import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

interface RigProps {
  intensity?: number;
}

export const Rig = ({ intensity = 0.5 }: RigProps) => {
  return useFrame((state, delta) => {
    // Smooth dampening to pointer coordinates
    easing.damp3(
      state.camera.position,
      [
        state.pointer.x * intensity,
        0.5 + state.pointer.y * (intensity * 0.4),
        3.8 - Math.abs(state.pointer.x * 0.2),
      ],
      0.8,
      delta
    );
    state.camera.lookAt(0, 0.2, 0);
  });
};

export default Rig;
