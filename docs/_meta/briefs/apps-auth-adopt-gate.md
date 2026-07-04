---
title: apps/auth — схлопнуть Gate-виджет на пакетный Auth.Gate
status: ready (Auth.Gate уже в ветке — 01c77b5a; пересобрать dist web-auth перед verify)
audience: owner-сессия `claude-scope -Scope apps` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [068]
---

# Scope (только apps/auth)

Пакет теперь отдаёт готовый guest-блок `Auth.Gate` (Login↔Register+свич внутри).
1. `widgets/gate.tsx`: guest-ветка = `<Auth.Gate …branding/>` (одна строка вместо
   Login/Register/SwitchMode); authed-ветка (Views.AuthedPanel) без изменений.
2. Удалить `views/switchMode.tsx`; из `features/app.tsx` — `mode` из context и
   guest.onClick-переключалку (to-login/to-register теги теперь ловит Gate-FSM
   пакета); из capsule.app.ts meta.tags убрать to-login/to-register если нигде
   больше не используются.
3. Событийный контракт не меняется: onLogin/onLoginError доходят до root как раньше.

# Acceptance

build+biome 0; живой флоу через :8080/auth/ (backend :8004): переключение
вход↔регистрация, register→authed, login→authed, F5-persist, ?next=-редирект.
