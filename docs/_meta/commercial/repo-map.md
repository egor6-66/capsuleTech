# Карта репозиториев v2 (топология под зонтик-бренд)

> Черновик для обсуждения (2026-07-06). Принцип границы: **репо = независимый ship/deploy-юнит.** Связанное (co-release, `workspace:*`) — в одном монорепо; независимо шипящееся/хостящееся — отдельно. Зонтик-бренд = GitHub-org + npm-scope `@<brand>/*` (нейтральный, Google-style; продукты со своими именами).

Легенда: `[pkg]` npm-пакет · `{svc}` backend-сервис · `(app)` фронт-апп.

---

## FOUNDATION — фреймворк (один монорепо, nx)

**`framework/`** — веб-фреймворк как dev-продукт. Все связанные пакеты, co-release группами (`cli`/`web_base`), публикуются `@<brand>/*`. **НЕ дробить** — это их естественная единица.

- runtime/core: `[web-core] [web-state] [web-router] [web-query] [web-remote] [web-renderer] [web-contract] [web-access] [web-profiler] [web-date] [web-intl] [web-docs]`
- kit/ui: `[web-ui] [web-style] [web-placeholders] [web-dnd] [web-shell]`
- boosts: `[boost-chart] [boost-flow] [boost-layout] [boost-map] [boost-table]`
- canvas: `[canvas-host] [canvas-three] [canvas-ui]`
- tooling: `[cli] [lib-builder] [vite-builder] [compliance] [biome-config] [docs-builder]`
- shared: `[shared-utils] [shared-zod] [data-gen]`
- desktop: `[desktop]`

## PLATFORM — сквозная инфра (используют все продукты)

- **`identity/`** — `{auth}` + `[web-auth]` (+ `[web-access]`? — сейчас в framework; identity = вход/сессия/права). Каждый продукт зависит.
- **`gateway/`** (или `infra/`) — `docker/gateway`, nginx-роутинг, WireGuard/self-host bootstrap (ADR 070/072), deploy.

## CAPABILITY PRODUCTS — самостоятельные тулзы (self-host, точечно)

- **`ai/`** («нейронки») — `{llm} {voice} {image}` + `[web-agent]`. Генерик AI-возможности; любой продукт потребляет. Каждый sub-tool self-hostable инстансом.
- **`vpn/`** — будущий продукт (пока пусто; заводим когда дойдём).
- **`studio/`** — `[web-studio]` + (studio-app) + (universal-canvas) + canvas-часть. Визуальный билдер. ⚠️ **развилка:** это tool ФРЕЙМВОРКА (им строят аппы) → можно оставить в `framework/`; ИЛИ отдельный продукт → свой репо. См. вопросы.

## END PRODUCTS — апп + доменный пакет + BFF

- **`learn/`** («лерны») — `{learn} {lang}` + `[web-learn]` + (learn-app). Потребляет `ai/` + `identity/`.
- **`community/`** — `{community}` + (community-app). Соц-ядро (ADR 071).
- **`moderator/`** — `[web-moderator]` + (moderator-app). Контент-операции; **первый продукт v2 + тестбед канона** (ADR 077).

## INTEGRATIONS — мосты к внешним сервисам

- **`integrations/`** (или репо на интеграцию) — `{telegram}` (+ будущие discord и т.д.). Gateway'и к внешним платформам.

---

## Не-репо (мусор/скретч)
- `backend/target` = cargo build-артефакт (не сервис).
- `backend/playground`, `apps/playground` = скретч/эксперименты (не продукт; personal/gitignore).

## Развилки для решения (до финализации)
1. **studio** — в `framework/` (dev-tool) или отдельный продукт `studio/`? (Влияет: если продаём студию как продукт — отдельно; если это «IDE фреймворка» — в framework.)
2. **lang** — с `learn/` (сейчас только Learn его юзает) или в `ai/`/отдельный language-capability (если появятся другие language-продукты)?
3. **canvas + universal-canvas** — во `framework/` (движок рендера) или в `studio/` (его remote-канвас)?
4. **web-access** — во `framework/` (runtime-примитив прав) или в `identity/`?
5. **auth/identity** — отдельный `identity/` репо (рекомендую, сквозной) или в `framework/` как пакет?

## Что из этого требует ИМЕНИ (для нейминг-сессии)
- **Зонтик** (org + npm scope) — нейтральный коинед.
- **Продукты, которые бренд «продаёт»:** фреймворк, AI («нейронки»), Learn, VPN, Studio, Moderator, Community. Каждый — либо `<Brand> <Product>` (Google-style), либо своё имя под зонтиком.
- Существующие имена learn/studio/moderator — рабочие кодовые; при релизе решим, ребрендим ли per-product.
