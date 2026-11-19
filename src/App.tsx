import React, { useEffect, useRef, useState } from 'react';
import { ThemeProvider } from './design-system/ThemeProvider';
import { ToastProvider } from './design-system/Toast';
import { CommandMenu, LIVE_WORKSPACES } from './design-system/CommandMenu';
import { Sidebar } from './components/shell/Sidebar';
import { TopBar } from './components/shell/TopBar';

// Forensic Workspaces
import { DashboardView } from './views/DashboardView';
import { ProvenanceGraphView } from './views/ProvenanceGraphView';
import { EvidenceRepositoryView } from './views/EvidenceRepositoryView';
import { EvidenceAcquisitionView } from './views/EvidenceAcquisitionView';
import { DiskForensicsView } from './views/DiskForensicsView';
import { HexAnalyzerView } from './views/HexAnalyzerView';
import { NetworkForensicsView } from './views/NetworkForensicsView';
import { ThreatIntelligenceView } from './views/ThreatIntelligenceView';
import { ChainOfCustodyView } from './views/ChainOfCustodyView';
import { AnalysisView } from './views/AnalysisView';
import { ForensicReportsView } from './views/ForensicReportsView';
import { AuditTrailView } from './views/AuditTrailView';
import { UserManagementView } from './views/UserManagementView';
import { SystemSettingsView } from './views/SystemSettingsView';
import { SecurityWorkspace } from './views/SecurityWorkspace';
import { LoginView } from './views/LoginView';

import { forensicApi, type SessionIdentity } from './api/client';
import { Button } from './design-system/Button';

