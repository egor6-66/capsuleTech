---
name: "@capsuletech/web-placeholders"
owner-agent: owner-placeholders
group: web_base
zone: domain
status: in-progress
priority: P2
last-updated: 2026-07-04
---

# OWNERSHIP — @capsuletech/web-placeholders

**Owner agent:** `owner-placeholders`
**Package path:** `packages/web/domain/placeholders/`
**Release group:** `web_base` (tag `web@{version}`) — **добавить в `nx.json` при первом releasable-теге** (сейчас `private:false`, `0.0.0`; прецедент web-auth/web-agent — skeleton вне группы до наполнения).
**Status:** `0.0.0` — iter 1 (блоки на kit-компонентах).
**Бриф:** `docs/_meta/briefs/web-placeholders-package.md`
**ADR:** [[032-package-controllers|ADR 032]] (useEmit-канал), [[033-package-registration|ADR 033]] (регистрация Placeholders.*)

## Состояние (читать ПЕРВЫМ)

- **Zone:** `domain` — готовые connected-блоки поверх stateless kit'а.
- **Принцип:** плейсхолдеры — **готовый продукт-контент** экосистемы. Каждый блок — dumb-презентация (общий каркас `PlaceholderShell`) + один именованный emit через `useEmitOptional` (ADR 032). Собственного состояния/IO нет: куда вести по клику — концерн доменной Feature аппа.
- **Priority:** **P2** — нужны любому аппу (404 / ошибка / нет прав / комьюнити-гейт / упавший виджет), но не блокируют ядро.

## Публичный API

Глобалы после `packages: ['@capsuletech/web-placeholders']` (ADR 033):

| Глобал | Событие (`__events`) | Назначение |
|---|---|---|
| `Placeholders.NotFound` | `onHome` | 404 |
| `Placeholders.Error` | `onRetry` | «что-то пошло не так» |
| `Placeholders.AccessDenied` | `onLogin` | нет прав на просмотр |
| `Placeholders.Community` | `onJoin` | доступ только для сообщества |
| `Placeholders.WidgetUnavailable` | `onRetry` | компактный, вместо упавшего виджета |

Апп ловит события доменной Feature:
```tsx
Feature<EventsOf<typeof Placeholders.AccessDenied>>(({ router }) => ({
  onLogin: () => router.goTo('/login'),
}));
```

Props каждого блока — только текстовые оверрайды (`title` / `description` / `actionLabel`); дефолты — по-русски, уточняются user'ом.

### Subpaths
- `.` — блоки + контракты (props/события) + `PlaceholderShell`.
- `./capsule` — манифест регистрации (`defineCapsuleModule`).

## Архитектурные заметки

- **Экспорт `Error` называется `ErrorState`** (файл `blocks/error.tsx`) — чтобы не шадоуить JS-builtin `Error` внутри модуля (biome noShadowRestrictedNames). В глобал попадает под ключом `Placeholders.Error` через capsule-манифест.
- **`useEmitOptional`, не `useEmit`** — блок может рендериться вне Controller/Feature-scope (standalone-превью): тогда emit тихо дропается, а не бросает.

## Roadmap (renderer-конвергенция)

Плейсхолдеры — заявленная линия «контент как ДАННЫЕ» и первый потребитель будущего value-binding'а web-renderer'а:

1. **Фаза 2 — схемы web-renderer.** Заменить тело `PlaceholderShell` на `<Renderer schema … registry={{ ui: Ui }} />`; схемы (`ISchema`) — статические `schemas/`-модули; события — тем же `useEmitOptional`, инжектом onClick в интерактивные узлы. Публичный контракт блоков (props + `__events`) НЕ меняется. Разблокировано: `@capsuletech/web-core/ui-kit` публично отдаёт собранный `Ui`.
   - ⚠️ Event-шов рендерера имеет gap: `Renderer` рендерит компоненты реестра БЕЗ UiProxy (`renderer.tsx`), а `IInteraction` несёт только `ref` (нет имени события). Поэтому «controlled + IInteraction» напрямую не эмитит — используем `mode="static"` + инжект onClick-замыканий. Механику подтвердил user (2026-07-04); если понадобится controlled/IInteraction — эскалация architect'у (зона web-renderer).
2. **Фаза 3 — студио-редактирование** (`document → пресет`, edit→save). Зона web-studio.

## Тесты

- `blocks/__tests__/blocks.test.tsx` — рендер + emit каждого блока (`useEmitOptional` замокан, прецедент Learn.Library.Info).
- `__tests__/capsule.test.ts` — форма манифеста (имя + 5 компонентов).

## Границы (НЕ трогать)

- `@capsuletech/web-renderer` (зона owner-web-renderer) — если фаза 2 упрётся в capability рендерера.
- `@capsuletech/web-ui` / `web-core` — потребляем, не правим.
- `tsconfig.base.json`, `nx.json`, `optimizeDeps.exclude` — зона architect (paths уже добавлены; exclude — бриф `builders-exclude-web-placeholders.md`).
