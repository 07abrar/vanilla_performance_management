import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,html}"],
  theme: {
    extend: {
      colors: {
        fg: "var(--fg)",
        muted: "var(--muted)",
        "muted-strong": "var(--muted-strong)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        ring: "var(--ring)",
        primary: "var(--primary)",
        "primary-dark": "var(--primary-dark)",
        "primary-soft": "var(--primary-soft)",
        "danger-fg": "var(--danger-fg)",
        "danger-bg": "var(--danger-bg)",
        "danger-border": "var(--danger-border)",
      },
    },
  },
  plugins: [],
} satisfies Config;
