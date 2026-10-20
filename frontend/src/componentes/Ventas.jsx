import { useEffect, useState } from "react";
import api, { bs, mensajeError } from "../api.js";
import Nota from "./Nota.jsx";

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

  const filas = carrito.map((i) => ({
    id: i.producto.id,
    cant: i.cantidad,
    desc: i.producto.nombre,
    unit: i.producto.precio_venta,
    quitar: () => quitar(i.producto.id),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
      <div className="min-w-0 space-y-5">
        <h2 className="titulo-pagina !mb-0">Nueva venta</h2>

        <div className="panel">
          <p className="label">Agregar a la nota</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <select className="input" aria-label="Producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                <option value="">Elige un producto...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock_actual === 0}>
                    {p.nombre} — {bs(p.precio_venta)} (stock {p.stock_actual})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <input className="input" type="number" min="1" aria-label="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <button className="btn" onClick={agregar} disabled={!productoId}>
              Agregar
            </button>
          </div>
        </div>

        <Nota titulo="Nota de venta" filas={filas} vacio="Todavía no agregaste productos a esta venta." />

        <div className="panel space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Cliente (opcional)</label>
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
              <label className="label">Método de pago</label>
              <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="qr">QR</option>
              </select>
            </div>
            <div>
              <label className="label">Descuento (Bs)</label>
              <input className="input" type="number" min="0" step="0.01" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="total-caja min-w-[16rem] flex-1 sm:flex-none">
              <span className="text-base text-tinta">Total</span>
              <span className="font-titulo text-4xl font-bold text-tinta-oscuro">{bs(total)}</span>
            </div>
            <button className="btn !h-12 px-8 text-lg" onClick={confirmar} disabled={carrito.length === 0}>
              Confirmar venta
            </button>
          </div>
          {Number(descuento) > 0 && <p className="text-sm text-stone-600">Subtotal {bs(subtotal)} menos descuento {bs(descuento)}.</p>}
          {ok && (
            <p role="status" className="aviso-ok">
              {ok}
            </p>
          )}
          {error && (
            <p role="alert" className="aviso-error">
              {error}
            </p>
          )}
        </div>
      </div>

      <aside className="panel h-fit">
        <h3 className="subtitulo mb-2">Últimas ventas</h3>
        <ul className="divide-y divide-tinta-linea/60">
          {ventas.map((v) => (
            <li key={v.id} className="py-2.5">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">Venta #{v.id}</span>
                <span className="font-semibold">{bs(v.total)}</span>
              </div>
              <p className="text-sm text-stone-600">
                {new Date(v.fecha + "Z").toLocaleString()} · {v.metodo_pago.toUpperCase()}
                {v.cliente_nombre ? ` · ${v.cliente_nombre}` : ""}
              </p>
            </li>
          ))}
          {ventas.length === 0 && <li className="py-2 text-base text-stone-600">Todavía no hay ventas. La primera aparecerá aquí.</li>}
        </ul>
      </aside>
    </div>
  );
}