export const AppContent = () => {
  const [identity, setIdentity] = useState<SessionIdentity | null>();
  const [sessionError, setSessionError] = useState('');
  const [currentView, setCurrentView] = useState('evidence');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const signOut = useRef<{ expired: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    const expire = () => {
      if (signOut.current) {
        signOut.current.expired = true;
        return;
      }
      setIdentity(null);
      setSessionError('Your session has ended. Sign in again.');
    };
    window.addEventListener('forentrace-session-expired', expire);
    void forensicApi.getSession().then((session) => {
      if (active) setIdentity(session);
    }).catch((failure) => {
      if (active) {
        setIdentity(null);
        setSessionError(failure instanceof Error ? failure.message : 'Sign-in service unavailable.');
      }
    });
    return () => {
      active = false;
      window.removeEventListener('forentrace-session-expired', expire);
    };
  }, []);

  if (identity === undefined) return <p className="p-6" role="status">Checking session…</p>;
  if (identity === null) {
    return (
      <ToastProvider>
        <LoginView sessionError={sessionError} onLoginSuccess={(session) => {
          setCurrentView('evidence');
          setSelectedCaseId('');
          setCommandMenuOpen(false);
          setSessionError('');
          setIdentity(session);
        }} />
      </ToastProvider>
    );
  }

  const activeCase = identity.cases.find((item) => item.id === selectedCaseId) ?? identity.cases[0];
  const activeCaseId = activeCase?.id ?? '';
  const canWrite = activeCase?.role === 'investigator';
  const caseAvailable = activeCase && !activeCase.restriction;
  const showDemo = identity.organization_id === 'demo' && activeCaseId === 'case-01' && !!caseAvailable;
  const view = showDemo || LIVE_WORKSPACES.includes(currentView)
    ? currentView : 'evidence';

  async function refreshSession() {
    const snapshot = identity;
    const next = await forensicApi.getSession();
    setIdentity((current) => current === snapshot ? next : current);
  }

  async function logout() {
    if (signOut.current) return;
    const attempt = { expired: false };
    signOut.current = attempt;
    try {
      await forensicApi.logout();
      setSessionError('');
      setIdentity(null);
    } catch {
      if (attempt.expired) {
        setIdentity(null);
        setSessionError('Your session has ended. Sign in again.');
      } else {
        setSessionError('Sign-out could not be confirmed. Try again.');
      }
    } finally {
      signOut.current = null;
    }
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F5F6F8] dark:bg-[#111318] text-[#202631] dark:text-[#E7EAF0] font-sans transition-colors duration-200">
        {/* Workstation Sidebar */}
        <Sidebar
          currentView={view}
          onNavigate={(view) => setCurrentView(view)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeCaseId={activeCaseId}
          onSelectCase={setSelectedCaseId}
          cases={identity.cases}
          organizationId={identity.organization_id}
          showDemo={showDemo}
        />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-[#F5F6F8] dark:bg-[#111318] relative transition-colors duration-200">
          {/* Subtle Ambient Background Grid */}
          <div className="absolute inset-0 bg-forensic-grid opacity-30 pointer-events-none z-0" />

          {/* Top Bar Navigation */}
          <TopBar
            onOpenCommandMenu={() => setCommandMenuOpen(true)}
            activeCaseNumber={activeCaseId || 'No assigned case'}
            username={identity.username}
            organizationId={identity.organization_id}
            onLogout={logout}
          />

          {/* Main Scrollable View Container */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10">
            <div className="max-w-7xl mx-auto space-y-6">
              {sessionError && <p role="alert">{sessionError}</p>}
              {activeCase?.restriction && view !== 'settings' && view !== 'cases' && (
                <div className="space-y-2">
                  <p role="alert">{activeCase.restriction}</p>
                  <Button variant="outline" onClick={() => setCurrentView('settings')}>Open Security Settings</Button>
                </div>
              )}
              {!activeCase && view !== 'settings' && view !== 'cases' && <p>No cases are assigned to your account.</p>}
              {view === 'dashboard' && (
                <DashboardView
                  activeCaseId={activeCaseId}
                  onNavigate={(view) => setCurrentView(view)}
                />
              )}
              {view === 'cases' && (
                <section className="space-y-3">
                  <h1 className="text-2xl font-bold">Assigned cases</h1>
                  {identity.cases.length === 0 && <p>No cases are assigned to your account.</p>}
                  {identity.cases.map((item) => <div key={item.id}>
                    <Button variant="outline" onClick={() => { setSelectedCaseId(item.id); setCurrentView('evidence'); }}>
                      {item.id} · {item.role}
                    </Button>
                  </div>)}
                </section>
              )}
              {(view === 'workspace' || view === 'timeline') && (
                <ProvenanceGraphView />
              )}
              {caseAvailable && (view === 'evidence' || view === 'integrity') && (
                <EvidenceRepositoryView caseId={activeCaseId} canWrite={canWrite} />
              )}
              {caseAvailable && view === 'acquisition' && (
                <EvidenceAcquisitionView key={activeCaseId} activeCase={activeCase} onViewVault={() => setCurrentView('evidence')} />
              )}
              {(view === 'disk' || view === 'artifacts') && (
                <DiskForensicsView />
              )}
              {(view === 'memory' || view === 'malware') && (
                <HexAnalyzerView />
              )}
              {view === 'network' && <NetworkForensicsView />}
              {view === 'threat-intel' && <ThreatIntelligenceView />}
              {caseAvailable && view === 'custody' && <ChainOfCustodyView key={activeCaseId} caseId={activeCaseId} canWrite={canWrite} />}
              {caseAvailable && view === 'analysis' && <AnalysisView key={activeCaseId} caseId={activeCaseId} canWrite={canWrite} />}
              {view === 'reports' && <ForensicReportsView />}
              {view === 'audit' && <AuditTrailView />}
              {view === 'users' && <UserManagementView />}
              {view === 'settings' && <><SecurityWorkspace activeCase={activeCase} refreshSession={refreshSession} /><SystemSettingsView /></>}
            </div>
          </main>
        </div>

        {/* Global Command Palette (Ctrl+K) */}
        <CommandMenu
          isOpen={commandMenuOpen}
          onClose={() => setCommandMenuOpen(false)}
          onNavigate={(view) => setCurrentView(view)}
          onSelectCase={setSelectedCaseId}
          cases={identity.cases}
          showDemo={showDemo}
        />
      </div>
    </ToastProvider>
  );
};

export const App = () => {
  return (
    <ThemeProvider defaultTheme="dark">
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
