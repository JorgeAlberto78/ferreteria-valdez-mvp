import { useEffect, useState } from "react";
import api, { bs, mensajeError } from "../api.js";

function Dato({ titulo, valor, detalle, alerta }) {
  return (
    <div className="px-5 py-4">
      <p className="text-base text-tinta">{titulo}</p>
      <p className={`font-titulo text-5xl font-bold ${alerta ? "text-etiqueta" : "text-tinta-oscuro"}`}>{valor}</p>
      {detalle && <p className="text-base text-stone-600">{detalle}</p>}
    </div>
  );
}

export default function Resumen({ ir }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/reportes/resumen", { params: { dias: 30 } })
      .then((r) => setDatos(r.data))
      .catch((e) => setError(mensajeError(e)));
  }, []);

  if (error) return <p role="alert" className="aviso-error">{error}</p>;
  if (!datos) return <p className="text-base text-stone-600">Cargando resumen...</p>;

  const maximo = Math.max(1, ...datos.mas_vendidos.map((p) => p.unidades));
  const hayBajos = datos.productos_stock_bajo > 0;

  return (
    <div className="space-y-6">
      <h2 className="titulo-pagina !mb-0">Resumen de los últimos {datos.dias} días</h2>

      <div className="panel grid divide-y divide-tinta-linea !p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Dato titulo="Ventas" valor={bs(datos.ventas.total)} detalle={`${datos.ventas.cantidad} ventas`} />
        <Dato titulo="Compras" valor={bs(datos.compras.total)} detalle={`${datos.compras.cantidad} compras`} />
        <Dato
          titulo="Productos con stock bajo"
          valor={datos.productos_stock_bajo}
          alerta={hayBajos}
          detalle={
            hayBajos ? (
              <button onClick={() => ir("inventario")} className="font-semibold text-tinta underline underline-offset-2">
                Ver cuáles en Inventario
              </button>
            ) : (
              "Todo tiene stock suficiente"
            )
          }
        />
      </div>

      <div className="panel">
        <h3 className="subtitulo mb-3">Productos más vendidos</h3>
        {datos.mas_vendidos.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-stone-600">Todavía no hay ventas en estos {datos.dias} días.</p>
            <button onClick={() => ir("ventas")} className="btn">
              Registrar una venta
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {datos.mas_vendidos.map((p) => (
              <li key={p.producto}>
                <div className="flex justify-between gap-3 text-base">
                  <span>{p.producto}</span>
                  <span className="font-semibold">{p.unidades} unidades</span>
                </div>
                <div className="mt-1 h-2.5 rounded-[2px] bg-tinta-claro">
                  <div className="h-2.5 rounded-[2px] bg-tinta" style={{ width: `${(p.unidades / maximo) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
