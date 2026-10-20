import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import Base, SessionLocal, engine
from routers import auth, catalogo, inventario, operaciones
from security import hash_password


def datos_iniciales():
    """Crea los usuarios y productos de ejemplo la primera vez que arranca la API."""
    db = SessionLocal()
    try:
        if db.query(models.Usuario).count() == 0:
            db.add(
                models.Usuario(
                    nombre="Administrador",
                    email=os.getenv("ADMIN_EMAIL", "admin@ferreteriavaldez.com").lower(),
                    password_hash=hash_password(os.getenv("ADMIN_PASSWORD", "admin123")),
                    rol="admin",
                )
            )
            db.add(
                models.Usuario(
                    nombre="Vendedor",
                    email=os.getenv("VENDEDOR_EMAIL", "vendedor@ferreteriavaldez.com").lower(),
                    password_hash=hash_password(os.getenv("VENDEDOR_PASSWORD", "vendedor123")),
                    rol="vendedor",
                )
            )
        # Datos de ejemplo para la demostración (precios inventados, no reales)
        if os.getenv("SEED_DEMO", "true").lower() == "true" and db.query(models.Producto).count() == 0:
            ejemplos = [
                ("CEM-001", "Cemento Portland 50 kg", "Cemento", "bolsa", 55, 68, 40, 10),
                ("PIN-001", "Pintura látex blanca 4 L", "Pintura", "galón", 120, 150, 12, 4),
                ("ELE-001", "Cable eléctrico N° 12 (metro)", "Eléctricos", "metro", 3.5, 5, 200, 50),
                ("PLO-001", "Tubo PVC 1/2 pulgada", "Plomería", "unidad", 9, 14, 30, 10),
                ("FER-001", "Clavos 2 pulgadas (kg)", "Ferretería", "kilo", 14, 20, 8, 10),
                ("HER-001", "Martillo de uña 16 oz", "Herramientas", "unidad", 38, 55, 6, 3),
            ]
            for codigo, nombre, cat, unidad, pc, pv, stock, minimo in ejemplos:
                p = models.Producto(
                    codigo=codigo,
                    nombre=nombre,
                    categoria=cat,
                    unidad_medida=unidad,
                    precio_compra=pc,
                    precio_venta=pv,
                    stock_actual=stock,
                    stock_minimo=minimo,
                )
                db.add(p)
                db.flush()
                db.add(
                    models.MovimientoInventario(
                        producto_id=p.id,
                        tipo="ENTRADA",
                        cantidad=stock,
                        stock_anterior=0,
                        stock_nuevo=stock,
                        referencia="Stock inicial (ejemplo)",
                    )
                )
            db.add(models.Proveedor(nombre="Proveedor de ejemplo", rubro="Materiales de construcción"))
            db.add(models.Cliente(nombre="Cliente de ejemplo", nit_ci="0000000"))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # crea las tablas en Supabase si no existen
    datos_iniciales()
    yield


app = FastAPI(
    title="API Ferretería Valdez - MVP de compra, venta e inventario",
    version="1.0.0",
    description="Backend en FastAPI con base de datos PostgreSQL en Supabase.",
    lifespan=lifespan,
)

origenes = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes,
    allow_credentials=False,  # el token va en el encabezado Authorization, no en cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(catalogo.router)
app.include_router(operaciones.router)
app.include_router(inventario.router)


@app.get("/", tags=["Estado"])
def raiz():
    return {"mensaje": "API Ferretería Valdez en línea", "documentacion": "/docs"}
