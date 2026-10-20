import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// Caja 3D del producto: la altura crece con el stock y el color avisa si el stock está bajo.
function Caja({ stock, bajo }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.6;
  });
  const alto = Math.min(Math.max(stock / 10, 0.6), 2.4);
  return (
    <mesh ref={ref} position={[0, alto / 2 - 1.2, 0]}>
      <boxGeometry args={[1.8, alto, 1.8]} />
      <meshStandardMaterial color={bajo ? "#D9402B" : "#F8A050"} />
    </mesh>
  );
}

export default function Producto3D({ producto }) {
  const bajo = producto.stock_actual <= producto.stock_minimo;
  return (
    <div className="overflow-hidden rounded-[4px] bg-tinta-oscuro text-white">
      <div className="h-64 w-full">
        <Canvas camera={{ position: [4.2, 3, 4.2], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 6, 3]} intensity={1.2} />
          <Caja stock={producto.stock_actual} bajo={bajo} />
          <gridHelper args={[8, 16, "#7F96B8", "#4D6489"]} position={[0, -1.2, 0]} />
          <OrbitControls enableZoom={false} />
        </Canvas>
      </div>
      <div className="px-4 py-3">
        <p className="font-titulo text-2xl font-semibold leading-tight">{producto.nombre}</p>
        <p className="text-base text-tinta-claro">
          Stock {producto.stock_actual} {producto.unidad_medida} · mínimo {producto.stock_minimo}
        </p>
        {bajo && <p className="mt-1 inline-block rounded-[3px] bg-etiqueta px-2 py-0.5 text-sm font-semibold">Stock bajo</p>}
        <p className="mt-1 text-sm text-tinta-linea">La altura de la caja crece con el stock. Arrastra para girarla.</p>
      </div>
    </div>
  );
}
