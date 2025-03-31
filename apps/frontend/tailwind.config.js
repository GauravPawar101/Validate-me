/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#111111",
        "primary-light": "#1A1A1A",
        accent: "#8B7355",
        success: "#10B981",
        surface: "#222222",
        text: "#FFFFFF",
        "text-secondary": "#A3A3A3",
      },
    },
  },
  plugins: [],
};

export default config;
