# Brief — Phase 1A: build glue для ADR 057 (import-map + manifest emission)

**Zone**: `owner-vite-builder` (`packages/builders/vite/`)
**Type**: feature implementation
**Tree**: main shared. **НЕ создавать ветку**, не коммитить — это часть epic'и ADR 057, финальный PR в конце.
**Depends on**: [[../../01-architecture/adr/057-web-remote-import-maps-native-esm|ADR 057]]
**Pairs with**: [[adr-057-phase1-web-remote]] (read-side, owner-remote делает после/параллельно).

---

## Цель

Реализовать **write-side** транспорта ADR 057 в `@capsuletech/vite-builder`:

1. **Import-map injection** в `.capsule/index.html` каждого capsule app — `<script type="importmap">` с pinned URL'ами для всех shared deps. Dev + build.
2. **Shared deps serving** — endpoint `/_shared/<pkg>@<version>/<file>` отдаёт реальные ESM bundle'ы из `node_modules/`. Dev: Vite middleware. Build: copy в `dist/_shared/`.
3. **Manifest emission** — каждый app расширяет existing `dist/capsule.manifest.json` (extend `RemoteManifestPlugin`, не плодить новый) полями `exposes` + `shared` + `$schema` (см. ADR 057 §D2 — extends existing). Используется owner-remote (Phase 1B) для discovery.

После Phase 1A любой capsule app сможет быть подключён через native dynamic import + import-map dedup. Phase 1B (owner-remote) добавляет HCA-уровневую обёртку.

---

## Scope — конкретные изменения

### Файл 1 — `packages/builders/vite/src/plugins/importMap.ts` (новый)

Vite-плагин `ImportMapPlugin`. Делает три вещи:

#### a) `transformIndexHtml` — inject `<script type="importmap">`

