/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#135bec",
        "background-light": "#f8fbff",
        "background-dark": "#081120",
        "surface-light": "#ffffff",
        "surface-dark": "#0d1b33",
        "surface-dark-alt": "#12284a",
        "input-light": "#ffffff",
        "input-dark": "#10223f",
        "electric-blue": "#2d7dfd",
        "line-light": "#dbeafe",
        "line-dark": "#1f3b68",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
}
