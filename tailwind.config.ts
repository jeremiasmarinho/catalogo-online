import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        action: "#32A041",
        forest: "#184E2D",
        ink: "#2D312E",
        surface: "#FFFFFF",
        canvas: "#F4F6F4",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(45, 49, 46, 0.08)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Arial", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-inter)", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
