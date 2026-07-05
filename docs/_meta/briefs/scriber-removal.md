---
title: backend/scriber — СНОС (ADR 074): Rust LLM-роутер superseded backend/llm
status: ready — ⚠️ ДЕСТРУКТИВНЫЙ (удаление зоны; наработки остаются в git-истории)
audience: owner-сессия `./claude-scope.sh backend-scriber` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [065, 074]
---

# Контекст

ADR 074 D3: scriber (Rust: capsule-core/ollama/mcp/native-tools/server) —
до-ADR-065 архитектура (Ollama = внешний сервис, отвергнут; агент-слой
переезжает на backend/llm + будущий agent-loop). Решение user: удалить.

# Scope

1. Удалить `backend/scriber/` целиком + его членство в `backend/Cargo.toml`
   workspace (+ Cargo.lock регенерировать).
2. **Проверка зависимых ДО удаления** (если что-то не сходится — STOP+surface,
   не резать по живому):
   - `backend/telegram` обязан компилироваться после сноса
     (`cargo check -p capsule-telegram`): его scriber.rs — HTTP-клиент К
     серверу, кодом от крейтов scriber зависеть не должен; если зависит —
     STOP+surface.
   - `backend/fs`: остаются ли потребители (telegram? desktop native —
     standalone, не workspace)? Есть → оставить; нет → удалить вместе,
     отметить в отчёте.
   - grep по repo: `capsule-server|scriber|:8787` — README/доки/скрипты,
     список остаточных упоминаний в отчёт (правки чужих зон НЕ делать —
     architect разнесёт).
3. OWNERSHIP scriber удаляется вместе с зоной; финальный отчёт (что удалено,
   что осталось, остаточные упоминания) — в коммит-сообщение.
4. root `package.json` (`dev:backend`) НЕ трогать — уберёт architect
   (shared infra).

# Acceptance
`cargo check` workspace зелёный (telegram компилируется); grep-отчёт в коммите.
