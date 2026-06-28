/**
 * `@capsuletech/web-core/events` — лёгкий event-channel субпатч.
 *
 * Отдаёт ТОЛЬКО программный HCA-dispatch (`useEmit` / `useEmitOptional`) для
 * пакетов-потребителей (web-remote и т.п.), которым нужен emit-механизм без
 * втягивания всего барла `@capsuletech/web-core` (`.` тянет wrappers/providers/
 * bootstrap). Транзитив — только `engine/use-emit` + лёгкие `ctx`/`derivation`/
 * `emit-context`.
 *
 * Параллель: web-remote уже берёт `EMBED_PROTOCOL` из `@capsuletech/web-core/bootstrap`.
 *
 * `useEmit` — throw вне Controller/Feature-scope (app-контракт);
 * `useEmitOptional` — no-op вне scope (для библиотечного кода с опциональным scope).
 *
 * @module
 */

export { useEmit, useEmitOptional } from '../engine/use-emit';