В каждый HTML response (dev и build) вставляет в `<head>` (после `<meta charset>`, до других script'ов):

```html
<script type="importmap">
{
  "imports": {
    "solid-js": "/_shared/solid-js@1.9.12/dist/solid.js",
    "solid-js/web": "/_shared/solid-js@1.9.12/web/dist/web.js",
    "solid-js/store": "/_shared/solid-js@1.9.12/store/dist/store.js",
    "@capsuletech/web-core": "/_shared/@capsuletech/web-core@0.X.Y/dist/index.mjs"
  }
}
</script>
```

**Источник URL'ов** — функция `buildImportMap(appRoot)`:
- Читает `appRoot/package.json` + workspace lockfile
- Для каждого пакета из CANONICAL `SHARED_DEPS` list (хардкод в плагине, начальный набор: `solid-js`, `solid-js/web`, `solid-js/store`, `@capsuletech/web-core`, `@capsuletech/web-router`, `@capsuletech/web-state`, `@capsuletech/web-ui`) — резолвит установленную версию через `require.resolve(pkg, { paths: [appRoot] })` и собирает URL `/_shared/<pkg>@<version>/<resolved-relative-to-pkg-root>`.
- Для подпутей (`solid-js/web`) — резолв через `require.resolve('solid-js/web', ...)`, version из родительского `package.json`.

`SHARED_DEPS` — экспортируемая константа `SHARED_DEPS: readonly string[]`, чтобы [[adr-057-phase1-web-remote]] (owner-remote) мог её импортнуть для consistency.

#### b) `configureServer` — dev middleware для `/_shared/...`

В dev режиме (`apply: 'serve'`) добавить middleware:
```ts
server.middlewares.use('/_shared/', (req, res, next) => {
  // req.url = '/<pkg>@<version>/<rest>' либо '/@scope/<pkg>@<version>/<rest>'
  // Парсить pkg+version из URL, найти реальный путь в node_modules, отдать с правильным content-type
});
```

Path parsing:
- `/_shared/solid-js@1.9.12/dist/solid.js` → pkg=`solid-js`, version=`1.9.12`, subpath=`dist/solid.js`
- `/_shared/@capsuletech/web-core@0.5.0/dist/index.mjs` → pkg=`@capsuletech/web-core`, version=`0.5.0`, subpath=`dist/index.mjs`

Резолв реального пути через `require.resolve(pkg, { paths: [appRoot] })` → root pkg's directory → join subpath. Если version не совпадает с установленной — 404 (или warning + serve installed).

Content-type определять по extension: `.js`/`.mjs` → `text/javascript`, остальное — `application/octet-stream` (для now).

#### c) Build-time copy в `dist/_shared/`

В `closeBundle` (или похожем) после `vite build` копировать **только нужные subpaths** ESM bundle'ов из `node_modules/<pkg>/...` в `dist/_shared/<pkg>@<version>/...`. Только те файлы которые встречаются в import-map (не весь пакет).

Простой strategy: для каждого entry URL в built import-map — `cp -L src dest` (resolve symlinks).

### Файл 2 — `packages/builders/vite/src/plugins/remoteManifest.ts` (EXTEND existing)

> [!warning] **Не создавать новый плагин.** В кодбейзе уже есть `RemoteManifestPlugin` (плагин `capsule:remote-manifest`) — эмиттит `/capsule.manifest.json` с shape `{ name, version, entry }`, интегрирован с ADR 053 user-override flow и существующий web-remote consumer уже подписан на этот URL (memory `project_remote_manifest_phase1a`). **Расширяем его**, не плодим параллельный.

ADR 057 amended (см. §D2): URL/filename `/capsule.manifest.json` сохраняются, `name`/`version`/`entry` convention сохраняется. **Добавляем** два поля + optional `$schema`:

#### Что добавить в existing `RemoteManifestPlugin`

**Helper-функция** `buildSharedDecl(appRoot: string): Record<string, { version: string; singleton: boolean }>`:
- Для каждого pkg из canonical `SHARED_DEPS` list (см. importMap.ts)
- Резолвит установленную версию через `require.resolve(pkg, { paths: [appRoot] })` → найти containing `package.json` → читать `version`
- Возвращает `{ [pkg]: { version, singleton: true } }`

**Helper-функция** `buildExposesDecl(entryUrl: string): Record<string, string>`:
- Phase 1: hardcoded `{ "./remote": entryUrl }` (single expose per ADR 053). 
- Расширение под multi-expose — Phase 2 (документировать в комменте).

**Изменения в `configureServer` middleware** (dev endpoint):

```ts
// Existing:
const manifest = { name, version: pkg.version ?? '0.0.0', entry: '/remote-entry.ts' };
// Заменить на:
const manifest = {
  $schema: 'https://capsuletech.dev/schemas/remote-manifest-v1.json',
  name,
  version: pkg.version ?? '0.0.0',
  entry: '/remote-entry.ts',
  exposes: buildExposesDecl('/remote-entry.ts'),
  shared: buildSharedDecl(opts.appRoot),
};
```

**Изменения в `generateBundle`** (build asset emission):

```ts
// Existing:
const entry = entryChunk ? `/${entryChunk.fileName}` : '/remote-entry.js';
const manifest = { name, version: pkg.version ?? '0.0.0', entry };
// Заменить на:
const entry = entryChunk ? `/${entryChunk.fileName}` : '/remote-entry.js';
const manifest = {
  $schema: 'https://capsuletech.dev/schemas/remote-manifest-v1.json',
  name,
  version: pkg.version ?? '0.0.0',
  entry,
  exposes: buildExposesDecl(entry),
  shared: buildSharedDecl(opts.appRoot),
};
```

#### Что НЕ менять в `RemoteManifestPlugin`

- URL `/capsule.manifest.json` — same
- Filename `capsule.manifest.json` — same
- `name` derivation (basename pkg name) — same
- `entry` derivation (bundle output `fileName` с hash, либо `/remote-entry.ts` в dev) — same
- `buildStart` hook (`.capsule/remote-entry.ts` generation для ADR 053 user-override) — same
- Plugin name `capsule:remote-manifest` — same

Это **расширение**, не replacement. Существующий smoke (universal-canvas → playground, Phase 1a) продолжает работать.

#### Coordination

`buildSharedDecl` использует **тот же** `SHARED_DEPS` const что и `importMap.ts` (из Файла 1). Импорти из одного источника — single source of truth.

#### Тест

В `__tests__/remoteManifest.test.ts` (если test-инфра есть для плагина, либо создай):
- Existing manifest shape (`name`/`version`/`entry`) сохраняется
- Новые поля (`$schema`/`exposes`/`shared`) присутствуют в правильном shape
- `shared` содержит все `SHARED_DEPS` пакеты с resolved версиями из mock app
- `exposes` Phase 1 = `{ "./remote": entry }`

### Файл 3 — `packages/builders/vite/src/defines/capsuleConfig.ts` (изменение)

Добавить новые плагины в массив `plugins:` (line 232+):

```ts
plugins: [
  // ... existing plugins
  ImportMapPlugin({ appRoot: root, workspaceRoot }),
  // RemoteManifestPlugin — already in plugins array (existing), просто extended
  // ... после них уже existing rest (HMRWrapping, Compliance, RouterPlugin, solidPlugin)
]
```

**Position**: до `HMRWrappingPlugin` и `solidPlugin` (они transform JSX и зависят от import resolution; import-map injection и manifest serving — это HTML/dev-server level, должны быть рано в chain). Точное место — подбери, runner'и не должны мешать друг другу.

**НЕ расширяй `ICapsuleConfig`** для Phase 1 — hardcoded `SHARED_DEPS` list в плагине достаточен. User-override surface (`capsule.config.ts:shared?:`) — Phase 2.

### Файл 4 — `packages/builders/vite/src/plugins/index.ts` (экспорт)

Экспортнуть новый плагин + `SHARED_DEPS` константу из barrel:

```ts
export * from './importMap';
// RemoteManifestPlugin уже экспортируется (existing) — ничего не добавляем
```

### Тесты

Unit-tests новых плагинов в `packages/builders/vite/src/plugins/__tests__/`:
- `importMap.test.ts`:
  - `buildImportMap()` корректно собирает URL'ы для известного set deps
  - `transformIndexHtml` правильно инжектит в существующий HTML
  - Middleware `/_shared/<pkg>@<v>/<file>` правильно парсит path и возвращает stub content (можно через мок `fs`)
- `remoteManifest.test.ts` (расширить existing, либо создать если нет):
  - Existing shape (`name`/`version`/`entry`) сохраняется
  - Новые поля (`$schema`/`exposes`/`shared`) emit'ятся correctly
  - `shared` содержит все `SHARED_DEPS` с resolved версиями из mock app
  - `exposes` Phase 1 = `{ "./remote": entry }`

Покрытие — happy path + 1-2 edge case на парсинг (`@scoped` packages, mismatch version в URL).

---

## Acceptance — что должно работать после Phase 1A

Прогон в реальном environment'е (architect делает после твоего report):

1. `cd apps/playground && pnpm dev`
2. `curl http://localhost:3050/` — отдаёт HTML с `<script type="importmap">{ "imports": { "solid-js": "/_shared/solid-js@1.9.12/dist/solid.js", ... } }</script>`
3. `curl http://localhost:3050/_shared/solid-js@1.9.12/dist/solid.js` — HTTP 200 + `text/javascript` + реальный Solid ESM bundle
4. `curl http://localhost:3000/capsule.manifest.json` (universal-canvas) — отдаёт extended manifest с правильными `name`, `version`, `entry` (existing) + `exposes`, `shared`, `$schema` (новые)
5. Browser http://localhost:3050 загружается без console errors (всё что было прежним продолжает работать; import-map просто добавлен)

owner-remote (Phase 1B) использует эти endpoints для тестирования своего transport refactor'а.

---

## Что НЕ входит в Phase 1A

- `<Remote.Provider>` / `<Remote.View>` refactor — Phase 1B (owner-remote).
- CSS isolation (shadow DOM wrap) — Phase 1B.
- Multi-expose из одного remote — Phase 2.
- User-surface `capsule.config.ts:shared?:` для override SHARED_DEPS — Phase 2.
- Production CDN deploy — отдельное решение позже.
- Manifest version negotiation / migration paths — пока v1 hardcoded.

---

## Coordination с owner-remote

`SHARED_DEPS` константа — **shared contract** между Phase 1A и Phase 1B. Owner-remote импортит её из `@capsuletech/vite-builder` для merge logic'и в `<Remote.Provider>`.

Manifest schema — ADR 057 §D2. Любые изменения формата manifest'а — coordinate через architect (меня), не unilateral.

Если по ходу работы выяснится что нужно расширить `IRemoteBootstrap` (ADR 053) для интеграции с Phase 1 — flag architect'у, не правим в этом PR.

---

## Git workflow

- **НЕ создавай ветку. НЕ коммитить.** Работа аккумулируется **в working tree only** (uncommitted) на main shared tree. Pre-commit hook on main намеренно блокирует commits — это design (canon user'а: «работаем в ветке main, создаём ветку и делаем PR когда я скажу»). Не --no-verify, не `switch -c <branch>` (canon `feedback_agent_hook_block_escalate`).
- В конце epic'и ADR 057 (после Phase 1B closed + architect verify) — architect создаёт feature branch и делает scope-tagged commits на ней. Один кросс-package PR per `feedback_git_scope_by_change_shape`.
- Suggested commit messages (architect использует в финальном flow, **не делай сейчас**):
  - `feat(vite-builder): import-map plugin (ADR 057 D1)`
  - `feat(vite-builder): extend remoteManifest with exposes/shared (ADR 057 D2)`
  - `test(vite-builder): importMap + remoteManifest extension tests`
- Если уже staged + tried commit и pre-commit hook блокнул — `git reset` (unstage), working tree сохраняется.

После каждой логической секции работы:
- `pnpm --filter @capsuletech/vite-builder build` — rebuild dist (memory `feedback_rebuild_dist_after_capsule_ts_edit`)
- `pnpm --filter @capsuletech/vite-builder test` (если test infra существует)

---

## Эскалация

Если по ходу — упёрся в gap другого пакета (например `web-remote` нужно что-то знать) — STOP, эскалируй architect'у. Не лезь в чужую зону.

Если SHARED_DEPS list требует расширения (нашёл какой-то package который должен быть shared singleton) — flag architect'у, я добавлю в ADR 057 + согласую с owner-remote.

## Связано

- [[../../01-architecture/adr/057-web-remote-import-maps-native-esm|ADR 057]] — direction canon
- [[../../01-architecture/adr/053-app-as-remote-symmetry-and-config-channel|ADR 053]] — `IRemoteBootstrap`, `src/remote.ts` контракт
- [[adr-057-phase1-web-remote]] — pair brief (read-side, owner-remote)
- [[feedback_homework_before_adr]] — direction уже validated POC'ом, готово к implementation
