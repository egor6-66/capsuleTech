# Migration Audit — capsule (oracle) → Omnifield v2

> Живой рабочий каталог миграции. Оракул = `D:\CODING\projects\my\capsule` (черновик).
> Новая земля = `D:\CODING\projects\my\omnifield\commons` (стандарты уже заложены) + будущие репо `framework/ apps/ backend/ devops/`.
>
> **Принцип миграции (POLICY v2):** в новый репо НЕ переносим то, к чему есть вопросы, и тем более костыли.
> Этот каталог — «таможня»: каждый пакет проходит аудит и получает вердикт ДО переноса.

## Порядок переноса (ADR 077)

`core → builders → kit → cli → домены`. Канон едет **впереди** пакетов (в commons уже лежит).

## 🧭 EXECUTIVE SUMMARY (для плана миграции)

**Главный вывод: база ДОВЕРЕННАЯ.** Sweep по всему `packages/**/src`: ноль silent-swallow'ов, ноль stray-логов в hot-path, ноль `HACK`, все type-касты аннотированы, у каждого пакета OWNERSHIP.md. «Спорное» = не гниль, а: (а) незрелость 0.0.0-скелетов, (б) тонкие тесты на части пакетов, (в) несколько ЯВНО помеченных workaround'ов, (г) доко-дрейф. Это мигрируемо дисциплинированно.

### Тиры готовности (35 пакетов)

**🟢 READY — переносим первыми, только бренд-rename (9):**
`shared-zod` · `shared-utils` · `lib-builder` · `biome-config` · `web-state` · `web-router` · `web-query` · `web-style` · `web-dnd`. Это безопасный фундамент.

**🟡 FIX-FIRST — рабочий каркас, код 🟢, закрыть точечные гэпы (13):**
`web-core` · `vite-builder` · `compliance` · `web-ui` · `cli` · `web-profiler` · `web-renderer` · `web-shell` · `boost-layout` · `boost-map` · `web-date` · `web-intl` (+ `data-gen` погранично). Гэпы: тест-глубина, AI-anchors, пара workaround'ов, canon-дыры линтера.

**🟠 UNDER-QUESTION — решать по пакету, большинство defer (11):**
`web-remote` (блокеры, не доказан e2e) · `web-access` (scaffold) · `web-contract` (проверить полноту) · `web-auth` (частичн.) · `boost-chart`/`boost-flow` (0 тестов) · `boost-table` (CC-6) · `web-learn`/`web-studio` (старая анатомия, последними) · `canvas-*` · `web-docs`.

**🔴 DO-NOT-MIGRATE as-is (1):** `web-agent` — scaffold, завязан на удалённый scriber; rebuild против `backend/llm`.

### Рекомендуемая первая волна
Ровно ADR 077: **core→builders→kit→cli→runtime-backbone→shell** = все 🟢 + 🟡. Это самодостаточный рабочий фреймворк (апп собирается и рендерит). 🟡-фиксы делаем **в чистой земле** по ходу (не тащим гэп, но и не блокируемся). 🟠/🔴 — отдельными осознанными решениями ПОСЛЕ каркаса; workspace (learn/studio) — самыми последними, после валидации package-модели на moderator-POC.

### 🚩 Развилки user'у (гейтят план — собраны из всех файлов)
1. **Variant B** (Vite root=appRoot) — закрываем ли `AppSourceServePlugin` workaround в чистой земле? [builders V1]
2. **compliance → error + shapes/entities enforcement** — поднимаем канон до полного enforcement ДО app-кода? [builders C2/C3]
3. **workspace-зона растворяется** — studio/learn = отдельные ship-юниты, не «зона»; zones.ts переосмыслить. [compliance C1 / workspace]
4. **Table (CC-6)** — достроить boost-table и убрать table из kit, ИЛИ отменить boost-table? [web-ui / boost]
5. **web-remote** — в первую волну (закрыв iframe browser-verify + DnD-ADR) или отложить (moderator стартует standalone)?
6. **web-auth oauth2/qr** — в первую волну или role/credentials-ядро сейчас, стратегии позже?
7. **web-placeholders** — kit или domain?
8. **web-agent** — подтвердить: не тащим, rebuild против backend/llm.
9. **desktop** — в первую волну или отдельный capability-трек (Rust-вес)?
10. **augmentation-модель (CC-8)** — namespace-hook (`Ui.Layout.Matrix`) vs programmatic (`Layouts.*`) — единую, до конца.

