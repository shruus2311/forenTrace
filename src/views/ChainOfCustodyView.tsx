import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Key,
  Download,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { IntegrityBadge } from '../design-system/Badge';
import { Button } from '../design-system/Button';
import { cyberAudio } from '../lib/audio';
import { useToast } from '../design-system/Toast';
import { forensicApi, type LiveCustodyRecord, type LiveEvidenceArtifact } from '../api/client';

export const ChainOfCustodyView: React.FC<{ caseId: string; canWrite: boolean }> = ({ caseId, canWrite }) => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<LiveCustodyRecord[] | null>();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSigning, setIsSigning] = useState(false);
  const [evidence, setEvidence] = useState<LiveEvidenceArtifact[]>([]);
  const [evidenceStatus, setEvidenceStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const pendingTransfer = useRef<{ payload: string; key: string } | null>(null);
  const [downloading, setDownloading] = useState<string>();

  useEffect(() => {
    let active = true;
    void forensicApi.listCustodyRecords(caseId).then((result) => {
      if (active) setRecords(result);
    });
    if (canWrite) {
      void forensicApi.listEvidence(caseId).then((result) => {
        if (active) {
          if (result) setEvidence(result);
          setEvidenceStatus(result ? 'ready' : 'unavailable');
        }
      });
    }
    return () => {
      active = false;
    };
  }, [caseId, canWrite, loadAttempt]);

  const reloadCustody = () => {
    setRecords(undefined);
    setEvidenceStatus('loading');
    setLoadAttempt((attempt) => attempt + 1);
  };

  async function download(recordId?: string) {
    setDownloading(recordId ?? 'ledger');
    try {
      const file = await forensicApi.downloadCustodyFile(caseId, recordId);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = recordId ? `forentrace-proof-${caseId}-${recordId}.json` : `forentrace-ledger-${caseId}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      showToast({ type: 'error', title: 'Ledger Download Failed',
        description: error instanceof Error ? error.message : 'Try again when the forensic API is available.' });
    } finally {
      setDownloading(undefined);
    }
  }

  const handleSignNewRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const artifact = evidence.find((item) => item.id === selectedEvidenceId);
    if (!artifact || !records || evidenceStatus !== 'ready') return;
    setIsSigning(true);
    setUnconfirmed(false);
    cyberAudio.playScan(740);
    showToast({
      type: 'info',
      title: 'Requesting Custody Signature',
      description: 'Waiting for the forensic API to confirm signing.',
    });

    try {
      const transfer = {
        evidence_id: artifact.id,
        evidence_name: artifact.name,
        transferred_from: String(data.get('from')).trim(),
        transferred_to: String(data.get('to')).trim(),
        purpose: String(data.get('purpose')).trim(),
        location: String(data.get('location')).trim(),
        witness_key: '',
      };
      const payload = JSON.stringify(transfer);
      if (pendingTransfer.current?.payload !== payload) {
        pendingTransfer.current = { payload, key: crypto.randomUUID() };
      }
      const liveBlock = await forensicApi.appendCustodyRecord(transfer, pendingTransfer.current.key);

      if (!liveBlock?.cryptographic_signature || typeof liveBlock.block_hash !== 'string') {
        throw new Error('Signed custody block unavailable');
      }

      setRecords((current) => current && (current.some((block) => block.id === liveBlock.id) ? current : [liveBlock, ...current]));
      pendingTransfer.current = null;
      setUnconfirmed(false);
      form.reset();
      setSelectedEvidenceId('');
      cyberAudio.playClick(1200, 0.08);
      showToast({
        type: 'success',
        title: 'Custody Block Signed',
        description: `The forensic API returned attestation ${liveBlock.record_number} with block hash ${liveBlock.block_hash.substring(0, 16)}…`,
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Custody Signing Unconfirmed',
        description: 'The forensic API did not confirm signing. Retry this transfer with the same details.',
      });
      setUnconfirmed(true);
      reloadCustody();
    } finally {
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
            Evidence transfer records from the forensic API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={reloadCustody} disabled={records === undefined || isSigning}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => void download()} disabled={!records || !!downloading}
            icon={<Download className="w-3.5 h-3.5" />}>
            {downloading === 'ledger' ? 'Preparing export…' : 'Download Signed Ledger'}
          </Button>
        </div>
      </div>

      <Card variant={records === null ? 'critical' : 'default'}>
        {records === null ? (
          <p role="alert">Custody ledger unavailable. The forensic API did not return custody records.</p>
        ) : (
          <p role="status" className="text-sm">
            {records === undefined ? 'Loading custody records…' :
              records.length === 0 ? 'No custody records found.' : `Total blocks: ${records.length}`}
          </p>
        )}
      </Card>

      {canWrite && (
        <Card title="Record a custody transfer">
          <form onSubmit={handleSignNewRecord} className="space-y-3">
            {evidenceStatus === 'loading' && <p role="status">Loading evidence for transfers…</p>}
            {evidenceStatus === 'unavailable' && (
              <div className="flex flex-wrap items-center gap-3">
                <p role="alert">Evidence for custody transfers is unavailable.</p>
                <Button variant="outline" type="button" onClick={reloadCustody}>Retry evidence</Button>
              </div>
            )}
            {evidenceStatus === 'ready' && evidence.length === 0 && <p>Register evidence before recording a transfer.</p>}
            {unconfirmed && <p role="status">Retry this transfer with the same details.</p>}
            <fieldset className="space-y-3" disabled={isSigning || evidenceStatus !== 'ready' || evidence.length === 0}>
              <div>
                <label htmlFor="custody-evidence" className="block text-sm">Evidence</label>
                <select id="custody-evidence" name="evidence" required value={selectedEvidenceId} onChange={(event) => setSelectedEvidenceId(event.target.value)}
                  className="block w-full mt-1 p-2 border rounded-md bg-transparent">
                  <option value="">Choose evidence</option>
                  {evidence.map((item) => <option className="dark:bg-[#1D232C]" key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[['from', 'Transferred from'], ['to', 'Transferred to'], ['purpose', 'Transfer purpose'], ['location', 'Location']].map(([name, label]) => (
                  <label key={name} className="text-sm">{label}
                    <input name={name} required maxLength={512} className="block w-full mt-1 p-2 border rounded-md bg-transparent" />
                  </label>
                ))}
              </div>
              <Button variant="primary" type="submit" disabled={!records || !evidence.some((item) => item.id === selectedEvidenceId)}
                icon={<Key className="w-3.5 h-3.5" />}>
                {isSigning ? 'Signing Block…' : 'Affix Custodial Signature'}
              </Button>
            </fieldset>
          </form>
        </Card>
      )}

      {/* Custody Records Timeline */}
      <div className="space-y-4">
        {records?.map((rec) => (
          <div
            key={rec.id}
            className="p-5 rounded-xl bg-white dark:bg-[#1D232C] border border-slate-200 dark:border-[#303743] hover:border-[#337D5C]/40 dark:hover:border-[#4D9B78]/40 transition-all shadow-sm font-mono text-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#303743]/60">
              <div className="flex items-center gap-3">
                <span className="text-[#337D5C] dark:text-[#4D9B78] font-bold">{rec.record_number}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="text-slate-800 dark:text-white font-semibold">{rec.evidence_name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400">
                  {rec.evidence_id}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <IntegrityBadge status={rec.integrity_verified === true ? 'VERIFIED' : 'FAILED_VERIFICATION'} size="sm" />
                <span className="text-slate-400 dark:text-slate-500">({rec.timestamp})</span>
              </div>
            </div>

            {rec.event_type === 'emergency_access_intent' ? <p>Emergency access activation requested by {rec.transferred_to}</p> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] mb-0.5">TRANSFERRED FROM:</span>
                <span className="text-slate-800 dark:text-slate-200">{rec.transferred_from}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] mb-0.5">TRANSFERRED TO:</span>
                <span className="text-[#416F9E] dark:text-[#648DBB] font-medium">{rec.transferred_to}</span>
              </div>
            </div>}

            <div className="text-[11px] p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] mb-0.5">{rec.event_type ? 'APPROVAL COMMITMENT' : 'CUSTODIAL PURPOSE'}</span>
              <p className="text-slate-700 dark:text-slate-300 font-sans text-xs leading-relaxed">{rec.purpose}</p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-[#9AA4B2] border-t border-slate-100 dark:border-[#303743]/60">
              <div className="flex items-center gap-2 truncate max-w-md">
                <Key className="w-3 h-3 text-[#416F9E] dark:text-[#648DBB]" />
                <span className="truncate">SIG: {rec.cryptographic_signature}</span>
              </div>
              <div>WITNESS: <span className="text-slate-700 dark:text-slate-400">{rec.witness_key}</span></div>
              <Button variant="outline" size="sm" onClick={() => void download(rec.id)} disabled={!!downloading}
                aria-label={`Download proof for ${rec.record_number}`}>
                {downloading === rec.id ? 'Preparing proof…' : 'Download Proof'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChainOfCustodyView;
