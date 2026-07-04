---
title: web-auth — готовый блок «формы + переключение вход↔регистрация» (SwitchMode = функционал пакета)
status: ready
audience: owner-сессия `claude-scope -Scope auth` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [032, 033, 068]
---

# Контекст (ревью user 2026-07-04)

`apps/auth/src/views/switchMode.tsx` + режим `mode: 'login'|'register'` в
app-Feature — переключение форм живёт в АППЕ. Вердикт user: «свич-мод — это не
функционал апп, а функционал пакета». Апп должен монтировать ОДИН блок.

# Scope (packages/web/domain/auth)

1. Новый connected-блок (имя предлагаю `Auth.Gate`; owner может предложить
   лучше — согласовать с architect ДО реализации, это публичный API):
   guest-состояние целиком — Login-форма ↔ Register-форма + переключатель
   («Нет аккаунта? Регистрация» / «Уже есть аккаунт? Вход»), mode-стейт ВНУТРИ
   блока. Существующие `Auth.Login`/`Auth.Register` остаются публичными
   (композиция, не замена).
2. Branding-пропсы (title/subtitle/footerNote) — прокинуть в обе формы.
3. События наружу без изменений: `onLogin`/`onLoginError` баблятся как есть.
4. Регистрация в capsule.ts + phantom `__events`.
5. Тесты: render обеих фаз, переключение, emit прозрачен.

# Параллельно (тот же коммит НЕ обязателен)

apps/auth упрощение (зона apps, отдельный мини-бриф после мержа этого):
Gate-виджет аппа монтирует `Auth.Gate`, `views/switchMode.tsx` и `mode` из
Feature-контекста удаляются.

# Acceptance

`pnpm --filter @capsuletech/web-auth test` зелёные; build (dist!); biome 0;
OWNERSHIP публичный API обновлён.
