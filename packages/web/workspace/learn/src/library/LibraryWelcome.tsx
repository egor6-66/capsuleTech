/**
 * Learn.LibraryWelcome — landing/index-fallback раздела library (зеркало Learn.Welcome,
 * но для под-сегментов library: explorer / collections).
 *
 * Tier-2 connected: обычный Solid-компонент, рендерится ВНУТРИ родительского
 * HCA-контекста и эмитит `onLibraryNavigate` через `useEmit` — тот же event, что
 * и `Learn.LibraryNav`, чтобы app-Feature ловил оба источника одним хэндлером
 * (паттерн studio Welcome + Navigation на `onNavigate`).
 *
 * Phantom `__events?: ILibraryWelcomeEvents` → codegen `Learn.LibraryWelcome.Events`.
 */
import { useEmit } from '@capsuletech/web-core';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For } from 'solid-js';
import { LIBRARY_SEGMENTS, type LibrarySegmentId } from './segments';

const DEFAULT_TITLE = 'Library';
const DEFAULT_DESCRIPTION = 'Выберите раздел библиотеки.';
const DEFAULT_HINT = 'Словарь и закладки придут с backend/learn (ADR 055).';

export interface ILibraryWelcomeProps {
  title?: string;
  description?: string;
  hint?: string;
}

export interface ILibraryWelcomeEvents {
  /** ID под-раздела library ('explorer' | 'collections'). */
  onLibraryNavigate: LibrarySegmentId;
}

const LibraryWelcomeComponent = (props: ILibraryWelcomeProps) => {
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
        <For each={LIBRARY_SEGMENTS}>
          {(seg) => (
            <Card
              role="button"
              tabIndex={0}
              class="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() =>
                emit('onLibraryNavigate', { source: 'Learn.LibraryWelcome', payload: seg.id })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  emit('onLibraryNavigate', { source: 'Learn.LibraryWelcome', payload: seg.id });
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
 * Learn.LibraryWelcome — welcome-панель раздела library с карточками под-разделов.
 *
 * Phantom `__events?: ILibraryWelcomeEvents` нужен codegen-у для генерации
 * `Learn.LibraryWelcome.Events` (namespace-merge). На runtime не используется.
 */
export const LibraryWelcome: ((props: ILibraryWelcomeProps) => any) & {
  readonly __events?: ILibraryWelcomeEvents;
} = LibraryWelcomeComponent;
