import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F6F8",
        surface: "#FFFFFF",
        subtle: "#F0F2F5",
        ink: "#111726",
        muted: "#6A7285",
        faint: "#9AA1B1",
        line: "#E7E9EE",
        primary: {
          DEFAULT: "#5B5BD6",
          hover: "#4B49C8",
          soft: "#EEF0FE",
        },
        danger: "#E5484D",
        status: {
          todo: "#64748B",
          progress: "#2E7BF6",
          review: "#F59E0B",
          done: "#14A06E",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,23,38,.06), 0 1px 3px rgba(16,23,38,.05)",
        lift: "0 12px 28px -10px rgba(16,23,38,.22)",
        panel: "0 2px 10px rgba(16,23,38,.06)",
        modal: "0 28px 70px -16px rgba(16,23,38,.40)",
        focus: "0 0 0 3px rgba(91,91,214,.28)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "spine-grow": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in .3s ease both",
        "fade-up": "fade-up .45s cubic-bezier(.2,.7,.2,1) both",
        "scale-in": "scale-in .28s cubic-bezier(.2,.7,.2,1) both",
        "slide-in": "slide-in .35s cubic-bezier(.2,.7,.2,1) both",
        "spine-grow": "spine-grow .6s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
