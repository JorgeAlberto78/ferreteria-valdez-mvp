// Iconos de línea sencillos (sin librerías externas)
const RUTAS = {
  resumen: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  productos: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />,
  ventas: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />,
  compras: (
    <>
      <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  inventario: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  proveedores: <path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6" />,
  clientes: <path d="M16 20v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M10 10a4 4 0 100-8 4 4 0 000 8zM20 20v-2a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8" />,
};

export default function Icono({ nombre, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {RUTAS[nombre]}
    </svg>
  );
}
