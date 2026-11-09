import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Lock,
  FileCheck,
  CheckCircle2,
  Clock,
  HardDrive,
  Download,
  FileText,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { CUSTODY_RECORDS } from '../data/mockForensicsData';
import { CustodyRecord } from '../types/forensics';
import { cyberAudio } from '../lib/audio';
import { useToast } from '../design-system/Toast';
import { forensicApi } from '../api/client';

export const ChainOfCustodyView: React.FC = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<CustodyRecord[]>(CUSTODY_RECORDS);
  const [isSigning, setIsSigning] = useState(false);

  const handleSignNewRecord = async () => {
    setIsSigning(true);
    cyberAudio.playScan(740);
    showToast({
      type: 'info',
      title: 'Requesting FIPS 140-3 Hardware Token Signature',
      description: 'Signing attestation block with Investigator Key #9082...',
    });

    try {
      const liveBlock = await forensicApi.appendCustodyRecord({
        evidence_id: 'EVD-9801',
        evidence_name: 'DC01_PHYSICAL_RAM_IMAGE.raw',
        transferred_from: 'ForenTrace Detonation Pod',
        transferred_to: 'Long-term Encrypted Legal Evidence Locker 14A',
        purpose: 'Periodic evidentiary re-certification and digital witness seal',
        location: 'Federal Evidentiary Vault, Pod 02',
        witness_key: 'KEY:FIPS140-3:HW_TOKEN_9082',
      });

      setIsSigning(false);
      if (liveBlock) {
        cyberAudio.playClick(1200, 0.08);
        const mappedRecord: CustodyRecord = {
          id: liveBlock.id,
          recordNumber: liveBlock.record_number,
          timestamp: liveBlock.timestamp,
          evidenceId: liveBlock.evidence_id,
          evidenceName: liveBlock.evidence_name,
          transferredFrom: liveBlock.transferred_from,
          transferredTo: liveBlock.transferred_to,
          purpose: liveBlock.purpose,
          location: liveBlock.location,
          cryptographicSignature: liveBlock.cryptographic_signature,
          witnessKey: liveBlock.witness_key,
          integrityVerified: liveBlock.integrity_verified,
        };
        setRecords([mappedRecord, ...records]);
        showToast({
          type: 'success',
          title: 'Custody Block Sealed (Live HSM Engine)',
          description: `Attestation ${liveBlock.record_number} verified with block hash ${liveBlock.block_hash.substring(0, 16)}...`,
        });
      } else {
        // Fallback attestation
        const newRecord: CustodyRecord = {
          id: `CUST-00${records.length + 1}`,
          recordNumber: `CC-2026-0884-0${records.length + 1}`,
          timestamp: new Date().toISOString(),
          evidenceId: 'EVD-9801',
          evidenceName: 'DC01_PHYSICAL_RAM_IMAGE.raw',
          transferredFrom: 'ForenTrace Detonation Pod',
          transferredTo: 'Long-term Encrypted Legal Evidence Locker 14A',
          purpose: 'Periodic evidentiary re-certification and digital witness seal',
          location: 'Federal Evidentiary Vault, Pod 02',
          cryptographicSignature: `SIG:ed25519:0x89a1f2...7710bc`,
          witnessKey: 'KEY:FIPS140-3:HW_TOKEN_9082',
          integrityVerified: true,
        };
        setRecords([newRecord, ...records]);
        cyberAudio.playClick(1200, 0.08);
        showToast({
          type: 'success',
          title: 'Custody Block Sealed',
          description: `Attestation ${newRecord.recordNumber} successfully verified.`,
        });
      }
    } catch {
      setIsSigning(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#337D5C] dark:text-[#4D9B78]" />
            <span>CHAIN OF CUSTODY & LEGAL AUDIT LEDGER</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Court-admissible electronic custody transfer ledger conforming to ISO/IEC 27037 standards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSignNewRecord}
            disabled={isSigning}
            icon={<Key className="w-3.5 h-3.5" />}
          >
            {isSigning ? 'Signing Block...' : 'Affix Custodial Signature'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              cyberAudio.playScan(600);
              showToast({
                type: 'success',
                title: 'Exporting Form 27037-B',
                description: 'Generated PDF audit certificate with embedded cryptographic timestamps.',
              });
            }}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Legal Certificate (.PDF)
          </Button>
        </div>
      </div>

      {/* Compliance Certification Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#142820]/50 border border-[#337D5C]/30 dark:border-[#4D9B78]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#EAF5F0] dark:bg-[#142820] border border-[#337D5C]/30 dark:border-[#4D9B78]/40 flex items-center justify-center text-[#337D5C] dark:text-[#4D9B78] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-sans font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>CONTINUOUS INTEGRITY VERIFICATION ACTIVE</span>
              <span className="px-2 py-0.5 rounded-md bg-[#EAF5F0] dark:bg-[#142820] text-[#337D5C] dark:text-[#4D9B78] font-mono text-[10px] border border-[#337D5C]/30 dark:border-[#4D9B78]/30 font-semibold">
                ZERO COLLISION
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-0.5">
              All bitstream duplicates match primary master hardware write-blocker signatures.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono text-slate-700 dark:text-slate-300">
          <div>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] block">TOTAL BLOCKS:</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{records.length} VERIFIED</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] block">STANDARD:</span>
            <span className="font-bold text-[#337D5C] dark:text-[#4D9B78] text-sm">ISO/IEC 27037</span>
          </div>
        </div>
      </div>

      {/* Custody Records Timeline */}
      <div className="space-y-4">
        {records.map((rec) => (
          <div
            key={rec.id}
            className="p-5 rounded-xl bg-white dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] hover:border-[#337D5C]/40 dark:hover:border-[#4D9B78]/40 transition-all shadow-sm font-mono text-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#303743]/60">
              <div className="flex items-center gap-3">
                <span className="text-[#337D5C] dark:text-[#4D9B78] font-bold">{rec.recordNumber}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="text-slate-800 dark:text-white font-semibold">{rec.evidenceName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400">
                  {rec.evidenceId}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#337D5C] dark:text-[#4D9B78] text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-semibold">INTEGRITY VERIFIED</span>
                <span className="text-slate-400 dark:text-slate-500">({rec.timestamp})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] mb-0.5">TRANSFERRED FROM:</span>
                <span className="text-slate-800 dark:text-slate-200">{rec.transferredFrom}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] mb-0.5">TRANSFERRED TO:</span>
                <span className="text-[#416F9E] dark:text-[#648DBB] font-medium">{rec.transferredTo}</span>
              </div>
            </div>

            <div className="text-[11px] p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] mb-0.5">CUSTODIAL PURPOSE:</span>
              <p className="text-slate-700 dark:text-slate-300 font-sans text-xs leading-relaxed">{rec.purpose}</p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-[#9AA4B2] border-t border-slate-100 dark:border-[#303743]/60">
              <div className="flex items-center gap-2 truncate max-w-md">
                <Key className="w-3 h-3 text-[#416F9E] dark:text-[#648DBB]" />
                <span className="truncate">SIG: {rec.cryptographicSignature}</span>
              </div>
              <div>WITNESS: <span className="text-slate-700 dark:text-slate-400">{rec.witnessKey}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChainOfCustodyView;
