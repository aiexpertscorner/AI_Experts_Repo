/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // We definiëren hier alleen de basis namen zonder ingewikkelde nesting
        'ai-primary': 'var(--color-primary)',
        'ai-secondary': 'var(--color-secondary)',
        'ai-dark': 'var(--color-bg-main)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}