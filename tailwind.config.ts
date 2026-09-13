import type { Config } from 'tailwindcss'

// Fase 2: paleta fintech minimalista (violeta/verde/azul), dark mode default.
// Los valores base viven como CSS variables en src/assets/styles/main.css;
// aca solo se mapean a utilidades de Tailwind con soporte de opacidad
// (bg-primary/50, text-debe/80, etc).
function withOpacity(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`
}

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: withOpacity('--color-background'),
        surface: {
          DEFAULT: withOpacity('--color-surface'),
          muted: withOpacity('--color-surface-muted'),
        },
        border: withOpacity('--color-border'),
        foreground: withOpacity('--color-foreground'),
        muted: withOpacity('--color-muted-foreground'),
        subtle: withOpacity('--color-subtle-foreground'),
        primary: {
          DEFAULT: withOpacity('--color-primary'),
          hover: withOpacity('--color-primary-hover'),
        },
        // Semántica contable: Ingreso = haber (verde), Egreso = debe (rojo).
        // No renombrar a "success"/"danger" genéricos: son etiquetas de negocio.
        haber: withOpacity('--color-haber'),
        debe: withOpacity('--color-debe'),
        info: {
          DEFAULT: withOpacity('--color-info'),
          hover: withOpacity('--color-info-hover'),
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '16px',
      },
      boxShadow: {
        // Sombras suaves estilo Stripe: sin glow pesado ni blur de vidrio.
        card: '0 1px 2px rgb(0 0 0 / 0.4)',
        'card-hover': '0 4px 12px rgb(0 0 0 / 0.35)',
        popover: '0 12px 24px rgb(0 0 0 / 0.45)',
      },
    },
  },
  plugins: [],
} satisfies Config
