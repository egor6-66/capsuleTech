# Brief — `apps/studio` (зеркало learn-аппа) + снос `apps/playground` (scope `apps`)

**Мандат user:** playground убираем совсем; studio переезжает в **свою апп `apps/studio`**,
анатомически **зеркало `apps/learn`**. (На место playground позже придёт hub-апп, который
будет подтягивать любые апы, в т.ч. studio — это ОТДЕЛЬНАЯ будущая задача, СЕЙЧАС не делаем.)

**Канон анатомии аппа:** `apps/learn` — эталон-зеркало. Открой его рядом и повторяй форму:
- `capsule.config.ts` — `base` + `devServerPort` (+ ничего лишнего).
- `capsule.app.ts` — `meta.tags`, `packages[]`, `api: () => ({ bases: { default: '/api' } })`, `router.transition`.
- `src/pages/_workspace/**` — **pathless-группа `_workspace`** (НЕ `workspace`, как в playground).
- `src/widgets/{header,navigation}.tsx`, `src/shapes/shellNavigation.tsx`, `src/features/app.tsx`.
- Scaffold через CLI (`capsule create-app`), не руками (канон), затем переносишь studio-контент.

## Целевой `apps/studio`
- **`capsule.config.ts`:** `base: '/studio/'`, `devServerPort: 3050` (совпадает с nginx upstream
  `app_studio`; не менять порт).
- **`capsule.app.ts`:** `packages: ['@capsuletech/web-studio', '@capsuletech/boost-layout',
  '@capsuletech/web-shell']` (+ `@capsuletech/web-placeholders` если нужен, как в learn).
  `api: () => ({ bases: { default: '/api' } })`. `router.transition: true`. `meta.tags` — по
  факту тегов studio-хоста.
- **НЕ тащить playground-мусор:** login-страница, `widgets/loginForm`, `entities/viewer`,
  `endpoints/auth`, `pages/workspace/docs`, `widgets/placeholder`, `web-auth` + `access` +
  `auth`-секция. studio сейчас **auth-less**, как learn (гостевой вход/роли — отдельной волной
  позже, не тут).
- **Перенести studio-хост** из playground, адаптируя под `_workspace`-структуру learn:
  `pages/workspace/web-studio/*` → `src/pages/_workspace/**` (студийные страницы),
  `widgets/studio/*` (componentsPalette/info/header/monitoring/tree/inspector) → `src/widgets/**`,
  `features/app`, `shapes/shellNavigation` — по образцу learn (header+navigation+shell-флоу).

## Снос `apps/playground`
- Удалить директорию `apps/playground` целиком (src + capsule.config/app + tsconfig; `.capsule/`
  и `node_modules/` — генерат, уйдут сами).
- Если playground упоминается в скриптах аппа/README внутри `apps/**` — вычистить.

## Что делает architect (НЕ ты — не трогай)
- `docker/gateway/nginx.conf` — раскомментить `location /studio/ { proxy_pass http://app_studio; }`
  + reload gateway.
- Workspace-инфра: `pnpm-workspace.yaml`/`nx` — `apps/*` glob подхватит studio и уронит playground
  сам; проверю. CI-матрица если хардкодит playground — поправлю.
- tsconfig.base пути — если studio-апп потребует новых, добавлю.

## Verify
`nx run <apps-studio>:typecheck` + `:build`. Живой: `capsule dev` в `apps/studio` (порт 3050),
затем `:8080/studio/` через gateway (после моего nginx-reload). Экран studio грузится, не 404.
Grep `playground` по репо = 0 (кроме исторических доков/чекпойнтов).
