/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        card: '#121215',
        border: '#27272a',
        muted: '#27272a',
        'muted-foreground': '#a1a1aa',
        primary: {
          DEFAULT: '#ff5c20',
          hover: '#e04f18',
        }
      }
    },
  },
  plugins: [],
}
