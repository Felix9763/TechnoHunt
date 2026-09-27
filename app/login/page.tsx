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
        {/* Newspaper Style Dateline Header */}
        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-ink-mid pb-1.5 border-b border-line-light uppercase tracking-widest">
          <span>SPECIAL INVESTIGATION DISPATCH</span>
          <span className="text-evidence-red">EDITION 01</span>
        </div>

        {/* Newspaper Masthead */}
        <header className="mb-6 pt-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-block border border-line px-2 py-0.5 mb-2 text-[10px] font-mono font-bold tracking-widest text-ink-mid bg-paper-inset uppercase">
                CONFIDENTIAL // CASE DOSSIER
              </div>
              <h1 className="font-serif text-3xl md:text-4xl tracking-tight leading-tight text-ink font-bold">
                The Case File
              </h1>
              <p className="text-xs md:text-sm font-serif text-ink-mid mt-1.5 leading-relaxed">
                Official investigation portal. Enter team credentials from your dispatch envelope to access your active lead.
              </p>
            </div>
            <div className="pt-1">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Case File Check-In Card */}
        <section className="news-card p-6 relative shadow-md">
          <div className="text-xs font-mono font-bold text-evidence-red mb-4 pb-2 border-b border-line-light tracking-wider flex justify-between items-center uppercase">
            <span>DETECTIVE IDENTIFICATION</span>
            <span className="text-ink-soft text-[10px]">SEC-AUTH</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="team-code"
                className="block text-xs font-bold text-ink mb-1.5 uppercase font-mono tracking-wider"
              >
                Team Code
              </label>
              <input
                id="team-code"
                type="text"
                autoComplete="off"
                spellCheck="false"
                placeholder="e.g. A1, B2..."
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                className="w-full bg-paper border-2 border-line px-3.5 py-2.5 font-mono text-base font-bold text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none transition-colors"
                required
              />
              <span className="text-[11px] font-mono text-ink-soft mt-1 block">
                Found on your team dispatch envelope
              </span>
            </div>

            <div>
              <label
                htmlFor="team-pin"
                className="block text-xs font-bold text-ink mb-1.5 uppercase font-mono tracking-wider"
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
                className="w-full bg-paper border-2 border-line px-3.5 py-2.5 font-mono text-base font-bold text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none transition-colors"
                required
              />
            </div>

            {error && (
              <div
                id="login-error"
                className="text-xs md:text-sm font-mono text-evidence-red border-l-4 border-evidence-red pl-3 py-1.5 font-bold bg-paper-inset"
              >
                {error}
              </div>
            )}

            <button
              id="login-submit-button"
              type="submit"
              disabled={submitting}
              className="w-full bg-ink text-paper py-3 font-mono font-bold text-sm uppercase tracking-wider hover:bg-ink-mid active:scale-95 transition-all disabled:opacity-50 shadow-md mt-2"
            >
              {submitting ? 'Authenticating...' : 'Access Case File'}
            </button>
          </form>
        </section>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 pt-3 border-t border-line text-[11px] font-mono font-bold text-ink-soft flex justify-between items-center">
        <span>CAMPUS EVENT // DETECTIVE DIVISION</span>
        <span className="text-evidence-red">STRICTLY TIMED</span>
      </footer>
    </main>
  );
}
