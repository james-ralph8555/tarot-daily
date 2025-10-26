import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./server/**/*.{ts,tsx}",
    "../../packages/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        lapis: {
          50: "#EEF2FA",
          100: "#DCE6F5",
          200: "#B7C7E4",
          300: "#8EA6D3",
          400: "#5A7BB9",
          500: "#355F9D",
          600: "#274C7C",
          700: "#203D63",
          800: "#1B2A4A",
          900: "#131D33",
          950: "#0B1221"
        },
        cardinal: {
          50: "#F8ECEC",
          100: "#F3D7D6",
          200: "#E7AFAE",
          300: "#D87F7C",
          400: "#BF5A56",
          500: "#A33C38",
          600: "#832F2B",
          700: "#6A1F1B",
          800: "#4B1512",
          900: "#2D0C0A"
        },
        parchment: {
          50: "#F3E9DC",
          100: "#EADBC6",
          200: "#DCC6A6",
          300: "#CDAE87",
          400: "#BFA474",
          500: "#A78B5E"
        },
        gilded: {
          200: "#F1DE9A",
          300: "#EBD77F",
          400: "#E6C75C",
          500: "#B08968"
        },
        ash: {
          900: "#111418",
          950: "#0E0F12"
        },
        incense: {
          200: "#D9D2C9",
          300: "#C8BFB3",
          400: "#A59C8E"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "Cormorant Garamond", ...defaultTheme.fontFamily.serif],
        serif: ["var(--font-serif)", "Cardo", ...defaultTheme.fontFamily.serif],
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans]
      },
      boxShadow: {
        halo:
          "0 0 0 1px rgba(230,199,92,0.35), 0 8px 30px rgba(0,0,0,0.45), 0 0 40px rgba(230,199,92,0.15)"
      },
      backgroundImage: {
        "gradient-lapis":
          "radial-gradient(1200px 600px at 50% -10%, #131D33 0%, #1B2A4A 40%, rgba(27,42,74,0) 70%)",
        "gradient-cardinal": "linear-gradient(135deg, #6A1F1B 0%, #0E0F12 60%)"
      }
    }
  },
  plugins: []
};

export default config;
