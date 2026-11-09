import React, { useState } from 'react';
import {
  Binary,
  Search,
  ShieldAlert,
  Cpu,
  RefreshCw,
  Terminal,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { cyberAudio } from '../lib/audio';
import { useToast } from '../design-system/Toast';

interface HexRow {
  offset: string;
  bytes: string[];
  ascii: string;
  isAnomaly: boolean;
  anomalyByteIndex?: number;
}

const HEX_DATASET: HexRow[] = [
  {
    offset: '0x7FFF5FA0',
    bytes: ['48', '83', 'EC', '28', '48', '8D', '0D', '51', '0F', '00', '00', 'E8', '3A', '02', '00', '00'],
    ascii: 'H..(.H..Q....:...',
    isAnomaly: false,
  },
  {
    offset: '0x7FFF5FB0',
    bytes: ['90', '90', '90', '31', 'C0', '50', '68', '2F', '2F', '73', '68', '68', '2F', '62', '69', '6E'],
    ascii: '...1.Ph//shh/bin',
    isAnomaly: true,
    anomalyByteIndex: 3,
  },
  {
    offset: '0x7FFF5FC0',
    bytes: ['89', 'E3', '50', '53', '89', 'E1', '31', 'D2', 'B0', '0B', 'CD', '80', '90', '90', '90', '90'],
    ascii: '..PS..1.........',
    isAnomaly: true,
    anomalyByteIndex: 0,
  },
  {
    offset: '0x7FFF5FD0',
    bytes: ['48', '89', '5C', '24', '20', '55', '56', '57', '41', '54', '41', '55', '41', '56', '41', '57'],
    ascii: 'H.\\$ UVWATAUAVAW',
    isAnomaly: false,
  },
  {
    offset: '0x7FFF5FE0',
    bytes: ['48', '83', 'EC', '70', '48', '8B', '05', '11', '24', '02', '00', '48', '33', 'C4', '48', '89'],
    ascii: 'H..pH...$..H3.H.',
    isAnomaly: false,
  },
  {
    offset: '0x7FFF5FF0',
    bytes: ['84', '24', '80', '00', '00', '00', '48', '8D', '4C', '24', '40', 'E8', '99', 'FD', 'FF', 'FF'],
    ascii: '.$....H.L$@.....',
    isAnomaly: false,
  },
];

export const HexAnalyzerView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedByte, setSelectedByte] = useState<{
    offset: string;
    byte: string;
    idx: number;
  }>({
    offset: '0x7FFF5FB0',
    byte: '31',
    idx: 3,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleByteSelect = (offset: string, byte: string, idx: number) => {
    setSelectedByte({ offset, byte, idx });
    cyberAudio.playClick(parseInt(byte, 16) * 10 + 200, 0.04);
  };

  const handleRunYara = () => {
    setIsScanning(true);
    cyberAudio.playScan(540);
    showToast({
      type: 'info',
      title: 'Neural YARA Scan Executing',
      description: 'Evaluating x86_64 unbacked shellcode signatures against live VAD memory...',
    });

    setTimeout(() => {
      setIsScanning(false);
      cyberAudio.playClick(1080, 0.08);
      showToast({
        type: 'warning',
        title: 'YARA Match: CobaltStrike_Beacon_Stager',
        description: 'Match confidence: 99.4% at offset 0x7FFF5FB0.',
      });
    }, 1100);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <Binary className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>MEMORY & PACKET HEX DISSECTOR</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Raw kernel dump byte inspector with neural entropy evaluation and ASM disassembler.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunYara}
            disabled={isScanning}
            icon={<Cpu className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />}
          >
            {isScanning ? 'Scanning...' : 'Execute YARA Heuristics'}
          </Button>
        </div>
      </div>

      {/* Hex Workstation Terminal Window */}
      <div className="rounded-2xl bg-white dark:bg-[#171B22] border border-slate-200 dark:border-[#303743] shadow-sm overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-slate-50 dark:bg-[#111318] px-5 py-3 border-b border-slate-200 dark:border-[#303743] flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-600 dark:text-[#9AA4B2]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B74D55] dark:bg-[#C66B70] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#A9772D] dark:bg-[#C69A54] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#337D5C] dark:bg-[#4D9B78] inline-block" />
            <span className="ml-2 text-slate-900 dark:text-white font-semibold">
              TARGET: DC01_VAD_0x7FFF5FA0 [VAD_PAGE_EXECUTE_READWRITE]
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#B74D55] dark:text-[#C66B70] font-bold">● ENTROPY: 7.91 (SHELLCODE OBFS)</span>
            <span className="text-[#416F9E] dark:text-[#648DBB]">ARCH: AMD64</span>
            <span className="text-[#337D5C] dark:text-[#4D9B78]">OFFSET: 0x0000 - 0x0060</span>
          </div>
        </div>

        {/* Search Offset Bar */}
        <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-[#141820] border-b border-slate-200 dark:border-[#303743]/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#416F9E] dark:text-[#648DBB]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hex string (e.g., '31 C0' or '/bin')..."
              className="bg-transparent border-none outline-none text-slate-900 dark:text-white font-mono text-xs w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
            SHOWING 6 CADENCES (96 BYTES)
          </div>
        </div>

        {/* Hex Grid Table */}
        <div className="p-6 overflow-x-auto font-mono text-xs md:text-sm">
          <div className="min-w-[680px] space-y-1.5">
            {HEX_DATASET.map((row) => (
              <div
                key={row.offset}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  row.isAnomaly
                    ? 'bg-[#FDF0F1] dark:bg-[#2C181A] border border-[#B74D55]/30 dark:border-[#C66B70]/40'
                    : 'hover:bg-slate-100 dark:hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                {/* Offset Register */}
                <span className="text-[#416F9E] dark:text-[#648DBB] font-bold w-28 shrink-0">{row.offset}</span>

                {/* 16 Hex Bytes */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 px-4">
                  {row.bytes.map((byte, idx) => {
                    const isSelected =
                      selectedByte?.offset === row.offset && selectedByte?.idx === idx;
                    const isMalicious = row.isAnomaly && idx >= (row.anomalyByteIndex ?? 0);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleByteSelect(row.offset, byte, idx)}
                        className={`w-6 h-6 flex items-center justify-center rounded text-[11px] font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#416F9E] dark:bg-[#648DBB] text-white dark:text-[#111318] font-extrabold shadow-sm'
                            : isMalicious
                            ? 'text-[#B74D55] dark:text-[#C66B70] hover:bg-[#FCE2E4] dark:hover:bg-[#3D1E22] font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1D232C] hover:text-[#416F9E] dark:hover:text-[#648DBB]'
                        }`}
                      >
                        {byte}
                      </button>
                    );
                  })}
                </div>

                {/* ASCII String View */}
                <span className="text-slate-500 dark:text-slate-400 tracking-widest font-mono text-xs w-36 text-right shrink-0">
                  |{row.ascii}|
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Byte Inspection Footer Bar */}
        {selectedByte && (
          <div className="bg-slate-50 dark:bg-[#111318] p-4 border-t border-slate-200 dark:border-[#303743] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-4">
              <div className="px-2.5 py-1 rounded-md bg-[#EBF2F9] dark:bg-[#1A2838] text-[#416F9E] dark:text-[#648DBB] border border-[#416F9E]/30 dark:border-[#648DBB]/40 font-bold">
                OFFSET: {selectedByte.offset} + 0x{selectedByte.idx.toString(16).toUpperCase()}
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                VALUE: <span className="text-slate-900 dark:text-white font-bold">0x{selectedByte.byte}</span> (DEC:{' '}
                {parseInt(selectedByte.byte, 16)})
              </div>
            </div>

            <div className="flex items-center gap-2 text-[#B74D55] dark:text-[#C66B70] font-semibold">
              <ShieldAlert className="w-4 h-4 text-[#B74D55] dark:text-[#C66B70] animate-pulse" />
              <span>OPCODE INTERPRETATION: XOR EAX, EAX [ZERO REGISTER STAGING]</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HexAnalyzerView;
