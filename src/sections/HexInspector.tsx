import { useState } from "react";
import { cyberAudio } from "@/lib/audio";
import { Binary, Eye, Cpu, ShieldAlert, Zap, RefreshCw } from "lucide-react";

interface HexRow {
  offset: string;
  bytes: string[];
  ascii: string;
  isAnomaly: boolean;
  anomalyByteIndex?: number;
}

const INITIAL_HEX_DATA: HexRow[] = [
  {
    offset: "0x7FFF5FA0",
    bytes: ["48", "83", "EC", "28", "48", "8D", "0D", "51", "0F", "00", "00", "E8", "3A", "02", "00", "00"],
    ascii: "H..(.H..Q....:...",
    isAnomaly: false,
  },
  {
    offset: "0x7FFF5FB0",
    bytes: ["90", "90", "90", "31", "C0", "50", "68", "2F", "2F", "73", "68", "68", "2F", "62", "69", "6E"],
    ascii: "...1.Ph//shh/bin",
    isAnomaly: true,
    anomalyByteIndex: 3,
  },
  {
    offset: "0x7FFF5FC0",
    bytes: ["89", "E3", "50", "53", "89", "E1", "31", "D2", "B0", "0B", "CD", "80", "90", "90", "90", "90"],
    ascii: "..PS..1.........",
    isAnomaly: true,
    anomalyByteIndex: 0,
  },
  {
    offset: "0x7FFF5FD0",
    bytes: ["48", "89", "5C", "24", "20", "55", "56", "57", "41", "54", "41", "55", "41", "56", "41", "57"],
    ascii: "H.\\$ UVWATAUAVAW",
    isAnomaly: false,
  },
  {
    offset: "0x7FFF5FE0",
    bytes: ["48", "83", "EC", "70", "48", "8B", "05", "11", "24", "02", "00", "48", "33", "C4", "48", "89"],
    ascii: "H..pH...$..H3.H.",
    isAnomaly: false,
  },
];

export const HexInspector = () => {
  const [hexRows, setHexRows] = useState<HexRow[]>(INITIAL_HEX_DATA);
  const [selectedByte, setSelectedByte] = useState<{ offset: string; byte: string; idx: number } | null>({
    offset: "0x7FFF5FB0",
    byte: "31",
    idx: 3,
  });
  const [isScanning, setIsScanning] = useState(false);

  const handleByteClick = (offset: string, byte: string, idx: number) => {
    setSelectedByte({ offset, byte, idx });
    cyberAudio.playClick(parseInt(byte, 16) * 10 + 200, 0.04);
  };

  const reScanMemory = () => {
    setIsScanning(true);
    cyberAudio.playScan(520);
    setTimeout(() => {
      setIsScanning(false);
      cyberAudio.playClick(1040, 0.08);
    }, 600);
  };

  return (
    <section id="hex-inspector" className="relative z-20 py-24 px-4 md:px-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-10 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-[#00F2FE] font-mono text-xs tracking-widest uppercase mb-2">
            <Binary className="w-3.5 h-3.5" />
            <span>SECTION 03 // LOW-LEVEL DISSECTION</span>
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
            VOLATILE MEMORY HEX SCANNER
          </h2>
        </div>

        <button
          onClick={reScanMemory}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-950/60 border border-[#00F2FE]/40 hover:bg-[#00F2FE] hover:text-black text-[#00F2FE] font-mono text-xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
          <span>RUN NEURAL HEURISTICS</span>
        </button>
      </div>

      {/* Main Terminal Window */}
      <div className="mt-8 rounded-2xl glass-surface border border-white/10 overflow-hidden shadow-2xl">
        {/* Terminal Header Bar */}
        <div className="bg-black/60 px-5 py-3 border-b border-white/10 flex items-center justify-between font-mono text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-3 text-white font-semibold">HEAP_DUMP_0x7FFF5FA0.bin [LIVE]</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-emerald-400">ENTROPY: 7.91 (HIGH)</span>
            <span className="text-[#00F2FE]">ARCH: X86_64</span>
          </div>
        </div>

        {/* Hex Grid Table */}
        <div className="p-6 overflow-x-auto font-mono text-xs md:text-sm">
          <div className="min-w-[640px] space-y-2">
            {hexRows.map((row) => (
              <div
                key={row.offset}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  row.isAnomaly
                    ? "bg-red-950/20 border border-red-500/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                {/* Offset */}
                <span className="text-[#00F2FE] font-bold w-28 shrink-0">{row.offset}</span>

                {/* 16 Bytes */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 px-4">
                  {row.bytes.map((byte, idx) => {
                    const isSelected =
                      selectedByte?.offset === row.offset && selectedByte?.idx === idx;
                    const isMalicious = row.isAnomaly && idx >= (row.anomalyByteIndex ?? 0);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleByteClick(row.offset, byte, idx)}
                        className={`w-6 h-6 flex items-center justify-center rounded text-[11px] font-mono transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#00F2FE] text-black font-extrabold shadow-[0_0_8px_#00F2FE]"
                            : isMalicious
                            ? "text-red-400 hover:bg-red-900/40"
                            : "text-slate-300 hover:bg-cyan-950/60 hover:text-[#00F2FE]"
                        }`}
                      >
                        {byte}
                      </button>
                    );
                  })}
                </div>

                {/* ASCII String View */}
                <span className="text-slate-400 tracking-widest font-mono text-xs w-32 text-right shrink-0">
                  |{row.ascii}|
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Inspector Bottom Bar Details */}
        {selectedByte && (
          <div className="bg-black/70 p-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1 rounded bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/40 font-bold">
                OFFSET: {selectedByte.offset} + 0x{selectedByte.idx.toString(16).toUpperCase()}
              </div>
              <div className="text-slate-300">
                VALUE: <span className="text-white font-bold">0x{selectedByte.byte}</span> (DEC:{" "}
                {parseInt(selectedByte.byte, 16)})
              </div>
            </div>

            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
              <span>INSTRUCTION: XOR EAX, EAX (SHELLCODE ZEROING REGISTER)</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HexInspector;
