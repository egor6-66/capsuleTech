---
title: web-shell — Shell.Picker (generic каркас селекта) + ThemePicker→wrapper
status: ready
audience: owner-сессия `claude-scope -Scope shell` (commit-only, без push)
last_updated: 2026-07-03
adr_refs: [032, 041]
---

# Контекст

Канон (user, 2026-07-03): **шелл раздаёт каркасы селектов, апп раздаёт данные** (взятые с бэка). Один флоу для всех доменных выборов: темы, TTS-движки (voice, ADR 067), позже языки (lang). Доменность приходит с данными — generic-каркас в шелле не пускает корень ни в один домен.

`ThemePicker` уже почти каркас (`themes?`/`value?`/`onSelect`/`mode` инжектируемы) — тематическое в нём только дефолты. Довести: вытащить generic `Shell.Picker`, ThemePicker сделать тонким wrapper'ом.

Первый потребитель: apps/learn — свич TTS-движков в `Shell.Header.Menu` (список с `GET /voice/engines`). App-сторону делает architect, НЕ этот бриф.

# Scope

**1. `ui/picker/` — новый блок `Shell.Picker`** (generic connected-контрол):

```ts
interface IPickerOption { value: string; label?: string }   // string тоже принимаем (shorthand)

interface IPickerProps {
  /** Опции — данные от аппа. string → {value: s}. */
  options: readonly (string | IPickerOption)[];
  /** Текущее значение (accessor, реактивно). */
  value?: Accessor<string | undefined>;
  /** Инжект действия выбора (пара к value — как у ThemePicker). */
  onSelect?: (value: string) => void;
  /** Пост-хук (после onSelect/emit, паритет с ThemePicker.onChange). */
  onChange?: (value: string) => void;
  /** Заголовок триггера. Дефолт: "<current>" | placeholder. */
  triggerLabel?: string | JSX.Element;
  /** Иконка триггера (JSX). Дефолт — без иконки. */
  icon?: JSX.Element;
  class?: string;
  /** 'standalone' (свой Dropdown root) | 'sub' (Dropdown.Sub внутри Menu) — как у ThemePicker. */
  mode?: 'standalone' | 'sub';
  /** Имя для named-event'а (см. Events). Дефолт 'picker'. */
  name?: string;
}
```

- Рендер — как у ThemePicker (Dropdown + Item + галочка на current), реализацию максимально ПЕРЕНЕСТИ из themePicker.tsx, не писать заново.
- **Канон-событие (ADR 032):** при выборе эмитить named event через `useEmitOptional` (не useEmit — контрол может рендериться вне host-scope, прецедент ComponentsPalette): `onPick { name, value }`. Phantom `__events` тип `IPickerEvents` — по образцу других shell-блоков. `onSelect`-prop, если задан, вызывается тоже (инжект-путь для studio-подобных кейсов, ADR 041: событие=роль, инжект=опция).

**2. `ui/themePicker/` — стал wrapper'ом над Picker:**
- Публичный контракт `IThemePickerProps` НЕ ломаем (существующие потребители: playground, studio StylesPanel).
- Внутри: `<Picker options={themes ?? DISCOVERED_THEMES} value={value ?? useTheme()} onSelect={onSelect ?? setTheme(…, target)} icon={<Palette/>} …/>`.
- Тесты themePicker должны остаться зелёными без правок ассертов (поведение 1:1); если тест лезет в внутренности — поправить минимально.

**3. Регистрация:** `Shell.Picker` в `/capsule` рядом с остальными блоками. Экспорт типов из `/ui`.

**4. Тесты:** `ui/picker/__tests__/` — рендер опций (string и {value,label}), галочка на value(), onSelect+onChange порядок, emit onPick (useEmitOptional мок), mode='sub' внутри Dropdown.Content.

**5. Docs:** обновить `docs/_meta/<shell-anchor>.md` секцию блоков (если есть) + OWNERSHIP.md «Публичный API».

# Git

Main tree, **commit-only, без push/веток** (хук режет коммит в main — это норма: оставь изменения в дереве, коммитит architect на ветке после ревью). Только `packages/web/domain/shell/**` (+ docs-анкор шелла).

# Acceptance

- `pnpm --filter @capsuletech/web-shell test` (или nx-эквивалент) — зелёные, включая СТАРЫЕ themePicker-тесты.
- `pnpm nx run-many -t typecheck` по affected — 0.
- `pnpm exec biome check packages/web/domain/shell --diagnostic-level=error` — 0.
- Живой eyeball (architect после): playground header — ThemePicker выглядит/работает как раньше.

# Что НЕ делаем

- НЕ VoicePicker/LocalePicker в шелле — доменные пикеры = Picker + данные аппа.
- НЕ динамическая подгрузка CSS тем с бэка (web-style, отдельная волна).
- НЕ трогаем apps/* (learn-интеграция — architect).
