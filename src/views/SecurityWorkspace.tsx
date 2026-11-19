import { useEffect, useState, type FormEvent } from 'react';
import { forensicApi, type CaseAccess, type EmergencyApproval, type PasskeyState, type SecurityAlert } from '../api/client';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';
import { EvidenceLineage } from './AnalysisView';

const alertNames: Record<string, string> = {
  repeated_password_failures: 'Repeated password failures',
  case_policy_denied: 'Case access policy denied a request',
  analysis_job_failed: 'Analysis job failed',
  passkey_verification_failed: 'Passkey response rejected',
  passkey_enrolled: 'Passkey enrolled',
  passkey_verified: 'Passkey verified',
  passkey_revoked: 'Passkey revoked',
  passkeys_reset: 'Passkeys reset by an operator',
  emergency_access_activated: 'Emergency evidence access activated',
};

function AlertList({ items }: { items?: SecurityAlert[] }) {
  if (!items) return <p>Alert history is unavailable.</p>;
  if (!items.length) return <p>No recorded alerts.</p>;
  return <ul className="space-y-2 text-sm">{items.map((item) => (
    <li key={`${item.kind}-${item.first_at}`}>
      {alertNames[item.kind] ?? item.kind} · {item.occurrences} · {new Date(item.last_at).toLocaleString()}
    </li>
  ))}</ul>;
}

