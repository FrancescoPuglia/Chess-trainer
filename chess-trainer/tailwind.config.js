/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chess: {
          primary: '#2563eb',
          secondary: '#f1f5f9',
          accent: '#10b981'
        }
      }
    },
  },
  plugins: [],
}