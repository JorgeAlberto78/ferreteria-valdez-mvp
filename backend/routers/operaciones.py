from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from notify import avisar_slack
from security import requiere_roles, usuario_actual

router = APIRouter(prefix="/api/v1", tags=["Compras y ventas"])


def _bloquear_producto(db: Session, producto_id: int) -> models.Producto:
    """Busca el producto y lo bloquea durante la transacción (FOR UPDATE en PostgreSQL),
    para que dos ventas al mismo tiempo no descuenten el mismo stock dos veces."""
    p = (
        db.query(models.Producto)
        .filter(models.Producto.id == producto_id, models.Producto.activo.is_(True))
        .with_for_update()
        .first()
    )
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Producto con ID {producto_id} no encontrado")
    return p


# ---------------- Compras (entrada de mercadería) ----------------
@router.post("/compras", response_model=schemas.CompraOut, status_code=status.HTTP_201_CREATED)
def registrar_compra(
    datos: schemas.CompraCreate,
    db: Session = Depends(get_db),
    usuario=Depends(requiere_roles("admin")),
):
    if not db.get(models.Proveedor, datos.proveedor_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado")

    try:
        compra = models.Compra(proveedor_id=datos.proveedor_id, usuario_id=usuario.id, nro_factura=datos.nro_factura)
        db.add(compra)
        db.flush()  # obtiene compra.id sin confirmar todavía

        total = 0.0
        for item in datos.items:
            p = _bloquear_producto(db, item.producto_id)
            anterior = p.stock_actual
            nuevo = anterior + item.cantidad

            # Costo promedio ponderado: mezcla el costo del stock actual con el de la nueva compra
            p.precio_compra = round((anterior * p.precio_compra + item.cantidad * item.precio_unitario) / nuevo, 2)
            p.stock_actual = nuevo

            subtotal = round(item.cantidad * item.precio_unitario, 2)
            total += subtotal
            db.add(
                models.DetalleCompra(
                    compra_id=compra.id,
                    producto_id=p.id,
                    cantidad=item.cantidad,
                    precio_unitario=item.precio_unitario,
                    subtotal=subtotal,
                )
            )
            db.add(
                models.MovimientoInventario(
                    producto_id=p.id,
                    tipo="ENTRADA",
                    cantidad=item.cantidad,
                    stock_anterior=anterior,
                    stock_nuevo=nuevo,
                    referencia=f"Compra #{compra.id}",
                    usuario_id=usuario.id,
                )
            )
        compra.total = round(total, 2)
        db.commit()  # todo se guarda junto
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error al registrar la compra: {e}")

    db.refresh(compra)
    avisar_slack(f"Compra #{compra.id} registrada por Bs {compra.total:.2f}")
    return compra


@router.get("/compras", response_model=List[schemas.CompraOut])
def listar_compras(limite: int = 50, db: Session = Depends(get_db), _=Depends(requiere_roles("admin"))):
    return db.query(models.Compra).order_by(models.Compra.id.desc()).limit(min(limite, 200)).all()


@router.get("/compras/{compra_id}", response_model=schemas.CompraOut)
def detalle_compra(compra_id: int, db: Session = Depends(get_db), _=Depends(requiere_roles("admin"))):
    c = db.get(models.Compra, compra_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Compra no encontrada")
    return c


# ---------------- Ventas (salida de mercadería) ----------------
@router.post("/ventas", response_model=schemas.VentaOut, status_code=status.HTTP_201_CREATED)
def registrar_venta(
    datos: schemas.VentaCreate,
    db: Session = Depends(get_db),
    usuario=Depends(requiere_roles("admin", "vendedor")),
):
    if datos.cliente_id is not None and not db.get(models.Cliente, datos.cliente_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")

    # Si el mismo producto viene en dos líneas, se suman
    cantidades: Dict[int, int] = {}
    for item in datos.items:
        cantidades[item.producto_id] = cantidades.get(item.producto_id, 0) + item.cantidad

    try:
        venta = models.Venta(
            cliente_id=datos.cliente_id,
            usuario_id=usuario.id,
            metodo_pago=datos.metodo_pago,
        )
        db.add(venta)
        db.flush()

        subtotal = 0.0
        for producto_id, cantidad in cantidades.items():
            p = _bloquear_producto(db, producto_id)
            # Regla de negocio: se verifica el stock ANTES de descontar
            if p.stock_actual < cantidad:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Stock insuficiente de '{p.nombre}'. Pedido: {cantidad}, disponible: {p.stock_actual}",
                )
            anterior = p.stock_actual
            p.stock_actual = anterior - cantidad

            linea = round(cantidad * p.precio_venta, 2)
            subtotal += linea
            db.add(
                models.DetalleVenta(
                    venta_id=venta.id,
                    producto_id=p.id,
                    cantidad=cantidad,
                    precio_unitario=p.precio_venta,
                    subtotal=linea,
                )
            )
            db.add(
                models.MovimientoInventario(
                    producto_id=p.id,
                    tipo="SALIDA",
                    cantidad=cantidad,
                    stock_anterior=anterior,
                    stock_nuevo=p.stock_actual,
                    referencia=f"Venta #{venta.id}",
                    usuario_id=usuario.id,
                )
            )

        subtotal = round(subtotal, 2)
        if datos.descuento > subtotal:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "El descuento no puede ser mayor al subtotal")
        venta.subtotal = subtotal
        venta.descuento = round(datos.descuento, 2)
        venta.total = round(subtotal - datos.descuento, 2)
        db.commit()  # transacción atómica: venta + detalle + descuento de stock + kardex
    except HTTPException:
        db.rollback()  # si algo falla, no queda nada a medias
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error al registrar la venta: {e}")

    db.refresh(venta)
    avisar_slack(f"Venta #{venta.id} registrada por Bs {venta.total:.2f} ({venta.metodo_pago})")
    return venta


@router.get("/ventas", response_model=List[schemas.VentaOut])
def listar_ventas(limite: int = 50, db: Session = Depends(get_db), usuario=Depends(usuario_actual)):
    q = db.query(models.Venta)
    if usuario.rol != "admin":  # el vendedor solo ve sus propias ventas
        q = q.filter(models.Venta.usuario_id == usuario.id)
    return q.order_by(models.Venta.id.desc()).limit(min(limite, 200)).all()


@router.get("/ventas/{venta_id}", response_model=schemas.VentaOut)
def detalle_venta(venta_id: int, db: Session = Depends(get_db), usuario=Depends(usuario_actual)):
    v = db.get(models.Venta, venta_id)
    if not v or (usuario.rol != "admin" and v.usuario_id != usuario.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Venta no encontrada")
    return v
