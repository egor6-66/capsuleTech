# @capsuletech/shared-zod

Capsule-расширенный `zod`-namespace. Внутри одна точка — `z.component()` для Solid JSX-renderable значений; будут добавляться доменные хелперы по мере появления (теги, ссылки, алиасы).

Пользователь напрямую этот пакет не импортирует — он получает `z` первым аргументом в фабриках (`Shape((z, ui) => ...)`, `defineEndpoint((z) => ...)`, и т.п.). Это часть API-договора фреймворка.

> Под капотом shallow-spread `{ ...zodRoot }`, а не прототипная цепочка —
> чтобы обойти frozen ESM Module-namespace после `optimizeDeps` Vite'а.
> Оригинальный `zod` НЕ мутируется.

Сборка: `pnpm nx build @capsuletech/shared-zod`.
