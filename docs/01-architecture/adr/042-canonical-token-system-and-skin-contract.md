---
tags: [hca, adr, accepted, architecture, design-system, tokens, tailwind, figma]
status: accepted
date: 2026-06-09
---

> [!info] Status
> **Accepted (направление)** — 2026-06-09. Канонизация токен-системы capsule под Tailwind v4 / shadcn-конвенцию ради **drop-in совместимости с community-темами** и чистого Figma-моста. Реализация — owner-web-style, фазами. Связано: [[036-shape-redesign-and-table-package|ADR 036]], anchor [[design-tokens]], [[043-figma-design-system-bridge|Figma bridge (следующий ADR)]].

# ADR 042 — Каноническая токен-система и skin-контракт

## Контекст {#context}

Цель: **дизайнер подстраивается под код**, и любой community-стиль (tweakcn / shadcn-registry / Tailwind-тема) кладётся **поверх** наших токенов и просто работает — без переименований. Это требует, чтобы наша токен-система была максимально канонична (Tailwind v4 `@theme`-namespace'ы + shadcn-имена), а кастом был чётко изолирован.

Аудит `packages/web/style/` (2026-06-09) выявил:
- **Skin-поверхность уже канонична** (shadcn-цвета, `--radius`, `--shadow-*`, `--font-*`) — drop-in для визуала работает уже сегодня.
- 🔴 **Блокер:** каждая тема (`themes/*.css`) дублирует свой `@theme inline`; блоки дрейфанули (5 тем — 155 токенов с tracking-блоком, 6 — 149 без). Community-тема `@theme inline` не несёт вовсе.
- 🟡 Кастом вне канона: `--motion-*` + фейковые `@theme inline --duration-*` (namespace'а `--duration-*` в Tailwind v4 НЕТ); `--status-success/error/warning` + `--current-status` (bespoke, не замаплены как `--color-*`); `--color-text-main/muted` (дубль `foreground`/`muted-foreground`); `--gradient-*` (нет канон-namespace'а).
- 🟡 Legacy «until Phase 2»: `--spacing-base`, `--layout-padding`, `--component-padding`, `--text-base-size`, `--font-size-h1/h2/p` — в активном использовании (matrix/typography variants).

Канон-namespace'ы Tailwind v4 (источник правды): `--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*`, `--leading-*`, `--tab-size-*`, `--breakpoint-*`, `--container-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--blur-*`, `--perspective-*`, `--zoom-*`, `--aspect-*`, `--ease-*`, `--animate-*`. **Нет** namespace'ов для duration, transition, gradient — это static-utility / plain-var территория.

## Решение {#decisions}

### 1. Skin-контракт: что вправе трогать тема vs capsule-internal

Жёсткое разделение:
- **Skin-поверхность** (то, что community-тема и `themes/*.css` ВПРАВЕ задавать в `[data-theme]`/`:root`/`.dark`): shadcn-цвета (полный набор + `chart-1..5` + `sidebar-*`), `--radius` (anchor), `--font-sans/serif/mono`, `--shadow-*` (+ shadow-атомы), `--tracking-normal`, `--spacing`. **И больше ничего.**
- **Capsule-internal** (живёт ТОЛЬКО в `index.css`, тема не трогает): motion (`--ease-*`, `--motion-*`, `--transition-*`), semantic-spacing (`--space-*`/`--spacing-*`), typography-scale (`--font-size-*`/`--leading-*`), radii-scale (`--radius-xs..3xl/full`), status, scrollbar, `--density`, `--size-slot`.

Гарантия drop-in: community-файл переопределяет только skin-vars → `@theme inline` в `index.css` ремапит их в утилиты → всё реминается. Internal-слой community-тема не несёт и не ломает.

### 2. Один `@theme inline` — только в `index.css`

Per-theme `@theme inline` **удаляется из всех тем**. Единственный источник utility-маппинга — `index.css`. Чинит дрейф 149/155 в корне. Doc [[design-tokens]] step 4 переписывается («НЕ копировать `@theme inline` в тему»).

### 3. Только канон-namespace'ы генерят утилиты; durations → numeric

- `--ease-*` (вкл. `spring`/`bounce`) — канон, остаётся.
- `--motion-*` **понижается до internal plain-var**, используется только внутри `--transition-*` composites и `createStyle`. Фейковые `@theme inline --duration-*` **удаляются** (не генерят канон-утилит).
- В коде длительности — **numeric канон** (`duration-200`), как shadcn/community. Потребители `duration-fast/normal/slow` мигрируются на numeric.
- `--transition-*` composites остаются как internal-vars для `createStyle` (не Figma-токены).

### 4. Status → канон

`--status-success/error/warning` → `--success`/`--warning` (+ `--success-foreground`/`--warning-foreground`); `--destructive` уже канон. Замапить `--color-success`/`--color-warning` в `@theme inline` → работают `bg-success`/`text-warning`. Bespoke-механизм `--current-status` + `.has-status` мигрируется на канон-токены.

### 5. Удалить редундантное и legacy

- `--color-text-main`/`--color-text-muted` — удалить (дубль `foreground`/`muted-foreground`).
- Доделать **Phase 2**: мигрировать matrix/typography variants с legacy-имён на канон-токены, затем удалить весь backward-compat блок.

### 6. Figma-мост из чистого источника

После канонизации `index.css` — единственный источник для генерации `tokens.json` (W3C DTCG), который импортит **Tokens Studio** (см. [[project_figma_design_system_bridge]]). OKLCH→hex на экспорте через `editor/oklch.ts`. Детали моста — отдельный ADR 043.

## Последствия {#consequences}

- **Набор токенов замораживается.** После канонизации + синка с Figma набор согласован; любое изменение/добавление токена тянет цепочку (код → `tokens.json` → Figma/Tokens Studio → zip → дизайнер). Политика: работаем существующими токенами; новый токен — только в исключительных случаях, через owner-web-style, с осознанием sync-стоимости. См. [[design-tokens]] (warning-callout) и [[feedback-token-set-frozen]].
- Реализует **owner-web-style**, фазами: (1) снести per-theme `@theme inline`; (2) status→канон + удалить `--color-text-*`; (3) motion→numeric; (4) Phase 2 cleanup. Каждая фаза — отдельный PR.
- **Верификация:** Tailwind-build должен подтвердить, что нужные утилиты генерятся (особо — что `duration-fast` был/не был мёртвым классом); визуал — только реальный браузер (jsdom не годится). `pnpm --filter @capsuletech/web-style test` green до/после.
- Обновить anchor [[design-tokens]] (step 4, motion-секция, status-секция) и [[web-style]] OWNERSHIP.
- breaking для потребителей legacy-имён и `duration-*` классов — мигрируются в тех же PR.
- Открывает ADR 043 (Figma bridge): tokens.json + custom-plugin.

## Альтернативы (отклонены) {#alternatives}

- **Оставить кастом-namespace'ы как есть** — per-theme `@theme inline` блокирует drop-in и дрейфует; bespoke status/durations путают дизайнера и community-инструменты. → канонизация.
- **Имена `--motion-*` как Tailwind-утилиты** — namespace'а нет, классы мёртвые/нестабильные. → numeric канон.
- **Свой синк токенов в Figma** — дублирует Tokens Studio. → готовый инструмент для токенов, кастом только для компонентов/layout (ADR 043).
