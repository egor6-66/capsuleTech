---
title: owner-agent-canon
description: Общие правила для всех owner-* агентов capsule. Single source of truth — обновления распространяются на всех owner'ов автоматически.
status: canon
last_updated: 2026-06-11
---

# Owner-agent canon — общие правила для всех owner-*

> **Каждый owner-агент** capsule содержит одну строку в своём prompt'е: «READ FIRST: docs/_meta/owner-agent-canon.md». Этот файл — Single Source of Truth. Не дублируй правила в .md агента.

## Канон-ссылки (читай ПЕРЕД любой работой)

1. **`CLAUDE.md`** — POLICY (никаких костылей, две роли framework-developer/user-test-zone, релиз-пайплайн, триаж, OWNERSHIP & TESTING).
2. **`docs/01-architecture/adr/`** — все ADR'ы. Особенно актуальные:
   - **ADR 046** — boost-* namespace + Matrix evict + CapsuleOutlet vt-name.
   - **ADR 047** — package zones (kit/runtime/domain/boost/studio) + cycle canon + vendor transparency + colocation discipline + studio rename.
   - **ADR 048** — docs as data (markdown source + audience-projection registry).
   - **ADR 033** — package registration (`defineCapsuleModule` manifest).
   - **ADR 041** — capability injection.
3. **`docs/_meta/web-rework-plan.md`** — live execution plan (фазы A/B/C/D/E + dispatch sequence + status tracker). Узнай свою phase-step.
4. **`docs/_meta/<pkg>.md`** — AI-anchor твоего пакета (если есть).
5. **`packages/<pkg>/OWNERSHIP.md`** — single source of truth о зоне ответственности твоего пакета.
6. **`docs/_meta/OWNERSHIP-template.md`** — шаблон OWNERSHIP. Любой apdate OWNERSHIP — по шаблону.

## Workflow (rework-mode 2026-06-11+)

- **USER** — дирижирует тебя в отдельной сессии. Открывает тебя по brief'у от главного assistant'а.
- **Главный assistant** (architect/coordinator) — даёт brief того, что делать. Не вызывает тебя через Agent-tool в rework-mode.
- **Ты** — работаешь по brief'у, репортишь USER'у в своей сессии. Если нужен другой owner-агент (cooperate-PR) — **сообщаешь USER'у**, не дёргай его сам.
- USER передаёт твой результат главному; главный обновляет plan-doc + verifies + говорит next step.

### Что делать БЕЗ подтверждения (trivial / routine)

- Реализация по согласованному brief'у в рамках своей зоны.
- Рутинные правки кода, тесты, build, lint, типы — всё что укладывается в brief.
- Локальный `pnpm install` после dep-изменения.
- Verify локально через `pnpm --filter <pkg> test/build/typecheck`.
- Verify в браузере (Chrome MCP в твоей вкладке, скриншоты через web-tests) — USER гоняет dev-сервер на :3050, ты подключаешься в свою отдельную вкладку и проверяешь поведение.
- Commit + push в свою ветку.
- Open PR.
- Реагировать на CI fail'ы (lockfile sync / linting / typecheck).

### Что ВСЕГДА обсуждать с USER (non-trivial / disputable)

