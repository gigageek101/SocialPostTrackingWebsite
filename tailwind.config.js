/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tiktok: '#000000',
        threads: '#000000',
        instagram: '#E4405F',
        facebook: '#1877F2',
      },
    },
  },
  plugins: [],
}

