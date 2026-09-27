'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Access denied.');
        setSubmitting(false);
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError('Connection failed. Please retry.');
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink p-4 flex flex-col justify-center items-center font-mono">
      <div className="w-full max-w-sm border-2 border-ink p-6 bg-paper">
        <div className="text-xs text-ink-soft mb-1">CONTROL ROOM // AUTH</div>
        <h1 className="font-display text-2xl mb-4 text-ink">Organizer Console</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="admin-passcode"
              className="block text-xs uppercase tracking-wider text-ink-soft mb-1 font-semibold"
            >
              Admin Passcode
            </label>
            <input
              id="admin-passcode"
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-paper border-2 border-line px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none"
              required
            />
          </div>

          {error && (
            <div
              id="admin-login-error"
              className="text-xs text-evidence-red border-l-2 border-evidence-red pl-2 py-1 font-semibold"
            >
              {error}
            </div>
          )}

          <button
            id="admin-login-button"
            type="submit"
            disabled={submitting}
            className="w-full bg-ink text-paper py-2.5 text-xs uppercase tracking-wider font-semibold hover:bg-ink-soft transition-colors disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : 'Submit'}
          </button>
        </form>
      </div>
    </main>
  );
}
