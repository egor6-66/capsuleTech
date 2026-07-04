---
title: apps/learn — схлопнуть library-страницу на блоки Learn.Library.* (финал переноса)
status: ready
audience: owner-сессия `claude-scope -Scope apps` (commit-only, ветка feat/wave-voice-auth-gateway)
last_updated: 2026-07-04
adr_refs: [032, 055]
---

# Контекст

Library-браузер переехал в пакет `web-learn` (бриф `learn-library-block-migration.md`,
сделано): блоки `Learn.Library.Search / Words / Info` со стором ВНУТРИ пакета,
наверх — события `onWordSelect { sense }` / `onSpeak { audioUrl }`. dist пакета
собран. Осталось перевести апп с самодельной library-логики на блоки.

# Scope (только apps/learn)

1. **Страница library/explorer**: слоты Matrix → `main = <Learn.Library.Search/> +
   <Learn.Library.Words/>`, `rightBar = <Learn.Library.Info/>`. Обёртка
   `<Features.Library>` больше не нужна.
2. **УДАЛИТЬ** app-дубли (переехали в пакет): `features/library.tsx`,
   `views/wordTile.tsx`, `views/wordSearch.tsx`, `views/wordInfo.tsx`,
   `shapes/wordTiles.tsx`, `widgets/words.tsx`, `widgets/wordInfo.tsx`.
   `entities/sense.tsx` — оставить только если на него ещё кто-то ссылается
   (endpoints), иначе тоже убрать.
3. **Озвучка**: в `features/app.tsx` вместо баббл-ветки `onClick`+audioUrl —
   именованный хендлер `onSpeak` (payload `{ audioUrl }`; типизация — см.
   nested-нюанс в `web-learn/src/capsule.ts`: вложенные блоки не в авто-агрегате
   Events, типизируй payload вручную). Плеер/движок остаются как есть.
   `onWordSelect` аппу пока не нужен — не подписывайся.
4. **endpoints/learn.ts**: senses/sense/related теперь дергает пакет сам —
   если после удаления app-потребителей endpoint'ы осиротели, убрать
   осиротевшие (voice.ts НЕ трогать — движки для хедера).

# Проверки (порядок из apps/OWNERSHIP.md)

capsule build → biome → dev-diagnostics без error → grep `^import `/`class=` = 0.
Функционал глазами проверит user: поиск, селект (подсветка ПЕРЕЕЗЖАЕТ), 🔊 с
выбранным движком, related-панель.

# Что НЕ делаешь

- НЕ трогаешь packages/**, header/движки/gateway.
