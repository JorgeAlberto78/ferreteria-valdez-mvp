import { useEffect, useState } from "react";
import api, { mensajeError } from "../api.js";

export default function Inventario({ usuario }) {
  const esAdmin = usuario.rol === "admin";
  const [bajos, setBajos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [kardex, setKardex] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [ajuste, setAjuste] = useState({ producto_id: "", stock_nuevo: "", motivo: "Conteo físico" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargar = () => {
    api.get("/inventario/stock-bajo").then((r) => setBajos(r.data));
    api.get("/productos").then((r) => setProductos(r.data));
    if (esAdmin) {
      api.get("/inventario/movimientos", { params: { producto_id: filtro || undefined } }).then((r) => setKardex(r.data));
    }
  };

  useEffect(cargar, [filtro]);

  const ajustar = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api.post("/inventario/ajuste", {
        producto_id: Number(ajuste.producto_id),
        stock_nuevo: Number(ajuste.stock_nuevo),
        motivo: ajuste.motivo,
      });
      setOk("Stock ajustado y registrado en el kardex");
      setAjuste({ ...ajuste, producto_id: "", stock_nuevo: "" });
      cargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const color = { ENTRADA: "bg-green-100 text-green-700", SALIDA: "bg-red-100 text-red-700", AJUSTE: "bg-amber-100 text-amber-800" };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-2 text-lg font-bold">Productos con stock bajo</h2>
        {bajos.length === 0 ? (
          <p className="text-sm text-green-700">Todos los productos tienen stock suficiente.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {bajos.map((p) => (
              <li key={p.id} className="flex justify-between py-2 text-sm">
                <span>{p.nombre}</span>
                <span className="font-semibold text-red-700">
                  {p.stock_actual} / mínimo {p.stock_minimo}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {esAdmin && (
        <>
          <form onSubmit={ajustar} className="card">
            <h3 className="mb-3 font-semibold">Ajustar stock (conteo físico)</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <select className="input sm:col-span-2" value={ajuste.producto_id} onChange={(e) => setAjuste({ ...ajuste, producto_id: e.target.value })} required>
                <option value="">Elige un producto...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (sistema: {p.stock_actual})
                  </option>
                ))}
              </select>
              <input className="input" type="number" min="0" placeholder="Stock real" value={ajuste.stock_nuevo} onChange={(e) => setAjuste({ ...ajuste, stock_nuevo: e.target.value })} required />
              <button className="btn">Ajustar</button>
            </div>
            {ok && <p className="mt-2 text-sm text-green-700">{ok}</p>}
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          </form>

          <div className="card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">Kardex (movimientos de inventario)</h3>
              <select className="input max-w-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="">Todos los productos</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-stone-200">
                  <tr>
                    <th className="th">Fecha</th>
                    <th className="th">Producto</th>
                    <th className="th">Tipo</th>
                    <th className="th text-right">Cantidad</th>
                    <th className="th text-right">Antes</th>
                    <th className="th text-right">Después</th>
                    <th className="th">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {kardex.map((m) => (
                    <tr key={m.id}>
                      <td className="td whitespace-nowrap text-xs">{new Date(m.fecha + "Z").toLocaleString()}</td>
                      <td className="td">{m.producto_nombre}</td>
                      <td className="td">
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${color[m.tipo]}`}>{m.tipo}</span>
                      </td>
                      <td className="td text-right">{m.cantidad}</td>
                      <td className="td text-right">{m.stock_anterior}</td>
                      <td className="td text-right">{m.stock_nuevo}</td>
                      <td className="td text-xs">{m.referencia}</td>
                    </tr>
                  ))}
                  {kardex.length === 0 && (
                    <tr>
                      <td className="td text-stone-500" colSpan={7}>
                        Sin movimientos todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
