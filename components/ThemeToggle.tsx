'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('technohunt-theme') as 'light' | 'dark' | null;
    const initial = saved || 'light';
    setTheme(initial);
    if (initial === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('technohunt-theme', next);
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-xs font-mono font-bold px-2.5 py-1 border-2 border-ink bg-paper-card text-ink hover:bg-ink hover:text-paper active:scale-95 transition-all rounded shadow-sm flex items-center gap-1.5"
      title="Switch between Light and Dark mode"
    >
      <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
      <span className="uppercase text-[11px] font-bold">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