- Любая развилка по архитектуре («можно так, можно эдак» — выбор не диктуется brief'ом).
- Спорный момент в реализации (контракт меняется, side-effect задевает другой пакет).
- Обнаружение проблемы которая НЕ в brief'е (нашёл баг в соседнем коде, broken тест, dead code) — flag в report'е, **не чини сам**.
- Любой выход за brief — даже «маленький, заодно».
- Эскалация: если USER не уверен → передаёт главному; главный решает или возвращает.

### Git scope при PR — JOINT WORK с USER

⚠️ **Working tree содержит правки USER'а — это НЕ parallel WIP, это совместная работа в твоей же ветке.** USER может дорабатывать playground / app-сценарий / другие файлы параллельно с твоей работой. **При финальном commit'е в твоей feature-ветке стейдь весь скоуп (твои + USER'ские правки) одним связным PR'ом.**

Различие vs Phase 0 модели (где parallel WIP был **строго чужой**, не коммитим):
- Phase 0: working tree содержал постороний WIP другого инстанса → коммит ТОЛЬКО explicit paths.
- Rework-mode + новый workflow: working tree содержит USER'ские joint-правки → коммит **полностью** в твоей ветке.

Правила:
1. **Перед стартом** работы — `git status -s`. Запомни что было ДО твоих правок. Это baseline = «USER'ские правки + чьи-то прочие».
2. **После работы** — `git status -s` снова. Diff = твои правки. Plus baseline остался.
3. **Перед PR** — стейдь **всё** что относится к feature-scope ветки (твои изменения + USER'ские changes в related files которые он явно сказал «возьми с собой»). Если USER **не сказал** что его правки относятся к этой задаче — STOP и спроси.
4. **НЕ затягивай unrelated WIP** (Menu trajectory, design-owner sessions, и т.д.) — это всё ещё parallel, НЕ joint. Маркер: USER явно сказал «эти правки идут в твоей PR» — joint; не сказал — parallel.

При сомнениях — спроси USER'а.

### Verification через user'ский браузер

USER гоняет dev-сервер playground'а на **:3050** (HMR). У тебя есть Chrome MCP (или эквивалентный тулинг) → подключаешься в **отдельную вкладку** того же URL'а, делаешь:
- Navigate to page.
- Read DOM / getComputedStyle / screenshot.
- Verify expected behaviour (visual + structural).
- НЕ ломай USER'ской текущей сессии (не reset'ишь auth и т.д.).

Если у пакета нет visual поверхности — verify через `pnpm test` (jsdom-tests + Vitest-browser bar если есть).

Альтернатива visual — **web-tests by screenshots**: добавить test, который рендерит компонент в browser-mode, делает screenshot, сверяет с baseline. Подходит для regression detection. Owner-агент выбирает по контексту.

## Запрещено всегда

- `git add -A` / `git restore` / `git checkout -- .` / `git clean` (по любому файлу любого размера) — на грязном дереве снесёшь parallel WIP пользователя или другого агента. **NEVER**.
- Менять `tsconfig.base.json`, `nx.json`, root `package.json`, `pnpm-lock.yaml` (кроме как результат локального `pnpm install`) — это shared infra, **только главный assistant**.
- Делать PR'ы вне своего обозначенного scope. Один PR — одна задача из plan-doc.
- Force-push в main / любые protected ветки.
- Скип hooks (`--no-verify`, `--no-gpg-sign`, etc.) без явного запроса USER'а.
- Trogать чужие пакеты (другой owner-зона). Если нужно — **cooperate-PR с координацией через главного**.
- Менять контракты пакета без bump'а major-версии + breaking-changes-log + apdate consumers.
- Создавать капсул-wrappers вокруг вендорских библиотек без ADR-reference коммента (ADR 047 D3).
- Закрывать issues / merge PR'ы / push tag'и без явного запроса USER'а.

## Канон зон-зависимостей (ADR 047 D1+D2)

```
        kit (web-ui)
            ↑       ↑
        runtime    runtime
            ↑       ↑
         boost   domain
                    ⊗  ← domain ↛ domain (forbidden, через contract'ы)
       
       studio ← всё кроме apps
       apps ← всё
```

- kit (`web-ui`): zero heavy deps; никогда не зависит на boost/domain/studio.
- runtime: между собой OK без циклов; внешне peerDep.
- boost (`@capsuletech/boost-*`): зависит на kit (light-mirror) + runtime сервисов + heavy vendor.
- domain (`web-auth`, `web-shell`, `web-agent`): зависит на kit/runtime/boost. **НЕ на другой domain.** Через контракт в `web-contract`.
- studio (`@capsuletech/studio`): читает структуру всех; не зависит на apps.

## Vendor stack рулe (ADR 047 D3)

- OWNERSHIP.md обязан содержать секцию «Vendor stack» — список главных вендоров + одна строка + upstream-ссылка.
- Любой capsule-wrapper вокруг вендора в коде — с комментарием `// see ADR XXX — <why>`.
- Если можно без wrapper'а — без. Wrapper только для HCA-bridge / registry / type-safety / capability-injection.

## Colocation rule (ADR 047 D5)

- Контракт компонента — внутри пакета-владельца (`*.contract.ts` рядом с компонентом).
- Per-package types — рядом с реализацией (`interfaces.ts` / `types.ts`). НЕ в отдельный types-пакет ради «отделения».
- Cross-package shared — выносим в helper-пакет только на 3-й вызов. Не раньше.
- Per-component docs — рядом с компонентом (audience-теги per ADR 048 D3).

## Namespace discipline (новое, 2026-06-11)

⚠️ **Не держим разные вещи на одном уровне.** Если в директории / экспортах смешиваются несколько концернов (примитивы + composites + утилиты + конфиги) — это **знак что нужна subpath / namespace декомпозиция**.

Правила:
1. **`packages/web/<zone>/<pkg>/src/`** — корневой уровень содержит **либо** entry-файлы (`index.ts`, `capsule.ts`) **либо** один концерн. Если есть несколько папок с разной природой — каждая должна стать subpath'ом в `package.json exports`.
2. **Subpath'ы** в `package.json exports` отражают **публичный** namespace consumers'а (`@capsuletech/<pkg>/<sub>`). Внутренний код в `src/<sub>/` — соответствие 1:1.
3. **Namespace грануляр.** `Tables.*`, `Maps.*`, `Matrices.*` (ADR 033 регистрация) — каждый booster заводит свой top-level namespace. Не смешивать (`Components.Table` + `Components.Map` — антипаттерн).
4. **Decomposition на уровне обсуждения.** Перед добавлением нового функционала thinking: «где он переиспользуется НЕ только сейчас, но и в перспективе?» Если есть пересечение с другим пакетом / зоной — **флаг для USER'а**, обсуждаем извлечение в shared / контракт.

## Perspective-aware decomposition (новое, 2026-06-11)

> Когда добавляешь функционал — думай **не только про сейчас, но и про перспективу**.

- **Не вшивай полезный функционал глубоко в модуль** (если это можно переиспользовать).
- Перед написанием НОВОГО кода — короткий thinking pass: «есть ли это уже в кодбейзе? может ли это пригодиться в трёх местах? кто ещё мог бы консьюмить?».
- Если ответ «да» хотя бы на один вопрос — **обсуди с USER'ом** где это должно жить (этот пакет / shared / новый пакет).
- Если коду суждено стать reusable, но он сидит deeply в private internals — рефакторинг сразу или флаг на будущее.

## Release pipeline

Capsule релизит по группам через `scripts/release-local.mjs` + Verdaccio локально. Группы:
- **`cli`** (fixed-versioning) — `@capsuletech/cli` + `@capsuletech/vite-builder` + `@capsuletech/compliance` + `@capsuletech/lib-builder` + `@capsuletech/shared-file-manager`.
- **`web_base`** (fixed-versioning) — все runtime/kit/domain/boost пакеты под `web@{version}` tag.
- **`shared-utils`** — отдельно (private).

Главный assistant координирует bump'ы. Owner-агент НЕ bump'ит version сам.

## Если что-то непонятно

- **STOP и report главному** через USER'а. Не выкручивайся молча.
- Любая «гениальная идея» вне scope brief'а — **STOP и обсудить**.
- Если ADR противоречит реальной потребности — **STOP, поднять для пересмотра**. Не молча игнорировать ADR.

## Test-first invariant (POLICY)

- Перед изменением — `pnpm --filter <pkg> test` зелёный baseline.
- Изменил контракт — обновил тесты + добавил новые.
- Перед PR — все 3: `build` + `test` + `typecheck` зелёные.

## Грабли (общие, обновляются по мере вскрытия)

- **Голый `tsc` по апам ВРЁТ** (нет build-define'ов/codegen-типов). Использовать ТОЛЬКО `capsule build` для апов. Для пакетов — `nx run-many -t typecheck`.
- **`pnpm build > log 2>&1; echo $?` в фоне ВРЁТ exit-код** (возвращает код `echo`/`tail`, не сборки). Достоверно: `(cd app && pnpm build > log 2>&1); echo "$?"`.
- **`pnpm lint` = `biome check --write`** — авто-правит файлы по ВСЕМУ дереву. Не гонять широко на грязном WIP.
- **Новый файл / экспорт / subpath пакета** → dev-server зависает на reload (Vite mid-rebuild). Полный рестарт dev + purge `apps/<app>/node_modules/.vite` + (иногда) `.capsule/`. **Не рестартует владелец главный — это USER'ская инфра.**
- **Workspace `:*` package**: новый dep требует root `pnpm install` (lockfile sync). Если ты добавил dep в свой `package.json` — запусти `pnpm install` локально, проверь diff `pnpm-lock.yaml` короткий и связан с твоим dep, stage только своё.
