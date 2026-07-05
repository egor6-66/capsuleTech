# Brief 1/2 — web-ui: Ui.Badge примитив (scope `ui`)

**Дедуп бейджей (канон [[feedback_product_wide_kit_layering]]).** Badge в ките НЕТ; везде хендроллят `Card padding="sm" + Typography size="sm" tone="muted"`. Хуже — **один и тот же тег рендерится по-разному** (`lessons/List`: голый `Typography #tag`; `library/Info`: `Card`-пилюля) = divergence. Нужен один примитив.

## `packages/web/kit/ui/src/primitives/badge/`
Stateless, пресет-driven, **классы только внутри**. Два подвида одним компонентом:

```ts
export interface IBadgeProps {
  children: JSX.Element;
  /** Визуальный тон (пресет). Дефолт 'muted'. */
  tone?: 'default' | 'muted' | 'outline' | 'accent';
  size?: 'sm' | 'md';                 // дефолт 'sm'
  /** Кликабельный чип (rule/word-chip). Дефолт false. */
  interactive?: boolean;
  /** Подсветка активного чипа (для interactive). */
  selected?: boolean;
  onClick?: (e: MouseEvent) => void;  // только при interactive
  class?: string;
}
```

Поведение:
- **Статический** (`interactive` не задан): inline-пилюля с лейблом. Заменяет `Card padding=sm + Typography muted`.
- **Интерактивный чип** (`interactive`): `role="button"` + tabIndex + onClick + Enter/Space + `selected`-подсветка + `aria-pressed`. Заменяет rule-chip/`WordChip`.

Визуал/токены — через `createStyle`/CVA (прецедент `button.presets.ts`), **замороженные токены** (ADR 042). Пресеты `tone` = композиция токенов, НЕ новые классы. `#`-префикс тегов — забота потребителя (контент), не Badge.

## Экспорт/регистрация
- `src/primitives/badge/index.ts` + `badge.tsx` + `badge.presets.ts` + `badge.stories.tsx` + тест.
- package.json exports `./badge`. **Сообщи субпат** — architect добавит `@capsuletech/web-ui/badge` в tsconfig.base.
- Stories: default/muted/outline/accent + interactive (selected/not) + sizes.

## Verify
`nx run @capsuletech/web-ui:build --skip-nx-cache` + `:test` + stories. Ноль сырых классов в публичном API.
