# Аудит: domain zone (shell / auth / agent / placeholders)

- **Путь:** `packages/web/domain/*`
- **Аудит:** 2026-07-07

Domain = stateful feature-пакеты (chrome/логика поверх kit+runtime). Cross-domain импорты запрещены (ADR 047 D2 — через web-contract). Все 0.0.0 кроме shell.

## @capsuletech/web-shell (0.1.0, alpha, P0) — 🟡 FIX-BEFORE-MIGRATE

Reusable app-shell blocks (chrome с логикой) — tier-2: Header / ModeToggle / Picker / ThemePicker / Appearance / FinishSettings / LocalePicker / **SegmentNav / Launcher** (connected nav-блоки, единое generic `onSegmentNavigate`, ADR 032 useEmit). Matrix эвакуирована в boost-layout (ADR 046 D2). **P0** — каждый апп тянет shell. src=34 test=5.

**🟡 причины:** status `alpha`, **тонкое покрытие (5 test / 34 src)**; maturity-bar до beta не закрыт (Header config-driven + `Controllers.Shell.*` finalize + switcher-state coordination с web-style). No active blockers.
**Действие:** добить Header block + Controllers.Shell + тесты; AI-anchor; бренд-rename. Консьюмеры learn/studio завязаны — переносить синхронно с ними. Держать канон [[feedback_product_wide_kit_layering]] (shell собирает из web-ui+хуков, ноль своих классов).

## @capsuletech/web-auth (0.0.0, in-progress) — 🟠 UNDER-QUESTION (частично реализован)

Auth-домен (вход/сессия/формы), параметризуется осью стратегии по subpath: `/role` `/credentials` `/oauth2` `/qr` + cross-cutting `/session` `/controllers` `/ui`. Generic auth-FSM (idle→submitting→authed/error). Эмиттит onLogin/onLogout/onError через useEmit. src=14 **test=8 (хорошо покрыт)**.

**Состояние (code-verified 2-й проход):** `role/index.ts` (116 строк) + `credentials/index.ts` (102) — **реальны + тесты** (`roleStrategy.test`, `credentials.test`); инфра `session`/`controllers`/`api` построена+тестирована (broadcast/session/auth/gate/client тесты). **`oauth2/index.ts` (16 строк) + `qr/index.ts` (14) — заглушки, БЕЗ тестов.** Т.е. role/credentials стратегии реализованы и тестированы; **`/oauth2` и `/qr` — TODO-заглушки** (`TODO(owner-web-auth): реализовать oauth2Strategy/qrStrategy`, redirect/PKCE/QR-polling не сделаны). loginForm biome-ignore noExplicitAny — аннотирован (meta.tags JSX-fallback quirk).
**Действие / развилка:** built-часть (role/credentials) близка к готовности. **v2-решение:** нужны ли oauth2/qr в первой волне? Если нет — перенести role/credentials как рабочее ядро, oauth2/qr достроить позже (ось subpath это позволяет — [[feedback_thin_provider_subpath_capabilities]]). Если да — достроить стратегии до переноса. Держать: контракт `/auth/login` чистый, моки = app preRequest + shared-zod/gen (НЕ MSW).

## @capsuletech/web-placeholders (0.0.0, in-progress) — 🟡

Placeholder-компоненты (`Placeholders.Empty` и т.п.) — используются live в learn/studio (empty-state дедуп). src=12 test=2. Малый функциональный, wired в продакшн.
**Действие:** проверить покрытие + полноту набора; бренд-rename; AI-anchor (или в общий doc). Малый риск. Кандидат: возможно место в kit (web-ui), а не отдельный domain-пакет — проверить, почему domain-зона (Empty = чистый stateless UI → скорее kit). **v2-вопрос:** placeholders в kit или domain?

## @capsuletech/web-agent (0.0.0, scaffold) — 🔴 DO-NOT-MIGRATE (yet)

Встраиваемый агент-примитив (LLM-чат + tool-calling + UI), оси транспорт/тулсет/персона по subpath (`/client` `/tools` `/personas` `/controllers` `/ui`). src=8 test=2.

**Проблема:** **весь пакет — заглушки** (`TODO(owner-web-agent)` в capsule.ts/controllers/personas/ui/tools). `client/index.ts` — stub «yields добавятся при реализации MCP tool-streaming (**PENDING scriber**)». **Scriber УДАЛЁН (ADR 074, 2026-07-05)** — LLM теперь `backend/llm` (:8007, Python llama-cpp), agent-loop = ADR 065 ф.4-5 поверх него. Т.е. web-agent завязан концептуально на удалённый бэкенд.
**Действие:** **не переносить as-is.** В v2 строить свежим против `backend/llm` контракта, когда agent-frontend понадобится. Ментальная модель (3 оси) — сохранить, код — нет. Скаффолд.

## Итог по зоне

| Пакет | Вердикт |
|---|---|
| web-shell | 🟡 — P0, добить тесты+Header, синхронно с learn/studio |
| web-auth | 🟠 — role/credentials готовы+тесты; oauth2/qr stub (развилка первой волны) |
| web-placeholders | 🟡 — малый функциональный; вопрос kit vs domain |
| web-agent | 🔴 — scaffold, завязан на удалённый scriber; строить свежим против backend/llm |

**Флажки user'у:** (1) web-auth — oauth2/qr в первую волну или отложить (role/credentials — рабочее ядро)? (2) placeholders — kit или domain? (3) web-agent — подтвердить: не тащим, rebuild против backend/llm.
