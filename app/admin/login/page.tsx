'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

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
      <div className="w-full max-w-sm news-card p-6 shadow-md border-2 border-ink">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-line-light">
          <div className="text-xs text-evidence-red font-bold uppercase tracking-wider">CONTROL ROOM // AUTH</div>
          <ThemeToggle />
        </div>
        <h1 className="font-serif text-2xl font-bold mb-4 text-ink">Organizer Console</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="admin-passcode"
              className="block text-xs uppercase tracking-wider text-ink mb-1 font-bold"
            >
              Admin Passcode
            </label>
            <input
              id="admin-passcode"
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-paper-inset border-2 border-line px-3.5 py-2.5 text-sm font-bold text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none"
              required
            />
          </div>

          {error && (
            <div
              id="admin-login-error"
              className="text-xs text-evidence-red border-l-4 border-evidence-red pl-2.5 py-1 font-bold bg-paper-inset"
            >
              {error}
            </div>
          )}

          <button
            id="admin-login-button"
            type="submit"
            disabled={submitting}
            className="w-full bg-evidence-red text-[#FFFDF8] py-3 text-xs uppercase tracking-wider font-bold hover:opacity-90 transition-all border-2 border-[#541212] disabled:opacity-50 shadow mt-2"
          >
            {submitting ? 'Verifying...' : 'Access Organizer Room →'}
          </button>
        </form>
      </div>
    </main>
  );
}
