/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        raised: "var(--bg-raised)",
        overlay: "var(--bg-overlay)",
        subtle: "var(--border-subtle)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
        success: "var(--success)",
        info: "var(--info)",
        danger: "var(--danger)"
      },
      boxShadow: {
        poster: "0 8px 24px rgba(0,0,0,.45)"
      }
    }
  },
  plugins: []
};
