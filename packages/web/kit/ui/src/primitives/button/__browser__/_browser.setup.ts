/**
 * Browser-test setup for Button tests.
 *
 * Injects the minimal CSS custom properties that Button variants rely on
 * directly onto :root so that getComputedStyle() assertions are stable
 * without requiring the full @capsuletech/web-style build.
 *
 * Values are taken from the zen-light theme (the project default) and
 * from the structural tokens defined in packages/web/style/src/index.css.
 *
 * IMPORTANT: Tailwind v4 maps `bg-primary` → `var(--color-primary)` which
 * itself points to `var(--primary)` (via the @theme inline block in index.css).
 * We inject both layers here so computed backgroundColor resolves correctly.
 *
 * Tailwind utility classes (h-9, rounded-md, etc.) are compiled via the
 * @tailwindcss/vite plugin configured in vitest.browser.config.ts.
 * The _browser.css entry file triggers that compilation pipeline.
 */

// Trigger Tailwind v4 utility class compilation via @tailwindcss/vite plugin.
import './_browser.css';

const style = document.createElement('style');

style.textContent = `
  :root {
    /* ---- Tailwind v4 @theme inline aliases (index.css) ---- */
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-destructive: var(--destructive);
    --color-destructive-foreground: var(--destructive-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);

    /* ---- Radius scale (structural, from index.css) ---- */
    --radius: 0.5rem;
    --radius-xs: calc(var(--radius) - 6px);
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);

    /* ---- Spacing / button padding (semantic, from index.css) ---- */
    --density: 1;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-button-sm: calc(var(--space-2) * var(--density));
    --space-button:    calc(var(--space-3) * var(--density));
    --space-button-lg: calc(var(--space-4) * var(--density));
    --spacing-button-sm: var(--space-button-sm);
    --spacing-button:    var(--space-button);
    --spacing-button-lg: var(--space-button-lg);

    /* ---- zen-light theme values (themes/zen.css) ---- */
    --primary:              oklch(0.3012 0 0);
    --primary-foreground:   oklch(0.9169 0.0175 99.616);
    --secondary:            oklch(0.8647 0.0201 87.5232);
    --secondary-foreground: oklch(0.3012 0 0);
    --destructive:          oklch(0.5771 0.2152 27.325);
    --destructive-foreground: oklch(1 0 0);
    --background:           oklch(0.9195 0.0169 88.003);
    --foreground:           oklch(0.235 0 0);
    --accent:               oklch(0.9169 0.0175 99.616);
    --accent-foreground:    oklch(0.3012 0 0);
    --border:               oklch(0.8434 0.0231 87.1621);
    --input:                oklch(0.8434 0.0231 87.1621);
    --ring:                 oklch(0.3012 0 0);
    --muted:                oklch(0.834 0.0232 87.163);
    --muted-foreground:     oklch(0.4688 0.0136 84.5932);
  }
`;

document.head.appendChild(style);
