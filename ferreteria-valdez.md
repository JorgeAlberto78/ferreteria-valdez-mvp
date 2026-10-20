# MVP Ferretería Valdez - Compra, venta e inventario

Backend: FastAPI + SQLAlchemy + PostgreSQL (Supabase). Frontend: React + Vite + Tailwind CSS.

```
proyecto-final/
├── backend/    API REST con JWT (FastAPI)
└── frontend/   Aplicación web (React + Vite)
```

## 1. Probar el backend en tu computadora (PowerShell)

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env      # luego abre .env y pega tu DATABASE_URL de Supabase
uvicorn main:app --reload --port 8000
```

- Antes de iniciar, comprueba la conexión con Supabase: `python probar_conexion.py` (debe decir "Motor de base de datos: postgresql" y "Conexión exitosa").
- Documentación y pruebas: http://127.0.0.1:8000/docs
- Si no pones `DATABASE_URL`, usa una base SQLite local (solo para pruebas).
- La primera vez crea las tablas, dos usuarios y productos de ejemplo:
  - admin@ferreteriavaldez.com / admin123
  - vendedor@ferreteriavaldez.com / vendedor123
- Pruebas automáticas: `python -m pip install pytest` y luego `python -m pytest -q`

En /docs: haz POST /api/v1/auth/login, copia el `access_token`, pulsa el botón **Authorize** y pega el token.

## 2. Probar el frontend en tu computadora

```powershell
cd frontend
npm install
copy .env.example .env      # VITE_API_URL=http://127.0.0.1:8000
npm run dev
```

Abre http://localhost:5173

## 3. Supabase (base de datos)

1. Crea un proyecto en supabase.com (plan gratuito) y guarda la contraseña de la base de datos.
2. Project Settings > Database > Connection string > URI. Copia la cadena `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` y reemplaza `[PASSWORD]`.
3. Pégala en `backend/.env` como `DATABASE_URL`. Al arrancar, la API crea las tablas sola; las verás en Table Editor.
4. Si al conectar desde Render sale un error de red ("Network is unreachable"), usa en su lugar la cadena del **Session pooler** (misma pantalla de conexión), que funciona sobre IPv4.

## 4. Backend en Render

1. Sube el proyecto a GitHub (el archivo `.env` NO se sube; ya está en `.gitignore`).
2. En Render: New > Web Service > conecta el repositorio.
   - Root Directory: `backend`
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Environment Variables: `DATABASE_URL`, `JWT_SECRET` (texto largo y secreto), `ADMIN_PASSWORD`, `VENDEDOR_PASSWORD`, y opcional `SLACK_WEBHOOK_URL`.
4. Cuando termine, tendrás una URL como https://tu-api.onrender.com (abre /docs para comprobar).
   En el plan gratuito, la API "se duerme" y la primera petición puede tardar unos segundos.

## 5. Frontend en Vercel

1. En Vercel: Add New > Project > importa el repositorio.
   - Root Directory: `frontend`
   - Framework: Vite
2. Environment Variables: `VITE_API_URL` = la URL de Render (sin barra final).
3. Deploy. Después, en Render puedes cambiar `CORS_ORIGINS` por la URL de Vercel.

## 6. Herramientas de la Tarea 6

- **Slack**: crea un Incoming Webhook y pon la URL en `SLACK_WEBHOOK_URL` (Render). La API avisa al canal cada vez que se registra una venta, compra o producto.
- **Gráficos 3D**: ya está el visor 3D del producto (React Three Fiber) en la pestaña Productos.
- **Vercel**: despliegue del frontend (paso 5).
- **Devin** y **Comentera**: se usan desde sus páginas; las capturas de uso las pones tú en el informe.
