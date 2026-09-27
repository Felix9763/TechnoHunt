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
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        'evidence-red': 'var(--color-evidence-red)',
        'verified-teal': 'var(--color-verified-teal)',
        'lockout-amber': 'var(--color-lockout-amber)',
        line: 'var(--color-line)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
