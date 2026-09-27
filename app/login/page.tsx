'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [teamCode, setTeamCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCode, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "That's not it, Detective.");
        setSubmitting(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Connection interrupted. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink px-4 py-8 flex flex-col justify-between max-w-md mx-auto">
      <div>
        {/* Header with Case stamp aesthetic & Theme Toggle */}
        <header className="mb-6 pt-2 flex justify-between items-start">
          <div>
            <div className="inline-block border-2 border-ink px-2.5 py-1 mb-2 text-xs font-mono font-bold tracking-wider text-ink bg-paper-card">
              CONFIDENTIAL // FIELD DOSSIER
            </div>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight leading-tight text-ink font-bold">
              The Case File
            </h1>
            <p className="text-sm font-medium text-ink mt-1.5 font-body">
              Official investigation portal. Enter team credentials to access your active lead.
            </p>
          </div>
          <ThemeToggle />
        </header>

        {/* Case File Form */}
        <section className="border-2 border-ink bg-paper-card p-6 clip-case relative shadow-md">
          <div className="text-xs font-mono font-bold text-evidence-red mb-4 pb-2 border-b-2 border-line tracking-wider">
            CASE CHECK-IN // DETECTIVE VERIFICATION
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="team-code"
                className="block text-sm font-bold text-ink mb-1.5 uppercase font-mono"
              >
                Team code
              </label>
              <input
                id="team-code"
                type="text"
                autoComplete="off"
                spellCheck="false"
                placeholder="e.g. A1 or B1"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                className="w-full bg-paper border-2 border-ink px-3.5 py-2.5 font-mono text-base font-bold text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none transition-colors"
                required
              />
              <span className="text-xs font-mono font-semibold text-ink-soft mt-1.5 block">
                Found on your dispatch envelope
              </span>
            </div>

            <div>
              <label
                htmlFor="team-pin"
                className="block text-sm font-bold text-ink mb-1.5 uppercase font-mono"
              >
                Passcode PIN
              </label>
              <input
                id="team-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-paper border-2 border-ink px-3.5 py-2.5 font-mono text-base font-bold text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none transition-colors"
                required
              />
            </div>

            {error && (
              <div
                id="login-error"
                className="text-xs md:text-sm font-mono text-evidence-red border-l-4 border-evidence-red pl-3 py-1.5 font-bold bg-evidence-red/10"
              >
                {error}
              </div>
            )}

            <button
              id="login-submit-button"
              type="submit"
              disabled={submitting}
              className="w-full bg-ink text-paper py-3 font-mono font-bold text-sm uppercase tracking-wider hover:bg-ink-soft active:scale-95 transition-all disabled:opacity-50 shadow-md"
            >
              {submitting ? 'Authenticating...' : 'Access Case File'}
            </button>
          </form>
        </section>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 pt-4 border-t-2 border-line text-xs font-mono font-bold text-ink flex justify-between items-center">
        <span>COLLEGE CAMPUS // LIVE EVENT</span>
        <span className="text-evidence-red font-bold">STRICTLY TIMED</span>
      </footer>
    </main>
  );
}
