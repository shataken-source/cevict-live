import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Institutional dark palette
        background: "#0B0F17",
        surface: "#111827",
        panel: "#0F172A",
        border: "#1E293B",

        primary: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          glow: "rgba(37, 99, 235, 0.4)",
        },

        accent: {
          DEFAULT: "#06B6D4",
          hover: "#0891B2",
        },

        success: {
          DEFAULT: "#16A34A",
          muted: "#22C55E",
        },

        danger: "#DC2626",
        warning: "#F59E0B",

        text: {
          primary: "#F1F5F9",
          secondary: "#9CA3AF",
          muted: "#6B7280",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      boxShadow: {
        glow: "0 0 40px rgba(37, 99, 235, 0.4)",
        "glow-sm": "0 0 20px rgba(37, 99, 235, 0.3)",
      },

      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slideIn 0.3s ease-out",
      },

      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}

export default config
