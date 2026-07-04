---
title: backend/learn — чекер дриллов (ADR 069 фаза 2): POST check + санитизация ответов из выдачи
status: ready
audience: owner-сессия `claude-scope -Scope backend-learn` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [067, 069]
---

# Контекст

Решение user (канон): проверка ответов — НА БЭКЕ, «фронты это просто
интерфейсы». Чекер живёт в learn-BFF (не в lang: lang = чистое хранилище
контента; не во фронте: одна реализация на web + будущих ботов, эталоны не
утекают в браузер, события фазы 3 рождаются в точке проверки).

# Scope (backend/learn)

## 1. 🔒 Санитизация выдачи (КРИТИЧНО, иначе чекер бессмыслен)

`GET /learn/lessons/{id}` сейчас пробрасывает drill.items как есть — с
`answerEn/accept/nearMiss`. Вырезать их из фронт-выдачи: item наружу =
`{ promptRu, context? }` (+ index). Passthrough-иммунитет (без response_model)
сохранить для остального урока — санитизация точечная по items.

## 2. `POST /learn/drills/{drill_id}/check`

Тело: `{ item_index: int, answer: str, reveal?: bool }`. Ответ:
`{ verdict: 'correct' | 'near_miss' | 'wrong', hint?: str, answer?: str }`.

- **Нормализация** (единая функция, покрыть тестами отдельно): trim, collapse
  пробелов, lowercase, срез финальной пунктуации (.!?), унификация апострофов
  (' → '). Применяется и к вводу, и к эталонам.
- correct: normalized(answer) == normalized(answerEn) ЛИБО любой из accept[].
- near_miss: первый сработавший паттерн в авторском порядке (contains =
  вхождение по нормализованным строкам; regex = re.search, IGNORECASE,
  компилировать один раз) → его hint.
- wrong: ничего не сработало.
- `reveal: true` → в ответе `answer: answerEn` (учебный формат «показать
  ответ»; вердикт при этом всё равно считается).
- Данные дрилла — из lang (существующий клиент), per-request; кэш дриллов
  НЕ городить (рано).
- 404 на незнакомый drill_id/item_index — честно.

## 3. Шов фазы 3 (только комментарий, НЕ реализация)

Место, где вердикт `near_miss|wrong` известен вместе с graboTag = будущая
точка эмита события «наступил на граблю» (user-домен, отдельный ADR).
Оставить NOTE-коммент в коде чекера.

## 4. Тесты

Нормализация (кейсы: регистр/пунктуация/апострофы/пробелы); correct по
answerEn и по accept; near_miss порядок (первый выигрывает) + contains vs
regex (кейс эталона: `had( already)? eat(ed)?\b` не задевает верный eaten);
wrong; reveal; санитизация — в lesson-выдаче нет answerEn/accept/nearMiss.

# Acceptance

pytest + ruff зелёные. Live (lang :8002 живой, эталон в БД):
`POST 127.0.0.1:8003/learn/drills/past-perfect-which-clause/check`
c "I did eat when he called" → near_miss + хинт про Past Perfect;
с "I'd already eaten when he called." → correct.

# Что НЕ делаем

- Событий/персистенции попыток (фаза 3), rate-limit, LLM-проверку (pluggable
  потом), фронт-часть (интерактив UI = отдельный бриф learn-пакета).
