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
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { cyberAudio } from '../lib/audio';

interface LoginViewProps {
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
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-6 bg-[#07090E] relative overflow-hidden select-none">
      {/* Background Cybernetic Texture */}
      <div className="absolute inset-0 bg-cyber-grid opacity-35 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00F2FE]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Banner */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between text-[11px] font-mono text-slate-500 pb-6 border-b border-white/5">
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>OFFICIAL FORENSIC WORKSTATION // ENCRYPTED SESSION</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>HSM: FIPS 140-3 VALIDATED</span>
          <span>NODE: US-EAST-04</span>
        </div>
      </div>

      {/* Centerpiece Authentication Terminal Card */}
      <div className="relative z-10 w-full max-w-md my-auto">
        <div className="p-8 rounded-2xl bg-[#0B0F17]/95 border border-white/15 shadow-2xl backdrop-blur-2xl">
          {/* Brand & Crest */}
          <div className="text-center pb-6 border-b border-white/10">
            <div className="mx-auto w-12 h-12 rounded-xl bg-cyan-950/80 border border-[#00F2FE]/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.3)] mb-3">
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
                  ? 'bg-[#121622] text-[#00F2FE] border border-[#00F2FE]/40 font-bold'
                  : 'text-slate-400 hover:text-white border border-transparent'
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
                  ? 'bg-[#121622] text-[#00F2FE] border border-[#00F2FE]/40 font-bold'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              FIDO2 TOKEN / CAC
            </button>
          </div>

          {/* Auth Form */}
          {authMode === 'PASSWORD' ? (
            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">
                  INVESTIGATOR BADGE ID
                </label>
                <input
                  type="text"
                  value={investigatorId}
                  onChange={(e) => setInvestigatorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/10 text-white font-mono text-xs focus:border-[#00F2FE]/60 outline-none transition-colors"
                  placeholder="e.g. INV-9082"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">
                  CASE ENCRYPTION PASSPHRASE
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/10 text-white font-mono text-xs focus:border-[#00F2FE]/60 outline-none transition-colors"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isAuthenticating}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {isAuthenticating ? 'VERIFYING CREDENTIALS...' : 'AUTHENTICATE & ENTER'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 text-center py-4 font-mono text-xs">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#121622] border border-[#00F2FE]/40 flex items-center justify-center text-[#00F2FE] animate-pulse">
                <Key className="w-8 h-8" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">HARDWARE TOKEN READY</div>
                <p className="text-slate-400 text-xs mt-1 font-sans">
                  Insert your FIDO2 YubiKey, PIV, or Common Access Card (CAC) into the hardware terminal.
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleSimulateToken}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? 'READING ENCLAVE KEY...' : 'SIMULATE HARDWARE TOUCH'}
              </Button>
            </div>
          )}

          {/* Legal Warning Notice */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
              WARNING: Authorized DFIR personnel only. All access, keystrokes, and memory transfers are cryptographically logged under chain of custody.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="relative z-10 w-full max-w-4xl text-center text-[10px] font-mono text-slate-600 pt-6 border-t border-white/5">
        FORENTRACE KERNEL v2026.11 // CRYPTOGRAPHIC CHAIN OF CUSTODY CERTIFIED
      </div>
    </div>
  );
};
