import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { View, Preload } from "@react-three/drei";
import Rig from "./Rig";

export const ViewCanvas = () => {
  const [eventSource, setEventSource] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setEventSource(document.body);
  }, []);

  return (
    <Canvas
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 10,
      }}
      camera={{ position: [0, 0, 4.2], fov: 35 }}
      eventSource={eventSource ?? undefined}
      eventPrefix="client"
      gl={{
        stencil: true,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <View.Port />
      </Suspense>
      <Rig intensity={0.6} />
      <Preload all />
    </Canvas>
  );
};

export default ViewCanvas;
