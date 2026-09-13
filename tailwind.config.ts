import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Caribbean dispatch palette — deep harbor navy + lagoon teal + coral action accent
        harbor: {
          950: "#0B1E28",
          900: "#0F2A38",
          800: "#163C4E",
          700: "#1E4F66",
        },
        lagoon: {
          500: "#1FA7A0",
          400: "#3ABFB6",
          300: "#7ED6CE",
        },
        coral: {
          600: "#E4633B",
          500: "#F0764C",
          400: "#F5936F",
        },
        sand: {
          100: "#FBF7F0",
          200: "#F3ECDD",
        },
        status: {
          pending: "#C08A2E",
          assigned: "#3ABFB6",
          accepted: "#1FA7A0",
          enroute: "#3B6FE4",
          arrived: "#7A4FE4",
          completed: "#2E9E4F",
          cancelled: "#B44242",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
