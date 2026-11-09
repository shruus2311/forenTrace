import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  Share2,
  Lock,
  Calendar,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { BrandLogo } from '../components/brand/BrandLogo';
import { useToast } from '../design-system/Toast';
import { cyberAudio } from '../lib/audio';
import { CASES, EVIDENCE_ITEMS, CUSTODY_RECORDS } from '../data/mockForensicsData';

export const ForensicReportsView: React.FC = () => {
  const { showToast } = useToast();
  const currentCase = CASES[0];

  const handleExportPdf = () => {
    cyberAudio.playScan(740);
    showToast({
      type: 'success',
      title: 'Court-Admissible PDF Report Generated',
      description: `SEALED REPORT #${currentCase.caseNumber}-FINAL.pdf compiled with RFC 3161 timestamps.`,
    });
  };

  const handleExportJson = () => {
    cyberAudio.playClick(920, 0.04);
    showToast({
      type: 'info',
      title: 'JSON-LD Evidence Manifest Exported',
      description: 'Exported machine-verifiable digital forensic attestation package.',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>FORENSIC REPORT BUILDER & LEGAL ATTESTATION</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            ISO/IEC 27037 compliant court-admissible forensic briefing documents and digital witness seals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            icon={<FileCode className="w-3.5 h-3.5" />}
          >
            Export JSON-LD Manifest
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPdf}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Generate Signed PDF Report
          </Button>
        </div>
      </div>

      {/* Interactive Report Document Preview Stage */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#171B22] border border-slate-300 dark:border-[#303743] rounded-2xl shadow-xl overflow-hidden p-8 sm:p-12 font-sans transition-colors">
        {/* Document Header with Official Logo */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b-2 border-slate-900 dark:border-white">
          <div>
            <BrandLogo variant="full" size="md" tagline="digital-forensic" />
            <div className="font-mono text-[10px] text-slate-500 dark:text-[#9AA4B2] mt-2">
              DIGITAL EVIDENCE PROVENANCE & CUSTODIAL ATTESTATION REPORT
            </div>
          </div>

          <div className="text-right font-mono text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div>
              <span className="text-slate-400">DOCUMENT ID:</span>{' '}
              <strong className="text-slate-900 dark:text-white">FT-DOC-2026-9082</strong>
            </div>
            <div>
              <span className="text-slate-400">STANDARD:</span>{' '}
              <strong className="text-[#337D5C] dark:text-[#4D9B78]">ISO/IEC 27037:2012</strong>
            </div>
            <div>
              <span className="text-slate-400">DATE:</span>{' '}
              <span>{new Date().toISOString().substring(0, 10)}</span>
            </div>
          </div>
        </div>

        {/* Executive Summary Section */}
        <div className="py-6 border-b border-slate-200 dark:border-[#303743] space-y-3">
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white uppercase tracking-wider">
            1. Executive Incident Summary
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] text-xs font-mono space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-slate-400 text-[10px] block">CASE NUMBER:</span>
                <span className="font-bold text-[#416F9E] dark:text-[#648DBB]">{currentCase.caseNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">THREAT LEVEL:</span>
                <span className="font-bold text-[#B74D55] dark:text-[#C66B70]">{currentCase.threatLevel}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">ORGANIZATION:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentCase.clientOrganization}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">LEAD EXAMINER:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentCase.leadInvestigator}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            {currentCase.summary} Forensic examiners confirmed presence of reflective DLL staging inside kernel memory space without initial file-backed persistence. Adversary utilized encrypted TLS 1.3 telemetry to exfiltrate unbacked memory contents.
          </p>
        </div>

        {/* Cryptographic Artifact Inventory */}
        <div className="py-6 border-b border-slate-200 dark:border-[#303743] space-y-4">
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white uppercase tracking-wider">
            2. Primary Cryptographic Evidence Inventory
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-100 dark:bg-[#111318] border-b border-slate-200 dark:border-[#303743] text-[10px] text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">EVIDENCE ID</th>
                  <th className="py-2.5 px-3">BITSTREAM FILE</th>
                  <th className="py-2.5 px-3">SIZE</th>
                  <th className="py-2.5 px-3">SHA-256 MASTER CHECKSUM</th>
                  <th className="py-2.5 px-3 text-right">SEAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#303743]/60 text-[11px]">
                {EVIDENCE_ITEMS.slice(0, 3).map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 font-bold text-[#416F9E] dark:text-[#648DBB]">{item.id}</td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-white truncate max-w-xs">{item.name}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{item.fileSize}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[10px] truncate max-w-xs">
                      {item.hashes.sha256}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#337D5C] dark:text-[#4D9B78] font-bold">
                      VERIFIED
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chain of Custody Attestation */}
        <div className="py-6 border-b border-slate-200 dark:border-[#303743] space-y-3">
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white uppercase tracking-wider">
            3. Chain of Custody Attestation Blocks
          </h2>
          <div className="space-y-2 font-mono text-xs">
            {CUSTODY_RECORDS.slice(0, 2).map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-[#337D5C] dark:text-[#4D9B78]">{rec.recordNumber}:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{rec.evidenceName}</span>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {rec.transferredFrom} ➔ {rec.transferredTo}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 text-right">
                  <div>SIG: {rec.cryptographicSignature.substring(0, 20)}...</div>
                  <div className="text-[#337D5C] dark:text-[#4D9B78] font-bold">MERKLE VERIFIED</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Digital Witness Key Seal Footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EAF5F0] dark:bg-[#142820] border border-[#337D5C]/30 flex items-center justify-center text-[#337D5C] dark:text-[#4D9B78]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">ED25519 HARDWARE ENCLAVE WITNESS</div>
              <div className="text-[10px]">KEY_FP: 9082:FIPS_140_3:LEVEL_4_ATTESTATION</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-800 dark:text-slate-200 font-bold">V. Raghunath, Lead Forensics Examiner</div>
            <div className="text-[10px]">CERTIFIED DFIR PROFESSIONAL // GCFE #4092</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForensicReportsView;
