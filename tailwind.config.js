/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // === Alivio Plus brand palette ===
        background: "#fff9eb",
        "warm-white": "#FDFAF4",
        cream: "#FCF6E8",
        sand: "#E8DCC8",
        sage: "#8FAF8A",
        "text-primary": "#2D2A25",
        "text-muted": "#7A7167",
        border: "#DDD4C0",
        outline: "#737970",
        "outline-variant": "#c3c8be",

        // primaries (sage darker for buttons)
        primary: "#486646",
        "primary-fixed": "#caecc3",
        "primary-fixed-dim": "#aecfa8",
        "primary-container": "#8faf8a",
        "on-primary": "#ffffff",
        "on-primary-container": "#274226",

        // secondary (sand)
        secondary: "#665d4e",
        "secondary-container": "#eadeca",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#6a6252",

        // tertiary (rose)
        tertiary: "#7f5160",
        "tertiary-container": "#ce98a8",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#58303e",

        // surfaces
        surface: "#fff9eb",
        "surface-bright": "#fff9eb",
        "surface-dim": "#dfdacc",
        "surface-variant": "#e8e2d4",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f9f3e5",
        "surface-container": "#f3ede0",
        "surface-container-high": "#ede8da",
        "surface-container-highest": "#e8e2d4",
        "on-surface": "#1d1c13",
        "on-surface-variant": "#434841",
        "on-background": "#1d1c13",
        "inverse-surface": "#333027",
        "inverse-on-surface": "#f6f0e2",
        "inverse-primary": "#aecfa8",

        // status
        success: "#5A8F6A",
        error: "#C0604A",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        processing: "#A07848",

        // badges
        "badge-ready-bg": "#DFF0DC",
        "badge-ready-text": "#3A6B44",
        "badge-running-bg": "#FDF0DC",
        "badge-running-text": "#8A5A20",
        "badge-draft-bg": "#E8E0F0",
        "badge-draft-text": "#5A4A80",

        // legacy aliases used by existing components — keep until migrated
        bg: "#fff9eb",
        fg: "#2D2A25",
        muted: "#f3ede0",
        "muted-fg": "#7A7167",
        accent: "#486646",
        "accent-fg": "#ffffff",
        warn: "#A07848",
        danger: "#C0604A",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.375rem",
        md: "0.75rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
        pill: "9999px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "40px",
        "2xl": "64px",
        "3xl": "96px",
      },
      fontFamily: {
        body: ["DM Sans", "system-ui", "-apple-system", "sans-serif"],
        "ui-label": ["DM Sans", "system-ui", "sans-serif"],
        "section-heading": ["Playfair Display", "Georgia", "serif"],
        "spoonie-italic": ["Playfair Display", "Georgia", "serif"],
        "mono-data": ["JetBrains Mono", "ui-monospace", "monospace"],
        "display-hero": ["Playfair Display", "Georgia", "serif"],
        "display-hero-mobile": ["Playfair Display", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        body: ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "ui-label": ["0.875rem", { lineHeight: "1.2", fontWeight: "500" }],
        "section-heading": ["2rem", { lineHeight: "1.3", fontWeight: "600" }],
        "spoonie-italic": ["1.1rem", { lineHeight: "1.5", fontWeight: "400" }],
        "mono-data": ["0.8rem", { lineHeight: "1.4", fontWeight: "400" }],
        "display-hero": ["4rem", { lineHeight: "1.1", fontWeight: "700" }],
        "display-hero-mobile": ["2.5rem", { lineHeight: "1.2", fontWeight: "700" }],
      },
      boxShadow: {
        sm: "0 1px 3px rgba(45,42,37,0.08)",
        md: "0 4px 16px rgba(45,42,37,0.10)",
        lg: "0 12px 40px rgba(45,42,37,0.13)",
        card: "0 10px 30px -5px rgba(45, 42, 37, 0.08)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
