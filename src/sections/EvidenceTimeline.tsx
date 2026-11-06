import { useState } from "react";
import { cyberAudio } from "@/lib/audio";
import { Clock, AlertTriangle, ShieldCheck, FileCode, CheckCircle2, Search } from "lucide-react";

interface TimelineEvent {
  id: string;
  time: string;
  delta: string;
  title: string;
  category: "INITIAL_ACCESS" | "EXECUTION" | "PERSISTENCE" | "EXFILTRATION";
  severity: "LOW" | "MED" | "CRITICAL";
  hash: string;
  description: string;
  rawPayload: string;
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "EV-01",
    time: "02:14:09.114 UTC",
    delta: "+0.000s",
    title: "Anomalous Memory Page Allocation",
    category: "INITIAL_ACCESS",
    severity: "MED",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    description: "VirtualAlloc called with PAGE_EXECUTE_READWRITE permissions at address 0x7FFF0A91.",
    rawPayload: "CALL VirtualAlloc(0x0, 0x10000, MEM_COMMIT, PAGE_EXECUTE_READWRITE) -> 0x7FFF0A91",
  },
  {
    id: "EV-02",
    time: "02:14:09.482 UTC",
    delta: "+0.368s",
    title: "Process Hollowing in svchost.exe",
    category: "EXECUTION",
    severity: "CRITICAL",
    hash: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    description: "Unmapped legitimate svchost.exe section header; replaced with unbacked reflective shellcode.",
    rawPayload: "ZwUnmapViewOfSection(TargetPID: 1042) => STATUS_SUCCESS. Thread hijacked.",
  },
  {
    id: "EV-03",
    time: "02:14:10.019 UTC",
    delta: "+0.905s",
    title: "C2 Beacon Encrypted Handshake",
    category: "PERSISTENCE",
    severity: "CRITICAL",
    hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    description: "Outbound TLS 1.3 socket initiated to 198.51.100.44:8443 mimicking legitimate CDN SNI.",
    rawPayload: "CONNECT 198.51.100.44:8443 TLS_AES_256_GCM_SHA384 [ECH JA3=771,4865-4866]",
  },
  {
    id: "EV-04",
    time: "02:14:11.230 UTC",
    delta: "+2.116s",
    title: "Automated Evidence Quarantine",
    category: "EXFILTRATION",
    severity: "LOW",
    hash: "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
    description: "ForenTrace EDR interceptor isolated memory segments and sealed cryptographic snapshot.",
    rawPayload: "FORENTRACE_ISOLATION_TRIGGER: PID 1042 frozen. Snapshot locked with key 0x9AF0.",
  },
];

export const EvidenceTimeline = () => {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent>(TIMELINE_EVENTS[1]);

  const handleSelect = (ev: TimelineEvent) => {
    setSelectedEvent(ev);
    cyberAudio.playClick(ev.severity === "CRITICAL" ? 640 : 880, 0.05);
  };

  return (
    <section id="timeline" className="relative z-20 py-24 px-4 md:px-12 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-12 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-[#00F2FE] font-mono text-xs tracking-widest uppercase mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>SECTION 02 // CHRONOLOGICAL SEQUENCE</span>
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
            INCIDENT ATTACK VECTOR TIMELINE
          </h2>
        </div>
        <p className="text-slate-400 font-sans text-xs sm:text-sm max-w-md">
          Microsecond-accurate event reconstruction derived from volatile RAM registers and raw packet PCAPs.
        </p>
      </div>

      {/* Grid: Events List (Left) + Detailed Evidence Inspector (Right) */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Timeline Events List */}
        <div className="lg:col-span-7 space-y-3">
          {TIMELINE_EVENTS.map((ev, index) => {
            const isSelected = selectedEvent.id === ev.id;
            return (
              <div
                key={ev.id}
                onClick={() => handleSelect(ev)}
                className={`p-4 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? "glass-panel-cyan border-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.15)]"
                    : "glass-surface border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between font-mono text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#00F2FE] font-bold">[{ev.id}]</span>
                    <span className="text-slate-400">{ev.time}</span>
                    <span className="text-slate-500 text-[10px]">({ev.delta})</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ev.severity === "CRITICAL"
                        ? "bg-red-950/80 text-red-400 border border-red-500/30"
                        : ev.severity === "MED"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {ev.severity}
                  </span>
                </div>

                <div className="font-display font-semibold text-white text-base">
                  {ev.title}
                </div>
                <p className="mt-1 text-slate-300 text-xs font-sans line-clamp-2">
                  {ev.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected Event Forensic Inspector */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-surface border border-cyan-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between pb-4 border-b border-white/10 font-mono text-xs">
            <span className="text-[#00F2FE] flex items-center gap-1.5 font-bold">
              <Search className="w-3.5 h-3.5" />
              FORENSIC ARTIFACT // {selectedEvent.id}
            </span>
            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              VERIFIED CHECKSUM
            </span>
          </div>

          <div className="mt-5 space-y-4 font-mono text-xs">
            <div>
              <div className="text-slate-400 text-[10px]">EVENT TITLE:</div>
              <div className="text-white font-semibold text-sm mt-0.5">{selectedEvent.title}</div>
            </div>

            <div>
              <div className="text-slate-400 text-[10px]">CATEGORY / MITRE ATT&CK:</div>
              <div className="text-cyan-300 font-bold mt-0.5">{selectedEvent.category}</div>
            </div>

            <div>
              <div className="text-slate-400 text-[10px]">SHA-256 ARTIFACT SIGNATURE:</div>
              <div className="text-[10px] text-slate-300 bg-black/60 p-2 rounded border border-white/5 break-all mt-1">
                {selectedEvent.hash}
              </div>
            </div>

            <div>
              <div className="text-slate-400 text-[10px]">RAW RECONSTRUCTED INSTRUCTION:</div>
              <pre className="text-[11px] text-emerald-400 bg-black/80 p-3 rounded border border-emerald-500/20 overflow-x-auto mt-1 font-mono">
                <code>{selectedEvent.rawPayload}</code>
              </pre>
            </div>

            <div className="pt-2">
              <button
                onClick={() => cyberAudio.playScan(740)}
                className="w-full py-2.5 rounded-lg bg-cyan-950/80 border border-[#00F2FE]/40 hover:bg-[#00F2FE] hover:text-black text-[#00F2FE] font-mono text-xs tracking-wider transition-all uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>EXPORT FORENSIC REPORT (.JSON)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EvidenceTimeline;