export function SecurityWorkspace({ activeCase, refreshSession }: {
  activeCase?: CaseAccess; refreshSession: () => Promise<void>;
}) {
  const [state, setState] = useState<PasskeyState>();
  const [accountAlerts, setAccountAlerts] = useState<SecurityAlert[]>();
  const [caseAlerts, setCaseAlerts] = useState<SecurityAlert[]>();
  const [approvals, setApprovals] = useState<EmergencyApproval[] | null>();
  const [lineage, setLineage] = useState<{
    approvalId: string; expiresAt: string; data: Awaited<ReturnType<typeof forensicApi.evidenceLineage>>;
  }>();
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const availableCase = activeCase?.restriction ? undefined : activeCase?.id;
  const policy = activeCase?.access_policy;

  useEffect(() => {
    let active = true;
    setCaseAlerts(undefined);
    void forensicApi.emergencyApprovals().then((data) => { if (active) setApprovals(data); }, () => { if (active) setApprovals(null); });
    void forensicApi.passkeyState().then((data) => { if (active) setState(data); }).catch(() => { if (active) setState(undefined); });
    void forensicApi.securityAlerts().then((data) => { if (active) setAccountAlerts(data); }).catch(() => { if (active) setAccountAlerts(undefined); });
    if (availableCase) void forensicApi.securityAlerts(availableCase).then((data) => {
      if (active) setCaseAlerts(data);
    }).catch(() => { if (active) setCaseAlerts(undefined); });
    return () => { active = false; };
  }, [attempt, availableCase]);

  useEffect(() => {
    if (!lineage) return;
    const timer = window.setTimeout(() => setLineage(undefined), Math.max(0, Date.parse(lineage.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [lineage]);

  async function run(action: () => Promise<void>) {
    setWorking(true);
    setError('');
    setLineage(undefined);
    try {
      await action();
      await refreshSession();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The security action was not confirmed.');
    } finally {
      setWorking(false);
      setAttempt((value) => value + 1);
    }
  }

  function manage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password'));
    const code = String(data.get('enrollmentCode') || '').trim();
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value');
    if (!password || !action) return;
    form.reset();
    void run(() => action === 'enroll' ? forensicApi.usePasskey('enroll', password, code) : forensicApi.revokePasskey(action, password));
  }

  async function downloadOriginal(id: string) {
    const file = await forensicApi.downloadOriginal(id);
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${id}.bin`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="Passkey verification">
      {error && <p role="alert" className="mb-3 text-sm">{error}</p>}
      <p className="text-sm">Your device verifies you with a biometric, device PIN, or compatible security key. ForenTrace stores a public key.</p>
      {!state && <p className="mt-2">Passkey status is unavailable.</p>}
      {state && <div className="mt-3 space-y-3">
        <p className="text-sm">{state.credentials.length} enrolled · {state.verified_at ? `Last verified ${new Date(state.verified_at).toLocaleString()}` : 'Current session awaiting verification'}</p>
        {!state.enabled && <p className="text-sm">The workstation origin needs to be configured to use passkeys.</p>}
        <Button variant="primary" disabled={working || !state.enabled || !state.credentials.length} onClick={() => void run(() => forensicApi.usePasskey('verify'))}>Verify with passkey</Button>
        <form className="space-y-2" onSubmit={manage}>
          {!!state.credentials.length && <p className="text-sm">Verify with an enrolled passkey before adding or removing one.</p>}
          <label className="block text-sm">Confirm account password to enroll or revoke
            <input className="block mt-1 w-full rounded-md border p-2 bg-transparent" type="password" name="password" required autoComplete="current-password" maxLength={256} />
          </label>
          {!state.credentials.length && state.enabled && <label className="block text-sm">Operator enrollment code
            <input className="block mt-1 w-full rounded-md border p-2 bg-transparent" type="password" name="enrollmentCode" required autoComplete="off" maxLength={100} />
          </label>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" value="enroll" variant="outline" disabled={working || !state.enabled}>Enroll passkey</Button>
            {state.credentials.map((credential, index) => <Button key={credential} type="submit" value={credential} variant="outline" disabled={working}>Revoke passkey {index + 1}</Button>)}
          </div>
        </form>
      </div>}
    </Card>
    <Card title="Case access policy" subtitle={activeCase?.id}>
      {activeCase?.restriction && <p role="status" className="mb-2">{activeCase.restriction}</p>}
      {policy ? <ul className="space-y-1 text-sm">
        <li>Time zone {policy.timezone}</li>
        <li>Access days {policy.weekdays.slice().sort().map((day) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day - 1]).join(', ')}</li>
        {policy.opens && <li>Local access hours {policy.opens}–{policy.closes}</li>}
        {policy.valid_from && <li>Starts {new Date(policy.valid_from).toLocaleString()}</li>}
        {policy.valid_until && <li>Expires {new Date(policy.valid_until).toLocaleString()}</li>}
        {policy.step_up_minutes && <li>Passkey verification valid for {policy.step_up_minutes} minutes</li>}
      </ul> : <p>No case-specific policy configured.</p>}
      <Button className="mt-3" variant="outline" disabled={working} onClick={() => void run(async () => {})}>Refresh access and alerts</Button>
    </Card>
    <Card title="Emergency evidence access">
      {approvals === undefined && <p role="status">Loading emergency approvals…</p>}
      {approvals === null && <p role="alert">Emergency approvals are unavailable.</p>}
      {approvals?.length === 0 && <p>No active or pending approvals for this session.</p>}
      <ul className="space-y-3 text-sm">{approvals?.map((approval) => <li key={approval.id} className="space-y-1">
        <p className="font-semibold break-all">{approval.evidence_id} · {approval.case_id}</p>
        <p>{approval.reason}</p>
        {approval.expires_at ? <>
          <p>Expires {new Date(approval.expires_at).toLocaleString()} · Ledger {approval.ledger_id}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={working} onClick={() => void run(() => downloadOriginal(approval.evidence_id))}>Download sealed original</Button>
            <Button variant="outline" size="sm" disabled={working} onClick={() => void run(async () => {
              if (!approval.expires_at) return;
              const data = await forensicApi.evidenceLineage(approval.case_id, approval.evidence_id);
              setLineage({ approvalId: approval.id, expiresAt: approval.expires_at, data });
            })}>View evidence lineage</Button>
          </div>
          {lineage?.approvalId === approval.id && <div className="mt-2"><EvidenceLineage lineage={lineage.data} /></div>}
        </> : <>
          <p>Activate before {new Date(approval.activate_before).toLocaleString()}. Recent passkey verification is required.</p>
          <Button variant="outline" size="sm" disabled={working} onClick={() => void run(async () => { await forensicApi.activateEmergency(approval.id); })}>Activate emergency access</Button>
        </>}
      </li>)}</ul>
    </Card>
    <Card title="Account security alerts"><AlertList items={accountAlerts} /></Card>
    {availableCase && <Card title="Case alerts" subtitle={availableCase}><AlertList items={caseAlerts} /></Card>}
  </div>;
}
