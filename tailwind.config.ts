import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#080C14",
          surface: "#0F172A",
          card: "#141F36",
          "card-hover": "#1A2845",
          border: "rgba(255, 255, 255, 0.08)",
          "border-active": "rgba(59, 130, 246, 0.4)",
          muted: "#94A3B8",
          primary: "#3B82F6",
          accent: "#06B6D4",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          purple: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        glow: "0 0 20px -3px rgba(59, 130, 246, 0.3)",
        "glow-success": "0 0 20px -3px rgba(16, 185, 129, 0.3)",
        "glow-warning": "0 0 20px -3px rgba(245, 158, 11, 0.3)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
