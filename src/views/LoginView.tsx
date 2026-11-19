import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../design-system/Button';
import { ThemeToggle } from '../design-system/ThemeToggle';
import { BrandLogo } from '../components/brand/BrandLogo';
import { forensicApi, type SessionIdentity } from '../api/client';

export function LoginView({ onLoginSuccess, sessionError }: {
  onLoginSuccess: (identity: SessionIdentity) => void;
  sessionError: string;
}) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError('');
    try {
      const identity = await forensicApi.login(String(data.get('username')), String(data.get('password')));
      form.reset();
      onLoginSuccess(identity);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Sign-in failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative min-h-screen grid place-items-center p-6 bg-[#F5F6F8] dark:bg-[#111318] text-[#202631] dark:text-[#E7EAF0]">
      <div className="absolute top-6 right-6"><ThemeToggle variant="segmented" /></div>
      <div className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-[#171B22] border border-slate-200 dark:border-[#303743] shadow-xl">
        <div className="pb-6 mb-6 border-b border-slate-200 dark:border-[#303743]">
          <BrandLogo variant="full" size="md" tagline="digital-forensic" />
        </div>
        <h1 className="text-lg font-bold mb-4">Investigator sign-in</h1>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">
            Investigator ID
            <input name="username" autoComplete="username" maxLength={64} required
              className="block w-full mt-1.5 p-2.5 rounded-lg border border-slate-300 dark:border-[#303743] bg-transparent" />
          </label>
          <label className="block text-sm">
            Password
            <input name="password" type="password" autoComplete="current-password" maxLength={256} required
              className="block w-full mt-1.5 p-2.5 rounded-lg border border-slate-300 dark:border-[#303743] bg-transparent" />
          </label>
          {(error || sessionError) && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error || sessionError}</p>}
          <Button type="submit" variant="primary" disabled={pending} className="w-full"
            icon={<ArrowRight className="w-4 h-4" />}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  );
}
