import React, { useRef, useState } from 'react';
import { forensicApi, type CaseAccess } from '../api/client';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';

const artifactTypes = [
  ['OTHER', 'Other file'],
  ['DISK_IMAGE', 'Disk image'],
  ['MEMORY_DUMP', 'Memory dump'],
  ['PACKET_CAPTURE', 'Packet capture'],
  ['EVENT_LOGS', 'Event logs'],
  ['REGISTRY_HIVE', 'Registry hive'],
  ['MALWARE_BINARY', 'Malware sample'],
];

export function EvidenceAcquisitionView({ activeCase, onViewVault }: {
  activeCase: CaseAccess;
  onViewVault: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setError('Choose a non-empty evidence file.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const key = requestId.current ??= crypto.randomUUID();
      await forensicApi.registerEvidence(activeCase.id, file, String(data.get('type')), String(data.get('sha256')).trim(), key);
      onViewVault();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Registration failed.');
    } finally {
      setPending(false);
    }
  }

  const fieldClass = 'block w-full mt-1.5 p-2 rounded-lg border border-slate-300 dark:border-[#303743] bg-white dark:bg-[#111318]';

  return (
    <section className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Register evidence</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Case {activeCase.id}</p>
      </div>
      <Card>
        {activeCase.role === 'viewer' ? <p>You have read-only access to this case.</p> : (
          <form onSubmit={submit} onChange={() => { requestId.current = null; }} className="space-y-4">
            <label className="block text-sm">
              Evidence file
              <input className={fieldClass} name="file" type="file" required disabled={pending} />
            </label>
            <label className="block text-sm">
              Artifact type
              <select className={fieldClass} name="type" disabled={pending}>
                {artifactTypes.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              Expected SHA-256 (optional)
              <input className={fieldClass + ' font-mono'} name="sha256" pattern="[0-9a-fA-F]{64}"
                maxLength={64} spellCheck={false} autoComplete="off" disabled={pending} />
            </label>
            {error && (
              <div className="space-y-2">
                <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>
                {requestId.current && <p className="text-xs break-all">Registration reference {requestId.current}</p>}
                <Button variant="outline" type="button" onClick={onViewVault}>Check Evidence Vault</Button>
              </div>
            )}
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? 'Registering and sealing…' : 'Register and seal'}
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}
