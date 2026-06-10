/**
 * Studio — Controller состояния шелла студии (web-studio). ADR 032.
 *
 * Держит shell-state (НЕ workspace — workspace = дочерние роуты design/logic/monitor):
 *   lens       — аспект внутри Design (ui|style|text|data); клик по сегменту (tag 'lens' + id).
 *   selection  — выбранный элемент канваса (placeholder; наполнится с приходом контрактов/кита).
 *
 * Дочерние Views читают через `useCtx().store.ctx.data.X`. События — именованный
 * onClick + discrimination по `target.meta.tags` (как Features.App ловит 'logout').
 * Мутации — `store.update({...})` (Bridge mutation API, docs/_meta/web-core.md).
 */

type Lens = 'ui' | 'style' | 'text' | 'data';

interface StudioCtx {
  lens: Lens;
  selection: string | null;
}

const Studio = Controller(() => {
  const initial: StudioCtx = { lens: 'ui', selection: null };

  return {
    initial: 'idle',
    context: initial,
    states: {
      idle: {
        onClick({ target, store }) {
          const tags = target.meta?.tags ?? [];

          if (tags.includes('lens')) {
            const lens = (['ui', 'style', 'text', 'data'] as const).find((l) => tags.includes(l));
            if (lens) store.update({ lens });
            return;
          }

          if (tags.includes('select')) {
            store.update({ selection: (target.payload as string | undefined) ?? null });
          }
        },
      },
    },
  };
});

export default Studio;
