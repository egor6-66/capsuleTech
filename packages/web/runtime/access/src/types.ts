/**
 * Public type contracts for @capsuletech/web-access.
 *
 * Gate-ось: capability — универсальная валюта; резолвер `can(cap)` + провайдеры.
 * См. docs/playground/access.md.
 */

import type { JSX } from 'solid-js';

/** Capability — абстрактный namespace-слаг (`styles`, `workspace.builds`). */
export type Capability = string;

/**
 * Policy: роль → список разрешённых capability.
 * `*` = все; префикс-грант `workspace.*` покрывает `workspace.builds`.
 * Источник — app `access.json`.
 */
export type AccessPolicy = Record<string, readonly Capability[]>;

/**
 * Провайдер gate-оси. Отвечает на `can(cap)`:
 *  - `true`  — грант,
 *  - `false` — запрет,
 *  - `undefined` — «не моя capability» (abstain, не влияет на слияние).
 */
export interface IAccessProvider {
  can(cap: Capability): boolean | undefined;
}

export interface ICanProps {
  cap: Capability;
  children?: JSX.Element;
  fallback?: JSX.Element;
}
