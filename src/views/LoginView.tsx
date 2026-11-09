import React, { useState } from 'react';
import {
  Lock,
  Key,
  ShieldAlert,
  ArrowRight,
  Cpu,
  CheckCircle2,
  HardDrive,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { ThemeToggle } from '../design-system/ThemeToggle';
import { BrandLogo } from '../components/brand/BrandLogo';
import { cyberAudio } from '../lib/audio';

export interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [investigatorId, setInvestigatorId] = useState('INV-9082');
  const [passphrase, setPassphrase] = useState('••••••••••••');
  const [authMode, setAuthMode] = useState<'PASSWORD' | 'FIDO2'>('PASSWORD');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    cyberAudio.playScan(700);

    setTimeout(() => {
      cyberAudio.playClick(1150, 0.08);
      setIsAuthenticating(false);
      onLoginSuccess();
    }, 900);
  };

  const handleSimulateToken = () => {
    setIsAuthenticating(true);
    cyberAudio.playScan(850);
    setTimeout(() => {
      cyberAudio.playClick(1250, 0.09);
      setIsAuthenticating(false);
      onLoginSuccess();
    }, 700);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-6 bg-[#F5F6F8] dark:bg-[#111318] text-[#202631] dark:text-[#E7EAF0] relative overflow-hidden select-none transition-colors duration-200">
      {/* Background Subtle Grid Texture */}
      <div className="absolute inset-0 bg-forensic-grid opacity-40 pointer-events-none" />

      {/* Top Banner */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#9AA4B2] pb-6 border-b border-slate-200 dark:border-[#303743]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-[#A9772D] dark:text-[#C69A54]" />
          <span>OFFICIAL FORENSIC WORKSTATION // ENCRYPTED SESSION</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-[#337D5C] dark:text-[#4D9B78]" />
            HSM: FIPS 140-3 VALIDATED
          </span>
          <ThemeToggle variant="segmented" />
        </div>
      </div>

      {/* Centerpiece Authentication Terminal Card */}
      <div className="relative z-10 w-full max-w-md my-auto">
        <div className="p-8 rounded-2xl bg-white dark:bg-[#171B22] border border-slate-200 dark:border-[#303743] shadow-xl backdrop-blur-xl transition-colors">
          {/* Brand & Crest */}
          <div className="text-center pb-6 border-b border-slate-100 dark:border-[#303743] flex flex-col items-center">
            <BrandLogo variant="full" size="md" tagline="digital-forensic" />
          </div>

          {/* Auth Method Tabs */}
          <div className="grid grid-cols-2 gap-2 my-5 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('PASSWORD');
                cyberAudio.playClick(800, 0.03);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                authMode === 'PASSWORD'
                  ? 'bg-[#EBF2F9] dark:bg-[#1D232C] text-[#416F9E] dark:text-[#648DBB] border border-[#416F9E]/40 dark:border-[#648DBB]/40 font-bold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              INVESTIGATOR ID
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('FIDO2');
                cyberAudio.playClick(800, 0.03);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                authMode === 'FIDO2'
                  ? 'bg-[#EBF2F9] dark:bg-[#1D232C] text-[#416F9E] dark:text-[#648DBB] border border-[#416F9E]/40 dark:border-[#648DBB]/40 font-bold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              FIDO2 TOKEN / CAC
            </button>
          </div>

          {/* Form Content */}
          {authMode === 'PASSWORD' ? (
            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
                  Investigator Identifier
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={investigatorId}
                    onChange={(e) => setInvestigatorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] focus:border-[#416F9E] dark:focus:border-[#648DBB] outline-none transition-colors shadow-sm"
                  />
                  <CheckCircle2 className="w-4 h-4 text-[#337D5C] dark:text-[#4D9B78] absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
                  Enclave Master Passphrase
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-300 dark:border-[#303743] text-slate-900 dark:text-[#E7EAF0] focus:border-[#416F9E] dark:focus:border-[#648DBB] outline-none transition-colors shadow-sm"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isAuthenticating}
                  className="w-full py-2.5"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {isAuthenticating ? 'Decrypting Workstation...' : 'Authenticate & Unlock'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 font-mono text-xs text-center py-2">
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#EBF2F9] dark:bg-[#1A2838] border border-[#416F9E]/30 dark:border-[#648DBB]/30 flex items-center justify-center text-[#416F9E] dark:text-[#648DBB]">
                  <CreditCard className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="text-slate-900 dark:text-[#E7EAF0] font-bold">PIV / CAC HARDWARE CHIP</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                    Insert government smartcard or FIDO2 hardware authenticator
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                disabled={isAuthenticating}
                onClick={handleSimulateToken}
                className="w-full py-2.5"
                icon={<Lock className="w-4 h-4" />}
              >
                {isAuthenticating ? 'Reading Hardware Enclave...' : 'Simulate Token Insertion'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Telemetry */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-slate-500 dark:text-[#9AA4B2] pt-6 border-t border-slate-200 dark:border-[#303743]">
        <div>ISO/IEC 27037:2012 COMPLIANT // FORENSIC WRITE-BLOCKING ENFORCED</div>
        <div className="flex items-center gap-4">
          <span>HSM SHA-512 ROOT</span>
          <span>LEGAL HOLD CONTINUITY</span>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
