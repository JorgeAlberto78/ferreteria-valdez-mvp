import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import api, { bs, mensajeError } from "../api.js";

// El visor 3D se carga solo cuando se necesita (pesa más que el resto de la página)
const Producto3D = lazy(() => import("./Producto3D.jsx"));

const VACIO = {
  codigo: "",
  nombre: "",
  categoria: "",
  unidad_medida: "unidad",
  precio_compra: 0,
  precio_venta: 0,
  stock_actual: 0,
  stock_minimo: 0,
};

export default function Productos({ usuario }) {
  const esAdmin = usuario.rol === "admin";
  const [productos, setProductos] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [form, setForm] = useState(VACIO);
  const [seleccion, setSeleccion] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargar = useCallback(() => {
    api
      .get("/productos", { params: { buscar: buscar || undefined } })
      .then((r) => {
        setProductos(r.data);
        setSeleccion((s) => (s ? r.data.find((p) => p.id === s.id) || r.data[0] : r.data[0]) || null);
      })
      .catch((e) => setError(mensajeError(e)));
  }, [buscar]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api.post("/productos", {
        ...form,
        categoria: form.categoria || null,
        precio_compra: Number(form.precio_compra),
        precio_venta: Number(form.precio_venta),
        stock_actual: Number(form.stock_actual),
        stock_minimo: Number(form.stock_minimo),
      });
      setForm(VACIO);
      setOk("Producto registrado");
      cargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const desactivar = async (p) => {
    if (!window.confirm(`¿Desactivar "${p.nombre}"? Seguirá en el historial de compras y ventas.`)) return;
    try {
      await api.delete(`/productos/${p.id}`);
      cargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Productos</h2>
            <input className="input max-w-xs" placeholder="Buscar por nombre o código" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-stone-200">
                <tr>
                  <th className="th">Código</th>
                  <th className="th">Producto</th>
                  <th className="th">Categoría</th>
                  <th className="th text-right">Precio venta</th>
                  <th className="th text-right">Stock</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {productos.map((p) => {
                  const bajo = p.stock_actual <= p.stock_minimo;
                  return (
                    <tr key={p.id} className={seleccion?.id === p.id ? "bg-amber-50" : ""}>
                      <td className="td font-mono text-xs">{p.codigo}</td>
                      <td className="td">{p.nombre}</td>
                      <td className="td">{p.categoria}</td>
                      <td className="td text-right">{bs(p.precio_venta)}</td>
                      <td className="td text-right">
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${bajo ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {p.stock_actual} {p.unidad_medida}
                        </span>
                      </td>
                      <td className="td space-x-1 text-right">
                        <button className="btn-sec" onClick={() => setSeleccion(p)}>
                          Ver 3D
                        </button>
                        {esAdmin && (
                          <button className="btn-sec text-red-700" onClick={() => desactivar(p)}>
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {productos.length === 0 && (
                  <tr>
                    <td className="td text-stone-500" colSpan={6}>
                      No hay productos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {seleccion ? (
            <Suspense fallback={<p className="text-sm text-stone-500">Cargando visor 3D...</p>}>
              <Producto3D producto={seleccion} />
            </Suspense>
          ) : (
            <div className="card text-sm text-stone-500">Elige un producto para verlo en 3D.</div>
          )}
        </div>
      </div>

      {esAdmin && (
        <form onSubmit={guardar} className="card">
          <h3 className="mb-3 font-semibold">Registrar producto</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className="input" placeholder="Código" value={form.codigo} onChange={cambiar("codigo")} required />
            <input className="input sm:col-span-2" placeholder="Nombre" value={form.nombre} onChange={cambiar("nombre")} required />
            <input className="input" placeholder="Categoría" value={form.categoria} onChange={cambiar("categoria")} />
            <input className="input" placeholder="Unidad (bolsa, metro, kilo...)" value={form.unidad_medida} onChange={cambiar("unidad_medida")} />
            <input className="input" type="number" min="0" step="0.01" placeholder="Precio compra" value={form.precio_compra} onChange={cambiar("precio_compra")} />
            <input className="input" type="number" min="0" step="0.01" placeholder="Precio venta" value={form.precio_venta} onChange={cambiar("precio_venta")} />
            <input className="input" type="number" min="0" placeholder="Stock inicial" value={form.stock_actual} onChange={cambiar("stock_actual")} />
            <input className="input" type="number" min="0" placeholder="Stock mínimo" value={form.stock_minimo} onChange={cambiar("stock_minimo")} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn">Guardar producto</button>
            {ok && <span className="text-sm text-green-700">{ok}</span>}
          </div>
        </form>
      )}
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
