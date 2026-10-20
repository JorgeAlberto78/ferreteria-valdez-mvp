import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Cadena de conexión de Supabase (PostgreSQL). Si no existe, usa SQLite local para pruebas.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ferreteria_local.db")

# Algunos proveedores entregan "postgres://", SQLAlchemy necesita "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Entrega una sesión de base de datos a cada endpoint y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
