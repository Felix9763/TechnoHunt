'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        {/* Header with Case stamp aesthetic */}
        <header className="mb-8 pt-4">
          <div className="inline-block border border-ink-soft px-2.5 py-1 mb-3 text-xs font-mono tracking-wider text-ink-soft transform -rotate-1">
            CONFIDENTIAL // FIELD DOSSIER
          </div>
          <h1 className="font-display text-3xl tracking-tight leading-tight text-ink transform rotate-1">
            The Case File
          </h1>
          <p className="text-sm text-ink-soft mt-1.5 font-body">
            Official investigation portal. Enter team credentials to access your active lead.
          </p>
        </header>

        {/* Case File Form */}
        <section className="border border-line bg-paper/60 p-5 clip-case relative">
          <div className="text-xs font-mono text-ink-soft mb-4 pb-2 border-b border-line">
            CASE CHECK-IN // DETECTIVE VERIFICATION
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="team-code"
                className="block text-sm font-medium text-ink mb-1"
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
                className="w-full bg-paper border-2 border-line px-3.5 py-2.5 font-mono text-base text-ink placeholder:text-ink-soft/50 focus:border-ink focus:outline-none transition-colors"
                required
              />
              <span className="text-xs text-ink-soft mt-1 block">
                Found on your dispatch envelope
              </span>
            </div>

            <div>
              <label
                htmlFor="team-pin"
                className="block text-sm font-medium text-ink mb-1"
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
                className="w-full bg-paper border-2 border-line px-3.5 py-2.5 font-mono text-base text-ink placeholder:text-ink-soft/50 focus:border-ink focus:outline-none tracking-widest transition-colors"
                required
              />
            </div>

            {error && (
              <div
                id="login-error"
                className="border-l-4 border-evidence-red bg-evidence-red/10 p-3 text-sm text-evidence-red font-medium"
              >
                {error}
              </div>
            )}

            <button
              id="submit-login-button"
              type="submit"
              disabled={submitting}
              className="w-full bg-ink text-paper py-3 font-medium text-sm hover:bg-ink-soft active:translate-y-0.5 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Checking credentials...' : 'Submit'}
            </button>
          </form>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-line text-xs font-mono text-ink-soft">
        <div>COHO INVESTIGATION UNIT</div>
        <div className="mt-1 text-ink-soft/75">Stationed campus personnel only</div>
      </footer>
    </main>
  );
}
