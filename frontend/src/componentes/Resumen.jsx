import { useEffect, useState } from "react";
import api, { bs, mensajeError } from "../api.js";

function Tarjeta({ titulo, valor, detalle }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-stone-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-marca-oscuro">{valor}</p>
      {detalle && <p className="text-xs text-stone-500">{detalle}</p>}
    </div>
  );
}

export default function Resumen() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/reportes/resumen", { params: { dias: 30 } })
      .then((r) => setDatos(r.data))
      .catch((e) => setError(mensajeError(e)));
  }, []);

  if (error) return <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!datos) return <p className="text-sm text-stone-500">Cargando resumen...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Resumen de los últimos {datos.dias} días</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Ventas" valor={bs(datos.ventas.total)} detalle={`${datos.ventas.cantidad} ventas`} />
        <Tarjeta titulo="Compras" valor={bs(datos.compras.total)} detalle={`${datos.compras.cantidad} compras`} />
        <Tarjeta titulo="Productos con stock bajo" valor={datos.productos_stock_bajo} detalle="Revisar en Inventario" />
      </div>
      <div className="card">
        <h3 className="mb-2 font-semibold">Productos más vendidos</h3>
        {datos.mas_vendidos.length === 0 ? (
          <p className="text-sm text-stone-500">Todavía no hay ventas en este periodo.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {datos.mas_vendidos.map((p) => (
              <li key={p.producto} className="flex justify-between py-2 text-sm">
                <span>{p.producto}</span>
                <span className="font-medium">{p.unidades} unidades</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
