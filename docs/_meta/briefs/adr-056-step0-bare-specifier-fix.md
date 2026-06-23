# Brief — bare specifier fix в `.capsule/index.html` template (Шаг 0 ADR 056)

**Zone**: `owner-vite-builder` (`packages/builders/vite/`)
**Type**: micro-fix — НЕ commit пока, architect примет после теста.
**Tree**: main shared.

---

## Контекст

Прошлый patch (federation + dts:false) поднял оба capsule dev-сервера. Browser нашёл новый блокер — `@module-federation/vite` HTML entry proxy не справляется с capsule scaffold template:

```
Uncaught TypeError: Failed to resolve module specifier 'index.ts'
  at __x00__virtual:mf-html-entry-proxy?init=...&entry=index.ts:28
```

Причина — `packages/builders/vite/src/plugins/scaffold/template/index.html.template:10`:

```html
<script type="module" src="index.ts"></script>
```

`src="index.ts"` — **bare specifier**. Vite normally rewrite'ит его через свой dev-resolver. MF2 plugin перехватывает HTML и копирует значение **as-is** в virtual entry proxy → browser-side `import('index.ts')` падает по ESM spec'у (bare specifiers не resolved в browser).

Это canonical-проблема `.capsule/index.html` независимо от MF2 — bare specifier работает в Vite только потому что Vite его допатчивает. Правильный canon — relative `./index.ts`.

## Что менять

**Один файл**: `packages/builders/vite/src/plugins/scaffold/template/index.html.template:10`

Заменить:
```html
<script type="module" src="index.ts"></script>
```

на:
```html
<script type="module" src="./index.ts"></script>
```

Один символ `./` префикс.

## После правки

1. Пересборка dist:
   ```
   pnpm --filter @capsuletech/vite-builder build
   ```

2. **Удалить старые `.capsule/index.html`** у тестовых apps, чтобы EnsureScaffoldPlugin их перегенерировал по новому шаблону:
   ```
   rm apps/playground/.capsule/index.html
   rm apps/universal-canvas/.capsule/index.html
   ```

3. **НЕ коммитить.** Architect перезапустит серверы и протестит в browser. После теста — git restore.

## Что НЕ делать

- НЕ трогай federation/dts patches из прошлого брифа — они нужны для теста.
- НЕ запускай dev-сервера — architect сам, серверы у него уже up на :3000/:3050.
- НЕ удаляй другие файлы в `.capsule/` (routes/, registry/ — это нормально).

## Связано

- [[adr-056-step0-mf2-diagnostic-patch]] — предыдущий бриф (federation + dts:false)
- [[../../01-architecture/adr/056-web-remote-mf2-iframe-transport-hybrid|ADR 056]]
