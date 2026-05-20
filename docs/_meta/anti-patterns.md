---
title: Anti-patterns Catalog — quick-fix vs proper-fix
status: living
last-updated: 2026-05-20
---

# Anti-patterns Catalog

**Каталог костылей, на которые мы наступали.** Каждый: что quick-fix говорит сделать → что proper делает на самом деле. Перед любым "временным решением" — проверь здесь.

> **POLICY п.1:** если решение требует >2 нестабильных шагов / hardcoded paths / silent-fallback'ов — подход в корне неверный.

---

## 🚫 "Добавлю третий path в `@source` на всякий случай"

**Симптом:** Tailwind не сканит классы из соседнего пакета в production install.

**Quick-fix (плохо):**
```css
@source "../../web-ui/dist";              /* workspace dev */
@source "../../../../@capsuletech/web-ui";  /* flat npm */
@source "../../../../.pnpm/**/web-ui";    /* pnpm isolated — на всякий */
@source "../../../../../node_modules/...";  /* ещё для уверенности */
```
Хрупкий matrix relative paths × install layouts. Любой новый layout → +1 path. Если один из путей съест mysterious node_modules — silent skip, классы пропадают, debug часами.

**Proper:** CSS-entry-point живёт **в app**, не в библиотеке. App знает свой layout. CSS в `.capsule/styles.css` (генерится builders scaffold).
- `web-core` НЕ shipping CSS.
- `web-style` НЕ shipping Tailwind entry — только themes (CSS variables).
- App's `.capsule/styles.css.template` имеет `@source "../node_modules/@capsuletech/web-ui"` — relative из known location.

**Когда применить proper:** всегда. Не добавляй n-й `@source` "на всякий случай".

---

## 🚫 "Silent error, exit 0"

**Симптом:** Команда падает, но процесс exit'ит 0 → CI green, реальный bug скрыт.

**Quick-fix (плохо):**
```js
const r = await execa('pnpm', ['install'], { stdio: 'ignore' });
// игнорируем r.exitCode
```
CI не видит failure. Smoke fixture не падает. Bug уходит в prod к первому пользователю.

**Proper:**
```js
const r = await execa('pnpm', ['install'], {
  stdio: isCi() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  reject: false,
});
if (r.failed) {
  if (!isCi()) process.stderr.write(r.stderr ?? '');
  kit.log.error(`pnpm install failed (exit ${r.exitCode})`);
  process.exit(1);  // ← обязательно
}
```
Output виден (CI) либо буферизуется и flush'ится при failure (TUI). `process.exit(1)` — non-zero exit, CI ловит, не пропускает.

---

## 🚫 "Hardcoded relative path в template"

**Симптом:** Template работает только в workspace главной репы, ломается в любом другом.

**Quick-fix (плохо):**
```json
// apps/<name>/package.json.template
{
  "scripts": {
    "dev": "node ../../packages/cli/bin/capsule.mjs"
  }
}
```
Работает в `<main-monorepo>/apps/<name>/`. **НЕ** работает в `capsule-test/apps/<name>/` или `packages/cli/e2e/fixture/apps/<name>/`. Smoke fixture fail, user-репорт.

**Proper:**
```json
{
  "scripts": {
    "dev": "capsule dev"   // ← через .bin/ shim
  },
  "devDependencies": {
    "@capsuletech/cli": "latest"
  }
}
```
pnpm положит `.bin/capsule` shim → работает где угодно. Workspace-internal apps (sandbox внутри capsule) имеют **отдельный** workflow (см. memory `project_global_cli_stale`), не путать.

---

## 🚫 "Quick patch на одну версию, забуду снять"

**Симптом:** `pnpm.overrides` с pinned version растёт без cleanup.

**Quick-fix (плохо):**
```json
"pnpm": {
  "overrides": {
    "solid-js": "1.9.12",
    "vite": "8.0.13",
    "react": "19.2.5"
  }
}
```
Через 6 месяцев никто не помнит зачем эти overrides. Upstream починили — мы застряли на старой версии.

**Proper:** каждый `pnpm.overrides` имеет запись в `docs/_meta/dep-overrides.md`:
```markdown
## solid-js: 1.9.12

- **Что:** pin exact версии.
- **Почему:** dual-package hazard через @kobalte/utils peer-range.
- **Когда снять:** когда @kobalte/utils выпустит peer ^1.9 (issue X).
- **Last-checked:** 2026-05-20.
```

`owner-deps` ревизирует registry ежеквартально. Если запись stale → снимаем.

---

## 🚫 "Lib-builder копирует только мою папку"

**Симптом:** Asymmetric path-config: `dist/template/` для одного плагина, `dist/plugins/X/template/` для другого. `__dirname` runtime ломается.

**Quick-fix (плохо):** добавить ещё один static copy с другим dest — теперь два места для templates.

**Proper:** Единый layout. Vite rolls плагины в `dist/index.mjs` → `__dirname = dist/`. Все templates → `dist/template/<name>.template`. Никаких `plugins/<X>/template/`. Симметрия = predictable runtime resolution.

---

## 🚫 "@source `@package-name` без проверки"

**Симптом:** Тестируешь — не работает. Но в docs / blog post видел что так можно.

**Quick-fix (плохо):**
```css
@source "@capsuletech/web-ui";
```
Полагаешься что Tailwind v4 поддерживает package resolution. **Silently ignored** (он не поддерживает) — classes не сканятся, никакого warning.

