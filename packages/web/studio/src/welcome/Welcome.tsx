/**
 * Welcome — tier-2 connected блок welcome/index-fallback студии.
 *
 * Рендерится через контроллер `WebStudioWelcome` в `<Ui.Outlet/>` layout'а
 * студии, когда пользователь находится на голом `/workspace/web-studio` без
 * дочернего матча.
 *
 * Tier-2 connected: обычный Solid-компонент (НЕ Controller-обёртка),
 * который рендерится ВНУТРИ родительского HCA-контекста и эмитит `onNavigate`
 * через `useEmit` — идентичный event-name + payload-shape что и Navigation,
 * чтобы app-Feature мог ловить оба источника одним хэндлером.
 *
 * Карточки сегментов — из `../navigation/segments` (shared knowledge студии).
 * Декоративные тексты (title/description/hint) параметризуемы через props.
 *
 * Phantom `__events?: IWelcomeEvents` → codegen генерирует
 * `namespace WebStudio.Welcome { type Events = ... }`.
 */

import { useEmit } from '@capsuletech/web-core';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For } from 'solid-js';
import { SEGMENTS, type SegmentId } from '../navigation/segments';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_HINT,
  DEFAULT_TITLE,
  type IWelcomeProps,
} from './types';

export interface IWelcomeEvents {
  /** ID сегмента карточки, по которой кликнули (`'store' | 'creator'`). */
  onNavigate: SegmentId;
}

const WelcomeComponent = (props: IWelcomeProps) => {
  const emit = useEmit();

  const title = () => props.title ?? DEFAULT_TITLE;
  const description = () => props.description ?? DEFAULT_DESCRIPTION;
  const hint = () => props.hint ?? DEFAULT_HINT;

  return (
    <Layout.Flex
      orientation="vertical"
      align="center"
      justify="center"
      gapY={8}
      h="full"
      class="p-12"
    >
      <Layout.Flex orientation="vertical" gapY={4} align="center" maxW={160}>
        <Typography variant="h1" size="4xl" align="center">
          {title()}
        </Typography>
        <Typography tone="muted" size="lg" align="center">
          {description()}
        </Typography>
      </Layout.Flex>

      <Layout.Flex orientation="horizontal" gapX={4} justify="center" maxW={200}>
        <For each={SEGMENTS}>
          {(seg) => (
            <Card
              role="button"
              tabIndex={0}
              class="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() =>
                emit('onNavigate', { source: 'WebStudio.Welcome', payload: seg.id })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  emit('onNavigate', { source: 'WebStudio.Welcome', payload: seg.id });
                }
              }}
            >
              <Card.Header>
                <Card.Title>{seg.label}</Card.Title>
                <Card.Description>{seg.description}</Card.Description>
              </Card.Header>
            </Card>
          )}
        </For>
      </Layout.Flex>

      <Typography tone="muted" size="sm">
        {hint()}
      </Typography>
    </Layout.Flex>
  );
};

/**
 * WebStudio.Welcome — welcome-панель студии с кликабельными карточками разделов.
 *
 * Phantom `__events?: IWelcomeEvents` нужен codegen-у для генерации
 * `WebStudio.Welcome.Events` (namespace-merge). На runtime не используется.
 */
export const Welcome: ((props: IWelcomeProps) => any) & {
  readonly __events?: IWelcomeEvents;
} = WelcomeComponent;
