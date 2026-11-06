import { useState } from "react";
import { cyberAudio } from "@/lib/audio";
import { ShieldCheck, Key, Lock, CheckCircle2, ArrowRightLeft, FileCheck } from "lucide-react";

interface CustodyNode {
  nodeId: string;
  timestamp: string;
  actor: string;
  action: string;
  signature: string;
  status: "VERIFIED" | "IMMUTABLE";
}

const CUSTODY_LOG: CustodyNode[] = [
  {
    nodeId: "BLOCK-001",
    timestamp: "2026-11-06T02:14:09.510Z",
    actor: "EDR_DAEMON://AGENT_FA9",
    action: "PHYSICAL_RAM_IMAGE_SEALED",
    signature: "0x89abf...71cd2",
    status: "IMMUTABLE",
  },
  {
    nodeId: "BLOCK-002",
    timestamp: "2026-11-06T02:14:10.120Z",
    actor: "FORENSIC_OFFICER://ID_4811",
    action: "EVIDENCE_TRANSFERRED_TO_COLD_VAULT",
    signature: "0x34fe1...99bb7",
    status: "VERIFIED",
  },
  {
    nodeId: "BLOCK-003",
    timestamp: "2026-11-06T02:14:12.890Z",
    actor: "NEURAL_DECOMPILER://AUTO_LAB",
    action: "HASH_COLLISION_VERIFICATION_PASS",
    signature: "0x12dc0...aa83e",
    status: "VERIFIED",
  },
];

export const ChainOfCustody = () => {
  const [signedCount, setSignedCount] = useState(CUSTODY_LOG.length);
  const [isSigning, setIsSigning] = useState(false);

  const handleSimulateSign = () => {
    setIsSigning(true);
    cyberAudio.playScan(780);
    setTimeout(() => {
      setSignedCount((prev) => prev + 1);
      setIsSigning(false);
      cyberAudio.playClick(1200, 0.09);
    }, 500);
  };

  return (
    <section id="chain-of-custody" className="relative z-20 py-24 px-4 md:px-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-12 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-widest uppercase mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>SECTION 04 // CRYPTOGRAPHIC CUSTODY</span>
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
            CHAIN OF CUSTODY LEDGER
          </h2>
        </div>
        <p className="text-slate-400 font-sans text-xs sm:text-sm max-w-md">
          Immutable cryptographic verification guarantees evidentiary admissibility in criminal and civil court proceedings.
        </p>
      </div>

      {/* Grid: Custody Nodes */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {CUSTODY_LOG.map((node) => (
          <div
            key={node.nodeId}
            className="p-6 rounded-2xl glass-surface border border-emerald-500/20 hover:border-emerald-500/50 transition-all shadow-xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs">
              <span className="text-emerald-400 font-bold">{node.nodeId}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                {node.status}
              </span>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div>
                <div className="text-slate-500 text-[10px]">CUSTODIAN / ACTOR:</div>
                <div className="text-white font-semibold mt-0.5">{node.actor}</div>
              </div>

              <div>
                <div className="text-slate-500 text-[10px]">VERIFIED ACTION:</div>
                <div className="text-cyan-300 font-medium mt-0.5">{node.action}</div>
              </div>

              <div>
                <div className="text-slate-500 text-[10px]">ED25519 SIGNATURE:</div>
                <div className="text-slate-400 text-[11px] bg-black/60 p-2 rounded border border-white/5 truncate mt-1">
                  {node.signature}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-1.5 text-emerald-400 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SHA-256 ZERO TAMPER CONFIRMED</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Verification Banner */}
      <div className="mt-8 p-6 rounded-2xl glass-panel-cyan flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-[#00F2FE]/40 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6 text-[#00F2FE]" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-base">
              COURT-READY FORENSIC ATTESTATION CERTIFICATE
            </div>
            <div className="font-mono text-xs text-slate-300 mt-0.5">
              Current ledger depth: {signedCount} verified custodial blocks. Ed25519 hardware key active.
            </div>
          </div>
        </div>

        <button
          onClick={handleSimulateSign}
          disabled={isSigning}
          className="px-6 py-3 rounded-xl bg-[#00F2FE] hover:bg-cyan-300 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
        >
          <FileCheck className="w-4 h-4" />
          <span>{isSigning ? "SIGNING BLOCK..." : "AFFIX INVESTIGATOR SIGNATURE"}</span>
        </button>
      </div>
    </section>
  );
};

export default ChainOfCustody;
