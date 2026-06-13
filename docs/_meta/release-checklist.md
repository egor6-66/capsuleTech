---
tags: [meta, release, ai-context]
status: documented
type: ai-anchor
audience: claude
last_updated: 2026-06-13
---

# 🚀 Release checklist — что делает owner перед релизом

> [!ai]
> Шпаргалка для owner-агентов перед публикацией пакета. Referenced from [[POLICY.md]] и каждого `owner-*.md`. Применима к любому пакету в `packages/`.

## TL;DR {#tldr}

Owner отвечает за release своих пакетов. Перед публикацией: green CI + bundler-✅ exports + CHANGELOG + docs in sync с кодом. Major-bump deps — отдельный PR с явным smoke-test.

## Pre-release checklist

### 1. Green CI

```bash
pnpm nx run-many -t typecheck,test,build --projects="@capsuletech/<my-pkg>"
```

Все три target'а должны быть **green**. Если что-то падает — fix первым делом, не зашивай. CI workflow в `.github/workflows/ci.yml` дёргает то же самое для всего workspace.

Smoke checklist:
- [ ] `typecheck` — нет TS errors (включая зависимости)
- [ ] `test` — все тесты pass; coverage не упал
- [ ] `build` — `dist/` содержит valid output

### 2. Bundler-friendly exports

```bash
pnpm audit:exports @capsuletech/<my-pkg>
```

Команда дёргает [publint](https://publint.dev/) + [@arethetypeswrong/cli](https://arethetypeswrong.github.io/). **Минимум** — bundler-✅ (правый столбец в attw output). Идеал — все шесть colonok ✅.

Если падает:
- `Cannot find module` для `./xxx` — забыли добавить subpath в `package.json:exports`
- `Wildcard subpath` warning — `exports: { "./*": ... }` не tree-shake-friendly; явные пути предпочтительны
- ESM/CJS dual вывод — если пакет ESM-only, убедись что `package.json:type === "module"` и нет stale `main`/`require` поля

### 3. CHANGELOG обновлён

Nx Release (`pnpm nx release` с `conventionalCommits: true`) генерит CHANGELOG автоматически из conventional commit messages. **Owner проверяет** что:
- [ ] Все breaking changes явно отмечены `!:` или `BREAKING CHANGE:` в commit body
- [ ] Новые public API упомянуты (`feat:`)
- [ ] Bug fixes явно (`fix:`)
- [ ] **Не** включены `chore(release): publish` от прошлых релизов (они auto-generated)

Если в группе `cli` или `web_base` (fixed-versioning) — все пакеты группы дернутся одной версией. Их CHANGELOGs обновятся синхронно даже если в конкретном пакете «version bump only». Это сознательно.

### 4. Docs синхронны с кодом

Owner-agent работает с двумя слоями docs:

| Doc | Назначение | Кто читает |
|---|---|---|
| `docs/_meta/<pkg>.md` | **AI anchor** — детальный technical reference | Claude-инстансы, owner-agents, future contributors |
| `docs/09-packages/<pkg>.md` | **User-facing** — guide, examples, API outline | разработчики apps |
| `packages/<pkg>/README.md` | **Short overview** — что это, API в 1 экран | npm landing |

**Checklist:**
- [ ] AI anchor (`_meta/<pkg>.md`) отражает текущий public API, известные грабли, lifecycle. Если меняется shape — обновляешь в том же PR что меняешь код. Не «потом».
- [ ] User-facing doc (`09-packages/<pkg>.md`) — usage examples работают (можно скопипастить → запустить)
- [ ] README — рассинхрон с реальностью = плохой UX на npm. Версия, имя экспортов, examples — актуальные.

### 5. Major-bump deps

Если пакет bumps **major** какой-то dep (peer/dep) — **отдельный PR** с явным smoke:
- [ ] Test fixture, который раньше падал и теперь работает (или наоборот, если ломаются consumer'ы — миграционный guide)
- [ ] Changelog entry в **этом** PR с явным указанием dep + версии
- [ ] Согласовано с owner'ами consumer'ов (через mention в PR description или сообщение юзеру)

## Release execution

Когда checklist green:

```bash
# Local dry-run (без публикации):
pnpm release:local:<group>          # см. nx.json:release.groups для имени

# Реальный release через CI workflow:
gh workflow run release.yml -f group=<group>
```

Workflow делает:
1. `pnpm nx release` — version bump (conventional commits) + tag + GitHub release
2. Build artifacts → `dist/`
3. `pnpm publish` для каждого пакета группы

После публикации:
- [ ] Проверь npm landing для каждого пакета: версия, README отображается корректно
- [ ] Smoke install в `capsule-test` workspace (или новом directory): `pnpm install @capsuletech/<pkg>@latest`
- [ ] Закрыть issues / PRs с label `target-release` если такие есть

## Известные грабли {#gotchas}

1. **`pnpm publish` requires NODE_AUTH_TOKEN.** CI workflow прокидывает через secret. Локально (`release:local`) использует Verdaccio (`http://localhost:4873`) — никакого реального npm push.

2. **Fixed-version group ≠ независимая публикация.** Если пакет в `web_base` — нельзя bumpнуть его в одиночку. Bump всю группу. Если нужен hotfix для одного — выноси из группы временно (sensitive, requires ADR).

3. **`releaseTagPattern: cli@{version}` vs `web@{version}`** — два разных tag-namespace'а. Git-tags не пересекаются. Local pre-release tags имеют тот же pattern.

4. **CHANGELOG `workspaceChangelog: false`** (см. nx.json) — нет глобального CHANGELOG.md в корне репо. Только per-package. Это сознательно — групповые CHANGELOG'и в group-leader'е (cli/, web/core/).

5. **`preserveLocalDependencyProtocols: true`** — `workspace:*` deps НЕ заменяются на конкретную версию в published package.json (поведение разных tooling'ов отличается, у нас намеренно сохраняем для monorepo-link сценариев).

6. **`updateDependents: 'never'`** — изменение одного пакета НЕ триггерит автоматический bump всех его dependents. Если хочешь cascade-bump — bump их вручную либо через group fixed-versioning.

7. **`git.push: false`** — Nx Release **не пушит** tags автоматически. После `pnpm nx release` дёрни `git push origin main --tags` руками (или скрипт релиза это делает).

## Post-release

- [ ] Tag pushed (`git push --tags`)
- [ ] GitHub release создан с release notes (Nx Release делает auto)
- [ ] Test workspace (`capsule-test`) обновлён до новой версии и smoke-passes
- [ ] CHANGELOG в repo синхрон с GitHub release page

## Hotfix flow

Если нашли критичный bug в released версии:

1. Создать ветку `hotfix/<pkg>-<issue>` от **tag релиза**, не main:
   ```bash
   git checkout -b hotfix/web-router-v0.1.2 cli@v0.1.1
   ```
2. Минимальный fix + test reproducer
3. Bump patch версии (`0.1.1` → `0.1.2`)
4. Merge в main через PR
5. Cherry-pick / fast-forward tag manually
6. Publish

Avoid hotfix-ы для не-critical bugs. Лучше дождаться следующего регулярного release.

## Связанное {#related}

- [[POLICY.md]] — общая политика (release p.4)
- [[releases]] — user-facing release guide
- [[agents]] — реестр owner-agents
- [Nx Release docs](https://nx.dev/recipes/nx-release) — внешний reference
