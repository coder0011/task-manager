/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#09090b',
        panel: '#121215',
        card: '#18181c',
        border: '#27272a'
      }
    },
  },
  plugins: [],
}
