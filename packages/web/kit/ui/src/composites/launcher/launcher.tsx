import { For, Show } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import { Card } from '../../primitives/card';
import { Flex } from '../../primitives/layout/flex';
import { Typography } from '../../primitives/typography';
import type { ILauncherProps } from './interfaces';
import { resolveLauncherPreset } from './launcher.presets';

/**
 * Launcher — stateless hero + грид кликабельных карточек-разделов.
 *
 * Визуал вынесен из learn-копии `welcome/Welcome.tsx`: центрированный `Flex`
 * (hero: Typography h1 + muted) + ряд кликабельных `Card` (role=button, tabIndex,
 * onClick/onKeyDown Enter/Space → `onSelect`) + hint. Клик-хендлинг клавиатуры —
 * внутри компонента. Кликабельная поверхность карточки берётся из канон-пропа
 * `Card interactive` (cursor + hover-surface) — ноль сырых hover-классов наружу.
 *
 * Ничего не знает про роутер/emit: `onSelect(id)` уходит наружу, connected-обвязку
 * держит shell-слой (`@capsuletech/web-shell`).
 *
 * @example
 * ```tsx
 * <Launcher items={sections} title="Обучение" onSelect={goToSection} />
 * ```
 */
export function Launcher(props: ILauncherProps) {
  useTrace('web-ui.launcher'); // ADR 062
  const preset = () => resolveLauncherPreset(props.preset);
  const select = (id: string) => props.onSelect(id);

  return (
    <Flex
      orientation="vertical"
      align="center"
      justify="center"
      gapY={preset().outerGap}
      h="full"
      p={preset().padding}
      class={props.class}
      style={props.style}
    >
      <Show when={props.title || props.description}>
        <Flex
          orientation="vertical"
          gapY={preset().heroGap}
          align="center"
          maxW={preset().heroMaxW}
        >
          <Show when={props.title}>
            <Typography variant="h1" size={preset().titleSize} align="center">
              {props.title}
            </Typography>
          </Show>
          <Show when={props.description}>
            <Typography tone="muted" size={preset().descriptionSize} align="center">
              {props.description}
            </Typography>
          </Show>
        </Flex>
      </Show>

      <Flex
        orientation="horizontal"
        gapX={preset().gridGap}
        justify="center"
        maxW={preset().gridMaxW}
      >
        <For each={props.items}>
          {(item) => (
            <Card
              interactive
              role="button"
              tabIndex={0}
              // focus-ring для клавиатурной навигации — внутренний класс (легитимен в kit'е).
              class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => select(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  select(item.id);
                }
              }}
            >
              <Card.Header>
                <Card.Title>{item.label}</Card.Title>
                <Show when={item.description}>
                  <Card.Description>{item.description}</Card.Description>
                </Show>
              </Card.Header>
            </Card>
          )}
        </For>
      </Flex>

      <Show when={props.hint}>
        <Typography tone="muted" size={preset().hintSize}>
          {props.hint}
        </Typography>
      </Show>
    </Flex>
  );
}
