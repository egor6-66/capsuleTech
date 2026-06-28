/**
 * Learn.Welcome — landing/index-fallback обучающего app'а (зеркало WebStudio.Welcome).
 *
 * Tier-2 connected: обычный Solid-компонент (НЕ Controller-обёртка), рендерится
 * ВНУТРИ родительского HCA-контекста (root-Feature app'а) и эмитит `onNavigate`
 * через `useEmit` — идентичный паттерн studio. App-Feature ловит onNavigate.
 *
 * Phantom `__events?: IWelcomeEvents` → codegen `Learn.Welcome.Events`.
 */
import { useEmit } from '@capsuletech/web-core';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For } from 'solid-js';
import { LEARN_SEGMENTS, type LearnSegmentId } from './segments';
import { DEFAULT_DESCRIPTION, DEFAULT_HINT, DEFAULT_TITLE, type IWelcomeProps } from './types';

export interface IWelcomeEvents {
  /** ID сегмента карточки ('lessons' | 'exercises' | 'progress' | 'library'). */
  onNavigate: LearnSegmentId;
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
        <For each={LEARN_SEGMENTS}>
          {(seg) => (
            <Card
              role="button"
              tabIndex={0}
              class="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => emit('onNavigate', { source: 'Learn.Welcome', payload: seg.id })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  emit('onNavigate', { source: 'Learn.Welcome', payload: seg.id });
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
 * Learn.Welcome — welcome-панель обучающего app'а с кликабельными карточками разделов.
 *
 * Phantom `__events?: IWelcomeEvents` нужен codegen-у для генерации
 * `Learn.Welcome.Events` (namespace-merge). На runtime не используется.
 */
export const Welcome: ((props: IWelcomeProps) => any) & {
  readonly __events?: IWelcomeEvents;
} = WelcomeComponent;
