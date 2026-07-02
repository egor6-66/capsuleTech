/**
 * StylesPanel — connected-модуль студии для переключения темы **канваса**
 * (remote `universal-canvas`) независимо от темы хрома самой студии.
 *
 * Структура (как `inspector/Inspector.tsx`): один сворачиваемый `Accordion`-item
 * «Тема канваса», **свёрнут по старту** (без `defaultValue` — решение USER); внутри
 * dark-тоггл + reset + список тем. Пишет в общий singleton `useCanvasTheme()` —
 * `Canvas.tsx` форвардит override пропами `<Remote theme={…} dark={…} />`;
 * провод web-remote сам шлёт `__capsule_theme__` в iframe.
 *
 * **Отражение реального состояния канваса (no-inversion).** Override может быть
 * `undefined` (= наследовать host). Чтобы панель не «врала» (тоггл в положении
 * light при тёмном host'е), активные тема/режим считаются как `override ?? host`:
 * `useTheme()` / `useDarkMode()` из `@capsuletech/web-style` дают host-стейт.
 *
 * Список тем — `DISCOVERED_THEMES` host'ового `@capsuletech/web-style` (quirk:
 * если canvas-app бандлит другой набор тем — список может разойтись, см.
 * OWNERSHIP). Контракт-идея (active-checkmark, state-injection) взята из shell
 * `ThemePicker`, но UI — собственная панель (dropdown не импортируем).
 *
 * Chrome — `@capsuletech/web-ui` напрямую (правило двух китов: это chrome
 * редактора, не контент-рендер → `useWebStudioKit()` не нужен).
 *
 * Регистрируется как `WebStudio.Styles` через `../capsule` (ADR 033).
 */

import { DISCOVERED_THEMES, useDarkMode, useTheme } from '@capsuletech/web-style';
import { Accordion } from '@capsuletech/web-ui/accordion';
import { Button } from '@capsuletech/web-ui/button';
import { Flex } from '@capsuletech/web-ui/flex';
import { Toggle } from '@capsuletech/web-ui/toggle';
import { For, Show } from 'solid-js';
import { useCanvasTheme } from './canvas-theme';

export const StylesPanel = () => {
  const ct = useCanvasTheme();
  const hostTheme = useTheme();
  const hostDark = useDarkMode();

  // Реально активные значения канваса: override, либо унаследованный host.
  const activeTheme = () => ct.theme() ?? hostTheme();
  const activeDark = () => ct.dark() ?? hostDark();

  return (
    <Accordion bordered multiple class="w-full">
      <Accordion.Item value="theme">
        <Accordion.Trigger data-testid="canvas-theme-trigger">Тема канваса</Accordion.Trigger>
        <Accordion.Content>
          <Flex direction="col" gap={2} class="px-1 pt-1">
            <Toggle
              checked={activeDark()}
              label="Тёмный режим"
              onChange={(value) => ct.setDark(value)}
            />
            <Button
              variant="outline"
              size="sm"
              fullWidth
              data-testid="canvas-theme-reset"
              onClick={() => ct.reset()}
            >
              Наследовать тему хоста
            </Button>
          </Flex>
          <Flex direction="col" gap={1} w={'full'} class="px-1 py-2">
            <For each={DISCOVERED_THEMES}>
              {(name) => (
                <Button
                  variant={activeTheme() === name ? 'secondary' : 'ghost'}
                  size="sm"
                  fullWidth
                  class="justify-start"
                  data-testid={`canvas-theme-${name}`}
                  onClick={() => ct.setTheme(name)}
                >
                  <span class="inline-block w-4 text-primary" aria-hidden="true">
                    <Show when={activeTheme() === name}>&#x2713;</Show>
                  </span>
                  <span>{name}</span>
                </Button>
              )}
            </For>
          </Flex>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
};

export default StylesPanel;
