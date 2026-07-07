# Бриф: web-studio — консолидация навигации под learn-эталон (WebStudio.Nav.*, generic-событие)

**Зона:** owner-studio (`packages/web/workspace/studio/`). Scope-тег `studio`, **НЕ пушить**. Делать **после** props-only брифа ИЛИ независимо (разные файлы) — на твоё усмотрение.

**Референс — learn (готовый эталон), открой и сверяйся:**
`packages/web/workspace/learn/src/{shared/segments,modules/navigation/MainNav.tsx,modules/navigation/LibraryNav.tsx,capsule.tsx}`. Плюс `docs/_meta/package-anatomy.md`.

**Перед стартом:** `pnpm --filter @capsuletech/web-studio test` — зелёный baseline.

---

## Зачем (канон, по следам learn)

Learn консолидировал навигацию: сегменты — единый `shared/segments/`, nav-блоки — `Learn.Nav.{Main,Library,Lessons}`, событие — generic `onSegmentNavigate { nav, segment }` из `Shell.SegmentNav.Events` (без своих `__events`), пути — знание аппа (пакет их не знает). Studio-nav сейчас отклоняется по трём пунктам — выравниваем.

**Что чиним (текущие отклонения `modules/navigation/`):**
1. `segments.ts` держит **`STUDIO_BASE = '/workspace/web-studio'`** — пакет знает app-путь. ❌ Убрать; active-state — через `useActiveSegment` (route-prefix-агностично), как learn.
2. `Navigation` эмитит **свой** `onNavigate: SegmentId` + держит **свой** `__events`-фантом. Learn перешёл на generic `onSegmentNavigate { nav, segment }` из web-shell. Выравниваем → **это же условие безопасности вложенного ключа** (см. ниже).
3. `SEGMENTS` читают Navigation **и** Welcome (`welcome/Welcome.tsx` импортит `../navigation/segments` — горизонталь модулей). → в `shared/segments/`.

> ⚠️ **Область:** консолидируем ТОЛЬКО внутренний nav web-studio (store/creator). App-level nav студии (`Web Studio / DevOps / Docs`) — **app-owned** (охватывает разные инструменты, role-gated), в пакет НЕ едет (в отличие от learn, где app-nav = секции пакета). Это осознанная асимметрия — см. app-бриф.

---

## Правки

### A. `shared/segments/`
- Перенести `SEGMENTS`/`ISegment`/`SegmentId` (store/creator) из `modules/navigation/segments.ts` в `src/shared/segments/` (+ `index.ts`). Атом: читают navigation + welcome.
- **Удалить `STUDIO_BASE`** (пакет не знает путей).

### B. `modules/navigation/` — `WebStudio.Nav.Main`
Переписать `Navigation` по образцу `learn/modules/navigation/MainNav.tsx` (header-attached — тот же вид):
- `useActiveSegment(SEGMENTS.map(s=>s.id))` вместо `useRouter().current()` + `STUDIO_BASE`.
- `useEmitOptional` (не `useEmit`) → `emit('onSegmentNavigate', { source: 'WebStudio.Nav.Main', payload: { nav: 'web-studio', segment: id } })`.
- **Удалить** `INavigationEvents` + phantom `__events` (событие типизируется из `Shell.SegmentNav.Events`).
- Файл можно переименовать в `MainNav.tsx` (leaf `Main`); экспорт — connected-блок.

### C. `modules/welcome/` — Welcome на shared-сегменты + generic-событие
- `Welcome.tsx`: импорт сегментов из `../../shared/segments` (не `../navigation/segments`).
- Событие карточек — на generic `onSegmentNavigate { nav:'web-studio', segment }`; **удалить** свой `IWelcomeEvents`/phantom (типизация из Shell). Welcome остаётся плоским `WebStudio.Welcome` (единственный — не вкладываем).
- (Опц., НЕ обязательно) карточки через `Shell.Launcher` как learn-welcome'ы — если легко; иначе оставь текущую Card-композицию, это не raw-классы.

### D. `capsule.ts` — вложенный ключ
- `Navigation: …` → `Nav: { Main: <MainNav> }` (регистрация `WebStudio.Nav.Main`). `Welcome` — как есть.
- Обнови докстринг.

> **Почему вложенность безопасна:** после §B/§C у nav/welcome НЕТ своих `__events` → в codegen-агрегат `WebStudio.Nav.*.Events` нечего собирать (контракт — `Shell.SegmentNav.Events`). Вложенность влияет только на рендер (прецедент `Learn.Library.Info`). **Verify:** собери апп / глянь `.capsule/registry` — `WebStudio.Nav.Main` поднимается. Если нет — СТОП + эскалируй.

---

## App companion (owner apps-studio, отдельный бриф)
Смена события `onNavigate → onSegmentNavigate` ломает хендлер в `apps/studio/src/features/app.tsx` (`onNavigate` → `onSegmentNavigate`, роутинг `nav==='web-studio' → /workspace/web-studio/${segment}`). Это в app-брифе `apps-studio-mirror-learn.md` — не твоя зона.

## Verify
- `pnpm --filter @capsuletech/web-studio test` — зелёный (обнови/перенеси nav+welcome тесты).
- `pnpm nx run @capsuletech/web-studio:typecheck` + `:build` — 0 / собирается.
- Grep: нет `STUDIO_BASE`, нет `INavigationEvents`/`IWelcomeEvents`, нет `../navigation/segments` в welcome.
- Registry поднимает `WebStudio.Nav.Main`.

Отчёт: тронутые файлы, статус codegen вложенного ключа, хвост test/typecheck/build.

## Готово =
внутренний nav студии = `shared/segments` + `WebStudio.Nav.Main` на generic `onSegmentNavigate`, без hardcoded путей и своих `__events`; Welcome на shared-сегментах; capsule вложенный ключ; test/typecheck/build зелёные.
