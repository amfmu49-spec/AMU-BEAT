/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0c', // Almost black, slightly cool
          800: '#141417',
          700: '#1c1c21',
          600: '#27272e',
        },
        accent: {
          cyan: '#00f0ff',
          orange: '#ff5c00',
          red: '#ff003c',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
