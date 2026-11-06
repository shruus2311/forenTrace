import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Line, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';
import { cyberAudio } from '../../lib/audio';

interface NodeData {
  id: string;
  label: string;
  category: string;
  position: [number, number, number];
  color: string;
  severity: string;
}

const NODES: NodeData[] = [
  {
    id: 'n-ram',
    label: 'RAM: DC01_PHYSICAL_DUMP',
    category: 'VOLATILE_MEMORY',
    position: [-1.8, 0.8, 0.4],
    color: '#00F2FE',
    severity: 'HIGH',
  },
  {
    id: 'n-pcap',
    label: 'PCAP: TLS1.3_BEACON_FLOW',
    category: 'NETWORK_EGRESS',
    position: [1.7, 0.9, -0.3],
    color: '#818CF8',
    severity: 'CRITICAL',
  },
  {
    id: 'n-disk',
    label: 'DISK: MFT_$LogFile_REPLAY',
    category: 'STORAGE_BITSTREAM',
    position: [-1.4, -0.9, 0.5],
    color: '#10B981',
    severity: 'MEDIUM',
  },
  {
    id: 'n-lsass',
    label: 'PROC: LSASS_HOLLOWED_THREAD',
    category: 'INJECTION_TARGET',
    position: [1.5, -0.8, 0.2],
    color: '#EF4444',
    severity: 'CRITICAL',
  },
  {
    id: 'n-evtx',
    label: 'LOG: AUDIT_LOG_CLEAR_1102',
    category: 'ANTI_FORENSICS',
    position: [0.0, 1.6, -0.4],
    color: '#F59E0B',
    severity: 'HIGH',
  },
];

const EvidenceScene: React.FC<{
  onSelectNode: (node: NodeData | null) => void;
  selectedId: string | null;
}> = ({ onSelectNode, selectedId }) => {
  const coreRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useFrame((state, delta) => {
    // Parallax camera dampening
    easing.damp3(
      state.camera.position,
      [state.pointer.x * 0.7, state.pointer.y * 0.5, 3.8],
      0.6,
      delta
    );
    state.camera.lookAt(0, 0, 0);

    // Subtle gentle rotation of central core & outer rings
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.15;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.2;
      ringRef.current.rotation.x += delta * 0.1;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 4]} intensity={2.0} color="#00F2FE" />
      <directionalLight position={[-4, -5, -4]} intensity={1.5} color="#818CF8" />
      <pointLight position={[0, 0, 0]} intensity={2.5} color="#00F2FE" distance={4} />

      {/* Central Evidence Nucleus */}
      <group ref={coreRef}>
        <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.3}>
          {/* Wireframe Matrix */}
          <mesh>
            <icosahedronGeometry args={[0.7, 1]} />
            <meshStandardMaterial
              color="#00F2FE"
              wireframe
              emissive="#00F2FE"
              emissiveIntensity={0.5}
            />
          </mesh>

          {/* Refractive Inner Core */}
          <mesh scale={0.65}>
            <dodecahedronGeometry args={[0.7, 0]} />
            <MeshDistortMaterial
              color="#07192C"
              emissive="#0B233D"
              roughness={0.1}
              metalness={0.9}
              distort={0.25}
              speed={1.5}
            />
          </mesh>

          {/* Singularity Center */}
          <mesh scale={0.25}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial color="#ffffff" wireframe />
          </mesh>
        </Float>
      </group>

      {/* Subtle Orbital Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.3, 0.008, 16, 80]} />
        <meshBasicMaterial color="#818CF8" wireframe opacity={0.6} transparent />
      </mesh>

      {/* Connected Evidence Nodes & Fine Hairline Connections */}
      {NODES.map((node) => {
        const isSelected = selectedId === node.id;
        const isHovered = hoveredId === node.id;
        const scale = isSelected ? 1.4 : isHovered ? 1.25 : 1.0;

        return (
          <group key={node.id}>
            {/* Fine Connection Line from Center [0,0,0] to Node */}
            <Line
              points={[[0, 0, 0], node.position]}
              color={isSelected ? '#00F2FE' : '#818CF8'}
              lineWidth={isSelected ? 1.8 : 0.8}
              transparent
              opacity={isSelected ? 0.9 : 0.35}
            />

            {/* Orbiting Evidence Node Mesh */}
            <group
              position={node.position}
              scale={scale}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(node.id);
                cyberAudio.playClick(920, 0.03);
              }}
              onPointerOut={() => {
                setHoveredId(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node);
                cyberAudio.playScan(740);
              }}
            >
              {/* Outer Wireframe Shell */}
              <mesh>
                <octahedronGeometry args={[0.18, 0]} />
                <meshStandardMaterial
                  color={node.color}
                  wireframe
                  emissive={node.color}
                  emissiveIntensity={isSelected || isHovered ? 1.8 : 0.7}
                />
              </mesh>

              {/* Inner Glowing Core */}
              <mesh scale={0.6}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={node.color} />
              </mesh>
            </group>
          </group>
        );
      })}
    </>
  );
};

