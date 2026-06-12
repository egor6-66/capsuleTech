---
tags: [hca, adr, proposed, packages, architecture, zones, canon, vendor]
status: proposed
date: 2026-06-11
---

> [!info] Status
> **Proposed** — 2026-06-11. Sister-ADR к [[046-boost-namespace-matrix-evict-vt-owner|046]] и [[048-docs-as-data|048]]. Триада ландит одной волной.
>
> Этот ADR — **глобальные правила**, которые перестраивают `packages/web/*` структурно и поведенчески. ADR 046 — точечная тактика (Matrix/vt-name/boost-наименование), ADR 047 — крыша над всем (zones + cycle canon + vendor transparency + studio rename + colocation).
>
> Связано: [[045-web-taxonomy]] (#2 absorb ui-creator подтверждается, имя пересмотрено), [[044-web-menu-package]] (heavy=pkg / light=kit-композиция канон поднимается в zone-разделение), [[004-compliance-golden-rules]] (compliance расширяется на пакет-уровень), [[033-package-registration]].

# ADR 047 — Capsule frontend architecture: zones + cycle canon + vendor transparency + design-time consolidation

## Контекст — пять болей

### Pain 1 — Flat 23-package layout

`packages/web/*` сейчас 23 пакета на одном уровне. Контрибьютор / агент / user не различает зоны: где kit, где runtime фреймворка, где domain-фичи, где boosters, где design-time. Чтение `ls packages/web/` не сообщает архитектуру.

### Pain 2 — Нет канонизированного «зонального» правила зависимостей

[[044]] зафиксировал «heavy = pkg / light = kit-композиция» — это **одно** правило. Зональное правило **в общем**: kit ← runtime ← domain, kit ← runtime ← boost, design-time = aside, и т.д. — НЕ зафиксировано. Owner-агенты иногда тянут зависимость в неправильную сторону, compliance не ловит (он сейчас работает на intra-app HCA-слоях, не на packages/).

### Pain 3 — Domain ↔ domain циклы

Domain-пакеты (`web-auth`, `web-shell`, `web-agent`) — **«мини-апп как пакет»**: каждый сам по себе стейтфул, имеет UI, services, controllers. Цена этого: они могут захотеть друг друга. Пример: shell хочет узнать `is-authed?` у auth; auth хочет рендерить login-форму внутри shell-сценария. Прямые импорты `import { useAuth } from '@capsuletech/web-auth'` из shell + наоборот = **цикл за один шаг**.

Сейчас ничего не запрещает это структурно.

### Pain 4 — Vendor-opaque wrapping

Несколько раз обсуждалось ([[042]], [[044]], session-feedback). Канон не зафиксирован: **мы используем Kobalte/CVA/Tailwind/TanStack/XState/MapLibre напрямую**, наша уникальность — в архитектуре (HCA, Proxy, registry), не в подменах вендорских паттернов. Но в коде это не enforced — например, можно сделать «свой Button с capsule-wrappers вокруг Kobalte», и compliance это не отловит.

Принципиальная цель: **senior FE с 5 годами стажа** открывает `web-ui/button.tsx` → видит CVA + Kobalte Polymorphic + Tailwind → понимает за 5 минут, потому что **узнаёт паттерны индустрии**, не учит наши.

### Pain 5 — `web-ui-creator` название врёт; `web-creator` рядом мусорит

ADR 045 #2 зафиксировал «creator absorb ui-creator». Но имя `web-creator` тоже не отражает scope: это не «UI-creator», это **полноценный design-time** (UI + логика + текст + monitoring + builds + catalog). И **два** creator-пакета лежат рядом (`creator/` и `ui-creator/`) — visual-мусор + confusion для контрибьютора.

## Принципы (constraints на все Decisions ниже + future)

> Эти принципы — **не Decisions сами по себе**, а **философия** через которую читаются ВСЕ архитектурные решения capsule (текущие + будущие). Любой ADR обязан им соответствовать или явно их пересматривать.

1. **Уникальность — за счёт возможностей, не за счёт «своих» практик.** Capsule предлагает HCA, Proxy, registry, ADR 033 регистрацию пакетов, ADR 041 capability-инъекцию — **архитектурный уровень**. На уровне примитивов / стилей / state / fetching / routing — **базовые индустриальные стандарты**, грамотно собранные. Не «свой Button», не «свой fetcher».

2. **Не заставляем юзера учить наши костыли.** Цель: разработчик, знакомый с используемой нами зависимостью (Kobalte/TanStack/XState/CVA/...), открывает наш код и начинает работать. Если для чего-то требуется обучение capsule-specific патерну — это либо **архитектурный bridge** (UiProxy, ControllerProxy, ADR 033) с **обязательным reference на ADR в коде**, либо это **антипаттерн**.

3. **Делаем максимально правильно.** Сейчас аудитории нет — людей надо привлекать качеством продукта. Не время для «как-нибудь, потом перепишем». Каждый ADR / PR / commit должен быть **canon-ready** для внешнего читателя. Когда придёт массовая аудитория — сможем позволить себе эксперименты, потому что бренд будет нести.

4. **Колокация > копипасты.** «Всё рядом» по умолчанию: docs рядом с кодом, контракты внутри пакета-владельца, типы рядом с реализацией. Если нужно **shar'ить** — выносим в helper-пакет; если хватает контракта — выносим в `web-contract` (или domain-`*-contract`). Дублировать = плохо, абстрагировать слишком рано = тоже плохо. Правило: **третий вызов** → выносим. До этого — копи (но осознанно, помечая).

5. **Vendor-transparent — opt-in capsule-wrappers.** Любой capsule-wrapper вокруг вендора (UiProxy вокруг Kobalte, ControllerProxy вокруг XState, и т.п.) **обязан** нести в коде комментарий с ссылкой на ADR / причину. Без комментария — wrapper рассматривается как «временный костыль» и подлежит compliance-warning.

## Decisions

### D1 — Package zones (5 зон, физическая директория-структура)

`packages/web/*` разбивается на **5 зон** по смыслу. Реализация — **физическая** через директории `packages/web/<zone>/<pkg>/` (директория-grouping ≠ namespace-prefix; npm-имена сохраняются).

| Zone | Что | Пакеты |
|---|---|---|
| **kit** | Stateless light primitives + light композиции. ZERO heavy deps. | `web-ui` |
| **runtime** | Сервисы, которые включены в **каждое** capsule-приложение под капотом. Framework-уровень. | `web-core`, `web-state`, `web-router`, `web-query`, `web-style`, `web-renderer`, `web-dnd`, `web-intl`, `web-date`, `web-profiler`, `web-remote`, `web-contract`, `web-access` |
| **domain** | Стейтфул feature-packages. «Мини-апп как пакет» (свои UI + services + controllers + registry). | `web-auth`, `web-shell`, `web-agent` |
| **boost** | Heavy domain-mirror kit-примитива. Зеркало в `Ui.*`, full power в `Boost.*` / `Tables.*` / etc. | `boost-table`, `boost-map`, `boost-flow`, `boost-charts`, `boost-matrix` (новый, см. ADR 046) |
| **design-time** | Tooling для создания capsule-приложений (редакторы, palette, inspector, monitoring, build, catalog, docs). Не runtime-консьюмерс. | `studio` (бывший `web-creator`, поглощает `web-ui-creator` — см. D4) |

**Канон зависимостей между зонами:**

```
       kit ← runtime
        ↑       ↑
       boost   domain
        ↑       ↑
       (apps консьюмят всё)
       
       design-time ← всё кроме apps; не зависит на самой себе
```

- **kit ← все:** kit зависит ТОЛЬКО на runtime/web-style (через peerDep) + вендоров. Никогда — на boost / domain / design-time.
- **runtime ← runtime:** internal допустимо, но без циклов (compliance ловит).
- **boost ← runtime + kit:** booster зависит на kit (его light-mirror) + runtime сервисов (state, query, etc). Не зависит на domain / другие boost / design-time.
- **domain ← kit + runtime + boost (downward):** mini-app может тянуть kit / runtime / boost.
- **domain ↛ domain (sideways forbidden):** см. D2.
- **design-time ← всё кроме apps:** дизайнерский tool может читать структуру kit/runtime/boost/domain/contracts; не зависит сам на себя.

`packages/web/*/` → `packages/web/<zone>/<pkg>/`:

```
packages/web/
  kit/
    ui/
  runtime/
    core/ state/ router/ query/ style/ renderer/ dnd/ intl/ date/
    profiler/ remote/ contract/ access/
  domain/
    auth/ shell/ agent/
  boost/
    table/ map/ flow/ charts/ matrix/    ← matrix новый (ADR 046)
  design-time/
    studio/                                ← бывший creator, см. D4
```

Конфиги обновляются:
- `tsconfig.base.json` — paths указывают на новые директории; npm-имена не меняются.
- `nx.json` workspaces glob — `packages/web/**` уже покрывает; per-zone customization не нужен.
- `pnpm-workspaces` — same, `packages/**` покрывает.
- Vite-builder, compliance — никакого изменения публичного API.

**Что не меняется:** npm package names (`@capsuletech/web-ui` остаётся; `@capsuletech/boost-table` после ADR 046 rename). Imports не плывут. Изменение **only physical layout**.

### D2 — Domain isolation canon (no horizontal imports between domain packages)

Domain-пакеты НЕ импортят друг друга напрямую. Никогда. Это **canon**, enforced compliance'ом (расширение ADR 004 «no horizontal imports» на пакет-уровень).

**Если domain-X нужна функциональность domain-Y:**

1. **Извлечь контракт** в `@capsuletech/web-contract` (либо domain-specific contract pkg, например `web-auth-contract`). Контракт = только types/interfaces, без impl. Lives либо в `web-contract` либо `packages/web/runtime/contract/`.
2. **domain-X импортит контракт**, не импл.
3. **domain-Y реализует контракт + регистрируется** через ADR 033 `defineCapsuleModule` (capsule.ts manifest).
4. **App-level композиция:** consumer-app получает экземпляр через registry, передаёт domain-X через capability-инъекцию (ADR 041) или через props/services.

Пример (shell хочет знать `is-authed?`):
```ts
// packages/web/runtime/contract/src/auth.ts
export interface IAuthCapability {
  isAuthed: Accessor<boolean>;
  viewer: Accessor<IViewer | null>;
}

// packages/web/domain/shell/src/.../header.tsx
import type { IAuthCapability } from '@capsuletech/web-contract/auth';
// Shell не знает кто реализует. Получает через services / capability.
const Header = Widget((Ui, props) => {
  const auth = services.auth as IAuthCapability;  // инжектировано ADR 041
  return <Show when={auth.isAuthed()}>...</Show>;
});

// packages/web/domain/auth/src/capsule.ts
defineCapsuleModule({
  capabilities: { auth: createAuthCapability() },  // регистрация
});
```

Compliance-rule: `@capsuletech/<domain>/*` НЕ может импортить `@capsuletech/<other-domain>/*`. Контракт — OK (он в runtime/contract).

OWNERSHIP-шаблон расширяется обязательной секцией «Allowed dependency zones» — domain-пакет явно перечисляет (`kit, runtime, boost`).

### D3 — Vendor transparency canon

**Все capsule-wrappers вокруг вендорских библиотек — opt-in и documented.**

Правила:

1. **Каждый wrapper вокруг вендора несёт в коде комментарий с ADR-ссылкой / причиной.** Без — compliance-warning.
2. **OWNERSHIP-template расширяется обязательной секцией «Vendor stack»** — список главных вендоров пакета + одна строка про каждый + ссылка на upstream docs. Контрибьютор / агент / user читает секцию → понимает с чем работает.
3. **Если функциональность можно сделать без wrapper'а (использовать вендор напрямую) — делаем без**. Wrapper только когда:
   - Нужен HCA-bridge (UiProxy для meta-binding, ControllerProxy для FSM-dispatch)
   - Нужен registry-bridge (ADR 033 регистрация)
   - Нужен type-safety bridge (capsule-typed контракт поверх loosely-typed вендора)
   - Нужна capability-инъекция (ADR 041)
4. **Wrapper НЕ маскирует вендорский API.** Если вендор экспортит `<Dialog.Root>`, мы НЕ создаём `<MyDialog>` с тем же поведением и другим API. Wrapper расширяет, не заменяет.

Пример OWNERSHIP «Vendor stack»:
```markdown
## Vendor stack

- **Solid.js** (1.9.12) — реактивный фреймворк. Все компоненты — Solid JSX.
- **@kobalte/core** (^0.13) — a11y-headless библиотека (Polymorphic pattern, focus-management). Используется через `web-ui/slot`.
- **class-variance-authority** (^0.7) — variant-API для классов. Используется через `web-style/createStyle`.
- **Tailwind v4** (^4.2) — utility-CSS. Темы через `@theme inline`.

Документация upstream:
- Kobalte → https://kobalte.dev/
- CVA → https://cva.style/
- Tailwind v4 → https://tailwindcss.com/
```

Это становится частью **vendor-transparent compliance**: новый пакет без секции «Vendor stack» — OWNERSHIP-gate warning.

### D4 — Design-time consolidation: `@capsuletech/web-creator` → `@capsuletech/studio`

Имя `creator` (и тем более `ui-creator`) не отражает scope: это **полноценный design-time** для аппа. Переименовываем в `@capsuletech/studio`. Подпути по двум родам — тулзы + редакторы:

```
@capsuletech/studio
  /shell          ← chrome редактора (не путать с web-shell)
  /palette        ← компоненты-палитра
  /tree           ← node-tree
  /inspector      ← generic-inspector пропсов
  /canvas         ← редактор-канвас (inline + iframe+WS режимы)
  /data           ← интерактивный Shape для UI-редактора
  /monitor        ← runtime/build/test monitor
  /catalog        ← catalog (Storybook sunset target)
  /docs           ← DocSection consumer (см. ADR 048)
  /style          ← style editor
  /ui             ← UI editor (структурный + procedural generator)
  /text           ← text/i18n editor
  /logic          ← FSM/logic editor (web-state-driven)
  /app            ← app composer (root level, склеивает остальное)
```

`web-ui-creator` поглощается (ADR 045 #2 подтверждается, имя финализируется на `studio`). `web-creator` пакет (пустой каркас) переименовывается на `studio`. После poглощения — `web-ui-creator` пакет удаляется + alias-period.

**Зона:** `design-time`. **Owner:** `owner-web-creator` переименовывается на `owner-studio` (опционально — после A1 session restart).

### D5 — Colocation discipline (heuristic)

Перечисляю как формальное правило, чтобы compliance/ревью могли на него ссылаться:

1. **Per-component docs** — рядом с компонентом, не в отдельном `docs/` дереве. Контракты компонента (zod schema, ADR-ссылки) внутри файла-компонента или соседний `.contract.ts`. Это уже делаем (button.contract.ts) — фиксируем как канон.
2. **Per-package types** — рядом с пакетом-владельцем (`interfaces.ts` / `types.ts` внутри). Не выносим в отдельный types-пакет ради «отделения интерфейса от реализации» — это премачур-абстракция. Исключение: cross-package контракт → `web-contract`.
3. **Per-zone helpers** — если 2+ пакета в одной зоне нуждаются в shared helper'е → новый пакет внутри зоны (`packages/web/runtime/<helper-name>/`). Не размазываем по нескольким.
4. **Cross-zone helpers** — `packages/shared/<helper>/` (уже есть `shared-utils`, `shared-zod`, `shared-file-manager`).
5. **Дублировать осознанно до 3-го вызова.** До трёх копий — копируем; на 3-м — выносим. **Не премачуро абстрагируем** (`shared-utils` не должен расти от каждого «вот может пригодится»).

Правило применяется к будущим ADR / refactor'ам: если ADR предлагает «вынести Х в shared» — проверяем «есть ли 3-й вызов уже?» Если нет — это premature, остаётся локально.

## Что НЕ решает ADR 047 (явно вне scope)

- **Конкретный список placeholder'ов в `web-ui`** (Ui.Map / Ui.Flow / Ui.Chart) — решает owner-web-ui когда добавляет; ADR 046 уже их zip'ует.
- **Storybook sunset timeline** — это plan-doc забота (Phase B + design-time/catalog зрелость).
- **Конкретный `web-auth-contract` пакет vs включить в `web-contract`** — owner-web-contract решает при первом cross-domain контракте.
- **Compliance-плагин расширение** (D2 enforcement + D3 wrapper-comment-check) — отдельная задача owner-builders при первом нарушении в реальном коде.
- **Migrations внешних консьюмеров** capsule (`capsule-test`, потенциальные external apps) — отдельный sweep, документируется в release-notes / migration-guide.

## Последствия

**+** `ls packages/web/` сообщает архитектуру: kit | runtime | domain | boost | design-time.
**+** Cycle-prevention для domain-пакетов structurally enforced. Будущие domain (web-payment, web-analytics, ...) не наплодят цепочечных циклов.
**+** Vendor-transparent правило позволяет внешнему dev'у читать наш код **без обучения**. Это **главный канал привлечения** для open-source-community.
**+** `studio` как single design-time umbrella — чистый namespace, расширяемый через subpath'ы. Catalog/monitor/docs одного-пакета.
**+** Colocation-правило экономит когнитивную нагрузку: ищу `Button` — нахожу всё про Button (компонент + contract + tests + browser-tests + docs) в одной папке.

**−** **Большой sweep** — Phase D в plan-doc'е переместит все 23+ пакета в новые директории + обновит tsconfig.base.json + nx.json + workspace + lockfile. Один coordinator (главный) рулит, owner-агенты cooperate'ятся.
**−** Renames + relocations требуют **alias-period** для внешних консьюмеров (если уже опубликованы). На pre-release состоянии — приемлемо.
**−** Vendor-transparent rule может конфликтовать с прошлыми решениями. Аудит существующих wrapper'ов **обязателен** — секция в plan-doc.
**−** `studio` rename = breaking для тех кто уже импортит `web-creator` (никто кроме нас не импортит, scope узкий).

## Roll-out

См. [`docs/_meta/web-rework-plan.md`](../../_meta/web-rework-plan.md) — обновляется с новой **Phase D** (zone migration) и пересмотренной dispatch-таблицей.

Общая последовательность:
- ADR 046 + 047 + 048 ландят одной волной (один docs-PR).
- Phase A0 (merge) + A1 (owner-boost-matrix + restart).
- Phase B (boost-* + Matrix evict — per ADR 046) **‖** Phase C (vt-rework — per ADR 046).
- Phase D (zone migration — per ADR 047) — после стабилизации B/C (чтобы не перемещать moving target). Внутри Phase D — последовательно: D1 директории + tsconfig + lockfile (один большой coordinator-PR главного), потом по zone'ам Vendor stack + cycle-canon compliance-extension.
- Phase E (docs infrastructure — per ADR 048) — параллельно Phase D.

## Альтернативы (rejected)

- **NPM-namespace prefix вместо директорий** (`@capsuletech/kit-ui`, `@capsuletech/runtime-router`, ...): имена становятся длиннее, imports плывут везде, **dirty rename**. Директория-grouping локально без consumer-impact.
- **Group через monorepo «workspaces» отдельные** (`pnpm workspace` per-zone): nx уже умеет group'ировать; усложнение build-pipeline не оправдано.
- **Domain-domain через runtime-bridge (без contract'а)** — runtime становится мусорной свалкой капабилити. Контракт — чище.
- **Vendor-transparent через комменты-только (без OWNERSHIP-секции «Vendor stack»)** — комменты разбросаны, нет ОДНОЙ точки чтения «что под капотом». OWNERSHIP-секция собирает.
- **`studio` vs `forge` vs другие** — обсуждено в session. `studio` выбран как нейтральное «place where you craft»; `forge` коллидирует с planned Rust crate (`backend/forge` для build product user'а).
- **Colocation как unwritten convention** (без формального ADR-правила) — без формального правила теряется через 2-3 года; формализуем.

## Amendment D6 (2026-06-12) — `design-time` zone retired in favor of top-level `studio/`

> [!info] Amendment
> Sole-inhabitant zone collapse. Layout-only; npm package name unchanged.

### Что меняется

Zone `design-time` (с единственным жителем `studio`) сворачивается в top-level `studio/` зону.

**Было:**
```
packages/web/
├── kit/
├── runtime/
├── domain/
├── boost/
└── design-time/
    └── studio/        ← sole inhabitant
```

**Стало:**
```
packages/web/
├── kit/
├── runtime/
├── domain/
├── boost/
└── studio/            ← 5-я top-level zone, host/composer
```

5 zones, 23 пакета (арифметика та же).

### Rationale

1. **«Design-time» как имя папки сбивает.** Читалось как «UI/styling/visual stuff» (design = visual), но зона содержит FSM editor, monitoring, build UI, docs consumer — это **tooling/authoring**, не дизайн. Naming-friction для контрибьютора и автокомплита.
2. **Single inhabitant.** В зоне был один пакет (`studio` после D4 absorb), parent-папка лишняя.
3. **Studio = host/composer canon.** Это не «UI creator», это suite-shell для авторства (как VS Code / IntelliJ — оболочка с инструментами). Top-level zone-slot отражает status.
4. **Composition rule clarity.** Apps/owner-агенты теперь имеют explicit canon: «studio composes from existing packages; raw engines живут отдельно». Зона = top-level slot для **host**-роли, не **категория тулзов**.

### Что не меняется

- npm package name `@capsuletech/studio` — без изменений.
- All subpath exports (`/manifests`, `/state`, `/inspector`, `/generators`, `/controllers`, `/capsule`) — без изменений.
- Import paths consumer'ов — без изменений (только `tsconfig.base.json` paths под капотом меняются).
- Zone count (5) — без изменений; `design-time` → `studio` это переименование, не удаление.

### Compliance

- `Zone` type в `@capsuletech/compliance`: `'design-time'` → `'studio'`.
- `PACKAGE_TO_ZONE` map: `@capsuletech/studio` мапится в `'studio'` зону.
- Path-reconstruction special case переехал с `design-time/<dir>` на `studio/<dir>` (sole zone без префикса в npm name).
- `ZONE_ALLOWED_DEPS`: `studio` → может зависеть на kit + runtime + boost + domain + (sama studio). Apps `↛ studio` в prod (через editor-shell only) — без изменений.

### Cost

Один coordinator-PR главного steward'а (this PR):
- `git mv` `packages/web/design-time/studio/` → `packages/web/studio/`.
- Удалить пустую `packages/web/design-time/`.
- `tsconfig.base.json` paths (7 entries).
- `compliance/{zones,check}.ts` + tests.
- `docs/_meta/web-zones/` — переименование `design-time.md` → `studio.md` + content rewrite + sibling cross-refs (kit/runtime/domain/boost).
- `docs/_meta/{owner-agent-canon,OWNERSHIP-template,readme-template,web-audit-cross-imports,web-rework-plan,renderer,studio}.md` — точечные правки zone-name.
- `.claude/agents/owner-studio.md` + `owner-web-renderer.md` — context update.
- Generated files (`apps/*/.capsule/tsconfig.paths.json`) — регенерируются автоматически при `capsule build`.

Никаких внешних изменений API. Apps consumer'ы compile clean без изменений.

### Composition rule (canon, появился на этом этапе)

Studio exports **product-blocks** (`logic-editor`, `component-builder`, `inspector-panel`, …), НЕ raw functionality. Universal engines (generators, manifest registry, JSON-tree ops) при необходимости живут в своих пакетах и юзаются и в studio, и в apps. Текущий internal layout studio (manifests/state/inspector/generators/controllers/capsule) — quick-and-dirty placement для test-запусков; будет audit-PR с extract'ом raw-блоков в свои пакеты. См. memory `feedback_studio_composition_rule` (canon-источник для owner-studio).

## Open questions

- Как именно дефинируем «3-й вызов» в colocation-правиле (D5)? Heuristic, не строго. Owner-агенты используют здравый смысл; ревью catches premature abstraction.
- Compliance-rule для D2 (no domain-domain) и D3 (vendor-wrapper comment) — реализация в `@capsuletech/compliance`, конкретный AST-pattern owner-builders дописывает по реальным кейсам.
- Per-domain `*-contract` пакет vs всё в `web-contract` — пока всё в `web-contract` (только types). Если он раздуется > 50 файлов — пересматриваем.

## Ссылки

- [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] (sister, точечная тактика)
- [[048-docs-as-data|ADR 048]] (sister, docs infrastructure)
- [[045-web-taxonomy|ADR 045]] (#2 absorb ui-creator подтверждается с новым именем `studio`)
- [[044-web-menu-package|ADR 044]] (heavy/light граница, поднимается в zone-канон)
- [[041-composition-distribution-model|ADR 041]] (capability-инъекция — основа D2)
- [[033-package-registration|ADR 033]] (manifest — основа D2 implementation)
- [[004-compliance-golden-rules|ADR 004]] (intra-app HCA правила; расширяются в D2 на inter-package)
- [`docs/_meta/web-rework-plan.md`](../../_meta/web-rework-plan.md) (live execution)
