---
title: Foundation 00 — nx мульти-язык + CI базовая настройка
status: ready
audience: architect (main session, делает сам — это framework infrastructure)
last_updated: 2026-06-20
depends_on: []
unlocks: [foundation-01, foundation-02, foundation-03, foundation-04]
adr_refs: [054]
---

# Контекст

ADR 054 зафиксировал что capsule — мульти-язычная платформа. Перед добавлением первого Python-сервиса (`backend/voice/`, `backend/lang/`, `backend/learn/`) и shared lib (`packages/shared/data/py/`) нужно настроить root-инфраструктуру так, чтобы nx-affected, кэширование и CI работали для Python-проектов без дальнейших правок.

Этот бриф — **архитекторский, не для subagent'а**. Правки в `nx.json` и CI-workflow'ах — framework infrastructure, делает main-сессия.

# Scope

Только **root-уровень** настройка. НЕ создаём ни одного Python-сервиса в этом брифе. Все скелеты — последующие брифы.

# Задачи

## 1. `nx.json` — namedInputs + targetDefaults

Добавить в `nx.json`:

```jsonc
{
  "namedInputs": {
    // существующие — не трогать
    "pythonSources": [
      "{projectRoot}/**/*.py",
      "{projectRoot}/pyproject.toml",
      "{projectRoot}/uv.lock",
      "{projectRoot}/project.json"
    ],
    "rustSources": [
      "{projectRoot}/**/*.rs",
      "{projectRoot}/Cargo.toml",
      "{projectRoot}/Cargo.lock",
      "{projectRoot}/project.json"
    ]
  },
  "targetDefaults": {
    "test:py": {
      "inputs": ["pythonSources", "^pythonSources"],
      "cache": true
    },
    "lint:py": {
      "inputs": ["pythonSources"],
      "cache": true
    },
    "build:py": {
      "inputs": ["pythonSources", "^pythonSources"],
      "cache": true,
      "outputs": ["{projectRoot}/dist", "{projectRoot}/.venv"]
    }
  }
}
```

## 2. CI — Python jobs (placeholder)

Добавить новый job в основной GitHub Actions workflow (`.github/workflows/<main>.yml`):

```yaml
python:
  name: Python tests
  runs-on: ubuntu-latest
  if: ${{ contains(needs.changes.outputs.python, 'true') }}  # или просто всегда — детектить через affected
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: '3.12'
    - name: Install uv
      run: pip install uv
    - name: nx affected — Python targets
      run: |
        # пока ни одного Python-проекта нет — job no-op
        pnpm exec nx affected -t test:py --parallel=3 || true
        pnpm exec nx affected -t lint:py --parallel=3 || true
```

**Watch out:** на момент мержа этого брифа Python-проектов нет — job должен быть **no-op** (не валить CI). Это сразу выполнит роль регрессии: если в будущем добавится Python-проект, job сам подхватит.

## 3. CLAUDE.md — обновить §Commands

Дописать в section "Команды" блок Python-окружения (uv install, base dev/test commands). Один параграф, без подробностей — детали будут в `docs/01-architecture/python-setup.md` (следующий бриф).

# Acceptance

- `pnpm exec nx graph` запускается без ошибок (новые namedInputs не ломают граф).
- CI workflow проходит зелёным на пустом репо (no-op Python job).
- `nx.json` валиден (json-schema).

# Что НЕ делаем

- Не создаём `backend/voice|lang|learn/`, `packages/shared/data/` — это следующие брифы.
- Не добавляем `@nxlv/python` plugin сейчас — `nx:run-commands` достаточно. Plugin добавим если выяснится что generator'ы реально нужны.
- Не настраиваем релизный pipeline для PyPI — нет publishable Python-пакетов.

# После мержа

Unlock'аются foundation-01..04 — их можно запускать параллельно (zero cross-dependencies на этом уровне). Foundation-05/06 unlock'аются после foundation-01 (web/learn нужен shared/data? нет — но nx-config из foundation-00).
