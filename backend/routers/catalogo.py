from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from notify import avisar_slack
from security import requiere_roles, usuario_actual

router = APIRouter(prefix="/api/v1", tags=["Catálogo"])


# ---------------- Productos ----------------
@router.get("/productos", response_model=List[schemas.ProductoOut])
def listar_productos(
    buscar: Optional[str] = None,
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    _=Depends(usuario_actual),
):
    q = db.query(models.Producto)
    if not incluir_inactivos:
        q = q.filter(models.Producto.activo.is_(True))
    if buscar:
        patron = f"%{buscar.strip()}%"
        q = q.filter(models.Producto.nombre.ilike(patron) | models.Producto.codigo.ilike(patron))
    return q.order_by(models.Producto.nombre).all()


@router.get("/productos/{producto_id}", response_model=schemas.ProductoOut)
def obtener_producto(producto_id: int, db: Session = Depends(get_db), _=Depends(usuario_actual)):
    p = db.get(models.Producto, producto_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return p


@router.post("/productos", response_model=schemas.ProductoOut, status_code=status.HTTP_201_CREATED)
def crear_producto(
    datos: schemas.ProductoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(requiere_roles("admin")),
):
    if db.query(models.Producto).filter(models.Producto.codigo == datos.codigo.strip()).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ya existe un producto con ese código")
    nuevo = models.Producto(**datos.model_dump())
    nuevo.codigo = nuevo.codigo.strip()
    db.add(nuevo)
    db.flush()
    # El stock inicial también queda registrado en el kardex
    if nuevo.stock_actual > 0:
        db.add(
            models.MovimientoInventario(
                producto_id=nuevo.id,
                tipo="ENTRADA",
                cantidad=nuevo.stock_actual,
                stock_anterior=0,
                stock_nuevo=nuevo.stock_actual,
                referencia="Stock inicial",
                usuario_id=usuario.id,
            )
        )
    db.commit()
    db.refresh(nuevo)
    avisar_slack(f"Nuevo producto registrado: {nuevo.nombre} (stock {nuevo.stock_actual})")
    return nuevo


@router.put("/productos/{producto_id}", response_model=schemas.ProductoOut)
def editar_producto(
    producto_id: int,
    datos: schemas.ProductoUpdate,
    db: Session = Depends(get_db),
    _=Depends(requiere_roles("admin")),
):
    p = db.get(models.Producto, producto_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(p, campo, valor)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def desactivar_producto(producto_id: int, db: Session = Depends(get_db), _=Depends(requiere_roles("admin"))):
    """No se borra de verdad para no perder el historial de compras y ventas: queda inactivo."""
    p = db.get(models.Producto, producto_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    p.activo = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------- Proveedores ----------------
@router.get("/proveedores", response_model=List[schemas.ProveedorOut])
def listar_proveedores(db: Session = Depends(get_db), _=Depends(usuario_actual)):
    return db.query(models.Proveedor).order_by(models.Proveedor.nombre).all()


@router.post("/proveedores", response_model=schemas.ProveedorOut, status_code=status.HTTP_201_CREATED)
def crear_proveedor(datos: schemas.ProveedorIn, db: Session = Depends(get_db), _=Depends(requiere_roles("admin"))):
    nuevo = models.Proveedor(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/proveedores/{proveedor_id}", response_model=schemas.ProveedorOut)
def editar_proveedor(
    proveedor_id: int, datos: schemas.ProveedorIn, db: Session = Depends(get_db), _=Depends(requiere_roles("admin"))
):
    p = db.get(models.Proveedor, proveedor_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proveedor no encontrado")
    for campo, valor in datos.model_dump().items():
        setattr(p, campo, valor)
    db.commit()
    db.refresh(p)
    return p


# ---------------- Clientes ----------------
@router.get("/clientes", response_model=List[schemas.ClienteOut])
def listar_clientes(db: Session = Depends(get_db), _=Depends(usuario_actual)):
    return db.query(models.Cliente).order_by(models.Cliente.nombre).all()


@router.post("/clientes", response_model=schemas.ClienteOut, status_code=status.HTTP_201_CREATED)
def crear_cliente(
    datos: schemas.ClienteIn, db: Session = Depends(get_db), _=Depends(requiere_roles("admin", "vendedor"))
):
    nuevo = models.Cliente(**datos.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/clientes/{cliente_id}", response_model=schemas.ClienteOut)
def editar_cliente(
    cliente_id: int, datos: schemas.ClienteIn, db: Session = Depends(get_db), _=Depends(requiere_roles("admin"))
):
    c = db.get(models.Cliente, cliente_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")
    for campo, valor in datos.model_dump().items():
        setattr(c, campo, valor)
    db.commit()
    db.refresh(c)
    return c
