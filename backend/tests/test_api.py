import os
import sys

import pytest

# Base de datos de prueba aislada (SQLite), antes de importar la app
RUTA_DB = os.path.join(os.path.dirname(__file__), "test_ferreteria.db")
os.environ["DATABASE_URL"] = f"sqlite:///{RUTA_DB}"
os.environ["SEED_DEMO"] = "false"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    if os.path.exists(RUTA_DB):
        os.remove(RUTA_DB)
    with TestClient(app) as c:
        yield c
    if os.path.exists(RUTA_DB):
        os.remove(RUTA_DB)


def login(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def admin(client):
    return login(client, "admin@ferreteriavaldez.com", "admin123")


@pytest.fixture(scope="module")
def vendedor(client):
    return login(client, "vendedor@ferreteriavaldez.com", "vendedor123")


def test_login_incorrecto(client):
    r = client.post("/api/v1/auth/login", json={"email": "admin@ferreteriavaldez.com", "password": "mala"})
    assert r.status_code == 401


def test_sin_token_y_token_alterado(client, admin):
    assert client.get("/api/v1/productos").status_code in (401, 403)
    alterado = {"Authorization": admin["Authorization"][:-3] + "abc"}
    assert client.get("/api/v1/productos", headers=alterado).status_code == 401


def test_roles(client, admin, vendedor):
    datos = {"codigo": "X-1", "nombre": "Producto X", "precio_venta": 10}
    assert client.post("/api/v1/productos", json=datos, headers=vendedor).status_code == 403
    assert client.post("/api/v1/productos", json=datos, headers=admin).status_code == 201
    assert client.get("/api/v1/usuarios", headers=vendedor).status_code == 403
    assert client.get("/api/v1/inventario/movimientos", headers=vendedor).status_code == 403


def test_codigo_duplicado(client, admin):
    datos = {"codigo": "X-1", "nombre": "Otro", "precio_venta": 10}
    assert client.post("/api/v1/productos", json=datos, headers=admin).status_code == 400


def crear_producto(client, admin, codigo, stock, precio_venta=100, precio_compra=60, minimo=2):
    r = client.post(
        "/api/v1/productos",
        json={
            "codigo": codigo,
            "nombre": f"Producto {codigo}",
            "precio_compra": precio_compra,
            "precio_venta": precio_venta,
            "stock_actual": stock,
            "stock_minimo": minimo,
        },
        headers=admin,
    )
    assert r.status_code == 201, r.text
    return r.json()


def stock_de(client, admin, pid):
    return client.get(f"/api/v1/productos/{pid}", headers=admin).json()["stock_actual"]


def test_compra_suma_stock_y_costo_promedio(client, admin):
    p = crear_producto(client, admin, "C-1", stock=10, precio_compra=50)
    prov = client.post("/api/v1/proveedores", json={"nombre": "Proveedor Prueba"}, headers=admin).json()
    r = client.post(
        "/api/v1/compras",
        json={"proveedor_id": prov["id"], "nro_factura": "F-1", "items": [{"producto_id": p["id"], "cantidad": 10, "precio_unitario": 70}]},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    assert r.json()["total"] == 700
    prod = client.get(f"/api/v1/productos/{p['id']}", headers=admin).json()
    assert prod["stock_actual"] == 20
    assert prod["precio_compra"] == 60  # (10*50 + 10*70) / 20


def test_venta_descuenta_stock_y_registra_kardex(client, admin, vendedor):
    p = crear_producto(client, admin, "V-1", stock=10, precio_venta=100)
    r = client.post(
        "/api/v1/ventas",
        json={"metodo_pago": "qr", "descuento": 20, "items": [{"producto_id": p["id"], "cantidad": 3}]},
        headers=vendedor,
    )
    assert r.status_code == 201, r.text
    v = r.json()
    assert v["subtotal"] == 300 and v["descuento"] == 20 and v["total"] == 280 and v["metodo_pago"] == "qr"
    assert stock_de(client, admin, p["id"]) == 7
    kardex = client.get(f"/api/v1/inventario/movimientos?producto_id={p['id']}", headers=admin).json()
    assert kardex[0]["tipo"] == "SALIDA" and kardex[0]["stock_anterior"] == 10 and kardex[0]["stock_nuevo"] == 7


def test_stock_insuficiente_hace_rollback(client, admin, vendedor):
    a = crear_producto(client, admin, "R-1", stock=5)
    b = crear_producto(client, admin, "R-2", stock=1)
    antes_ventas = len(client.get("/api/v1/ventas", headers=admin).json())
    r = client.post(
        "/api/v1/ventas",
        json={"items": [{"producto_id": a["id"], "cantidad": 2}, {"producto_id": b["id"], "cantidad": 5}]},
        headers=vendedor,
    )
    assert r.status_code == 400
    assert "Stock insuficiente" in r.json()["detail"]
    # Nada quedó a medias: el stock del primer producto NO se descontó y no hay venta nueva
    assert stock_de(client, admin, a["id"]) == 5
    assert stock_de(client, admin, b["id"]) == 1
    assert len(client.get("/api/v1/ventas", headers=admin).json()) == antes_ventas


def test_descuento_mayor_al_subtotal(client, admin, vendedor):
    p = crear_producto(client, admin, "D-1", stock=5, precio_venta=10)
    r = client.post(
        "/api/v1/ventas",
        json={"descuento": 999, "items": [{"producto_id": p["id"], "cantidad": 1}]},
        headers=vendedor,
    )
    assert r.status_code == 400
    assert stock_de(client, admin, p["id"]) == 5


def test_lineas_repetidas_se_suman(client, admin, vendedor):
    p = crear_producto(client, admin, "L-1", stock=4)
    r = client.post(
        "/api/v1/ventas",
        json={"items": [{"producto_id": p["id"], "cantidad": 3}, {"producto_id": p["id"], "cantidad": 3}]},
        headers=vendedor,
    )
    assert r.status_code == 400  # 6 pedidos, solo hay 4
    assert stock_de(client, admin, p["id"]) == 4


def test_stock_bajo_ajuste_y_reporte(client, admin, vendedor):
    p = crear_producto(client, admin, "B-1", stock=3, minimo=5)
    bajos = [x["codigo"] for x in client.get("/api/v1/inventario/stock-bajo", headers=vendedor).json()]
    assert "B-1" in bajos
    r = client.post(
        "/api/v1/inventario/ajuste",
        json={"producto_id": p["id"], "stock_nuevo": 20, "motivo": "Conteo físico"},
        headers=admin,
    )
    assert r.status_code == 201 and r.json()["tipo"] == "AJUSTE"
    assert stock_de(client, admin, p["id"]) == 20
    res = client.get("/api/v1/reportes/resumen", headers=admin).json()
    assert res["ventas"]["cantidad"] >= 1 and res["ventas"]["total"] > 0


def test_vendedor_solo_ve_sus_ventas(client, admin, vendedor):
    mias = client.get("/api/v1/ventas", headers=vendedor).json()
    todas = client.get("/api/v1/ventas", headers=admin).json()
    assert len(mias) <= len(todas) and all(v["usuario_nombre"] == "Vendedor" for v in mias)
