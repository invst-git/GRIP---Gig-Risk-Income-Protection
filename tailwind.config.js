/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-success': 'var(--accent-success)',
        'accent-danger': 'var(--accent-danger)',
        'accent-info': 'var(--accent-info)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-disabled': 'var(--text-disabled)',
        'text-on-accent': 'var(--text-on-accent)',
        'border-default': 'var(--border-default)',
        'border-active': 'var(--border-active)',
      },
      boxShadow: {
        card: '0 14px 36px rgba(23, 32, 51, 0.08), 0 2px 6px rgba(23, 32, 51, 0.04)',
        frame: '0 40px 110px rgba(23, 32, 51, 0.14)',
      },
      borderRadius: {
        card: '16px',
        button: '12px',
        input: '10px',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      maxWidth: {
        frame: '430px',
      },
    },
  },
  plugins: [],
}
