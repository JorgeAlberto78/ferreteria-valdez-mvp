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

  const color = { ENTRADA: "bg-cal/10 text-cal", SALIDA: "bg-etiqueta/10 text-etiqueta", AJUSTE: "bg-obra/30 text-carbon" };

  return (
    <div className="space-y-6">
      <h2 className="titulo-pagina !mb-0">Inventario</h2>
      <div className="panel">
        <h3 className="subtitulo mb-2">Productos con stock bajo</h3>
        {bajos.length === 0 ? (
          <p className="text-base text-cal">Todos los productos tienen stock suficiente.</p>
        ) : (
          <ul className="divide-y divide-tinta-linea/60">
            {bajos.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2.5 text-base">
                <span>{p.nombre}</span>
                <span className="font-semibold text-etiqueta">
                  {p.stock_actual} de mínimo {p.stock_minimo}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {esAdmin && (
        <>
          <form onSubmit={ajustar} className="panel">
            <h3 className="subtitulo mb-3">Ajustar stock después de contar</h3>
            <div className="grid items-end gap-3 sm:grid-cols-4">
              <select className="input sm:col-span-2" aria-label="Producto" value={ajuste.producto_id} onChange={(e) => setAjuste({ ...ajuste, producto_id: e.target.value })} required>
                <option value="">Elige un producto...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (sistema: {p.stock_actual})
                  </option>
                ))}
              </select>
              <input className="input" type="number" min="0" placeholder="Stock real" aria-label="Stock real" value={ajuste.stock_nuevo} onChange={(e) => setAjuste({ ...ajuste, stock_nuevo: e.target.value })} required />
              <button className="btn">Ajustar</button>
            </div>
            {ok && <p role="status" className="aviso-ok mt-3">{ok}</p>}
            {error && <p role="alert" className="aviso-error mt-3">{error}</p>}
          </form>

          <div className="panel">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="subtitulo">Kardex: todos los movimientos</h3>
              <select className="input max-w-xs" aria-label="Filtrar por producto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
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
                <thead>
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
                <tbody className="divide-y divide-tinta-linea/60">
                  {kardex.map((m) => (
                    <tr key={m.id}>
                      <td className="td whitespace-nowrap text-sm">{new Date(m.fecha + "Z").toLocaleString()}</td>
                      <td className="td">{m.producto_nombre}</td>
                      <td className="td">
                        <span className={`chip ${color[m.tipo]}`}>{m.tipo}</span>
                      </td>
                      <td className="td text-right">{m.cantidad}</td>
                      <td className="td text-right">{m.stock_anterior}</td>
                      <td className="td text-right">{m.stock_nuevo}</td>
                      <td className="td text-sm text-stone-600">{m.referencia}</td>
                    </tr>
                  ))}
                  {kardex.length === 0 && (
                    <tr>
                      <td className="td text-stone-500" colSpan={7}>
                        Todavía no hay movimientos. Se crean al registrar una compra, una venta o un ajuste.
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
