/**
 * Learn.LessonsWelcome — landing/index-fallback раздела Lessons (зеркало
 * `library/LibraryWelcome`, но для под-сегментов Lessons: concepts / rules).
 *
 * Tier-2 connected: обычный Solid-компонент, рендерится ВНУТРИ родительского
 * HCA-контекста и эмитит `onLessonsNavigate` через `useEmit` — тот же event, что
 * и `Learn.LessonsNav`, чтобы app-Feature ловил оба источника одним хэндлером
 * (паттерн `LibraryWelcome` + `Navigation` на `onLibraryNavigate`).
 *
 * Phantom `__events?: ILessonsWelcomeEvents` → codegen `Learn.LessonsWelcome.Events`.
 */
import { useEmit } from '@capsuletech/web-core';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For } from 'solid-js';
import { LESSONS_SEGMENTS, type LessonsSegmentId } from './segments';

const DEFAULT_TITLE = 'Lessons';
const DEFAULT_DESCRIPTION = 'Выберите раздел уроков.';
const DEFAULT_HINT = 'Концепты и правила приходят из lang-vault (backend/learn).';

export interface ILessonsWelcomeProps {
  title?: string;
  description?: string;
  hint?: string;
}

export interface ILessonsWelcomeEvents {
  /** ID под-раздела Lessons ('concepts' | 'rules'). */
  onLessonsNavigate: LessonsSegmentId;
}

const LessonsWelcomeComponent = (props: ILessonsWelcomeProps) => {
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
        <For each={LESSONS_SEGMENTS}>
          {(seg) => (
            <Card
              role="button"
              tabIndex={0}
              class="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() =>
                emit('onLessonsNavigate', { source: 'Learn.LessonsWelcome', payload: seg.id })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  emit('onLessonsNavigate', { source: 'Learn.LessonsWelcome', payload: seg.id });
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
 * Learn.LessonsWelcome — welcome-панель раздела Lessons с карточками под-разделов.
 *
 * Phantom `__events?: ILessonsWelcomeEvents` нужен codegen-у для генерации
 * `Learn.LessonsWelcome.Events` (namespace-merge). На runtime не используется.
 */
export const LessonsWelcome: ((props: ILessonsWelcomeProps) => any) & {
  readonly __events?: ILessonsWelcomeEvents;
} = LessonsWelcomeComponent;

export default LessonsWelcome;
