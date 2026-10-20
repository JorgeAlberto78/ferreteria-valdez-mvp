import { useEffect, useState } from "react";
import api, { bs, mensajeError } from "../api.js";

export default function Compras() {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [items, setItems] = useState([]); // [{ producto, cantidad, precio }]
  const [proveedorId, setProveedorId] = useState("");
  const [factura, setFactura] = useState("");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargar = () => {
    api.get("/productos").then((r) => setProductos(r.data));
    api.get("/compras", { params: { limite: 10 } }).then((r) => setCompras(r.data));
  };

  useEffect(() => {
    cargar();
    api.get("/proveedores").then((r) => setProveedores(r.data));
  }, []);

  const agregar = () => {
    setError("");
    const p = productos.find((x) => x.id === Number(productoId));
    if (!p) return;
    if (Number(cantidad) < 1 || Number(precio) <= 0) return setError("Escribe una cantidad y un precio mayores a 0");
    setItems((l) => [...l, { producto: p, cantidad: Number(cantidad), precio: Number(precio) }]);
    setCantidad(1);
    setPrecio("");
  };

  const total = items.reduce((s, i) => s + i.cantidad * i.precio, 0);

  const confirmar = async () => {
    setError("");
    setOk("");
    if (!proveedorId) return setError("Elige un proveedor");
    try {
      const { data } = await api.post("/compras", {
        proveedor_id: Number(proveedorId),
        nro_factura: factura || null,
        items: items.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad, precio_unitario: i.precio })),
      });
      setOk(`Compra #${data.id} registrada por ${bs(data.total)}. El stock aumentó automáticamente.`);
      setItems([]);
      setFactura("");
      cargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card space-y-4 lg:col-span-2">
        <h2 className="text-lg font-bold">Registrar compra a proveedor</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="input" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            <option value="">Elige un proveedor...</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <input className="input" placeholder="N° de factura del proveedor (opcional)" value={factura} onChange={(e) => setFactura(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2">
          <select className="input flex-1" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            <option value="">Elige un producto...</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} (stock {p.stock_actual})
              </option>
            ))}
          </select>
          <input className="input w-24" type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          <input className="input w-32" type="number" min="0" step="0.01" placeholder="Precio unit." value={precio} onChange={(e) => setPrecio(e.target.value)} />
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
            {items.map((i, idx) => (
              <tr key={idx}>
                <td className="td">{i.producto.nombre}</td>
                <td className="td text-right">{i.cantidad}</td>
                <td className="td text-right">{bs(i.precio)}</td>
                <td className="td text-right">{bs(i.cantidad * i.precio)}</td>
                <td className="td text-right">
                  <button className="btn-sec" onClick={() => setItems((l) => l.filter((_, k) => k !== idx))}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="td text-stone-500" colSpan={5}>
                  Todavía no agregaste productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="text-lg font-bold text-marca-oscuro">Total {bs(total)}</span>
          <button className="btn" onClick={confirmar} disabled={items.length === 0}>
            Confirmar compra
          </button>
        </div>
        {ok && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</p>}
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>

      <div className="card">
        <h3 className="mb-2 font-semibold">Últimas compras</h3>
        <ul className="divide-y divide-stone-100 text-sm">
          {compras.map((c) => (
            <li key={c.id} className="py-2">
              <div className="flex justify-between">
                <span className="font-medium">Compra #{c.id}</span>
                <span>{bs(c.total)}</span>
              </div>
              <p className="text-xs text-stone-500">
                {c.proveedor_nombre}
                {c.nro_factura ? ` · Factura ${c.nro_factura}` : ""}
              </p>
            </li>
          ))}
          {compras.length === 0 && <li className="py-2 text-stone-500">Sin compras todavía.</li>}
        </ul>
      </div>
    </div>
  );
}