export const SignatureEvidenceGraph: React.FC<{
  onSelectNodeDetail?: (node: NodeData) => void;
}> = ({ onSelectNodeDetail }) => {
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(NODES[0]);
  const [use3D, setUse3D] = useState(true);

  const handleSelect = (node: NodeData | null) => {
    setSelectedNode(node);
    if (node && onSelectNodeDetail) {
      onSelectNodeDetail(node);
    }
  };

  return (
    <div className="relative w-full h-[360px] md:h-[420px] rounded-2xl bg-[#090C14] border border-white/10 overflow-hidden shadow-2xl">
      {/* View Mode Toggle: 3D vs 2D Schematic */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => {
            setUse3D(!use3D);
            cyberAudio.playClick(600, 0.04);
          }}
          className="px-2.5 py-1 rounded bg-[#111622]/90 border border-white/10 hover:border-white/25 text-[10px] font-mono text-slate-300 transition-colors cursor-pointer"
        >
          MODE: {use3D ? '3D MATRIX' : '2D SCHEMATIC'}
        </button>
      </div>

      {/* Top Left Telemetry HUD */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00F2FE] animate-pulse" />
          <span className="font-mono text-[10px] tracking-wider text-cyan-300 uppercase">
            EVIDENCE PROVENANCE TOPOLOGY
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-400 mt-1">
          NODES: 5 CORRELATED // ZERO COLLISION
        </div>
      </div>

      {/* 3D Canvas Scene */}
      {use3D ? (
        <Canvas
          camera={{ position: [0, 0, 3.8], fov: 38 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
        >
          <EvidenceScene
            onSelectNode={handleSelect}
            selectedId={selectedNode?.id ?? null}
          />
        </Canvas>
      ) : (
        /* 2D High-Density Accessible Fallback */
        <div className="w-full h-full flex flex-col justify-center items-center p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl">
            {NODES.map((n) => (
              <div
                key={n.id}
                onClick={() => handleSelect(n)}
                className={`p-3 rounded-lg border font-mono text-xs cursor-pointer transition-colors ${
                  selectedNode?.id === n.id
                    ? 'bg-[#00F2FE]/10 border-[#00F2FE] text-white'
                    : 'bg-[#111622] border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="text-[10px] text-slate-400">{n.category}</div>
                <div className="font-semibold text-xs mt-1 truncate">{n.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Selected Node Inspector Card */}
      {selectedNode && (
        <div className="absolute bottom-4 inset-x-4 z-20 p-3 rounded-xl bg-[#0B0F17]/90 backdrop-blur-md border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedNode.color }}
            />
            <div>
              <span className="text-white font-semibold">{selectedNode.label}</span>
              <span className="text-slate-400 ml-2 text-[10px]">[{selectedNode.category}]</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400">SEVERITY:</span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold"
              style={{
                backgroundColor: `${selectedNode.color}22`,
                color: selectedNode.color,
                border: `1px solid ${selectedNode.color}44`,
              }}
            >
              {selectedNode.severity}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
