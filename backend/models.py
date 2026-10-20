from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


def ahora():
    return datetime.now(timezone.utc)


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    rol = Column(String(20), nullable=False, default="vendedor")  # admin | vendedor
    activo = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime, default=ahora)


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(40), unique=True, index=True, nullable=False)
    nombre = Column(String(150), nullable=False)
    categoria = Column(String(60), nullable=True)
    unidad_medida = Column(String(30), nullable=False, default="unidad")
    precio_compra = Column(Float, nullable=False, default=0)
    precio_venta = Column(Float, nullable=False, default=0)
    stock_actual = Column(Integer, nullable=False, default=0)
    stock_minimo = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)


class Proveedor(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    nit_ci = Column(String(30), nullable=True)
    telefono = Column(String(30), nullable=True)
    rubro = Column(String(80), nullable=True)


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    nit_ci = Column(String(30), nullable=True)
    telefono = Column(String(30), nullable=True)


class Compra(Base):
    __tablename__ = "compras"

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nro_factura = Column(String(40), nullable=True)
    fecha = Column(DateTime, default=ahora, index=True)
    total = Column(Float, nullable=False, default=0)

    proveedor = relationship("Proveedor")
    usuario = relationship("Usuario")
    items = relationship("DetalleCompra", back_populates="compra", cascade="all, delete-orphan")

    @property
    def proveedor_nombre(self):
        return self.proveedor.nombre if self.proveedor else None


class DetalleCompra(Base):
    __tablename__ = "detalle_compras"

    id = Column(Integer, primary_key=True, index=True)
    compra_id = Column(Integer, ForeignKey("compras.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    compra = relationship("Compra", back_populates="items")
    producto = relationship("Producto")

    @property
    def producto_nombre(self):
        return self.producto.nombre if self.producto else None


class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(DateTime, default=ahora, index=True)
    metodo_pago = Column(String(20), nullable=False, default="efectivo")  # efectivo | qr
    subtotal = Column(Float, nullable=False, default=0)
    descuento = Column(Float, nullable=False, default=0)
    total = Column(Float, nullable=False, default=0)

    cliente = relationship("Cliente")
    usuario = relationship("Usuario")
    items = relationship("DetalleVenta", back_populates="venta", cascade="all, delete-orphan")

    @property
    def cliente_nombre(self):
        return self.cliente.nombre if self.cliente else None

    @property
    def usuario_nombre(self):
        return self.usuario.nombre if self.usuario else None


class DetalleVenta(Base):
    __tablename__ = "detalle_ventas"

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    venta = relationship("Venta", back_populates="items")
    producto = relationship("Producto")

    @property
    def producto_nombre(self):
        return self.producto.nombre if self.producto else None


class MovimientoInventario(Base):
    """Kardex: registro de cada entrada, salida o ajuste de stock."""

    __tablename__ = "movimientos_inventario"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False, index=True)
    tipo = Column(String(10), nullable=False)  # ENTRADA | SALIDA | AJUSTE
    cantidad = Column(Integer, nullable=False)
    stock_anterior = Column(Integer, nullable=False)
    stock_nuevo = Column(Integer, nullable=False)
    referencia = Column(String(60), nullable=True)  # ej. "Venta #12", "Compra #3"
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha = Column(DateTime, default=ahora, index=True)

    producto = relationship("Producto")

    @property
    def producto_nombre(self):
        return self.producto.nombre if self.producto else None
