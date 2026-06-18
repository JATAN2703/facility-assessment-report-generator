import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pulled from the INFINITE / Managed by MEDELITE brand mark
        infinite: {
          magenta: "#E6007E",
          purple: "#6A1B9A",
          ink: "#1f2937",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
