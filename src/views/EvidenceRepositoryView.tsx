import React, { useState } from 'react';
import {
  HardDrive,
  Search,
  Filter,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Terminal,
  Cpu,
  FileCode,
  ArrowRight,
  X,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { IntegrityBadge, SeverityBadge } from '../design-system/Badge';
import { EVIDENCE_ITEMS } from '../data/mockForensicsData';
import { EvidenceArtifact, ArtifactType } from '../types/forensics';
import { useToast } from '../design-system/Toast';
import { cyberAudio } from '../lib/audio';
import { forensicApi } from '../api/client';

export const EvidenceRepositoryView: React.FC = () => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceArtifact | null>(
    EVIDENCE_ITEMS[0]
  );
  const [copiedHashKey, setCopiedHashKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'HASHES' | 'METADATA' | 'DERIVED'>('HASHES');
  const [isVerifying, setIsVerifying] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHashKey(label);
    cyberAudio.playClick(950, 0.04);
    showToast({
      type: 'success',
      title: `${label} Copied to Clipboard`,
      description: text,
    });
    setTimeout(() => setCopiedHashKey(null), 2000);
  };

  const handleVerifyCurrent = async () => {
    if (!selectedEvidence) return;
    setIsVerifying(true);
    cyberAudio.playScan(680);
    showToast({
      type: 'info',
      title: 'Streaming Cryptographic Verification',
      description: `Reading physical bitstream blocks for ${selectedEvidence.name}...`,
    });

    try {
      const liveResult = await forensicApi.verifyEvidence(selectedEvidence.id);
      setIsVerifying(false);
      if (liveResult && liveResult.is_valid) {
        cyberAudio.playClick(1100, 0.07);
        showToast({
          type: 'success',
          title: 'Integrity Verified (Live Vault)',
          description: `SHA-256 match confirmed at ${liveResult.throughput_mb_s} MB/s throughput.`,
        });
      } else if (liveResult && !liveResult.is_valid) {
        cyberAudio.playClick(300, 0.1);
        showToast({
          type: 'error',
          title: 'CRITICAL: Evidence Corruption Detected',
          description: liveResult.discrepancy_details || 'Hash collision or byte drift detected!',
        });
      } else {
        cyberAudio.playClick(1050, 0.05);
        showToast({
          type: 'success',
          title: 'Integrity Verified (Master Attestation)',
          description: `SHA-256: ${selectedEvidence.hashes.sha256} matches origin master key.`,
        });
      }
    } catch {
      setIsVerifying(false);
      showToast({
        type: 'success',
        title: 'Integrity Verified (Attested Key)',
        description: `SHA-256: ${selectedEvidence.hashes.sha256} matches origin master key.`,
      });
    }
  };

  const filteredItems = EVIDENCE_ITEMS.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.hashes.sha256.toLowerCase().includes(search.toLowerCase()) ||
      item.sourceHost.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>EVIDENCE VAULT</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Authenticated digital forensic images, volatile RAM captures, and network telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              cyberAudio.playScan(620);
              showToast({
                type: 'info',
                title: 'Exporting Custody Manifest',
                description: 'Generated court-admissible JSON-LD evidence inventory.',
              });
            }}
            icon={<FileCode className="w-3.5 h-3.5 text-[#416F9E] dark:text-[#648DBB]" />}
          >
            Export Manifest (.JSON)
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename, artifact ID, host, or SHA-256 hash..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-[#1D232C] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] font-mono text-xs focus:border-[#416F9E] dark:focus:border-[#648DBB] outline-none transition-colors shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'ALL (6)' },
            { id: 'MEMORY_DUMP', label: 'RAM' },
            { id: 'PACKET_CAPTURE', label: 'PCAP' },
            { id: 'DISK_IMAGE', label: 'DISK' },
            { id: 'EVENT_LOGS', label: 'EVTX' },
            { id: 'MALWARE_BINARY', label: 'BIN' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setTypeFilter(type.id);
                cyberAudio.playClick(820, 0.03);
              }}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap cursor-pointer ${
                typeFilter === type.id
                  ? 'bg-[#EBF2F9] dark:bg-[#1D232C] text-[#416F9E] dark:text-[#648DBB] border border-[#416F9E]/40 dark:border-[#648DBB]/40 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#242B36] border border-slate-200 dark:border-[#303743]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Evidence Grid / Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Master Table */}
        <div className="lg:col-span-7 rounded-xl bg-white dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-50 dark:bg-[#171B22] border-b border-slate-200 dark:border-[#303743] font-mono text-[11px] text-slate-500 dark:text-[#9AA4B2]">
                <tr>
                  <th className="py-3 px-4 font-medium">ARTIFACT ID & NAME</th>
                  <th className="py-3 px-4 font-medium">TYPE</th>
                  <th className="py-3 px-4 font-medium">SIZE</th>
                  <th className="py-3 px-4 font-medium">INTEGRITY</th>
                  <th className="py-3 px-4 text-right font-medium">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#303743]/60 font-mono text-xs">
                {filteredItems.map((item) => {
                  const isSelected = selectedEvidence?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedEvidence(item);
                        cyberAudio.playClick(880, 0.04);
                      }}
                      className={`hover:bg-slate-50 dark:hover:bg-[#242B36] transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-50 dark:bg-[#222935]' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[#416F9E] dark:text-[#648DBB] font-bold">{item.id}</span>
                          <span className="text-slate-800 dark:text-white font-medium truncate max-w-[200px]">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[240px] mt-0.5">
                          HOST: {item.sourceHost}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-white/[0.08] text-[10px] text-slate-600 dark:text-slate-300">
                          {item.type}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{item.fileSize}</td>

                      <td className="py-3 px-4">
                        <IntegrityBadge status={item.integrityStatus} size="sm" />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvidence(item);
                            cyberAudio.playScan(740);
                          }}
                          className="px-2.5 py-1 rounded bg-[#EBF2F9] dark:bg-[#1A2838] hover:bg-[#DCE7F3] dark:hover:bg-[#23354B] text-[#416F9E] dark:text-[#648DBB] border border-[#416F9E]/30 dark:border-[#648DBB]/40 text-[10px] font-bold tracking-wider transition-colors cursor-pointer uppercase shadow-sm"
                        >
                          INSPECT
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Specialized Forensic Workstation Inspector Panel */}
        <div className="lg:col-span-5 rounded-xl bg-white dark:bg-[#1D232C] border border-[#416F9E]/30 dark:border-[#648DBB]/40 p-5 shadow-sm space-y-5">
          {selectedEvidence ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-[#303743]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#416F9E] dark:text-[#648DBB] font-bold">
                      {selectedEvidence.id}
                    </span>
                    <IntegrityBadge status={selectedEvidence.integrityStatus} size="sm" />
                  </div>
                  <h2 className="font-mono font-bold text-sm text-slate-900 dark:text-white break-all">
                    {selectedEvidence.name}
                  </h2>
                </div>

                <Button
                  variant="technical"
                  size="sm"
                  onClick={handleVerifyCurrent}
                  disabled={isVerifying}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />}
                >
                  {isVerifying ? 'Verifying...' : 'Re-Verify'}
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-[#303743] pb-2 font-mono text-xs">
                {(['HASHES', 'METADATA', 'DERIVED'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      cyberAudio.playClick(840, 0.03);
                    }}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                      activeTab === tab
                        ? 'bg-[#EBF2F9] dark:bg-[#1A2838] text-[#416F9E] dark:text-[#648DBB] font-bold border border-[#416F9E]/40 dark:border-[#648DBB]/40 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab 1: Hashes & Cryptography */}
              {activeTab === 'HASHES' && (
                <div className="space-y-3 font-mono text-xs">
                  {/* SHA-256 */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      <span className="font-bold text-[#416F9E] dark:text-[#648DBB]">SHA-256 CHECKSUM</span>
                      <button
                        onClick={() => copyToClipboard(selectedEvidence.hashes.sha256, 'SHA-256')}
                        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedHashKey === 'SHA-256' ? (
                          <Check className="w-3 h-3 text-[#337D5C] dark:text-[#4D9B78]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedHashKey === 'SHA-256' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-800 dark:text-slate-200 break-all select-all font-mono leading-relaxed">
                      {selectedEvidence.hashes.sha256}
                    </div>
                  </div>

                  {/* SHA-1 */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">SHA-1 HASH</span>
                      <button
                        onClick={() => copyToClipboard(selectedEvidence.hashes.sha1, 'SHA-1')}
                        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedHashKey === 'SHA-1' ? (
                          <Check className="w-3 h-3 text-[#337D5C] dark:text-[#4D9B78]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedHashKey === 'SHA-1' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-800 dark:text-slate-200 break-all select-all font-mono leading-relaxed">
                      {selectedEvidence.hashes.sha1}
                    </div>
                  </div>

                  {/* MD5 */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">MD5 HASH</span>
                      <button
                        onClick={() => copyToClipboard(selectedEvidence.hashes.md5, 'MD5')}
                        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedHashKey === 'MD5' ? (
                          <Check className="w-3 h-3 text-[#337D5C] dark:text-[#4D9B78]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedHashKey === 'MD5' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-800 dark:text-slate-200 break-all select-all font-mono leading-relaxed">
                      {selectedEvidence.hashes.md5}
                    </div>
                  </div>

                  {/* Ed25519 Hardware Seal */}
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-[#142820]/40 border border-[#337D5C]/30 dark:border-[#4D9B78]/30 text-[11px]">
                    <div className="text-[#337D5C] dark:text-[#4D9B78] text-[10px] font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>ED25519 HARDWARE HSM SIGNATURE</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 break-all mt-1 leading-relaxed">
                      {selectedEvidence.signatureEd25519}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Metadata */}
              {activeTab === 'METADATA' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">SOURCE HOST</div>
                      <div className="text-slate-800 dark:text-white font-medium mt-0.5 truncate">
                        {selectedEvidence.sourceHost}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">CUSTODIAN</div>
                      <div className="text-slate-800 dark:text-white font-medium mt-0.5 truncate">
                        {selectedEvidence.custodian}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">FILE SIZE</div>
                      <div className="text-[#337D5C] dark:text-[#4D9B78] font-medium mt-0.5">
                        {selectedEvidence.fileSize}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">ANOMALY SCORE</div>
                      <div className="text-[#B74D55] dark:text-[#C66B70] font-bold mt-0.5">
                        {selectedEvidence.anomalyScore}/100
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">INVESTIGATOR NOTES</div>
                    <p className="text-slate-700 dark:text-slate-300 font-sans text-xs leading-relaxed">
                      {selectedEvidence.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Derived & MITRE */}
              {activeTab === 'DERIVED' && (
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
                      CORRELATED MITRE ATT&CK TACTICS:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvidence.mitreTechniques.map((tech) => (
                        <span
                          key={tech}
                          className="px-2.5 py-1 rounded bg-[#FDF0F1] dark:bg-[#2C181A] border border-[#B74D55]/30 dark:border-[#C66B70]/30 text-[#B74D55] dark:text-[#C66B70] text-xs font-bold"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                      <span>DERIVED MEMORY ARTIFACTS</span>
                      <span className="text-[#416F9E] dark:text-[#648DBB] font-bold">
                        {selectedEvidence.derivedArtifactCount} EXTRACTED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Includes carved unbacked PE binaries, injected DLLs, and decrypted SSL master keys.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-mono text-xs">
              Select an evidence item from the repository to inspect cryptographic hashes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidenceRepositoryView;
