/**
 * @capsuletech/web-access — SKELETON (0.0.0).
 *
 * Единая gate-ось capsule: authn(login) + RBAC(role) + entitlements(tenant) +
 * feature-toggle/inject (ADR 041) — ОДИН механизм. capability = универсальная
 * валюта; резолвер `can(cap)` + провайдеры; enforcement в точках
 * (build-inject / route-guard / nav-filter / element).
 *
 * Стюард — главный (сквозная архитектура, как web-contract).
 * План: docs/playground/access.md.
 *
 * Срез «ограничить роутинг»: A0 (резолвер + role-провайдер от useAuth +
 * access.json-схема) → usePermissions/<Can>/registerAccessProvider.
 */
export {};
