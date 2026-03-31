import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "../../packages/shared-types/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#08111F",
        mist: "#EFF4F7",
        accent: "#126B5F",
        gold: "#D4A63A",
        night: "#071019",
        midnight: "#0C1724",
        slate: "#132232",
        steel: "#93A4B8",
        glow: "#35CFA6",
        ember: "#F08C62",
        frost: "#D6E7F8"
      },
      boxShadow: {
        panel: "0 24px 80px rgba(8, 17, 31, 0.12)",
        chrome: "0 30px 90px rgba(0, 0, 0, 0.34)",
        insetGlow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
