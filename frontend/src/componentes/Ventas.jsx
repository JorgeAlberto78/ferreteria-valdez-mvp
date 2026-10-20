import { useEffect, useState } from "react";
import api, { bs, mensajeError } from "../api.js";

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [carrito, setCarrito] = useState([]); // [{ producto, cantidad }]
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [clienteId, setClienteId] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [descuento, setDescuento] = useState(0);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargar = () => {
    api.get("/productos").then((r) => setProductos(r.data));
    api.get("/ventas", { params: { limite: 10 } }).then((r) => setVentas(r.data));
  };

  useEffect(() => {
    cargar();
    api.get("/clientes").then((r) => setClientes(r.data));
  }, []);

  const agregar = () => {
    setError("");
    const p = productos.find((x) => x.id === Number(productoId));
    if (!p) return;
    const q = Number(cantidad);
    if (!q || q < 1) return setError("La cantidad debe ser mayor a 0");
    const yaEnCarrito = carrito.find((i) => i.producto.id === p.id)?.cantidad || 0;
    if (yaEnCarrito + q > p.stock_actual) {
      return setError(`Solo hay ${p.stock_actual} ${p.unidad_medida} de "${p.nombre}" en stock`);
    }
    setCarrito((c) => {
      const existe = c.find((i) => i.producto.id === p.id);
      return existe
        ? c.map((i) => (i.producto.id === p.id ? { ...i, cantidad: i.cantidad + q } : i))
        : [...c, { producto: p, cantidad: q }];
    });
    setCantidad(1);
  };

  const quitar = (id) => setCarrito((c) => c.filter((i) => i.producto.id !== id));

  const subtotal = carrito.reduce((s, i) => s + i.cantidad * i.producto.precio_venta, 0);
  const total = Math.max(subtotal - Number(descuento || 0), 0);

  const confirmar = async () => {
    setError("");
    setOk("");
    try {
      const { data } = await api.post("/ventas", {
        cliente_id: clienteId ? Number(clienteId) : null,
        metodo_pago: metodo,
        descuento: Number(descuento || 0),
        items: carrito.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
      });
      setOk(`Venta #${data.id} registrada por ${bs(data.total)}. El stock se descontó automáticamente.`);
      setCarrito([]);
      setDescuento(0);
      setClienteId("");
      cargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card space-y-4 lg:col-span-2">
        <h2 className="text-lg font-bold">Nueva venta</h2>
        <div className="flex flex-wrap gap-2">
          <select className="input flex-1" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            <option value="">Elige un producto...</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock_actual === 0}>
                {p.nombre} — {bs(p.precio_venta)} (stock {p.stock_actual})
              </option>
            ))}
          </select>
          <input className="input w-24" type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          <button className="btn" onClick={agregar} disabled={!productoId}>
            Agregar
          </button>
        </div>

        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className="th">Producto</th>
              <th className="th text-right">Cant.</th>
              <th className="th text-right">P. unit.</th>
              <th className="th text-right">Subtotal</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {carrito.map((i) => (
              <tr key={i.producto.id}>
                <td className="td">{i.producto.nombre}</td>
                <td className="td text-right">{i.cantidad}</td>
                <td className="td text-right">{bs(i.producto.precio_venta)}</td>
                <td className="td text-right">{bs(i.cantidad * i.producto.precio_venta)}</td>
                <td className="td text-right">
                  <button className="btn-sec" onClick={() => quitar(i.producto.id)}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
            {carrito.length === 0 && (
              <tr>
                <td className="td text-stone-500" colSpan={5}>
                  Todavía no agregaste productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Cliente (opcional)</label>
            <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Sin cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Método de pago</label>
            <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="qr">QR</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Descuento (Bs)</label>
            <input className="input" type="number" min="0" step="0.01" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-3">
          <div className="text-sm text-stone-600">
            Subtotal {bs(subtotal)} · <span className="text-lg font-bold text-marca-oscuro">Total {bs(total)}</span>
          </div>
          <button className="btn" onClick={confirmar} disabled={carrito.length === 0}>
            Confirmar venta
          </button>
        </div>
        {ok && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</p>}
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>

      <div className="card">
        <h3 className="mb-2 font-semibold">Últimas ventas</h3>
        <ul className="divide-y divide-stone-100 text-sm">
          {ventas.map((v) => (
            <li key={v.id} className="py-2">
              <div className="flex justify-between">
                <span className="font-medium">Venta #{v.id}</span>
                <span>{bs(v.total)}</span>
              </div>
              <p className="text-xs text-stone-500">
                {new Date(v.fecha + "Z").toLocaleString()} · {v.metodo_pago.toUpperCase()}
                {v.cliente_nombre ? ` · ${v.cliente_nombre}` : ""}
              </p>
            </li>
          ))}
          {ventas.length === 0 && <li className="py-2 text-stone-500">Sin ventas todavía.</li>}
        </ul>
      </div>
    </div>
  );
}
