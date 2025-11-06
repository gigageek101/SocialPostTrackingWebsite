/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Platform colors
        tiktok: '#000000',
        threads: '#000000',
        instagram: '#E4405F',
        facebook: '#1877F2',
        // Luxury Mandarin palette
        'dark-bg': '#0a0908',
        'dark-surface': '#1a1918',
        'dark-elevated': '#252423',
        'mandarin': {
          DEFAULT: '#ff6b35',
          light: '#ff8c61',
          dark: '#e55527',
        },
        'gold': {
          DEFAULT: '#ffc857',
          light: '#ffd677',
        },
        'cream': '#fff5e6',
      },
      fontFamily: {
        'playfair': ['Playfair Display', 'serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-mandarin': '0 0 20px rgba(255, 107, 53, 0.3), 0 0 40px rgba(255, 107, 53, 0.1)',
        'glow-gold': '0 0 20px rgba(255, 200, 87, 0.3), 0 0 40px rgba(255, 200, 87, 0.1)',
        'luxury': '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 107, 53, 0.1)',
      },
    },
  },
  plugins: [],
}

