---
tags: [adr, accepted, community, content, moderation, rating, agents]
status: accepted (стройка после lessons iter-2 и community ф.2 — очередь)
date: 2026-07-05
last_updated: 2026-07-05
supersedes: []
extends:
  - 064-lexical-graph-data-model
  - 069-lessons-content-in-lang
  - 071-backend-community-social-core
---

> [!info] Status: accepted
> Вклад контента от людей (модераторы скоро, потом любой участник — слова,
> правила, дриллы, багрепорты, для любых проектов): **два канала подачи —
> один валидатор**. Vault учителя остаётся hi-trust каналом; UI-подача идёт
> через **contribution-core в community** (submissions, очередь, статусы,
> canon-score) и применяется в домене ТЕМ ЖЕ кодом, что importer. Рейтинг =
> существующий event-журнал (`contribution.accepted {score}` → очки). Судья
> канона: v1 rule-based (валидатор importer'а + метрики), v2 — LLM через
> `backend/llm` (ADR 074), судья СОВЕТУЕТ — решает модератор.

# ADR 073 — Contribution pipeline: два канала, один валидатор

## Решение {#decision}

### D1 — Каналы {#d1}
Vault (git, Obsidian) — авторский канал доверенных (учитель): как есть.
UI-канал (формы в аппах) — для модераторов/участников. Оба сходятся в единую
валидацию домена (у learn-контента она уже построена и боевая: reject с
причинами). Второго канона не существует по построению.

### D2 — Contribution-core (community) {#d2}
`submissions(id, contributor_id, type, payload jsonb, status
draft|review|accepted|rejected, canon_score, notes, ts)` + очередь модерации.
Права: member → submit; **moderator** (новая роль в auth — аддитивно к
enum, ядро identity не меняется) → accept/reject; принятие эмитит
`contribution.accepted {type, score}` в event-журнал (ADR 071 D4) → рейтинг
пропорционален канон-близости; reject → снижение. Механика очков уже живая.

### D3 — Contribution-types: контракт домена {#d3}
Домен-сервис регистрирует тип вклада: `schema` (форма payload — SenseIn/drill
уже есть) + `validate` (importer-код) + `apply` (upsert с provenance
`source: community` + contributor_id — расширение оси ADR 064; до принятия
вклад в доменную БД НЕ попадает). Новый кейс (правило, багрепорт, вклад в
другой апп) = регистрация типа, ядро не трогается.

### D4 — Судья канона: pluggable {#d4}
v1 — детерминированный: validate-результат + метрики (полнота полей, резолв
ссылок, дубли) → score. Без нейронок. v2 — LLM-судья: community зовёт
`backend/llm /llm/generate` (structured JSON `{score, notes}`) со своим
judge-промптом и канон-контекстом. Судья — рекомендация модератору, не
автомат (пересмотр — отдельным решением, когда накопится статистика).

## Фазы {#phases}
A. contribution-core + тип «слово» (lang validate/apply) + роль moderator.
B. UI-формы (community ЛК + «предложить» в learn) + очередь модерации UI.
C. LLM-судья (после backend/llm, ADR 074).

## Последствия {#consequences}
**Плюсы:** масштабирование контента без агентов-запускальщиков; рейтинг
получает смысл (качество вклада); канон один на все каналы. **Цена:**
роль-модель +1 роль; домены обязаны экспортировать validate/apply как
переиспользуемые функции (learn уже так).
