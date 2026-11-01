/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f97316', // orange-500
          light:   '#fb923c', // orange-400
          dark:    '#ea580c', // orange-600
        },
        surface: {
          DEFAULT: '#0f0f0f', // near-black background
          raised:  '#1a1a1a', // slightly lighter cards
          border:  '#2a2a2a', // subtle borders
        },
      },
    },
  },
  plugins: [],
}
