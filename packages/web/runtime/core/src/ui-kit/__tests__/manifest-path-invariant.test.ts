import { getAllManifests } from '@capsuletech/web-ui/manifest';
import { describe, expect, it } from 'vitest';
import { Ui } from '../index';

/**
 * Guard — path-инвариант между web-ui манифестами и собранным namespace `Ui`.
 *
 * Канвас кормит рендерер так: `<Renderer.View schema={preset} registry={{ ui: Ui }} />`.
 *   - `preset.type` — dot-path из web-ui манифеста (`*.manifest.tsx` → `'ui.Button'`,
 *     `'ui.Layout.Flex'`, `'ui.Card.Header'`, …).
 *   - `Ui` — namespace, собираемый ЗДЕСЬ, в web-core (`src/ui-kit/imports.tsx`).
 *
 * Резолв в рендерере (`@capsuletech/web-renderer/resolve`) — простой walk по
 * dot-path против registry `{ ui: Ui }`. Он работает ТОЛЬКО потому, что типы
 * манифестов СОВПАДАЮТ со структурой `Ui` — по соглашению, не enforced.
 *
 * Этот тест хардит инвариант: каждый `manifest.type` обязан резолвиться в том
 * же объекте, что апп передаёт как `{ ui: Ui }`. Дрейф (кто-то добавит примитив
 * с путём ≠ namespace) валит CI здесь, а не даёт тихий `cannot resolve` в
 * рантайме канваса.
 *
 * Резолв инлайнен (walk по сегментам) намеренно — без зависимости на
 * web-renderer, но семантически идентичен `resolvePath`.
 */

/** Walk dot-path против registry. `'ui.Layout.Flex'` → `registry.ui.Layout.Flex`. */
const resolve = (registry: Record<string, unknown>, path: string): unknown => {
  if (!path) return undefined;
  let cur: unknown = registry;
  for (const seg of path.split('.')) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
};

/**
 * Намеренные исключения — manifest-типы, которые ОСОЗНАННО отсутствуют в
 * namespace `Ui`. Явный allowlist с обоснованием, НЕ молчаливый skip.
 *
 * - `ui.Animate` — wrapper-категория (анимационная обёртка), не render-leaf.
 *   `Animate` был удалён из ui-kit (`imports.tsx`) при переводе анимаций на
 *   нативный CSS (View Transitions + Kobalte data-attrs, см. OWNERSHIP
 *   changelog «Ui.Animate удалён»). Манифест остаётся для studio-метаданных,
 *   но render-узлом Animate не является и пресетов не имеет.
 *   owner-web-ui (Part B2 брифа) решает причинно — снять render-`type` с
 *   манифеста ИЛИ оставить здесь. До тех пор — явное исключение.
 */
const ALLOWLIST = new Set<string>(['ui.Animate']);

describe('manifest path-invariant: every web-ui manifest.type resolves in Ui namespace', () => {
  // Тот же registry, что апп/канвас передаёт рендереру.
  const registry = { ui: Ui } as Record<string, unknown>;

  it('all manifest types resolve (except explicit allowlist)', () => {
    const unresolved = getAllManifests()
      .map((m) => m.type)
      .filter((type) => resolve(registry, type) == null)
      .filter((type) => !ALLOWLIST.has(type));

    expect(unresolved).toEqual([]);
  });

  it('allowlist has no stale entries (entry that now resolves must be removed)', () => {
    const stale = [...ALLOWLIST].filter((type) => resolve(registry, type) != null);

    expect(stale).toEqual([]);
  });
});
