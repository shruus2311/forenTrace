import React, { useState } from 'react';
import { ThemeProvider } from './design-system/ThemeProvider';
import { ToastProvider } from './design-system/Toast';
import { CommandMenu } from './design-system/CommandMenu';
import { Sidebar } from './components/shell/Sidebar';
import { TopBar } from './components/shell/TopBar';

// Forensic Workspaces
import { DashboardView } from './views/DashboardView';
import { CaseManagementView } from './views/CaseManagementView';
import { ProvenanceGraphView } from './views/ProvenanceGraphView';
import { EvidenceRepositoryView } from './views/EvidenceRepositoryView';
import { EvidenceAcquisitionView } from './views/EvidenceAcquisitionView';
import { DiskForensicsView } from './views/DiskForensicsView';
import { HexAnalyzerView } from './views/HexAnalyzerView';
import { NetworkForensicsView } from './views/NetworkForensicsView';
import { ThreatIntelligenceView } from './views/ThreatIntelligenceView';
import { ChainOfCustodyView } from './views/ChainOfCustodyView';
import { ForensicReportsView } from './views/ForensicReportsView';
import { AuditTrailView } from './views/AuditTrailView';
import { UserManagementView } from './views/UserManagementView';
import { SystemSettingsView } from './views/SystemSettingsView';
import { LoginView } from './views/LoginView';

import { CASES } from './data/mockForensicsData';

export const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeCaseId, setActiveCaseId] = useState('case-01');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  const activeCase = CASES.find((c) => c.id === activeCaseId) || CASES[0];

  // If not authenticated, show the specialized workstation login terminal
  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F5F6F8] dark:bg-[#111318] text-[#202631] dark:text-[#E7EAF0] font-sans transition-colors duration-200">
        {/* Workstation Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeCaseId={activeCaseId}
          onSelectCase={(id) => setActiveCaseId(id)}
        />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-[#F5F6F8] dark:bg-[#111318] relative transition-colors duration-200">
          {/* Subtle Ambient Background Grid */}
          <div className="absolute inset-0 bg-forensic-grid opacity-30 pointer-events-none z-0" />

          {/* Top Bar Navigation */}
          <TopBar
            onOpenCommandMenu={() => setCommandMenuOpen(true)}
            activeCaseNumber={activeCase.caseNumber}
            onLogout={() => setIsAuthenticated(false)}
          />

          {/* Main Scrollable View Container */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10">
            <div className="max-w-7xl mx-auto space-y-6">
              {currentView === 'dashboard' && (
                <DashboardView
                  activeCaseId={activeCaseId}
                  onNavigate={(view) => setCurrentView(view)}
                />
              )}
              {currentView === 'cases' && (
                <CaseManagementView
                  activeCaseId={activeCaseId}
                  onSelectCase={(id) => setActiveCaseId(id)}
                  onNavigate={(view) => setCurrentView(view)}
                />
              )}
              {(currentView === 'workspace' || currentView === 'timeline') && (
                <ProvenanceGraphView />
              )}
              {(currentView === 'evidence' || currentView === 'integrity') && (
                <EvidenceRepositoryView />
              )}
              {currentView === 'acquisition' && <EvidenceAcquisitionView />}
              {(currentView === 'disk' || currentView === 'artifacts') && (
                <DiskForensicsView />
              )}
              {(currentView === 'memory' || currentView === 'malware') && (
                <HexAnalyzerView />
              )}
              {currentView === 'network' && <NetworkForensicsView />}
              {currentView === 'threat-intel' && <ThreatIntelligenceView />}
              {currentView === 'custody' && <ChainOfCustodyView />}
              {currentView === 'reports' && <ForensicReportsView />}
              {currentView === 'audit' && <AuditTrailView />}
              {currentView === 'users' && <UserManagementView />}
              {currentView === 'settings' && <SystemSettingsView />}
            </div>
          </main>
        </div>

        {/* Global Command Palette (Ctrl+K) */}
        <CommandMenu
          isOpen={commandMenuOpen}
          onClose={() => setCommandMenuOpen(false)}
          onNavigate={(view) => setCurrentView(view)}
          onSelectCase={(id) => setActiveCaseId(id)}
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
