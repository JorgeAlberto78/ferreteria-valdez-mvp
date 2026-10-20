import { useState } from "react";
import api, { mensajeError } from "../api.js";
import logoBlanco from "../assets/logo-blanco.png";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      onLogin(data.usuario);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-2">
      <section className="tablero flex flex-col items-center justify-center bg-tinta px-6 py-10 text-center text-white md:px-12 md:py-14">
        <img src={logoBlanco} alt="Ferretería Valdez" className="w-64 md:w-96" />
        <ul className="mt-8 space-y-2 text-lg text-tinta-claro">
          <li>Cada venta descuenta el stock.</li>
          <li>Cada compra lo repone.</li>
          <li>El kardex guarda cada movimiento.</li>
        </ul>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-10">
        <form onSubmit={enviar} className="w-full max-w-sm space-y-5">
          <h2 className="text-4xl font-bold text-tinta-oscuro">Iniciar sesión</h2>
          <div>
            <label htmlFor="correo" className="label">
              Correo
            </label>
            <input id="correo" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="clave" className="label">
              Contraseña
            </label>
            <input id="clave" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && (
            <p role="alert" className="aviso-error">
              {error}
            </p>
          )}
          <button className="btn w-full" disabled={cargando}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
          {cargando && <p className="text-sm text-stone-500">Si el servidor estaba inactivo, puede tardar hasta un minuto.</p>}
        </form>
      </section>
    </div>
  );
}
