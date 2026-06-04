/**
 * utils.ts — helpers для получения label/icon из манифестов.
 * Используется в Row.tsx.
 */

import type { JSX } from 'solid-js';
import { getManifest } from '../../manifests/registry';

/** Человекочитаемый лейбл ноды из манифеста (fallback: последний сегмент типа). */
export const label = (type: string): string =>
  getManifest(type)?.label ?? type.split('.').pop() ?? type;

/** Иконка из манифеста (JSX-функция или undefined). */
export const icon = (type: string): (() => JSX.Element) | undefined =>
  getManifest(type)?.icon;