**Proper:** Verify capabilities **до** того как полагаешься. `pnpm view tailwindcss` + `cat node_modules/tailwindcss/CHANGELOG.md` + actual test. Если silently ignored — relative path с правильной depth.

---

## 🚫 "Storage пустой? Просто очищу и опубликую снова"

**Симптом:** Verdaccio storage `.verdaccio-db.json` существует, но `@capsuletech/*` версии **пустые**. publish "успешный", но client install видит `Not Found`.

**Quick-fix (плохо):** `rm -rf storage && pnpm publish` — иногда работает, иногда нет.

**Proper:** Понять root cause:
- Was Verdaccio child process **fully started** до publish? (probe :4873 first).
- Uplinks для `@capsuletech/*` **disabled**? (иначе proxy npmjs, видит legacy 0.1.x).
- `npm unpublish` перед `npm publish` (для replace immutable version).
- Verdaccio config storage path = real storage path? Не путать с capsule-test/tmp.

См. `docs/_meta/verdaccio-mental-model.md` (TODO P1).

---

## 🚫 "Я просто перезапущу dev — обычно помогает"

**Симптом:** Vite/HMR держит stale module. F5 не помогает. Сделал rebuild — всё равно old behavior.

**Quick-fix (плохо):** перезапустить, надеяться, иногда работать.

**Proper:** Detect caching layer и почистить **правильный**:
- **Browser cache** — Ctrl+Shift+R (hard reload).
- **Vite `.vite/deps/` pre-bundle** — `rm -rf apps/<name>/node_modules/.vite`.
- **Vite in-memory module cache** — restart `pnpm dev`.
- **pnpm metadata cache** — `pnpm install --force`.
- **pnpm store** — `pnpm store prune` (последняя инстанция).
- **Verdaccio metadata RAM** — restart Verdaccio.

5 разных кэшей. Знай какой проверять для какого симптома.

---

## 🚫 "Workspace-internal pattern в CLI app template"

**Симптом:** Изменение в `apps/sandbox/` (внутри capsule monorepo) → пишешь template такой же → ломаешь external user.

**Quick-fix (плохо):** копируешь script из workspace-internal app в CLI template "for consistency".

**Proper:** Понять **две роли**:
- **Workspace-internal** (`<capsule>/apps/<name>/`): `node ../../packages/cli/bin/...` — это **dev-quirk** + memory `project_global_cli_stale`. Только для framework-developer'а.
- **CLI-scaffolded** (capsule-test, e2e fixture, external user): `capsule dev` через `.bin/` shim. Это **prod-correct**.

См. POLICY п.2 (две роли). См. `docs/_meta/architect-routing.md`.

---

## 🚫 "Сразу пересоберу всё и проверю"

**Симптом:** Не запускаешь smoke перед framework change. После change ломается prod. Не знаешь регрессия это или existing bug.

**Quick-fix (плохо):** "проверю позже". CI не настроен. Никто smoke не запускает регулярно.

**Proper:** **Test-first culture** (POLICY п.6).
```bash
pnpm test:e2e:cli   # baseline (должно быть green до changes)
# make changes
pnpm test:e2e:cli   # diff поведения
```

Делегируй `owner-tests` если сам не хочешь. Без baseline diff не видно — каждый bug new vs existing неразличим.

---

## 🚫 "Главный agent сам поправил packages/* — было быстро"

**Симптом:** "Маленький fix" в одном файле web-ui. Не вижу смысла вызывать owner-web-ui ради одной строки.

**Quick-fix (плохо):** сам правишь. Owner-* не в курсе. OWNERSHIP.md не обновлён. В следующий раз owner-* удивлён.

**Proper:** Даже маленький fix → `Agent(subagent_type='owner-web-ui', prompt='fix line X in Y, reason: Z')`. Owner-* делает + обновляет своё. **Boundary** важнее **speed** — иначе boundaries не работают.

Исключение: главный coordinates **shared infra** (`scripts/`, `nx.json`, root `package.json`, `CLAUDE.md`) — там нет owner-*, твоя зона.

---

## 🚫 "Memory обновлю когда-нибудь"

**Симптом:** Сделал session work, learnings потерялись. Следующий instance повторяет ошибки.

**Quick-fix (плохо):** "запомню". Не запомнишь — у тебя нет persistent state кроме memory + docs.

**Proper:** В конце сессии (или при значительной находке):
- **Memory** — temporal facts (что в работе, blocker, plan).
- **Docs** (`docs/_meta/`, `OWNERSHIP.md`) — stable architectural.

Правило: если факт изменится через неделю — memory. Если стабилен — docs. См. CLAUDE.md POLICY п.7.

---

## Принципы

1. **Корневой fix дешевле двух quick-fix'ов.** Quick-fix'ы накапливаются и формируют долг технический.
2. **Тестируемое = надёжное.** Если нельзя автоматизировать verify → проверь руками **сразу** после fix'а.
3. **Boundaries — не для красоты.** owner-* пишут код, ты — архитектуру. Нарушение = двойная работа.
4. **Документируй провалы**, а не только успехи. Antipattern catalog растёт.

## Связанные документы

- `CLAUDE.md` — POLICY.
- `docs/_meta/architect-routing.md` — куда делегировать.
- `docs/_meta/dep-management-plan.md` — план dep гигиены.
- `~/.claude/projects/.../memory/MEMORY.md` — persistent learnings.
