import { bs } from "../api.js";

// Nota de talonario: cantidad, descripción, precio unitario y total, con líneas como en el papel.
// filas = [{ id, cant, desc, unit, quitar }]
export default function Nota({ titulo, filas, vacio, minFilas = 5 }) {
  const libres = Math.max(0, minFilas - filas.length);
  const hoy = new Date().toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="nota">
      <div className="nota-cabecera">
        <h2>{titulo}</h2>
        <span className="text-base text-tinta-claro">{hoy}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="nota-tabla min-w-[30rem]">
          <thead>
            <tr>
              <th className="w-20">Cant.</th>
              <th>Descripción</th>
              <th className="w-32 text-right">P. unit.</th>
              <th className="w-36 text-right">Total</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id}>
                <td>{f.cant}</td>
                <td>{f.desc}</td>
                <td className="text-right">{bs(f.unit)}</td>
                <td className="text-right font-semibold">{bs(f.cant * f.unit)}</td>
                <td className="text-right">
                  <button type="button" className="btn-sec" onClick={f.quitar}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
            {Array.from({ length: libres }).map((_, i) => (
              <tr key={`libre-${i}`}>
                <td></td>
                {i === 0 && filas.length === 0 ? (
                  <td colSpan={2} className="text-stone-500">
                    {vacio}
                  </td>
                ) : (
                  <>
                    <td></td>
                    <td></td>
                  </>
                )}
                <td></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
