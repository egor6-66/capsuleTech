# 🛠️ Для разработчика — связь токенов с кодом

> **Навигация:** 📍 [Общее](README.md) · 🎨 [Дизайнеру](for-designer.md) · 🛠️ [Разработчику](for-developer.md) · 📐 [Контракт](CONTRACT.md) · 🎛️ [Токены](tokens/)

Контекст для того, кто ведёт дизайн-систему в коде и поддерживает мост в Figma.

## 📍 Источник правды

- **`packages/web/style/src/index.css`** — единственный источник: `@theme inline` (маппинг в Tailwind-утилиты) + `:root` (scale-слой: spacing, typography, radii, motion, status, scrollbar, density).
- **`packages/web/style/src/themes/*.css`** — skin-поверхность per-theme: цвета (OKLCH), `--radius`, `--font-*`, `--shadow-*`, `--tracking-normal`, `--spacing`. После канонизации (ADR 042) темы **не** содержат `@theme inline` — только skin-vars.

Архитектура контракта зафиксирована в **ADR 042** (`docs/01-architecture/adr/042-canonical-token-system-and-skin-contract.md`).

## 🧱 Skin vs Scale (тот же контракт, что у дизайнера)

- **Skin** (тема вправе менять): shadcn-цвета, `--radius`-anchor, `--font-*`, `--shadow-*`, `--tracking-normal`, `--spacing`.
- **Scale** (общее, только в `index.css`): `--space-*`, `--font-size-*`, `--leading-*`, radii-ladder, `--ease-*`, статусы, scrollbar, `--density`.

Гарантия drop-in community-тем: community-CSS переопределяет только skin-vars → `@theme inline` ремапит в утилиты → реминается. Scale-слой community-тема не несёт и не ломает.

## 🎯 Канон (почему именно так)

Имена и namespace'ы строго по **Tailwind v4 + shadcn**. Канон-namespace'ы Tailwind v4: `--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*`, `--leading-*`, `--spacing*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--animate-*` и др. Чего в каноне **нет** — `--duration-*`, transition, gradient → это не Tailwind-утилиты:
- длительности — numeric в коде (`duration-200`, `duration-[320ms]`); `--motion-*` — internal-var только внутри `--transition-*` composites;
- `--transition-*`, `--gradient-*` — internal-vars для `createStyle`, **не** Figma-токены.

## 🌈 OKLCH → hex

Цвета в коде — OKLCH. Figma OKLCH не умеет → на экспорте в Figma конвертируем в sRGB hex. Конвертер (Ottosson, без зависимостей) использован для генерации эталонного бандла. `editor/oklch.ts` пока умеет только parse + contrast — полноценную конвертацию вынесем в генератор.

## ➕ Как добавить

| Задача | Где |
|---|---|
| Новый цвет (роль) | `themes/*.css` (raw) + `@theme inline --color-*` в `index.css` |
| Новый статус | `index.css :root` (`--<name>` + `-foreground`) + `@theme inline --color-*` + `constants.ts` (если нужен `.has-status`) |
| Новый scale-токен | `index.css :root` + (опц.) `@theme inline` маппинг |
| Новая тема | `themes/<name>.css` (только skin-vars, БЕЗ `@theme inline`) + `@import` в `themes/index.css` |

## 🗺️ Дорожная карта моста (ADR 043 — следующий)

1. **tokens.json генератор** (owner-web-style): `index.css` + `themes/*` → DTCG JSON (OKLCH→hex), все 11 тем, в структуре этого эталона. Заменяет ручную сборку `figma-handoff/tokens/`.
2. **Tokens Studio** — двусторонний синк токенов code↔Figma (git-backed).
3. **Компоненты** code→Figma — отдельно (story.to.design или свой плагин на `web-ui-creator/manifests`).
4. **Figma→code** — плагин-экспортёр фрейма в `web-renderer` ISchema.

Этот каталог (`figma-handoff/`) — **эталон формата**, который генератор должен воспроизводить 1:1.
