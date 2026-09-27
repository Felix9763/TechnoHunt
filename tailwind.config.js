/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-card': 'var(--color-paper-card)',
        'paper-inset': 'var(--color-paper-inset)',
        ink: 'var(--color-ink)',
        'ink-mid': 'var(--color-ink-mid)',
        'ink-soft': 'var(--color-ink-soft)',
        'evidence-red': 'var(--color-evidence-red)',
        'verified-teal': 'var(--color-verified-teal)',
        'lockout-amber': 'var(--color-lockout-amber)',
        line: 'var(--color-line)',
        'line-light': 'var(--color-line-light)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'var(--font-serif)', 'Georgia', 'serif'],
        serif: ['var(--font-serif)', 'Georgia', 'Times New Roman', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
