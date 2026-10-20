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

function Campo({ etiqueta, className = "", children }) {
  return (
    <div className={className}>
      <label className="label">{etiqueta}</label>
      {children}
    </div>
  );
}

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
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="panel min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="titulo-pagina !mb-0">Productos</h2>
            <input className="input max-w-xs" placeholder="Buscar por nombre o código" aria-label="Buscar producto" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Código</th>
                  <th className="th">Producto</th>
                  <th className="th text-right">Precio</th>
                  <th className="th text-right">Stock</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tinta-linea/60">
                {productos.map((p) => {
                  const bajo = p.stock_actual <= p.stock_minimo;
                  return (
                    <tr key={p.id} className={seleccion?.id === p.id ? "bg-obra/15" : ""}>
                      <td className="td whitespace-nowrap text-sm text-stone-600">{p.codigo}</td>
                      <td className="td">
                        <span className="font-medium">{p.nombre}</span>
                        {p.categoria && <span className="block text-sm text-stone-600">{p.categoria}</span>}
                      </td>
                      <td className="td whitespace-nowrap text-right font-semibold">{bs(p.precio_venta)}</td>
                      <td className="td text-right">
                        <span className={`chip ${bajo ? "bg-etiqueta/10 text-etiqueta" : "bg-cal/10 text-cal"}`}>
                          {p.stock_actual} {p.unidad_medida}
                          {bajo ? " · bajo" : ""}
                        </span>
                      </td>
                      <td className="td space-x-1 whitespace-nowrap text-right">
                        <button className="btn-sec" onClick={() => setSeleccion(p)}>
                          Ver 3D
                        </button>
                        {esAdmin && (
                          <button className="btn-sec !text-etiqueta" onClick={() => desactivar(p)}>
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {productos.length === 0 && (
                  <tr>
                    <td className="td text-stone-500" colSpan={5}>
                      No hay productos con ese nombre. Prueba con otra palabra o con el código.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {seleccion ? (
            <Suspense fallback={<p className="text-base text-stone-600">Cargando visor 3D...</p>}>
              <Producto3D producto={seleccion} />
            </Suspense>
          ) : (
            <div className="panel text-base text-stone-600">Elige un producto de la lista para verlo en 3D.</div>
          )}
        </div>
      </div>

      {esAdmin && (
        <form onSubmit={guardar} className="panel">
          <h3 className="subtitulo mb-4">Registrar producto</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Código">
              <input className="input" value={form.codigo} onChange={cambiar("codigo")} required />
            </Campo>
            <Campo etiqueta="Nombre" className="sm:col-span-2">
              <input className="input" value={form.nombre} onChange={cambiar("nombre")} required />
            </Campo>
            <Campo etiqueta="Categoría">
              <input className="input" value={form.categoria} onChange={cambiar("categoria")} />
            </Campo>
            <Campo etiqueta="Unidad (bolsa, metro, kilo...)">
              <input className="input" value={form.unidad_medida} onChange={cambiar("unidad_medida")} />
            </Campo>
            <Campo etiqueta="Precio de compra (Bs)">
              <input className="input" type="number" min="0" step="0.01" value={form.precio_compra} onChange={cambiar("precio_compra")} />
            </Campo>
            <Campo etiqueta="Precio de venta (Bs)">
              <input className="input" type="number" min="0" step="0.01" value={form.precio_venta} onChange={cambiar("precio_venta")} />
            </Campo>
            <Campo etiqueta="Stock inicial">
              <input className="input" type="number" min="0" value={form.stock_actual} onChange={cambiar("stock_actual")} />
            </Campo>
            <Campo etiqueta="Stock mínimo">
              <input className="input" type="number" min="0" value={form.stock_minimo} onChange={cambiar("stock_minimo")} />
            </Campo>
            <div className="flex items-end">
              <button className="btn w-full">Guardar producto</button>
            </div>
          </div>
          {ok && (
            <p role="status" className="aviso-ok mt-4">
              {ok}
            </p>
          )}
        </form>
      )}
      {error && <p role="alert" className="aviso-error">{error}</p>}
    </div>
  );
}
