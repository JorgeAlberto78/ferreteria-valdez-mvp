// Paleta tomada del logo de la ferretería: azul pizarra y naranja. El rojo queda reservado para avisos.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cemento: "#E4E7EA",
        carbon: "#1D2128",
        tinta: { DEFAULT: "#3F587A", oscuro: "#2B3F5C", claro: "#E8EDF4", linea: "#B4C2D6" },
        obra: { DEFAULT: "#F8A050", oscuro: "#D9823A" },
        etiqueta: "#C8321E",
        cal: "#2E7D4F",
        // nombre anterior, para que ningún componente viejo quede sin color
        marca: { DEFAULT: "#3F587A", oscuro: "#2B3F5C", claro: "#E8EDF4" },
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        titulo: ['"Barlow Condensed"', "Barlow", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
