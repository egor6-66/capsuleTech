export interface IOklch {
  l: number; // 0..1
  c: number; // 0..~0.4
  h: number; // 0..360
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/i;

/** Парсит `'oklch(0.65 0.18 250)'` → `{l, c, h}`. Fallback на black-ish. */
export const parseOklch = (raw: string): IOklch => {
  const m = raw.trim().match(OKLCH_RE);
  if (!m) return { l: 0.5, c: 0, h: 0 };
  return {
    l: Number.parseFloat(m[1]),
    c: Number.parseFloat(m[2]),
    h: Number.parseFloat(m[3]),
  };
};

export const formatOklch = (c: IOklch): string =>
  `oklch(${c.l.toFixed(3)} ${c.c.toFixed(3)} ${c.h.toFixed(1)})`;

/**
 * Производит «контрастный» foreground для primary: если primary тёмный
 * (l < 0.5) → светлый текст, иначе тёмный. Не идеально с точки зрения
 * WCAG, но достаточно для preview и большинства случаев.
 */
export const contrastForeground = (primary: string): string => {
  const { l } = parseOklch(primary);
  return l < 0.5 ? 'oklch(0.985 0 0)' : 'oklch(0.145 0 0)';
};
