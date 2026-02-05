/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'drama-high': '#DC2626',
        'drama-medium': '#FBBF24',
        'drama-low': '#10B981',
        'link-blue': '#0000FF',
        'link-purple': '#551A8B',
      },
    },
  },
  plugins: [],
}
