import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export type ForensicModule = "MEM_CORE" | "PACKET_STREAM" | "CRYPTO_VAULT";

interface ForensicEvidenceCoreProps {
  activeModule: ForensicModule;
  scale?: number;
}

export const ForensicEvidenceCore = ({
  activeModule,
  scale = 1,
}: ForensicEvidenceCoreProps) => {
  const masterGroup = useRef<THREE.Group>(null);
  const memGroup = useRef<THREE.Group>(null);
  const packetGroup = useRef<THREE.Group>(null);
  const cryptoGroup = useRef<THREE.Group>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  // Smooth entrance & transition when activeModule changes
  useGSAP(() => {
    if (!masterGroup.current) return;

    // Reset scales and positions
    const targets = [
      { ref: memGroup.current, active: activeModule === "MEM_CORE" },
      { ref: packetGroup.current, active: activeModule === "PACKET_STREAM" },
      { ref: cryptoGroup.current, active: activeModule === "CRYPTO_VAULT" },
    ];

    targets.forEach(({ ref, active }) => {
      if (!ref) return;
      if (active) {
        gsap.to(ref.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.8,
          ease: "back.out(1.4)",
        });
        gsap.to(ref.position, {
          y: 0,
          duration: 0.7,
          ease: "power2.out",
        });
      } else {
        gsap.to(ref.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.5,
          ease: "power2.in",
        });
        gsap.to(ref.position, {
          y: 1.5,
          duration: 0.5,
          ease: "power2.in",
        });
      }
    });
  }, [activeModule]);

  // Dynamic continuous rotation & telemetry spin in render loop
  useFrame((_, delta) => {
    if (ring1.current) {
      ring1.current.rotation.x += delta * 0.4;
      ring1.current.rotation.y += delta * 0.6;
    }
    if (ring2.current) {
      ring2.current.rotation.y -= delta * 0.5;
      ring2.current.rotation.z += delta * 0.3;
    }
    if (memGroup.current && activeModule === "MEM_CORE") {
      memGroup.current.rotation.y += delta * 0.3;
    }
    if (packetGroup.current && activeModule === "PACKET_STREAM") {
      packetGroup.current.rotation.x += delta * 0.4;
      packetGroup.current.rotation.y += delta * 0.5;
    }
    if (cryptoGroup.current && activeModule === "CRYPTO_VAULT") {
      cryptoGroup.current.rotation.y += delta * 0.7;
    }
  });

  return (
    <group ref={masterGroup} scale={scale} position={[0, 0, 0]}>
      {/* Studio Forensic Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={2.5} color="#00F2FE" />
      <directionalLight position={[-5, -4, -5]} intensity={1.8} color="#10B981" />
      <pointLight position={[0, 0, 0]} intensity={3} color="#00F2FE" distance={5} />

      {/* Outer Telemetry Orbital Rings */}
      <mesh ref={ring1}>
        <torusGeometry args={[1.7, 0.015, 16, 100]} />
        <meshStandardMaterial
          color="#00F2FE"
          emissive="#00F2FE"
          emissiveIntensity={1.2}
          wireframe
        />
      </mesh>

      <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.9, 0.012, 16, 100]} />
        <meshStandardMaterial
          color="#10B981"
          emissive="#10B981"
          emissiveIntensity={0.8}
          wireframe
        />
      </mesh>

      {/* MODULE 1: MEM_CORE (Memory Dump Reconstruction) */}
      <group ref={memGroup}>
        <Float speed={2} rotationIntensity={0.8} floatIntensity={0.5}>
          {/* Wireframe outer lattice */}
          <mesh>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial
              color="#00F2FE"
              wireframe
              emissive="#00F2FE"
              emissiveIntensity={0.6}
            />
          </mesh>

          {/* Organic Pulsing Nucleus */}
          <mesh>
            <sphereGeometry args={[0.65, 32, 32]} />
            <MeshDistortMaterial
              color="#00F2FE"
              emissive="#053040"
              roughness={0.15}
              metalness={0.9}
              distort={0.4}
              speed={3}
            />
          </mesh>

          {/* Core Singularity point */}
          <mesh>
            <octahedronGeometry args={[0.25, 0]} />
            <meshBasicMaterial color="#ffffff" wireframe />
          </mesh>
        </Float>
      </group>

      {/* MODULE 2: PACKET_STREAM (Encrypted Network Conduit) */}
      <group ref={packetGroup} scale={[0, 0, 0]}>
        <Float speed={2.5} rotationIntensity={1} floatIntensity={0.8}>
          <mesh>
            <torusKnotGeometry args={[0.7, 0.22, 128, 32, 2, 3]} />
            <MeshDistortMaterial
              color="#10B981"
              emissive="#042617"
              roughness={0.1}
              metalness={0.95}
              distort={0.25}
              speed={2}
            />
          </mesh>

          {/* Wireframe Conduit Shell */}
          <mesh scale={1.12}>
            <torusKnotGeometry args={[0.7, 0.22, 64, 16, 2, 3]} />
            <meshStandardMaterial
              color="#10B981"
              wireframe
              emissive="#10B981"
              emissiveIntensity={0.8}
            />
          </mesh>
        </Float>
      </group>

      {/* MODULE 3: CRYPTO_VAULT (Anomalous Signature Crystal) */}
      <group ref={cryptoGroup} scale={[0, 0, 0]}>
        <Float speed={3} rotationIntensity={1.2} floatIntensity={0.6}>
          {/* Crystalline Anomaly Shell */}
          <mesh>
            <dodecahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial
              color="#FF2E54"
              emissive="#4a0410"
              roughness={0.1}
              metalness={0.9}
              wireframe={false}
            />
          </mesh>

          {/* Wireframe Alert Cage */}
          <mesh scale={1.15}>
            <dodecahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial
              color="#FF2E54"
              wireframe
              emissive="#FF2E54"
              emissiveIntensity={1.5}
            />
          </mesh>

          {/* Inner Crystal Core */}
          <mesh scale={0.5}>
            <octahedronGeometry args={[0.8, 0]} />
            <meshBasicMaterial color="#ffffff" wireframe />
          </mesh>
        </Float>
      </group>
    </group>
  );
};

export default ForensicEvidenceCore;
