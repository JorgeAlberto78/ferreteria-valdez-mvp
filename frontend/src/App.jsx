import { useState } from "react";
import Login from "./componentes/Login.jsx";
import Icono from "./componentes/Icono.jsx";
import Resumen from "./componentes/Resumen.jsx";
import Productos from "./componentes/Productos.jsx";
import Ventas from "./componentes/Ventas.jsx";
import Compras from "./componentes/Compras.jsx";
import Inventario from "./componentes/Inventario.jsx";
import { Proveedores, Clientes } from "./componentes/Terceros.jsx";

const TABS = [
  { id: "resumen", nombre: "Resumen", roles: ["admin"], vista: Resumen },
  { id: "ventas", nombre: "Ventas", roles: ["admin", "vendedor"], vista: Ventas },
  { id: "compras", nombre: "Compras", roles: ["admin"], vista: Compras },
  { id: "productos", nombre: "Productos", roles: ["admin", "vendedor"], vista: Productos },
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
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="bg-tinta text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] bg-obra font-titulo text-2xl font-bold text-carbon">V</span>
            <div className="leading-tight">
              <p className="font-titulo text-2xl font-bold">Ferretería Valdez</p>
              <p className="hidden text-sm text-tinta-linea lg:block">Compra, venta e inventario</p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <span className="chip bg-white/15 text-white">{usuario.rol}</span>
            <button onClick={salir} className="rounded-[4px] border border-white/40 px-3 py-1.5 text-sm hover:bg-white/10">
              Salir
            </button>
          </div>
        </div>

        <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {tabs.map((t) => {
            const activo = actual.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={activo ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-[4px] border-b-4 px-3 py-2.5 text-left text-base lg:border-b-0 lg:border-l-4 ${
                  activo ? "border-obra bg-white/15 font-semibold text-white" : "border-transparent text-tinta-claro hover:bg-white/10"
                }`}
              >
                <Icono nombre={t.id} />
                {t.nombre}
              </button>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/15 p-4 lg:block">
          <p className="font-semibold">{usuario.nombre}</p>
          <p className="mb-3 text-sm text-tinta-linea">Rol: {usuario.rol === "admin" ? "administrador" : "vendedor"}</p>
          <button onClick={salir} className="w-full rounded-[4px] border border-white/40 px-3 py-2 text-sm hover:bg-white/10">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl">
          <Vista usuario={usuario} ir={setTab} />
        </div>
      </main>
    </div>
  );
}
