/**
 * WebStudio.Canvas — область превью выбранного компонента.
 *
 * Читает `selected` через `useSelectedPreset()` (singleton Solid Store).
 * Рендерит схему пресета через `<Renderer>` (`@capsuletech/web-renderer`)
 * внутри `<CanvasFrame>` — same-origin iframe с зеркалированным CSS.
 *
 * Registry — ХАРДКОД на `@capsuletech/web-ui`: студио оперирует только нашим
 * UI-kit'ом. Renderer резолвит dot-path'ы: `ui.Button` → kit.Button,
 * `ui.Icons.<Name>` → kit.Icons.<Name>, etc.
 *
 * Show с non-function children: `<Renderer schema={schema()!} ...>` остаётся
 * mount'нутым между сменами пресета, schema prop обновляется реактивно через
 * Solid Store proxy → mergeProps в RenderNode видит новые props без re-mount.
 *
 * **Iframe isolation:** см. `canvas-frame/CanvasFrame.tsx` — нужно чтобы можно
 * было применять canvas-only тему/dark-mode без влияния на app-chrome
 * (следующая итерация — отдельный style-редактор рядом с Inspector'ом).
 */

import { type Registry, Renderer } from '@capsuletech/web-renderer';
import * as kit from '@capsuletech/web-ui';
import { Flex } from '@capsuletech/web-ui/flex';
import * as kitIcons from '@capsuletech/web-ui/icons';
import { Typography } from '@capsuletech/web-ui/typography';
import { Show } from 'solid-js';
import { CanvasFrame } from '../canvas-frame';
import { useCanvasDark, useCanvasTheme } from '../canvas-style';
import { useSelectedPreset } from '../selection';

const REGISTRY: Registry = {
  ui: {
    ...(kit as unknown as Record<string, unknown>),
    Icons: kitIcons as unknown as Record<string, unknown>,
  },
} as unknown as Registry;

export const WebStudioCanvas = () => {
  const { schema } = useSelectedPreset();
  const canvasTheme = useCanvasTheme();
  const canvasDark = useCanvasDark();

  return (
    <CanvasFrame class="h-full w-full" theme={canvasTheme()} dark={canvasDark()}>
      <Flex
        orientation="vertical"
        justify="center"
        align="center"
        class="h-full w-full overflow-auto p-6"
      >
        <Show
          when={schema()}
          fallback={<Typography tone="muted">Выберите компонент в палитре</Typography>}
          keyed
        >
          {(s) => <Renderer schema={s} registry={REGISTRY} mode="static" />}
        </Show>
      </Flex>
    </CanvasFrame>
  );
};
