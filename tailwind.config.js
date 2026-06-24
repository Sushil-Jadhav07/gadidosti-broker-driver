/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Outfit', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1976FF",
          dark: "#1560D4",
          light: "#4A9AFF",
          50: "#EBF3FF",
          100: "#C4DBFF",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#041E42",
          dark: "#020E21",
          light: "#0A2E5C",
          foreground: "#FFFFFF",
        },
        tertiary: {
          DEFAULT: "#17D86B",
          dark: "#12B85A",
          light: "#4EE88A",
        },
        success: {
          DEFAULT: "#17D86B",
          dark: "#12B85A",
          light: "#4AE88A",
        },
        warning: {
          DEFAULT: "#F59E0B",
          dark: "#D97706",
        },
        danger: {
          DEFAULT: "#EF4444",
          dark: "#DC2626",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        neutral: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        sidebar: {
          DEFAULT: "#111827",
          hover: "rgba(255,255,255,0.05)",
          active: "rgba(25,118,255,0.1)",
          icon: "#6B7280",
          border: "rgba(255,255,255,0.06)",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F1F5F9",
          foreground: "#0F172A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.05)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        modal: "0 20px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
        dropdown: "0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)",
        "inner-sm": "inset 0 1px 0 rgba(255,255,255,0.08)",
        nav: "0 -2px 10px rgba(0,0,0,0.08)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "pulse-dot": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.4)", opacity: "0.7" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1)",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "spin-slow": "spin-slow 1s linear infinite",
        "slide-up": "slide-up 0.4s ease-out",
      },
    },
  },
  plugins: [],
}
