import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// Caja 3D del producto: la altura crece con el stock y el color avisa si el stock está bajo.
function Caja({ stock, bajo }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.6;
  });
  const alto = Math.min(Math.max(stock / 10, 0.6), 3.2);
  return (
    <mesh ref={ref} position={[0, alto / 2 - 1.2, 0]}>
      <boxGeometry args={[1.8, alto, 1.8]} />
      <meshStandardMaterial color={bajo ? "#dc2626" : "#b45309"} />
    </mesh>
  );
}

export default function Producto3D({ producto }) {
  const bajo = producto.stock_actual <= producto.stock_minimo;
  return (
    <div className="overflow-hidden rounded-lg bg-slate-900">
      <div className="h-64 w-full">
        <Canvas camera={{ position: [3.5, 2.5, 3.5], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 6, 3]} intensity={1.2} />
          <Caja stock={producto.stock_actual} bajo={bajo} />
          <gridHelper args={[8, 16, "#475569", "#334155"]} position={[0, -1.2, 0]} />
          <OrbitControls enableZoom={false} />
        </Canvas>
      </div>
      <div className="px-3 py-2 text-center text-xs text-slate-300">
        <p className="font-medium text-white">{producto.nombre}</p>
        <p>
          Stock: {producto.stock_actual} · mínimo {producto.stock_minimo} {bajo && "· STOCK BAJO"}
        </p>
        <p className="text-slate-400">Modelo 3D interactivo (arrastra para girar)</p>
      </div>
    </div>
  );
}
