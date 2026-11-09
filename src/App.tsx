import React, { useState } from 'react';
import { ToastProvider } from './design-system/Toast';
import { CommandMenu } from './design-system/CommandMenu';
import { Sidebar } from './components/shell/Sidebar';
import { TopBar } from './components/shell/TopBar';
import { DashboardView } from './views/DashboardView';
import { EvidenceRepositoryView } from './views/EvidenceRepositoryView';
import { ProvenanceGraphView } from './views/ProvenanceGraphView';
import { HexAnalyzerView } from './views/HexAnalyzerView';
import { ChainOfCustodyView } from './views/ChainOfCustodyView';
import { LoginView } from './views/LoginView';
import { CASES } from './data/mockForensicsData';

export const App = () => {
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
      <div className="flex h-screen w-screen overflow-hidden bg-[#06080E] text-slate-100 font-sans selection:bg-[#00F2FE] selection:text-black">
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
        <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-[#06080E] relative">
          {/* Subtle Ambient Background Grid */}
          <div className="absolute inset-0 bg-cyber-grid opacity-30 pointer-events-none z-0" />

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
              {currentView === 'evidence' && <EvidenceRepositoryView />}
              {currentView === 'provenance' && <ProvenanceGraphView />}
              {currentView === 'hex' && <HexAnalyzerView />}
              {currentView === 'custody' && <ChainOfCustodyView />}
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

export default App;
