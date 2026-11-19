import { useEffect, useState, type FormEvent } from 'react';
import { forensicApi, type AnalysisJob, type Analyzer, type CaseSearchResults, type Correlation, type CorrelationDecision, type IntelligenceSource, type LiveEvidenceArtifact } from '../api/client';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';

const field = 'w-full p-2 rounded-md border border-slate-300 dark:border-[#303743] bg-white dark:bg-[#111318]';
const analyzers: Record<Analyzer, string> = {
  'file-profile': 'File profile', 'byte-entropy': 'Byte entropy', 'text-metrics': 'Text metrics', 'cve-references': 'CVE references',
  'attack-references': 'ATT&CK references',
};
const sourceLabels: Record<string, string> = { 'cisa-kev': 'CISA KEV', 'first-epss': 'FIRST EPSS', 'mitre-attack': 'MITRE ATT&CK' };

function Report({ job }: { job: AnalysisJob }) {
  const report = job.result?.report;
  return (
    <li className="py-2 space-y-1 border-b border-slate-200 dark:border-[#303743]">
      <p className="text-sm font-semibold">{job.evidence_id} · {job.status}</p>
      <p className="text-sm">{analyzers[job.analyzer]}</p>
      {job.error && <p className="text-sm">{job.error}</p>}
      {job.result && report && <>
        {report.format === 'forentrace.file-profile.v1' && <p className="text-sm">Header {report.classification} · {report.byte_count.toLocaleString()} bytes</p>}
        {report.format === 'forentrace.byte-entropy.v1' && <p className="text-sm">{(report.entropy_millibits / 1000).toFixed(3)} bits per byte · {report.distinct_bytes} distinct bytes</p>}
        {report.format === 'forentrace.text-metrics.v1' && <p className="text-sm">{report.printable_ascii_bytes} printable ASCII bytes · {report.line_feeds} line feeds · {report.nul_bytes} NUL bytes</p>}
        {report.format === 'forentrace.cve-references.v1' && <p className="text-sm">{report.cve_ids.join(', ') || 'No CVE references found.'}{report.truncated && ' (showing 50 unique IDs)'}</p>}
        {report.format === 'forentrace.attack-references.v1' && <p className="text-sm">{report.technique_ids.join(', ') || 'No ATT&CK references found.'}{report.truncated && ' (showing 50 unique IDs)'}</p>}
        <p className="text-xs font-mono break-all">Report SHA-256 {job.result.report_sha256}</p>
        <p className="text-xs font-mono break-all">Analyzer image {job.result.worker_image}</p>
      </>}
    </li>
  );
}

export function EvidenceLineage({ lineage }: { lineage: { evidence: LiveEvidenceArtifact; reports: AnalysisJob[] } }) {
  return <>
    <p className="font-semibold">{lineage.evidence.name}</p>
    <p className="text-xs font-mono break-all">Original SHA-256 {lineage.evidence.hashes.sha256}</p>
    {lineage.reports.length ? <ul className="ml-3 pl-3 border-l border-slate-300 dark:border-[#303743] mt-2">
      {lineage.reports.map((job) => <Report key={job.id} job={job} />)}
    </ul> : <p className="mt-2 text-sm">No derived reports yet.</p>}
  </>;
}

