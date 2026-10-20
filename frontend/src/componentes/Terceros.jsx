import { useEffect, useState } from "react";
import api, { mensajeError } from "../api.js";

// Pantalla genérica para proveedores y clientes (lista + formulario)
function ListaSimple({ titulo, ruta, campos, columnas }) {
  const vacio = Object.fromEntries(campos.map((c) => [c.nombre, ""]));
  const [filas, setFilas] = useState([]);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargar = () => api.get(ruta).then((r) => setFilas(r.data)).catch((e) => setError(mensajeError(e)));
  useEffect(() => {
    cargar();
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const datos = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]));
      await api.post(ruta, datos);
      setForm(vacio);
      setOk("Guardado");
      cargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        <h2 className="mb-3 text-lg font-bold">{titulo}</h2>
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              {columnas.map((c) => (
                <th key={c.nombre} className="th">
                  {c.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filas.map((f) => (
              <tr key={f.id}>
                {columnas.map((c) => (
                  <td key={c.nombre} className="td">
                    {f[c.nombre]}
                  </td>
                ))}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td className="td text-stone-500" colSpan={columnas.length}>
                  Todavía no hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={guardar} className="card space-y-3">
        <h3 className="font-semibold">Agregar</h3>
        {campos.map((c) => (
          <input
            key={c.nombre}
            className="input"
            placeholder={c.etiqueta}
            value={form[c.nombre]}
            onChange={(e) => setForm({ ...form, [c.nombre]: e.target.value })}
            required={c.requerido}
          />
        ))}
        <button className="btn w-full">Guardar</button>
        {ok && <p className="text-sm text-green-700">{ok}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </div>
  );
}

export function Proveedores() {
  const campos = [
    { nombre: "nombre", etiqueta: "Nombre o razón social", requerido: true },
    { nombre: "rubro", etiqueta: "Rubro (cemento, pintura, fierro...)" },
    { nombre: "nit_ci", etiqueta: "NIT o CI" },
    { nombre: "telefono", etiqueta: "Teléfono" },
  ];
  return <ListaSimple titulo="Proveedores" ruta="/proveedores" campos={campos} columnas={campos.map((c) => ({ nombre: c.nombre, etiqueta: c.etiqueta.split(" (")[0] }))} />;
}

export function Clientes() {
  const campos = [
    { nombre: "nombre", etiqueta: "Nombre o razón social", requerido: true },
    { nombre: "nit_ci", etiqueta: "NIT o CI" },
    { nombre: "telefono", etiqueta: "Teléfono" },
  ];
  return <ListaSimple titulo="Clientes" ruta="/clientes" campos={campos} columnas={campos.map((c) => ({ nombre: c.nombre, etiqueta: c.etiqueta }))} />;
}
