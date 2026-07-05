/**
 * useStudioMode — derive активного раздела студии из URL.
 *
 * Single source of truth = URL (как в `Navigation.tsx`): первый сегмент
 * после `/workspace/web-studio/` определяет режим. Палитра/Tree/Canvas/etc
 * сверяются через этот hook вместо локальных стейтов — sync с табами
 * автоматический.
 *
 * Дефолт `'store'` (если URL вне studio, сегмент не распознан, или вообще
 * нет `<Providers.Base>` в дереве — standalone unit-тесты палитры). Mirный
 * fallback, потребитель всегда получает валидное значение.
 */

import { useRouter } from '@capsuletech/web-router';

export type StudioMode = 'store' | 'creator';

const STUDIO_BASE = '/workspace/web-studio';
const KNOWN_MODES: readonly StudioMode[] = ['store', 'creator'];

export const useStudioMode = (): (() => StudioMode) => {
  // Standalone-режим (нет Providers.Base): useRouter throw'ает.
  // Это нормально — палитра должна рендериться в любом контексте,
  // mode тогда дефолтится в 'store' (текущее поведение click-to-select).
  let router: ReturnType<typeof useRouter> | null;
  try {
    router = useRouter();
  } catch {
    router = null;
  }

  return () => {
    if (!router) return 'store';
    const path = router.current();
    if (!path.startsWith(STUDIO_BASE)) return 'store';
    const rest = path.slice(STUDIO_BASE.length).replace(/^\/+/, '');
    const seg = rest.split('/')[0];
    return (KNOWN_MODES as readonly string[]).includes(seg) ? (seg as StudioMode) : 'store';
  };
};
