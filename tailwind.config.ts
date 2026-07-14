import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16211d",
        moss: "#315c4d",
        coral: "#d86f52"
      }
    }
  },
  plugins: []
};

export default config;
