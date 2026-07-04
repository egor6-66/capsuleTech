/**
 * PlaceholderShell — общий презентационный каркас плейсхолдеров.
 *
 * Dumb-компонент (никакой логики / emit / состояния) — только раскладка:
 * иконка в мягком круге → eyebrow → заголовок → описание → кнопки-действия.
 * Вся «умность» (useEmitOptional, событие клика) живёт в блоках, которые
 * композируют этот каркас. Так презентация переиспользуется всеми 5 блоками
 * и остаётся единственным местом визуальных решений (canon «presentation in
 * component»).
 *
 * Iter 1 — на kit-примитивах. Фаза 2 (renderer-конвергенция) заменит тело на
 * `<Renderer schema … />`, но публичный контракт блоков (props + события) не
 * изменится.
 */

import { Button } from '@capsuletech/web-ui/button';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import type { JSX } from 'solid-js';
import { Show } from 'solid-js';

/** Кнопка-действие внутри плейсхолдера. */
export interface IPlaceholderAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
}

export interface IPlaceholderShellProps {
  /** Готовый JSX иконки (обычно lucide-иконка). Рендерится в мягком круге. */
  icon?: JSX.Element;
  /** Маленькая надпись над заголовком (напр. «404» / «Ошибка»). */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Основное действие (primary-кнопка). */
  action?: IPlaceholderAction;
  /** Вторичное действие (по умолчанию outline). */
  secondaryAction?: IPlaceholderAction;
  /**
   * Компактный вариант — для встраивания вместо упавшего виджета
   * (`Placeholders.WidgetUnavailable`). Меньше отступы, меньше типографика.
   */
  compact?: boolean;
}

const PlaceholderShell = (props: IPlaceholderShellProps): JSX.Element => {
  return (
    <Layout.Flex
      orientation="vertical"
      align="center"
      justify="center"
      gapY={props.compact ? 3 : 6}
      w="full"
      class={props.compact ? 'p-6 text-center' : 'min-h-full p-12 text-center'}
    >
      <Show when={props.icon}>
        <div
          class={`flex items-center justify-center rounded-full bg-muted text-muted-foreground ${
            props.compact ? 'size-11' : 'size-16'
          }`}
        >
          {props.icon}
        </div>
      </Show>

      <Layout.Flex orientation="vertical" gapY={2} align="center" maxW={props.compact ? 80 : 120}>
        <Show when={props.eyebrow}>
          <Typography
            variant="muted"
            size="sm"
            align="center"
            class="font-medium uppercase tracking-widest"
          >
            {props.eyebrow}
          </Typography>
        </Show>

        <Typography
          variant={props.compact ? 'h2' : 'h1'}
          size={props.compact ? 'lg' : '3xl'}
          align="center"
        >
          {props.title}
        </Typography>

        <Show when={props.description}>
          <Typography tone="muted" size={props.compact ? 'sm' : 'base'} align="center">
            {props.description}
          </Typography>
        </Show>
      </Layout.Flex>

      <Show when={props.action || props.secondaryAction}>
        <Layout.Flex orientation="horizontal" gapX={3} justify="center" class="flex-wrap">
          <Show when={props.action}>
            {(action) => (
              <Button
                variant={action().variant ?? 'default'}
                size={props.compact ? 'sm' : 'default'}
                onClick={() => action().onClick()}
              >
                {action().label}
              </Button>
            )}
          </Show>
          <Show when={props.secondaryAction}>
            {(action) => (
              <Button
                variant={action().variant ?? 'outline'}
                size={props.compact ? 'sm' : 'default'}
                onClick={() => action().onClick()}
              >
                {action().label}
              </Button>
            )}
          </Show>
        </Layout.Flex>
      </Show>
    </Layout.Flex>
  );
};

export default PlaceholderShell;
