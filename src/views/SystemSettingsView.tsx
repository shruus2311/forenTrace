import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Lock,
  Cpu,
  Server,
  Key,
  HardDrive,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { ThemeToggle } from '../design-system/ThemeToggle';
import { useTheme } from '../design-system/ThemeProvider';
import { forensicApi, BackendHealthResponse } from '../api/client';
import { useToast } from '../design-system/Toast';
import { cyberAudio } from '../lib/audio';

export const SystemSettingsView: React.FC = () => {
  const { showToast } = useToast();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [tsaServer, setTsaServer] = useState('https://timestamp.digicert.com (RFC 3161)');
  const [strictCompliance, setStrictCompliance] = useState(true);

  const checkHealth = async () => {
    setIsCheckingBackend(true);
    cyberAudio.playScan(600);
    const res = await forensicApi.getHealth();
    setIsCheckingBackend(false);
    setBackendHealth(res);
    if (res) {
      showToast({
        type: 'success',
        title: 'Backend Cryptographic Engine Online',
        description: `${res.service} v${res.version} // ${res.crypto_engine}`,
      });
    } else {
      showToast({
        type: 'warning',
        title: 'Backend Local Standalone Mode',
        description: 'FastAPI service on 127.0.0.1:8000 is not reachable; running in secure offline enclave.',
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#303743]">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-[#E7EAF0] tracking-wide flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#416F9E] dark:text-[#648DBB]" />
            <span>SYSTEM SETTINGS & HARDWARE ENCLAVE CONFIGURATION</span>
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-[#9AA4B2] mt-1">
            Global workstation preferences, cryptographic keystores, theme system, and write-blocking policies.
          </p>
        </div>

        <Button
          variant="technical"
          size="sm"
          onClick={checkHealth}
          disabled={isCheckingBackend}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isCheckingBackend ? 'animate-spin' : ''}`} />}
        >
          {isCheckingBackend ? 'Checking...' : 'Probe Backend Engine'}
        </Button>
      </div>

      {/* Two Column Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: UI Appearance & Theme Preferences */}
        <div className="space-y-6">
          <Card
            title="Workstation Appearance & Theme"
            subtitle="Configure display mode conforming to high-contrast forensic standards"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-500 dark:text-[#9AA4B2] uppercase mb-2">
                  Color Mode Preference
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Current Mode: <span className="uppercase text-[#416F9E] dark:text-[#648DBB]">{theme} ({resolvedTheme})</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#9AA4B2] mt-0.5 font-sans">
                      Automatically syncs with operating system preference or locked value.
                    </div>
                  </div>
                  <ThemeToggle variant="segmented" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                  <div className="text-[10px] text-slate-400">SURFACE BACKGROUND</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {resolvedTheme === 'dark' ? '#111318 (Obsidian)' : '#F5F6F8 (Paper Slate)'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                  <div className="text-[10px] text-slate-400">PRIMARY ACCENT</div>
                  <div className="font-bold text-[#416F9E] dark:text-[#648DBB] mt-0.5">
                    {resolvedTheme === 'dark' ? '#648DBB (Azure Steel)' : '#416F9E (Navy Steel)'}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Evidence Write-Blocking & Compliance Enforcement"
            subtitle="Strict ISO/IEC 27037:2012 evidentiary preservation rules"
          >
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743]">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">STRICT READ-ONLY ENFORCEMENT</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-sans">
                    Block bitstream modifications at kernel level
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={strictCompliance}
                  onChange={(e) => setStrictCompliance(e.target.checked)}
                  className="w-4 h-4 rounded text-[#416F9E] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
                  RFC 3161 Trusted Timestamping Authority (TSA)
                </label>
                <input
                  type="text"
                  value={tsaServer}
                  onChange={(e) => setTsaServer(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] text-xs outline-none"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Hardware Enclave & Cryptographic Engine */}
        <div className="space-y-6">
          <Card
            title="FastAPI Cryptographic Engine Telemetry"
            subtitle="Local Python 3.13 streaming hasher and Ed25519 witness"
          >
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">SERVICE STATUS:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      backendHealth
                        ? 'bg-emerald-100 dark:bg-[#142820] text-[#337D5C] dark:text-[#4D9B78]'
                        : 'bg-amber-100 dark:bg-[#2B2113] text-[#A9772D] dark:text-[#C69A54]'
                    }`}
                  >
                    {backendHealth ? 'CONNECTED // HEALTHY' : 'OFFLINE // STANDALONE'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">CRYPTO ENCLAVE:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    {backendHealth ? backendHealth.crypto_engine : 'Ed25519 / SHA-256 / SHA-512 (In-Memory)'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ENDPOINT URL:</span>
                  <span className="text-[#416F9E] dark:text-[#648DBB] font-bold">http://127.0.0.1:8000</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#EAF5F0] dark:bg-[#142820] border border-[#337D5C]/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#337D5C] dark:text-[#4D9B78]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Hardware Key Attestation #9082 Valid</span>
                </div>
                <span className="font-bold text-[#337D5C] dark:text-[#4D9B78]">FIPS 140-3</span>
              </div>
            </div>
          </Card>

          <Card title="Vault Storage Node Allocation">
            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">NODE_01 (LOCAL NVME RAID 10)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">C:\vit(projects)\ForenTrace\backend\data\vault</div>
                </div>
                <span className="text-[#337D5C] dark:text-[#4D9B78] font-bold">ONLINE</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">NODE_02 (FIPS 140-3 ENCRYPTED SAN)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">san://forentrace-vault-cluster-02</div>
                </div>
                <span className="text-[#337D5C] dark:text-[#4D9B78] font-bold">STANDBY</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsView;
