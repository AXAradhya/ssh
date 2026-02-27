/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0a0e1f",
          800: "#0d1224",
          700: "#111829",
          600: "#162035",
          500: "#1a2540",
        },
        electric: {
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          glow: "#00d4ff",
        },
        neon: {
          blue: "#00d4ff",
          green: "#00ff88",
          purple: "#a855f7",
          orange: "#f97316",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "float": "float 6s ease-in-out infinite",
        "grid-move": "gridMove 20s linear infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 10px #00d4ff44" },
          "100%": { boxShadow: "0 0 30px #00d4ff88, 0 0 60px #00d4ff22" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        gridMove: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "50px 50px" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
