---
title: backend/voice — чистка ростера движков: f5/edge вон по канону; xtts в списке = стухший процесс
status: ready
audience: owner-сессия `claude-scope -Scope backend-voice` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [065]
---

# Контекст

1. **«xtts в списке» — НЕ баг кода.** В src xtts отсутствует (выпилен `4dff328b`),
   но живой `/voice/engines` на :8001 отдаёт
   `["chatterbox","edge","f5","kokoro","piper","xtts"]` — процесс запущен ДО
   выпила. Лечение — рестарт uvicorn (user). В код-части делать нечего.
2. **Реальный долг — лицензии/канон ростера** (флаг architect'а 2026-07-03 висит):
   - `f5` — CC-BY-NC: non-commercial **уже отклонён ADR 065** (прецедент). Выпилить.
   - `edge` — облачный сервис Microsoft: нарушает канон **library-not-service**
     (ADR 065: torch-библиотеки in-process ок, внешние сервисы — нет). Выпилить.
   - Остаются: `kokoro` (Apache), `chatterbox` (MIT), `piper` (MIT) — ок.

# Scope (backend/voice)

1. Удалить `engines/f5.py`, `engines/edge.py` + их регистрацию/deps
   (opt-in extras в pyproject, если есть) + их тесты.
2. Если дефолт/конфликт-механика ссылается на удалённые — подчистить.
3. **OWNERSHIP.md: таблица лицензий движков** (kokoro/chatterbox/piper +
   вердикты по выпиленным xtts/f5/edge с причинами) — закрыть старый хвост
   «лицензии зафиксировать».
4. Тесты + ruff зелёные.

# После мержа (user, не owner)

Перезапустить voice: `cd backend/voice; uv run --no-sync uvicorn capsule_voice.main:app --port 8001`
→ `/voice/engines` = `["chatterbox","kokoro","piper"]` (+default kokoro).
Фронт-свичер подхватит сам (Features.App ре-фетчит на загрузке; персист юзера
на удалённый движок откатится на default — механика уже есть).

# Acceptance

`uv run pytest` + `uv run ruff check .` зелёные; grep f5|edge по src = 0
(кроме OWNERSHIP-истории).