export function AnalysisView({ caseId, canWrite }: { caseId: string; canWrite: boolean }) {
  const [jobs, setJobs] = useState<AnalysisJob[] | null>();
  const [evidence, setEvidence] = useState<LiveEvidenceArtifact[] | null>();
  const [selected, setSelected] = useState('');
  const [analyzer, setAnalyzer] = useState<Analyzer>('file-profile');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<CaseSearchResults>();
  const [lineage, setLineage] = useState<{ evidence: LiveEvidenceArtifact; reports: AnalysisJob[] }>();
  const [matches, setMatches] = useState<{ name: string; items: Correlation[] }>();
  const [sources, setSources] = useState<IntelligenceSource[] | null>();

  useEffect(() => {
    let active = true;
    void forensicApi.intelligenceSources().then((data) => { if (active) setSources(data); }, () => { if (active) setSources(null); });
    void Promise.allSettled([forensicApi.listAnalysis(caseId), forensicApi.listEvidence(caseId)])
      .then(([nextJobs, nextEvidence]) => {
        if (!active) return;
        setJobs(nextJobs.status === 'fulfilled' ? nextJobs.value : null);
        setEvidence(nextEvidence.status === 'fulfilled' ? nextEvidence.value : null);
      });
    return () => { active = false; };
  }, [caseId, attempt]);

  const refresh = () => {
    setError('');
    setJobs(undefined);
    setAttempt((value) => value + 1);
  };

  async function run(action: string, operation: () => Promise<void>) {
    setBusy(action);
    setError('');
    try {
      await operation();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Analysis is unavailable.');
    } finally {
      setBusy('');
    }
  }

  function queue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canWrite) return;
    void run('queue', async () => {
      await forensicApi.queueAnalysis(caseId, selected, analyzer);
      refresh();
    });
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get('query')).trim();
    if (!query) return;
    setResults(undefined);
    void run('search', async () => setResults(await forensicApi.searchCase(caseId, query)));
  }

  function inspect(id: string) {
    setLineage(undefined);
    void run('lineage', async () => setLineage(await forensicApi.evidenceLineage(caseId, id)));
  }

  function correlate() {
    const artifact = evidence?.find((item) => item.id === selected);
    if (!artifact) return;
    setMatches(undefined);
    void run('correlate', async () => setMatches({ name: artifact.name, items: await forensicApi.correlations(caseId, artifact.id) }));
  }

  function review(match: Correlation, decision: CorrelationDecision) {
    void run('review', async () => {
      const updated = await forensicApi.reviewCorrelation(caseId, match.evidence_id, match.id, decision);
      setMatches((current) => current && { ...current, items: current.items.map((item) => item.id === match.id ? { ...item, review: updated } : item) });
    });
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">Forensic Analysis</h1>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <Card title="Case jobs" headerAction={<Button size="sm" onClick={refresh} disabled={jobs === undefined || !!busy}>Refresh Jobs</Button>}>
        {evidence === null && <p role="alert">Evidence is unavailable.</p>}
        {!!evidence?.length && (
          <form onSubmit={queue} className="space-y-2">
            <label htmlFor="analysis-evidence" className="block text-sm">Original evidence</label>
            <select id="analysis-evidence" className={field} value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Choose evidence</option>
              {evidence.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {canWrite && <>
              <label htmlFor="analysis-analyzer" className="block text-sm">Analyzer</label>
              <select id="analysis-analyzer" className={field} value={analyzer} onChange={(event) => setAnalyzer(event.target.value as Analyzer)}>
                {Object.entries(analyzers).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </>}
            <div className="flex flex-wrap gap-2">
              {canWrite && <Button type="submit" variant="primary" disabled={!selected || !!busy || !jobs}>Queue Analysis</Button>}
              <Button type="button" variant="outline" disabled={!selected || !!busy} onClick={() => inspect(selected)}>View Lineage</Button>
              <Button type="button" variant="outline" disabled={!selected || !!busy} onClick={correlate}>Show Correlations</Button>
            </div>
          </form>
        )}
        {evidence?.length === 0 && <p className="text-sm">Register evidence to run a file profile.</p>}
        {jobs === undefined ? <p role="status" className="mt-3">Loading jobs…</p> : jobs === null ? (
          <p role="alert" className="mt-3">Analysis jobs are unavailable.</p>
        ) : jobs.length ? (
          <ul className="mt-3">{jobs.map((job) => <Report key={job.id} job={job} />)}</ul>
        ) : <p className="mt-3">No analysis jobs found.</p>}
      </Card>
      {busy === 'correlate' && <p role="status">Checking correlation sources…</p>}
      {matches && <Card title="Evidence correlations" subtitle={matches.name}>
        {!matches.items.length && <p>No matches found in the available sources.</p>}
        <ul className="divide-y divide-slate-200 dark:divide-[#303743]">
          {matches.items.map((match) => <li key={match.id} className="space-y-2 py-3 text-sm">
            <h3 className="font-semibold">{match.kind === 'direct_observation' ? 'Direct observation' : 'External intelligence match'} · {match.related_id}</h3>
            <p>{match.logic}</p>
            {match.context && <p>{match.context}</p>}
            <dl className="space-y-1 text-xs">
              <div><dt className="inline font-semibold">Match </dt><dd className="inline break-all">{match.matched_fields.join(' ↔ ')} · {match.value}</dd></div>
              <div><dt className="inline font-semibold">Confidence </dt><dd className="inline">{match.confidence === 'exact_hash' ? 'Exact hash' : 'Exact identifier'}</dd></div>
              <div><dt className="inline font-semibold">Source </dt><dd className="inline">{match.source} · {new Date(match.source_updated_at).toLocaleString()}</dd></div>
              <div><dt className="inline font-semibold">Supporting evidence </dt><dd className="inline break-all">{match.evidence_id}{match.report_id && ` · Report ${match.report_id}`}</dd></div>
            </dl>
            <p>{match.review ? `${match.review.decision === 'confirmed' ? 'Analyst confirmed the match' : 'Analyst dismissed the match'} · ${match.review.reviewed_by} · ${new Date(match.review.reviewed_at).toLocaleString()}` : 'Awaiting analyst review'}</p>
            {canWrite && <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => review(match, 'confirmed')}>Confirm match</Button>
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => review(match, 'dismissed')}>Dismiss match</Button>
            </div>}
          </li>)}
        </ul>
      </Card>}
      <Card title="Intelligence sources">
        {sources === undefined && <p role="status">Loading source status…</p>}
        {sources === null && <p role="alert">Intelligence source status is unavailable.</p>}
        <ul className="space-y-2 text-sm">{sources?.map((source) => <li key={source.source}>
          <p className="font-semibold">{sourceLabels[source.source] ?? source.source}</p>
          <p>{source.version ? `${source.version} · ${source.source_mode === 'official_https' ? 'Official HTTPS import' : 'Local file import'}` : 'Awaiting first import'}</p>
          {source.observed_at && <p>Source updated {new Date(source.observed_at).toLocaleString()}</p>}
          {source.last_success && <p>Last scheduled success {new Date(source.last_success).toLocaleString()}</p>}
          {source.last_error && <p>Last scheduled sync failed{source.last_attempt && ` at ${new Date(source.last_attempt).toLocaleString()}`}.</p>}
        </li>)}</ul>
      </Card>
      <Card title="Case search">
        <form onSubmit={search} className="flex flex-wrap items-end gap-2">
          <label className="grow text-sm">Evidence, report, or CISA KEV term
            <input name="query" className={field + ' mt-1'} maxLength={160} required />
          </label>
          <Button type="submit" disabled={!!busy}>Search</Button>
        </form>
        {busy === 'search' && <p role="status" className="mt-3">Searching…</p>}
        {results && (
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold">Original evidence ({results.evidence.length})</h3>
            {results.evidence.map((item) => <div key={item.id}>
              <Button variant="ghost" onClick={() => inspect(item.id)} disabled={!!busy}>{item.name}</Button>
            </div>)}
            <h3 className="text-sm font-semibold">Analysis reports ({results.reports.length})</h3>
            <ul>{results.reports.map((job) => <Report key={job.id} job={job} />)}</ul>
            <h3 className="text-sm font-semibold">CISA KEV catalog ({results.intelligence.length})</h3>
            {results.intelligence.map((entry) => <div key={entry.cve_id} className="space-y-1 text-sm">
              <p className="font-semibold">{entry.cve_id} · {entry.title}</p>
              <p>{entry.vendor} · {entry.product}</p>
              <p>{entry.description}</p>
              <p>{entry.action}</p>
              <p className="text-xs">Catalog {entry.catalog_version} · {entry.source_mode === 'official_https' ? 'Official HTTPS import' : 'Local file import'} · {new Date(entry.imported_at).toLocaleDateString()}</p>
            </div>)}
          </div>
        )}
      </Card>
      {busy === 'lineage' && <p role="status">Loading lineage…</p>}
      {lineage && <Card title="Evidence lineage">
        <EvidenceLineage lineage={lineage} />
      </Card>}
    </section>
  );
}
