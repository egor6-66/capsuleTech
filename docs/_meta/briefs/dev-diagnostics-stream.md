# Бриф: dev-diagnostics stream → agent Monitor

**Статус:** draft, ожидает реализации
**Owner:** `owner-builders` (vite-builder плагин) + architect (settings.json hook)
**Дата:** 2026-06-20
**Связанные memory:** `feedback_no_hypotheses_diagnose_with_tools`, `feedback_verify_after_agents`, `feedback_local_typecheck_before_pr`, `feedback_capsule_verification_gotchas`

---

## Контекст

2026-06-20 — наблюдение из review-сессии. Agent (главный assistant) делал review файла `apps/playground/src/pages/workspace/docs.tsx`. Нашёл canon-нарушение, которое лежит в его memory (raw Tailwind-классы на kit-примитивах). Пропустил TS-ошибку `TS2322: Type "h3" is not assignable to type ...` на `<Ui.Typography variant="h3">`, потому что не запускал tsc/LSP и реальные diagnostics не видел.

**Корень проблемы:** agent судит по памяти и тексту в файле, а не по реальности компиляции. Real diagnostics существуют (LSP, tsc, biome, compliance-плагин в dev-server) — но не попадают в context agent'а автоматически. Tool'ы вроде `LSP` / `mcp__ide__getDiagnostics` лежат в deferred-tools, agent их не дёргает превентивно.

Промпт-уровень («обязательно вызывай diagnostics перед review») не работает по той же причине, что и git-canon — под нагрузкой задачи забывается.

---

## Цель

Превратить уже существующий поток диагностики dev-server'а в физический канал, который agent читает через `Monitor`. Ошибки попадают в context **во время работы**, не в конце через гейт (отличие от Pre-claim-done подхода — пользователь явно отверг блокирующий гейт «agent застрянет»).

Идея: **источник фильтрует и пишет структурированный лог; agent читает через Monitor; шум отсекается на источнике, не на читателе.**

---

## Архитектура потока

```
capsule dev (vite-builder)
  ├─ vite resolve/transform errors  ──┐
  ├─ compliance plugin (warn+error) ──┤
  ├─ tsc-checker (worker)            ──┼──> DevDiagnosticsPlugin
  └─ ...                              ─┘         │
                                                 │ JSONL
                                                 ▼
                                    .capsule/dev-diagnostics.log
                                                 │
                                                 │ tail / Monitor
                                                 ▼
                                          agent context
                                       (per-line notification)
```

---

## Скоуп — что пишем в лог