### Сквозная механика (делаем скриптом/системно, не по файлу)
Бренд-rename (CC-1) · вычистить dangling `shared-file-manager` (CC-7, 24 файла + CI) · освежить пути в OWNERSHIP после зон-реорга (CC-3) · exports↔docs sync (CC-5) · дописать отсутствующие AI-anchor'ы (почти везде помечены как долг).

## 🌐 FULL-CODEBASE ROLLUP (2026-07-08 — аудит расширен за пределы framework)

Аудит теперь покрывает **весь кодбейз**: framework (packages) · backend (7 py + 2 rust) · apps
(6 фронтов) · infra (scripts/config/CI/docker/harness). Сводка по зонам:

| Зона | Здоровье | Ключевое |
|---|---|---|
| **framework** | база ДОВЕРЕННАЯ (0 silent-swallow/HACK) | касты = low-risk type-shaping; **chart/flow/table — 3 heavy без app-потребителей** (defer-until-needed); CC-4 (vite-builder в web-core deps) LIVE |
| **backend** | **здоровее framework** (все py tested, federation env-URL ✅) | **§4 Docker НЕ выполнен** (0 Dockerfile'ов = packaging-долг CC-11); §2 seam ✅; lang importer typing-долг (fixable) |
| **apps** | compliance ЧИСТО (0 app-package-import в слоях) | learn=ЭТАЛОН; **store.ctx typing-gap → `as any` даже в эталоне** (CC-10, root=web-core/state); playground-судьба развилка |
| **infra** | v2 = regen/adapt, не verbatim | gateway+observability REUSE (brainer их юзает); CI CC-7 cleanup; harness уже деривится из commons |

**Мета-уроки для v2 (сквозные, новые этой ночью):**
1. **Не строить heavy-обвязку вперёд спроса** — chart/flow/table построены/extracted, но 0 app-потребителей. v2: заводить по факту нужды, с тестами. Снимает давление с 3 развилок разом.
2. **store.ctx typing-gap** (CC-10) — единственный крутыль в самом эталоне; root во фреймворке (web-core `useCtx` + web-state `createBridge` не типизируют `store.ctx.data`). Фикс в runtime чистит все апы. **v2-приоритет.**
3. **ADR 072 §4 Docker-долг** (CC-11) — backend не контейнеризован; env-конфиг есть (pydantic) → механический, но обязательный шаг для self-host/federation.
4. **web-agent → brainer** — 🔴 web-agent не портируется standalone; его rebuild = `self-hosted`-провайдер продукта Brainer (agent-as-provider, backend/llm agent-loop).

**Связь с текущим курсом (пивот 2026-07-07):** первая волна v2 = **продукт Brainer** (agent-оркестрация), не docs. Этот аудит = задел под ПОЗДНЮЮ framework-миграцию (когда до неё дойдём) + источник для backend-контрактов, которые Brainer/движки потребляют уже сейчас (OTEL-стек, backend/llm). Framework-first-wave (🟢+🟡 spine) остаётся валидным планом, но исполняется ПОСЛЕ обкатки дисциплины на Brainer.

---

---

## Легенда вердиктов

| Вердикт | Значение |
|---|---|
| 🟢 **READY** | Переносим как есть. Канон соблюдён, тесты/доки есть, костылей нет. |
| 🟡 **FIX-BEFORE-MIGRATE** | Перенос только после точечных фиксов. Список фиксов — в файле пакета. |
| 🟠 **UNDER-QUESTION** | Есть открытые архитектурные вопросы / скелет / нестабильность. Решаем ДО переноса (обсудить с user / ADR). |
| 🔴 **DO-NOT-MIGRATE (yet)** | Костыль/незрелость в основе. Либо переписать в v2 с нуля, либо отложить. |
| ⚪ **N/A** | Артефакт не мигрирует (test-fixture, build-output, оракул-специфика). |

## Методология аудита (что проверяю в каждом пакете)

1. **Структура** — раскладка соответствует канон-анатомии (домен = app-minus-Page/Feature; runtime/builders — по назначению). Barrel / subpath-exports без дрейфа.
2. **Канон-compliance** — upward/horizontal-импорты; классы в потребителях (должны быть только в kit); ручная вёрстка вместо пресетов; композиция только в widgets; stateless views.
3. **Костыли** — silent fallback, try/catch-swallow, hardcoded paths, `@ts-ignore`/`@ts-nocheck`, `as any`, `biome-ignore`/`eslint-disable`, `TODO/FIXME/HACK/XXX`, дубль `@source`.
4. **Зрелость** — версия, скелет vs реальный код, наличие и зелёность тестов, docs-anchor.
5. **Публичный API** — `package.json` exports против реальных файлов (мёртвые субпаты = дрейф).
6. **Известные quirk'и** — из CLAUDE.md «Известные шероховатости» + OWNERSHIP.md.
7. **Вердикт** + конкретный список действий.

## Инвентарь фреймворка (`packages/`)

Версия из `package.json`. `0.0.0` = скелет/скаффолд (кандидат в 🟠).

### Ядро / билд-тайм
| Пакет | Путь | Версия | Файл аудита | Вердикт |
|---|---|---|---|---|
| @capsuletech/web-core | web/runtime/core | 0.1.1 | [web-core.md](framework/web-core.md) | 🟡 код🟢, доко/dep-гигиена |
| @capsuletech/vite-builder | builders/vite | 0.1.1 | [builders.md](framework/builders.md) | 🟡 AppSourceServe workaround + тест-пробел |
| @capsuletech/compliance | builders/compliance | 0.1.1 | [builders.md](framework/builders.md) | 🟡 canon-дыры (shapes/entities, warn, dead zones) |
| @capsuletech/lib-builder | builders/lib | 0.1.1 | [builders.md](framework/builders.md) | 🟢 |
| @capsuletech/biome-config | builders/biome | 0.0.10 | [builders.md](framework/builders.md) | 🟢 |
| @capsuletech/docs-builder | builders/docs-builder | 0.0.0 | [builders.md](framework/builders.md) | 🟠 нет OWNERSHIP, docs-тулинг дублируется |
| @capsuletech/cli | cli | 0.1.1 | [cli.md](framework/cli.md) | 🟡 CI-bypass gap + git add -A футган |

### Kit
| Пакет | Путь | Версия | Файл аудита | Вердикт |
|---|---|---|---|---|
| @capsuletech/web-ui | web/kit/ui | 0.2.0 | [web-ui.md](framework/web-ui.md) | 🟡 код🟢 (референс); test-depth + table-развилка |

### Shared
| Пакет | Путь | Версия | Файл аудита | Вердикт |
|---|---|---|---|---|
| @capsuletech/shared-zod | shared/zod | 0.1.1 | [shared.md](framework/shared.md) | 🟢 |
| @capsuletech/shared-utils | shared/utils | 0.1.0 | [shared.md](framework/shared.md) | 🟢 |

### Runtime
| Пакет | Путь | Версия | Файл аудита | Вердикт |
|---|---|---|---|---|
| @capsuletech/web-state | web/runtime/state | 0.1.1 | [runtime.md](framework/runtime.md) | 🟢 |
| @capsuletech/web-style | web/runtime/style | 0.1.1 | [runtime.md](framework/runtime.md) | 🟢 |
| @capsuletech/web-router | web/runtime/router | 0.1.1 | [runtime.md](framework/runtime.md) | 🟢 |
| @capsuletech/web-query | web/runtime/query | 0.1.1 | [runtime.md](framework/runtime.md) | 🟢 |
| @capsuletech/web-dnd | web/runtime/dnd | 0.1.1 | [runtime.md](framework/runtime.md) | 🟢 |
| @capsuletech/web-profiler | web/runtime/profiler | 0.1.1 | [runtime.md](framework/runtime.md) | 🟡 API→stable (v2 observability-хребет) |
| @capsuletech/web-renderer | web/runtime/renderer | 0.1.1 | [runtime.md](framework/runtime.md) | 🟡 value-binding + full-mode + тесты |
| @capsuletech/web-intl | web/runtime/intl | 0.1.0 | [runtime.md](framework/runtime.md) | 🟡 малый, проверить покрытие |
| @capsuletech/web-date | web/runtime/date | 0.1.0 | [runtime.md](framework/runtime.md) | 🟡 малый, проверить покрытие |
| @capsuletech/web-remote | web/runtime/remote | 0.0.0 | [runtime.md](framework/runtime.md) | 🟠 открытые блокеры, не доказан e2e |
| @capsuletech/web-access | web/runtime/access | 0.0.0 | [runtime.md](framework/runtime.md) | 🟠/🔴 scaffold без реализации |
| @capsuletech/web-contract | web/runtime/contract | 0.0.0 | [runtime.md](framework/runtime.md) | 🟠 контракт-фундамент, проверить полноту |
| @capsuletech/data-gen | web/runtime/data-gen | 0.0.0 | [runtime.md](framework/runtime.md) | 🟡 процедурный UI-gen (НЕ дубль, verified) |

### Domain
| Пакет | Путь | Версия | Файл аудита | Вердикт |
|---|---|---|---|---|
| @capsuletech/web-shell | web/domain/shell | 0.1.0 | [domain.md](framework/domain.md) | 🟡 P0, тонкие тесты + Header |
| @capsuletech/web-auth | web/domain/auth | 0.0.0 | [domain.md](framework/domain.md) | 🟠 role/creds готовы, oauth2/qr stub |
| @capsuletech/web-agent | web/domain/agent | 0.0.0 | [domain.md](framework/domain.md) | 🔴 scaffold, завязан на удалённый scriber |
| @capsuletech/web-placeholders | web/domain/placeholders | 0.0.0 | [domain.md](framework/domain.md) | 🟡 малый; kit vs domain? |

### Boost
| Пакет | Путь | Версия | Файл аудита | Вердикт |
|---|---|---|---|---|
| @capsuletech/boost-chart | web/boost/chart | 0.1.1 | [boost.md](framework/boost.md) | 🟠 ZERO тестов |
| @capsuletech/boost-flow | web/boost/flow | 0.1.1 | [boost.md](framework/boost.md) | 🟠 ZERO тестов, крошечный |
| @capsuletech/boost-layout | web/boost/layout | 0.0.0 | [boost.md](framework/boost.md) | 🟡 зрелый, D5 augment-хук не готов |
| @capsuletech/boost-map | web/boost/map | 0.0.1 | [boost.md](framework/boost.md) | 🟡 почти 🟢 |
| @capsuletech/boost-table | web/boost/table | 0.0.0 | [boost.md](framework/boost.md) | 🟠 CC-6 mid-extraction дубль |

### Workspace (домен-апп-хосты)
| Пакет | Путь | Версия | Файл аудита | Вердикт |
|---|---|---|---|---|
| @capsuletech/web-learn | web/workspace/learn | 0.0.0 | [workspace.md](framework/workspace.md) | 🟠 старая анатомия, мигрирует последним |
| @capsuletech/web-studio | web/workspace/studio | 0.0.0 | [workspace.md](framework/workspace.md) | 🟠 старая анатомия + не добито |

### Canvas / Desktop / Docs (низкий приоритет — скелеты)
| Пакет | Путь | Версия | Файл аудита | Вердикт |
|---|---|---|---|---|
| @capsuletech/canvas-host | canvas/host | 0.0.0 | [misc.md](framework/misc.md) | 🟠 скелет, Unity-трек, defer |
| @capsuletech/canvas-three | canvas/three | 0.0.0 | [misc.md](framework/misc.md) | 🟠 голый скелет (1 файл) |
| @capsuletech/canvas-ui | canvas/ui | 0.0.0 | [misc.md](framework/misc.md) | 🟠 голый скелет (1 файл) |
| @capsuletech/desktop | desktop | 0.0.0 | [misc.md](framework/misc.md) | 🟡/🟠 функц.+tested, Rust-вес, опционален |
| @capsuletech/web-docs | web/docs | 0.0.0 | [misc.md](framework/misc.md) | 🟠 docs-трио, consolidate, defer + Obsidian-canon-conflict (wikilinks/callouts) |

## Прогресс аудита

- [x] Broad crutch-sweep (grep по всему `packages/`)
- [x] web-core
- [x] builders
- [x] web-ui
- [x] cli
- [x] shared
- [x] runtime
- [x] domain
- [x] boost
- [x] workspace
- [x] canvas/desktop/docs
- [x] Второй проход — углубление спорного (code-verified: classify.ts, AppSourceServe, data-gen≠shared-zod, web-ui vitest, cli git add -A, web-auth стратегии; 2 поправки → CC-9).
- [x] **Pass-2 (2026-07-08):** 🟢-backbone code-verify (касты low-risk type-shaping, query `log()`=opt-in не crutch, web-remote cross-origin TODO — в runtime.md); boost-chart/flow **usage-verify = 0 app-потребителей → DEFER** (boost.md); docs-трио tie-in к writer-продукту (misc.md).
- [x] **Backend zone (pass-1, 2026-07-08)** — [backend/README.md](backend/README.md). 7 python capability-сервисов (все tested) + 2 rust + target(N/A). Federation ✅ (env-URL pydantic-settings). Tiers: learn/lang/community 🟢, auth/image/llm/voice 🟡, telegram/playground 🟠.
- [x] **Apps zone (pass-1, 2026-07-08)** — [apps-frontends.md](apps-frontends.md). learn=ЭТАЛОН, playground=fork, studio/canvas/community=WIP/scaffold. Compliance clean. Cross-cutting: store.ctx typing-gap (as any даже в эталоне) → web-core/state fix.
- [x] **Infra zone (2026-07-08)** — [infra.md](infra.md). scripts/root-config/CI/docker/harness. Вердикт: в v2 РЕГЕН/АДАПТ, не verbatim. gateway+observability 🟢 REUSE (brainer юзает); CI 🟡 REWRITE + CC-7 cleanup; harness уже деривится из commons-шаблонов. CC-7 подтверждён (24 файла).
- [ ] Pass-2 deepen backend (per-service ADR 072 §2/§3/§4, lang importer typing-долг, telegram e2e) + apps (playground-судьба, full compliance:check).

> **АУДИТ ТЕПЕРЬ ПОКРЫВАЕТ ВЕСЬ КОДБЕЙЗ** (2026-07-08): framework (packages, pass-1+2) · backend (7 py + 2 rust) · apps (6 фронтов) · infra (scripts/config/CI/docker/harness). Ниже executive summary — framework-центричный (историч.); полная картина по зонам — в per-zone файлах + прогресс выше.
- [ ] Pass-2 deepen backend (per-service ADR 072 §2/§3/§4, lang importer typing-долг, telegram e2e) + apps (playground-судьба, full compliance:check).

## Сквозные находки (cross-cutting)

Паттерны, повторяющиеся во многих пакетах — фиксятся **системно** при переносе, не по одному.

### CC-1. Бренд-rename `@capsuletech/*` → `@omnifield/*` (mech, все пакеты)
Каждый `package.json` name + все workspace-deps + все импорты `@capsuletech/...` в коде + `tsconfig.base.json` paths. Механически, но тотально. Заложить codemod/скрипт замены при переносе, не руками по файлу.

### CC-2. Здоровье кода — фреймворк ЧИСТ от худших костылей ✅
Sweep по всему `packages/**/src`:
- `catch {}` (silent swallow) — **0 совпадений**.
- stray `console.log/debug` в рантайм-hot-path — **нет** (все console — в build-tools/CLI/profiler-reporters/stories, намеренные).
- `HACK`/`XXX` — **0**. `FIXME` — 0.
- `@ts-expect-error`/`as unknown as`/`biome-ignore` — почти все **в тестах** (негативные type-тесты, mock-касты) **с обоснованием** в комментарии. Костыли аннотированы, не молчаливые.
- `TODO` — сконцентрированы в **0.0.0-скелетах** (web-auth oauth2/qr, web-agent весь) как честные «future phase» маркеры, не долг в рабочем коде.
**Вывод:** база доверенная; «спорное» = незрелость скелетов + доко-дрейф, а не гниль.

### CC-3. Доко-дрейф путей после зон-реорга (ADR 047 D7)
OWNERSHIP.md-файлы ссылаются на **старые пути** (`packages/web/core/...`, `packages/web/ui/...`) — фактически пакеты переехали в `runtime/`, `kit/`, `domain/`, `boost/`, `workspace/`. У каждого пакета есть OWNERSHIP.md (✅ дисциплина), но внутренние пути надо освежить при переносе. Проверять в каждом пакете.

### CC-4. Build-tool в рантайм-`dependencies` — sweep сделан, concern = 1 пакет
Систематический скан всех package.json: только 3 пакета держат build-tool в `dependencies`:
- `vite-builder` → compliance, lib-builder — **легитимно** (bundleDependencies в dist, рантайм-плагины).
- `cli` → vite-builder, compliance — **легитимно** (оркестрация dev/build + release-group).
- **`web-core` → vite-builder — НАРУШЕНИЕ.** Runtime-сердце (в каждом апе) зависит на build-tool, а в src только doc-комментарий (app-config.ts:175). → devDep/удалить. Единственный реальный dependency-tier smell (детали в web-core.md V3).

### CC-5. exports (package.json) vs документированный API
web-core: 9 subpath'ов в exports, 4 в OWNERSHIP-API. Мёртвых нет, но недокументированы. Проверять соответствие exports↔реальные файлы↔доки в каждом пакете (мёртвый subpath = дрейф под снос; недокументированный реальный = дописать).

### CC-9. OWNERSHIP-файлы содержат STALE claim'ы — вердикт по КОДУ, не по OWNERSHIP
Второй проход поймал: web-ui OWNERSHIP заявляет active-blocker «vitest не конфигурит solid transform» — по факту config **уже** содержит `solid()` + jsdom (render-тесты работают); boost-layout frontmatter `status: scaffold` vs тело «alpha». **Урок для миграции:** OWNERSHIP = отличный указатель, но claim'ы (blockers/roadmap/status) могут отставать от кода. Перед переносом каждого 🟡/🟠 — code-verify ключевых утверждений, освежить OWNERSHIP. Не переносить stale-доку как истину.

### CC-8. Augmentation runtime-хук (`Ui.X` ← boost) — частично не подключён
Паттерн «kit-плейсхолдер `Ui.Layout`/`Ui.Chart`/… augment'ится heavy-boost'ом» — местами aspirational. boost-layout OWNERSHIP: D5 augmentation runtime hook (`Object.assign` в `Ui.Layout`) **не реализован в web-core** → апы используют `<Layouts.Matrix/>` (programmatic), не `<Ui.Layout.Matrix/>`. Связано с web-core roadmap «Ui.* injection API consolidation (Phase C2)». **v2:** решить единую модель augmentation (namespace-hook vs programmatic `Layouts.*`/`Tables.*`) и подключить до конца — сейчас две полу-модели.

### CC-7. Dangling `@capsuletech/shared-file-manager` (удалённый пакет) — подтверждён, 24 файла
Пакет инлайнен в CLI (`generateFromTemplates.ts`) и удалён из `packages/shared/` (там только utils+zod; Verdaccio-storage тоже без него). Но ссылки живут в **24 файлах**, включая **`.github/workflows/ci.yml`**, release-group конфигах (CLI+web-core+builders OWNERSHIP), `.claude/agents/owner-{shared,cli,builders}.md`, ADR 047, docs/_meta+08+09. Большинство = oracle-doc-drift (в v2 доки/агенты переписываются). **Actionable:** CI + `scripts/release-local.mjs` group-конфиг — не публиковать/тестить несуществующий пакет. При переносе не тащить упоминания.

### CC-6. Дубль-каталог(и) — верификация
Ранний sweep показал `composites/dataTable/` **в двух местах**: `web/kit/ui/` и `web/boost/table/` (boost-table = 0.0.0 скелет, по ADR 033 должен был ВЫНЕСТИ table из web-ui). Проверить в аудите web-ui + boost — где живой источник, что дубль/недоделанный вынос.

### CC-10. store.ctx typing-gap → `as any` в app-слоях (surfaced 2026-07-08)
Апы (вкл. **ЭТАЛОН learn**) кастуют `(store.ctx as any)?.data?.X` для чтения данных — web-core
`useCtx` / web-state `createBridge` **не типизируют `store.ctx.data`** под schema-context. Загоняет
`as any` в app-слои = нарушение «без крутылей» в самом эталоне. **Root — framework** (web-core/state),
не апы. v2-приоритет: типизировать store.ctx → чистит `as any` во всех апах. См. [web-core.md](framework/web-core.md) + [apps-frontends.md](apps-frontends.md).

### CC-11. ADR 072 §4 containerize НЕ выполнен — backend без Dockerfile'ов (surfaced 2026-07-08)
У python-сервисов **ноль своих Dockerfile'ов** (крутятся на хосте через `uv run uvicorn`). ADR 072
§4 («каждый бэк-сервис контейнеризуем с первого дня») — аспирационен, известный packaging-долг.
env-конфиг уже есть (pydantic Settings) → контейнеризация **механическая, но обязательная** для
self-host/federation в v2. См. [backend/README.md](backend/README.md).
