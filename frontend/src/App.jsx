import { useState } from "react";
import Login from "./componentes/Login.jsx";
import Resumen from "./componentes/Resumen.jsx";
import Productos from "./componentes/Productos.jsx";
import Ventas from "./componentes/Ventas.jsx";
import Compras from "./componentes/Compras.jsx";
import Inventario from "./componentes/Inventario.jsx";
import { Proveedores, Clientes } from "./componentes/Terceros.jsx";

const TABS = [
  { id: "resumen", nombre: "Resumen", roles: ["admin"], vista: Resumen },
  { id: "productos", nombre: "Productos", roles: ["admin", "vendedor"], vista: Productos },
  { id: "ventas", nombre: "Ventas", roles: ["admin", "vendedor"], vista: Ventas },
  { id: "compras", nombre: "Compras", roles: ["admin"], vista: Compras },
  { id: "inventario", nombre: "Inventario", roles: ["admin", "vendedor"], vista: Inventario },
  { id: "proveedores", nombre: "Proveedores", roles: ["admin"], vista: Proveedores },
  { id: "clientes", nombre: "Clientes", roles: ["admin", "vendedor"], vista: Clientes },
];

function leerUsuario() {
  try {
    return localStorage.getItem("token") ? JSON.parse(localStorage.getItem("usuario")) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [usuario, setUsuario] = useState(leerUsuario);
  const [tab, setTab] = useState(null);

  if (!usuario) return <Login onLogin={setUsuario} />;

  const tabs = TABS.filter((t) => t.roles.includes(usuario.rol));
  const actual = tabs.find((t) => t.id === tab) || tabs[0];
  const Vista = actual.vista;

  const salir = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  };

  return (
    <div className="min-h-screen">
      <header className="bg-marca-oscuro text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">Ferretería Valdez</h1>
            <p className="text-xs text-amber-200">Compra, venta e inventario</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span>
              {usuario.nombre} <span className="rounded bg-amber-200 px-1.5 py-0.5 text-xs text-marca-oscuro">{usuario.rol}</span>
            </span>
            <button onClick={salir} className="rounded border border-amber-200 px-3 py-1 hover:bg-marca">
              Cerrar sesión
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-t-md px-4 py-2 text-sm ${
                actual.id === t.id ? "bg-stone-100 font-semibold text-marca-oscuro" : "text-amber-100 hover:bg-marca"
              }`}
            >
              {t.nombre}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Vista usuario={usuario} />
      </main>
    </div>
  );
}
