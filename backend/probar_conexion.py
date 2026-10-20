"""Comprueba que el backend se conecta a Supabase (PostgreSQL) y muestra las tablas.

Uso (con el venv activo y el archivo .env listo):
    python probar_conexion.py
"""
from sqlalchemy import inspect, text

from database import DATABASE_URL, engine

motor = DATABASE_URL.split(":")[0]
print(f"Motor de base de datos: {motor}")
if motor.startswith("sqlite"):
    print("ATENCIÓN: no encontré DATABASE_URL en el archivo .env, estás usando SQLite local.")
    print("Pega la cadena de Supabase en .env para usar Supabase.")
    raise SystemExit(1)
else:
    # Muestra solo el servidor, nunca la contraseña
    print("Servidor:", DATABASE_URL.split("@")[-1])

try:
    with engine.connect() as conexion:
        version = conexion.execute(text("select version()")).scalar()
    print("Conexión exitosa.")
    print("Versión:", version.split(",")[0])
    tablas = inspect(engine).get_table_names()
    print("Tablas existentes:", ", ".join(tablas) if tablas else "(ninguna todavía; se crean al iniciar la API)")
except Exception as e:
    print("No se pudo conectar:", str(e).splitlines()[0])
    print("Revisa la contraseña, y si estás en Render prueba con la cadena Session pooler de Supabase.")
