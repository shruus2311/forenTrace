import React, { useState } from 'react';
import {
  Radio,
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
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-6 bg-[#06080E] relative overflow-hidden select-none">
      {/* Background Cybernetic Texture */}
      <div className="absolute inset-0 bg-cyber-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Banner */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between text-[11px] font-mono text-slate-500 pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>OFFICIAL FORENSIC WORKSTATION // ENCRYPTED SESSION</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            HSM: FIPS 140-3 VALIDATED
          </span>
          <span>NODE: US-EAST-04</span>
        </div>
      </div>

      {/* Centerpiece Authentication Terminal Card */}
      <div className="relative z-10 w-full max-w-md my-auto">
        <div className="p-8 rounded-2xl bg-[#090D17]/95 border border-white/[0.1] shadow-2xl backdrop-blur-2xl">
          {/* Brand & Crest */}
          <div className="text-center pb-6 border-b border-white/[0.08]">
            <div className="mx-auto w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.25)] mb-3">
              <Radio className="w-6 h-6 text-[#00F2FE]" />
            </div>
            <h1 className="font-display font-extrabold text-2xl tracking-wider text-white">
              FOREN<span className="text-[#00F2FE]">TRACE</span>
            </h1>
            <div className="font-mono text-[10px] text-[#00F2FE]/80 tracking-widest uppercase mt-1">
              DIGITAL FORENSICS & THREAT INTELLIGENCE
            </div>
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
                  ? 'bg-[#101726] text-[#00F2FE] border border-cyan-400/40 font-bold shadow-[0_0_12px_rgba(0,242,254,0.1)]'
                  : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.04]'
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
                  ? 'bg-[#101726] text-[#00F2FE] border border-cyan-400/40 font-bold shadow-[0_0_12px_rgba(0,242,254,0.1)]'
                  : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.04]'
              }`}
            >
              FIDO2 TOKEN / CAC
            </button>
          </div>

          {/* Form Content */}
          {authMode === 'PASSWORD' ? (
            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-400 text-[10px] uppercase mb-1">
                  Investigator Identifier
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={investigatorId}
                    onChange={(e) => setInvestigatorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#060910] border border-white/10 text-white focus:border-cyan-400/50 outline-none transition-colors"
                  />
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase mb-1">
                  Enclave Master Passphrase
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#060910] border border-white/10 text-white focus:border-cyan-400/50 outline-none transition-colors"
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
              <div className="p-5 rounded-xl bg-[#060910] border border-white/10 flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-400/30 flex items-center justify-center text-[#00F2FE]">
                  <CreditCard className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="text-white font-bold">PIV / CAC HARDWARE CHIP</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">
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
      <div className="relative z-10 w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-slate-500 pt-6 border-t border-white/[0.08]">
        <div>ISO/IEC 27037:2012 COMPLIANT // FORENSIC WRITE-BLOCKING ENFORCED</div>
        <div className="flex items-center gap-4">
          <span>HSM SHA-512 ROOT</span>
          <span>LEGAL HOLD CONTINUITY</span>
        </div>
      </div>
    </div>
  );
};
