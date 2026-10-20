from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Rol = Literal["admin", "vendedor"]
MetodoPago = Literal["efectivo", "qr"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Autenticación y usuarios ----------
class LoginIn(BaseModel):
    email: str
    password: str


class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=6, max_length=100)
    rol: Rol = "vendedor"


class UsuarioOut(ORM):
    id: int
    nombre: str
    email: str
    rol: str
    activo: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


# ---------- Productos ----------
class ProductoBase(BaseModel):
    codigo: str = Field(min_length=1, max_length=40)
    nombre: str = Field(min_length=2, max_length=150)
    categoria: Optional[str] = None
    unidad_medida: str = "unidad"
    precio_compra: float = Field(default=0, ge=0)
    precio_venta: float = Field(default=0, ge=0)
    stock_actual: int = Field(default=0, ge=0)
    stock_minimo: int = Field(default=0, ge=0)


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    unidad_medida: Optional[str] = None
    precio_compra: Optional[float] = Field(default=None, ge=0)
    precio_venta: Optional[float] = Field(default=None, ge=0)
    stock_minimo: Optional[int] = Field(default=None, ge=0)


class ProductoOut(ProductoBase, ORM):
    id: int
    activo: bool


# ---------- Proveedores y clientes ----------
class ProveedorIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    nit_ci: Optional[str] = None
    telefono: Optional[str] = None
    rubro: Optional[str] = None


class ProveedorOut(ProveedorIn, ORM):
    id: int


class ClienteIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    nit_ci: Optional[str] = None
    telefono: Optional[str] = None


class ClienteOut(ClienteIn, ORM):
    id: int


# ---------- Compras ----------
class CompraItemIn(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)
    precio_unitario: float = Field(gt=0)


class CompraCreate(BaseModel):
    proveedor_id: int
    nro_factura: Optional[str] = None
    items: List[CompraItemIn] = Field(min_length=1)


class DetalleOut(ORM):
    id: int
    producto_id: int
    producto_nombre: Optional[str] = None
    cantidad: int
    precio_unitario: float
    subtotal: float


class CompraOut(ORM):
    id: int
    proveedor_id: int
    proveedor_nombre: Optional[str] = None
    nro_factura: Optional[str] = None
    fecha: datetime
    total: float
    items: List[DetalleOut]


# ---------- Ventas ----------
class VentaItemIn(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)


class VentaCreate(BaseModel):
    cliente_id: Optional[int] = None
    metodo_pago: MetodoPago = "efectivo"
    descuento: float = Field(default=0, ge=0)
    items: List[VentaItemIn] = Field(min_length=1)


class VentaOut(ORM):
    id: int
    cliente_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    usuario_nombre: Optional[str] = None
    fecha: datetime
    metodo_pago: str
    subtotal: float
    descuento: float
    total: float
    items: List[DetalleOut]


# ---------- Inventario (kardex) ----------
class AjusteIn(BaseModel):
    producto_id: int
    stock_nuevo: int = Field(ge=0)
    motivo: str = Field(default="Ajuste de inventario", max_length=60)


class MovimientoOut(ORM):
    id: int
    producto_id: int
    producto_nombre: Optional[str] = None
    tipo: str
    cantidad: int
    stock_anterior: int
    stock_nuevo: int
    referencia: Optional[str] = None
    fecha: datetime
