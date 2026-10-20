from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import requiere_roles, usuario_actual

router = APIRouter(prefix="/api/v1", tags=["Inventario y reportes"])


@router.get("/inventario/stock-bajo", response_model=List[schemas.ProductoOut])
def stock_bajo(db: Session = Depends(get_db), _=Depends(usuario_actual)):
    """Productos activos cuyo stock actual es menor o igual al stock mínimo."""
    return (
        db.query(models.Producto)
        .filter(models.Producto.activo.is_(True), models.Producto.stock_actual <= models.Producto.stock_minimo)
        .order_by(models.Producto.stock_actual)
        .all()
    )


@router.get("/inventario/movimientos", response_model=List[schemas.MovimientoOut])
def kardex(
    producto_id: Optional[int] = None,
    limite: int = 100,
    db: Session = Depends(get_db),
    _=Depends(requiere_roles("admin")),
):
    q = db.query(models.MovimientoInventario)
    if producto_id:
        q = q.filter(models.MovimientoInventario.producto_id == producto_id)
    return q.order_by(models.MovimientoInventario.id.desc()).limit(min(limite, 500)).all()


@router.post("/inventario/ajuste", response_model=schemas.MovimientoOut, status_code=status.HTTP_201_CREATED)
def ajustar_stock(datos: schemas.AjusteIn, db: Session = Depends(get_db), usuario=Depends(requiere_roles("admin"))):
    """Corrige el stock cuando el conteo físico no coincide con el sistema."""
    p = db.query(models.Producto).filter(models.Producto.id == datos.producto_id).with_for_update().first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    anterior = p.stock_actual
    p.stock_actual = datos.stock_nuevo
    mov = models.MovimientoInventario(
        producto_id=p.id,
        tipo="AJUSTE",
        cantidad=abs(datos.stock_nuevo - anterior),
        stock_anterior=anterior,
        stock_nuevo=datos.stock_nuevo,
        referencia=datos.motivo,
        usuario_id=usuario.id,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return mov


@router.get("/reportes/resumen")
def resumen(
    dias: int = 30,
    db: Session = Depends(get_db),
    _=Depends(requiere_roles("admin")),
):
    """Resumen de los últimos N días: ventas, compras, productos con stock bajo y más vendidos."""
    desde = datetime.utcnow() - timedelta(days=max(dias, 1))

    ventas_total, ventas_n = (
        db.query(func.coalesce(func.sum(models.Venta.total), 0), func.count(models.Venta.id))
        .filter(models.Venta.fecha >= desde)
        .one()
    )
    compras_total, compras_n = (
        db.query(func.coalesce(func.sum(models.Compra.total), 0), func.count(models.Compra.id))
        .filter(models.Compra.fecha >= desde)
        .one()
    )
    bajos = (
        db.query(func.count(models.Producto.id))
        .filter(models.Producto.activo.is_(True), models.Producto.stock_actual <= models.Producto.stock_minimo)
        .scalar()
    )
    top = (
        db.query(models.Producto.nombre, func.sum(models.DetalleVenta.cantidad).label("unidades"))
        .join(models.DetalleVenta, models.DetalleVenta.producto_id == models.Producto.id)
        .join(models.Venta, models.Venta.id == models.DetalleVenta.venta_id)
        .filter(models.Venta.fecha >= desde)
        .group_by(models.Producto.nombre)
        .order_by(func.sum(models.DetalleVenta.cantidad).desc())
        .limit(5)
        .all()
    )
    return {
        "dias": dias,
        "ventas": {"cantidad": ventas_n, "total": round(float(ventas_total), 2)},
        "compras": {"cantidad": compras_n, "total": round(float(compras_total), 2)},
        "productos_stock_bajo": bajos,
        "mas_vendidos": [{"producto": n, "unidades": int(u)} for n, u in top],
    }
