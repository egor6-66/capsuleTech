import { createEffect, createSignal } from 'solid-js';
import { applyTheme } from './apply';
import { Panel } from './panel/Panel';
import { DEFAULT_THEME } from './presets';
import { Preview } from './preview/Preview';
import type { ITheme } from './types';

interface IProps {
  /** Стартовая тема. По умолчанию dark + Blue + radius 0.5rem. */
  initialTheme?: ITheme;
  /** Колбэк при каждом изменении (для persist, analytics). */
  onChange?: (theme: ITheme) => void;
}

/**
 * Главная композиция редактора: левая колонка-Panel + правая Preview.
 * Тема живёт здесь как signal; каждое изменение applyTheme'ится на
 * preview-элемент (scoped — не трогает host-app).
 *
 * Layout: 380px фиксированный левый стол, оставшееся под preview.
 * Min-height 100vh, чтобы scroll preview/panel был внутри editor'а.
 */
export const ThemeEditor = (props: IProps) => {
  const [theme, setTheme] = createSignal<ITheme>(props.initialTheme ?? DEFAULT_THEME);

  let previewRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (previewRef) applyTheme(previewRef, theme());
    props.onChange?.(theme());
  });

  const onPatch = (patch: Partial<ITheme>) => {
    setTheme((t) => ({ ...t, ...patch }));
  };

  return (
    <div class="grid grid-cols-[380px_1fr] h-screen overflow-hidden bg-background text-foreground">
      <aside class="border-r border-border bg-card/30 overflow-hidden">
        <Panel theme={theme()} onChange={onPatch} />
      </aside>
      <main ref={previewRef} class="overflow-hidden">
        <Preview />
      </main>
    </div>
  );
};
