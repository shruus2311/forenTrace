import React, { useState } from 'react';
import {
  FolderGit2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Terminal,
  Activity,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { SeverityBadge, IntegrityBadge } from '../design-system/Badge';
import { PROVENANCE_GRAPH_NODES } from '../data/mockForensicsData';
import { ProvenanceNode } from '../types/forensics';
import { cyberAudio } from '../lib/audio';
import { useToast } from '../design-system/Toast';

export const ProvenanceGraphView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedNode, setSelectedNode] = useState<ProvenanceNode>(PROVENANCE_GRAPH_NODES[0]);

  const handleSelectNode = (node: ProvenanceNode) => {
    setSelectedNode(node);
    cyberAudio.playClick(node.severity === 'CRITICAL' ? 620 : 880, 0.04);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="font-display font-bold text-2xl text-white tracking-wide flex items-center gap-2.5">
            <FolderGit2 className="w-5 h-5 text-[#818CF8]" />
            <span>EVIDENCE LINEAGE & PROVENANCE GRAPH</span>
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Reconstructed parent-child execution vectors, network conduits, and exfiltration pathways.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="technical"
            size="sm"
            soundType="scan"
            onClick={() => {
              cyberAudio.playScan(740);
              showToast({
                type: 'info',
                title: 'Provenance Graph Re-indexed',
                description: 'Correlated 5 nodes with zero circular parent dependencies.',
              });
            }}
          >
            Re-calculate Lineage
          </Button>
        </div>
      </div>

      {/* Main Interactive Provenance Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Visual Graph Board */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-[#0B0E17] border border-white/10 shadow-2xl relative min-h-[460px] flex flex-col justify-between overflow-hidden">
          {/* Subtle Grid backdrop */}
          <div className="absolute inset-0 bg-cyber-grid opacity-30 pointer-events-none" />

          {/* Top HUD */}
          <div className="relative z-10 flex items-center justify-between font-mono text-xs text-slate-400 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#818CF8] animate-pulse" />
              <span>CHAIN ID: PROV-HELIOS-01 // 5 NODES</span>
            </div>
            <span className="text-emerald-400">STATUS: RECONSTRUCTED</span>
          </div>

          {/* Interactive Flow Nodes */}
          <div className="relative z-10 my-8 space-y-4">
            {PROVENANCE_GRAPH_NODES.map((node, index) => {
              const isSelected = selectedNode.id === node.id;
              const hasConnection = node.connections.length > 0;

              return (
                <div key={node.id} className="relative">
                  <div
                    onClick={() => handleSelectNode(node)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#121622] border-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.15)] translate-x-2'
                        : 'bg-[#0E121B] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[#00F2FE] font-bold">
                          [{node.id}]
                        </span>
                        <span className="font-sans font-semibold text-sm text-white">
                          {node.label}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-slate-300">
                          {node.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{node.timestamp}</span>
                        <SeverityBadge severity={node.severity} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Flow Arrow to next node */}
                  {hasConnection && (
                    <div className="flex justify-center my-1 text-[#818CF8]/60">
                      <ArrowRight className="w-4 h-4 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Telemetry Legend */}
          <div className="relative z-10 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-slate-500">
            <div className="flex items-center gap-4">
              <span>● SOURCE (EXPLOIT)</span>
              <span>● PROCESS (STAGER)</span>
              <span>● NETWORK (C2)</span>
              <span>● EXFILTRATION</span>
            </div>
            <span>RFC 3161 TIME-ATTESTED</span>
          </div>
        </div>

        {/* Right: Detailed Node Inspector */}
        <div className="lg:col-span-4 rounded-2xl bg-[#0E121B] border border-cyan-500/30 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs">
            <span className="text-[#00F2FE] font-bold">PROVENANCE NODE // {selectedNode.id}</span>
            <SeverityBadge severity={selectedNode.severity} size="sm" />
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <div className="text-slate-500 text-[10px]">EXECUTION EVENT:</div>
              <div className="text-white font-bold text-sm mt-0.5">{selectedNode.label}</div>
            </div>

            <div>
              <div className="text-slate-500 text-[10px]">EXACT TIMELAPSE REGISTER:</div>
              <div className="text-cyan-300 mt-0.5 font-bold">{selectedNode.timestamp} UTC</div>
            </div>

            <div>
              <div className="text-slate-500 text-[10px]">CATEGORY / VECTOR:</div>
              <div className="text-white mt-0.5">{selectedNode.type}</div>
            </div>

            <div>
              <div className="text-slate-500 text-[10px]">FORENSIC TELEMETRY FINDING:</div>
              <p className="mt-1 p-3 rounded bg-black/60 border border-white/5 text-slate-300 font-sans text-xs leading-relaxed">
                {selectedNode.details}
              </p>
            </div>

            <div>
              <div className="text-slate-500 text-[10px]">CHILD CONNECTIONS:</div>
              <div className="mt-1 flex gap-2">
                {selectedNode.connections.length > 0 ? (
                  selectedNode.connections.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-1 rounded bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30 font-bold"
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-xs">TERMINAL NODE (EXFILTRATION HALTED)</span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => {
                  cyberAudio.playScan(680);
                  showToast({
                    type: 'success',
                    title: 'Node Evidence Exported',
                    description: `Extracted forensic snapshot for ${selectedNode.id}`,
                  });
                }}
              >
                Export Forensic Sub-Graph
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
