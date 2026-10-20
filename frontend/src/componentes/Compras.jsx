import { useEffect, useState } from "react";
import api, { bs, mensajeError } from "../api.js";
import Nota from "./Nota.jsx";

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

  const filas = items.map((i, idx) => ({
    id: idx,
    cant: i.cantidad,
    desc: i.producto.nombre,
    unit: i.precio,
    quitar: () => setItems((l) => l.filter((_, k) => k !== idx)),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
      <div className="min-w-0 space-y-5">
        <h2 className="titulo-pagina !mb-0">Registrar compra a proveedor</h2>

        <div className="panel space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Proveedor</label>
              <select className="input" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
                <option value="">Elige un proveedor...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Factura o nota del proveedor (opcional)</label>
              <input className="input" placeholder="Si no entregó, déjalo vacío" value={factura} onChange={(e) => setFactura(e.target.value)} />
            </div>
          </div>

          <div>
            <p className="label">Agregar a la nota</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="basis-full">
                <select className="input" aria-label="Producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                  <option value="">Elige un producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (stock {p.stock_actual})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <input className="input" type="number" min="1" aria-label="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
              </div>
              <div className="w-36">
                <input className="input" type="number" min="0" step="0.01" placeholder="Precio unit." aria-label="Precio unitario" value={precio} onChange={(e) => setPrecio(e.target.value)} />
              </div>
              <button className="btn" onClick={agregar} disabled={!productoId}>
                Agregar
              </button>
            </div>
          </div>
        </div>

        <Nota titulo="Nota de compra" filas={filas} vacio="Todavía no agregaste productos a esta compra." />

        <div className="panel space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="total-caja min-w-[16rem] flex-1 sm:flex-none">
              <span className="text-base text-tinta">Total</span>
              <span className="font-titulo text-4xl font-bold text-tinta-oscuro">{bs(total)}</span>
            </div>
            <button className="btn !h-12 px-8 text-lg" onClick={confirmar} disabled={items.length === 0}>
              Confirmar compra
            </button>
          </div>
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
        <h3 className="subtitulo mb-2">Últimas compras</h3>
        <ul className="divide-y divide-tinta-linea/60">
          {compras.map((c) => (
            <li key={c.id} className="py-2.5">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">Compra #{c.id}</span>
                <span className="font-semibold">{bs(c.total)}</span>
              </div>
              <p className="text-sm text-stone-600">
                {c.proveedor_nombre}
                {c.nro_factura ? ` · Factura ${c.nro_factura}` : ""}
              </p>
            </li>
          ))}
          {compras.length === 0 && <li className="py-2 text-base text-stone-600">Todavía no hay compras. La primera aparecerá aquí.</li>}
        </ul>
      </aside>
    </div>
  );
}
