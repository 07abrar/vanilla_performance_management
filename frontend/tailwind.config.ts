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
        "primary-hover": "var(--primary-hover)",
        "primary-disabled": "var(--primary-disabled)",
        "danger-fg": "var(--danger-fg)",
        "danger-bg": "var(--danger-bg)",
        "danger-border": "var(--danger-border)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        focus: "var(--shadow-focus)",
      },
      minWidth: {
        picker: "var(--size-picker-min-w)",
      },
      maxWidth: {
        filter: "var(--size-filter-max-w)",
        layout: "var(--size-layout-max-w)",
      },
      height: {
        chart: "var(--size-chart-h)",
      },
    },
  },
  plugins: [],
} satisfies Config;
