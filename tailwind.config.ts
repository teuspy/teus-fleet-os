import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teus: {
          // Dark colors (sidebar, login)
          bg: "#0B2E22",
          "bg-2": "#0F3D2E",
          card: "#123E30",
          "card-2": "#164A39",
          // Accent (buttons, highlights, brand green)
          accent: "#26D07C",
          "accent-2": "#1FB86A",
          "accent-dark": "#0B2E22",
          // Light theme (main content)
          bg_light: "#FAFBFA",
          card_light: "#FFFFFF",
          hover_light: "#F3F7F4",
          border_light: "#E5EAE7",
          text_dark: "#0B2E22",
          text_muted: "#6B7C74",
          text_soft: "#94A69C",
          // Semantics
          text: "#FFFFFF",
          "text-dim": "#9FC4B4",
          danger: "#EF4444",
          "danger-light": "#FEE2E2",
          warn: "#F59E0B",
          "warn-light": "#FEF3C7",
          success: "#10B981",
          "success-light": "#D1FAE5",
          border: "rgba(38,208,124,.18)",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.6s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(11,46,34,.06), 0 1px 2px rgba(11,46,34,.04)",
        "card-hover": "0 10px 30px rgba(11,46,34,.08), 0 4px 8px rgba(11,46,34,.04)",
        "accent-glow": "0 8px 24px rgba(38,208,124,.25)",
      },
    },
  },
  plugins: [],
};

export default config;