**Файл:** `.capsule/dev-diagnostics.log` (в корне app'а, рядом с `.capsule/registry/` и `.capsule/routes/`).
**Формат:** JSONL, одна строка = одна диагностика.
**Truncate:** при старте `capsule dev` — файл обнуляется. Не таскаем вчерашние ошибки между сессиями.

Schema одной записи:
```json
{
  "ts": 1718900000000,
  "type": "ts" | "compliance" | "vite",
  "severity": "error" | "warn",
  "file": "apps/playground/src/pages/workspace/docs.tsx",
  "line": 9,
  "col": 23,
  "code": "TS2322" | "raw-class" | "...",
  "message": "Type \"h3\" is not assignable to type ..."
}
```

**Источники:**
- ✅ TypeScript — через tsc-checker (vite-plugin-checker или встроенный аналог в vite-builder; см. «открытый вопрос» ниже).
- ✅ Compliance — плагин `@capsuletech/compliance` уже структурно знает severity (после L7 flip, 2026-06-14). Перехватываем его output.
- ✅ Vite resolve/transform errors — через стандартные vite-hooks (`buildStart` / `transform` / Logger).

**НЕ пишем в лог (шум):**
- HMR update messages (`[vite] hmr update ...`)
- Page reload events
- Server start/restart info
- Devtools connect/disconnect
- Любые `info`-уровня сообщения

Если этот фильтр нарушен — Monitor захлёбывается, context agent'а забивается мусором. Качество фильтра на источнике — критично.

---

## Dedup и cleanup

**Dedup при записи.** Если за tick'ом tsc вылетает 50 ошибок в одном файле — это 50 записей; но если файл не менялся между tick'ами, повторно НЕ пишем (kept-the-same). Логика: плагин держит in-memory `Map<file, lastErrorsHash>`, пишет только при изменении хэша.

**Cleanup при успешном compile.** Когда tsc/compliance прогоняет файл и он чистый — старые записи этого файла удаляются из лога. Реализация: переписать файл, исключив строки с этим `file`. Дёшево, файл малый (десятки-сотни строк max).

**Rotation.** Не нужна — truncate при старте dev-сервера достаточно. Лог живёт ровно одну dev-сессию.

---

## Auto-attach через SessionStart hook

**В `.claude/settings.json`:**

SessionStart-хук:
1. Проверяет наличие `.capsule/dev-diagnostics.log` (любого app'а в `apps/*/.capsule/dev-diagnostics.log`).
2. Если файл существует И mtime < 60 сек назад (т.е. dev-server активен) → атачит `Monitor` на этот файл.
3. Если файла нет или он stale → молча скип. Никаких блоков, никаких error'ов. Agent работает «слепым» — это на совести пользователя (не запустил dev).

Monitor выливает каждую новую строку JSONL как отдельное уведомление agent'у. Формат уведомления (parsed):
```
[diag:ts:error] apps/playground/src/pages/workspace/docs.tsx:9:23 — TS2322: Type "h3" is not assignable to type ...
[diag:compliance:warn] apps/playground/src/pages/workspace/docs.tsx:9:1 — raw-class: classes on kit primitives forbidden
```

Это физически в context agent'а, пропустить нельзя.

---

## Что НЕ в скоупе первой итерации

- ❌ **Browser runtime errors** (console.error в браузере). Сервер их не видит; нужен либо capsule error-overlay → POST на dev-server → лог, либо CDP-tap. Отдельная задача, не блокирует основной канал.
- ❌ **Production build errors.** Канал только для dev-server'а. `capsule build` имеет свой exit-code, его отдельно гейтить смысла нет.
- ❌ **Linter (biome) as separate source.** Biome не запускается на каждом save в dev-loop; запуск через `pnpm lint` отдельная ручная команда. Если позже захотим — добавим как 4-й источник, но не сейчас.
- ❌ **Multi-app параллельно.** Если запущено 2 `capsule dev` (apps/playground + apps/sandbox), Monitor attache'ится только к одному. Логика «к какому» — по mtime (свежее). Multi-attach в v2.

---

## Открытые вопросы

1. **tsc-checker performance.** Нужно подтвердить, что worker-thread с tsc не валит HMR responsiveness. Стандартный `vite-plugin-checker` работает в отдельном worker'е и не блокирует main thread — но в нашем monorepo'е (большой tsconfig graph) может тормозить старт. Альтернатива — нативный `tsc --build --watch` отдельным процессом, который пишет в наш log напрямую через простой парсер stdout.
2. **Где живёт плагин.** Скорее всего отдельный файл в `packages/builders/vite/src/plugins/DevDiagnosticsPlugin.ts`, регистрируется в `capsuleConfig.ts` рядом с другими плагинами. Подключается автоматически в dev-режиме, в build-режиме отключён.
3. **Структура `.capsule/dev-diagnostics.log`.** JSONL или просто text-lines с фиксированным префиксом? JSONL даёт типизацию для будущего consumer'а (например, UI-обзор ошибок), text проще читать глазом. Рекомендация — **JSONL** + opt-in pretty-printer на стороне Monitor-parsing (хук parsит и форматит в одну строку).
4. **Что с уже существующим dev-output в stdout пользователя?** Не трогаем. Compliance плагин как печатал warn в stdout, так и продолжает (это сигнал для глаз). Лог — параллельный канал для agent'а.

---

## Скоуп — что нужно сделать

### Часть A — owner-builders (packages/builders/vite)

1. **Новый плагин `DevDiagnosticsPlugin`** в `packages/builders/vite/src/plugins/`.
2. Регистрация в `capsuleConfig.ts` (только для `command === 'serve'`).
3. **Подключение источников:**
   - Vite ошибки — через `Logger` override или `handleHotUpdate`.
   - Compliance — встроиться в существующий `CompliancePlugin` (передавать callback `onDiagnostic`).
   - TS — добавить tsc-checker (vite-plugin-checker или эквивалент). Подтвердить с architect, что зависимость ок.
4. Truncate при старте, dedup при записи, cleanup при clean compile.
5. **Unit-tests:** написать ошибки в файл, проверить структуру JSONL, проверить dedup, проверить cleanup.

### Часть B — architect (.claude/settings.json)

1. SessionStart-хук: scan `apps/*/.capsule/dev-diagnostics.log`, attach Monitor к самому свежему.
2. Optional: parsing/pretty-print JSONL → одна читаемая строка в notification.
3. Документация в `CLAUDE.md` (1 абзац): «при работе с app — запусти `capsule dev` для diagnostics-стрима».

### Часть C — координация

Часть A merge'ится первой (плагин нужен для генерации файла). Часть B — после, когда есть что Monitor'ить. Без A хук молча скипает (файла нет), регрессий нет.

---

## Deliverables

**Часть A (owner-builders PR):**
- Diff по `packages/builders/vite/src/plugins/DevDiagnosticsPlugin.ts` (новый файл)
- Diff по `packages/builders/vite/src/defines/capsuleConfig.ts` (регистрация плагина)
- Diff по `packages/builders/compliance/` если меняем API (вряд ли, должен подойти `onDiagnostic` callback)
- Unit-tests
- Manual smoke в PR description: запустить `apps/playground` dev, сломать `variant="h3"`, показать строку в `.capsule/dev-diagnostics.log`

**Часть B (architect PR):**
- Diff по `.claude/settings.json` с SessionStart-хуком
- Demo: запущенный dev-server с искусственной ошибкой → новая сессия agent'а сразу получает notification про эту ошибку

---

## Verification

Сценарий 1 (positive):
1. Запустить `apps/playground` через `capsule dev`.
2. Сломать строку: `variant="h3"` (TS-ошибка) + добавить `class="foo"` на Ui.Typography (compliance-ошибка).
3. В `.capsule/dev-diagnostics.log` появляются 2 строки JSONL.
4. Запустить новую сессию agent'а — в первых notification'ах присутствуют обе ошибки.
5. Починить файл — записи исчезают из лога.

Сценарий 2 (negative / no dev):
1. dev-server не запущен.
2. Запустить сессию agent'а.
3. SessionStart-хук молча скип, никаких error'ов в transcript'е.
4. Agent работает как обычно (без сигналов diagnostics).

Сценарий 3 (noise):
1. Запустить dev, сделать 20 HMR update'ов подряд (правки несвязанных файлов без ошибок).
2. Лог НЕ должен наполняться HMR-update сообщениями.
3. Размер лога остаётся ≈ 0 байт.

Если все три сценария проходят — канал работает.
