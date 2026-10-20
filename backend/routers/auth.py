from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import (
    crear_token,
    hash_password,
    requiere_roles,
    usuario_actual,
    verificar_password,
)

router = APIRouter(prefix="/api/v1", tags=["Autenticación y usuarios"])


@router.post("/auth/login", response_model=schemas.TokenOut)
def login(datos: schemas.LoginIn, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == datos.email.strip().lower()).first()
    if not usuario or not usuario.activo or not verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    return {"access_token": crear_token(usuario), "usuario": usuario}


@router.get("/auth/me", response_model=schemas.UsuarioOut)
def mi_usuario(usuario: models.Usuario = Depends(usuario_actual)):
    return usuario


@router.get("/usuarios", response_model=List[schemas.UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db), _=Depends(requiere_roles("admin"))):
    return db.query(models.Usuario).order_by(models.Usuario.id).all()


@router.post("/usuarios", response_model=schemas.UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(datos: schemas.UsuarioCreate, db: Session = Depends(get_db), _=Depends(requiere_roles("admin"))):
    email = datos.email.strip().lower()
    if db.query(models.Usuario).filter(models.Usuario.email == email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ya existe un usuario con ese correo")
    nuevo = models.Usuario(
        nombre=datos.nombre.strip(),
        email=email,
        password_hash=hash_password(datos.password),
        rol=datos.rol,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo
