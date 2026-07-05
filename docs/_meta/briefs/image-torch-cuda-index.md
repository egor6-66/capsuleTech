---
title: backend/image — воспроизводимый ML-стек: CUDA-torch (uv index-пин) + transformers<5
status: ready
audience: owner-сессия `claude-scope -Scope backend-image` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [065]
---

# Контекст

`uv sync --extra gen` ставит `torch 2.12.1+cpu` — на Windows дефолтные
PyPI-колёса torch = CPU-only. На CPU sdxl-turbo — минуты/кадр, flux — мёртв.
Architect для немедленного теста поставил CUDA-колёса руками
(`uv pip install torch --index-url https://download.pytorch.org/whl/cu126`) —
это НЕ воспроизводимо: следующий `uv sync` молча откатит на CPU.

# Вторая грабля той же природы (2026-07-05, найдена architect'ом live)

uv зарезолвил `transformers==5.13.0` — его новый лоадер строит text-encoder
sdxl по ДЕФОЛТ-конфигу (512) вместо конфига модели (1280) →
`RuntimeError: mismatched sizes` на `from_pretrained` (diffusers ещё не
догнал v5-механику). Лечение проверено live: `transformers<5` (встало 4.57.6,
рендер пошёл). В pyproject: пин `transformers>=4.57,<5` в extra `gen`
(+ коммент почему; снять пин, когда diffusers объявит поддержку v5).

# Scope

1. `pyproject.toml`: воспроизводимый CUDA-путь через uv:
   ```toml
   [[tool.uv.index]]
   name = "pytorch-cu126"
   url = "https://download.pytorch.org/whl/cu126"
   explicit = true

   [tool.uv.sources]
   torch = [
     { index = "pytorch-cu126", marker = "sys_platform == 'win32' or sys_platform == 'linux'" },
   ]
   ```
   (точную форму сверить с актуальной документацией uv; критерий — `uv sync
   --extra gen` с нуля даёт `torch.cuda.is_available() == True` на машине с
   NVIDIA; версию индекса cu126/cu128 выбрать по факту наличия колёс 2.12.x).
2. README: секция «GPU» — какой индекс, что на не-NVIDIA машинах будет CPU
   fallback и чем это грозит по скорости.
3. OWNERSHIP: заметка про PyPI-CPU граблю.
4. CI НЕ трогаем: CI живёт без extras (fake-движок), CUDA-индекс его не касается.

# Acceptance

`uv sync --extra dev --extra gen` с чистого venv → `uv run python -c "import
torch; print(torch.cuda.is_available())"` = True на dev-машине; pytest/ruff
зелёные; uv.lock перегенерён и закоммичен.
