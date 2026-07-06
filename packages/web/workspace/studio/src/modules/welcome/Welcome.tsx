/**
 * Welcome — tier-2 connected блок welcome/index-fallback студии.
 *
 * Регистрируется напрямую как `WebStudio.Welcome` и рендерится в `<Ui.Outlet/>`
 * layout'а студии, когда пользователь находится на голом `/workspace/web-studio`
 * без дочернего матча.
 *
 * Tier-2 connected: обычный Solid-компонент (НЕ Controller-обёртка), рендерится
 * ВНУТРИ родительского HCA-контекста и эмитит generic `onSegmentNavigate
 * { nav: 'web-studio', segment }` через `useEmitOptional` — идентичный контракт
 * с `MainNav` (app-Feature различает источник по `payload.nav`).
 *
 * Карточки сегментов — из `../../shared/segments` (атом; читают nav + welcome).
 * Декоративные тексты (title/description/hint) параметризуемы через props.
 *
 * Своих `__events` НЕТ — контракт события из `Shell.SegmentNav.Events`;
 * агрегировать в `WebStudio.Welcome.Events` нечего (плоский ключ, только рендер).
 */

import { useEmitOptional } from '@capsuletech/web-core';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For } from 'solid-js';
import { SEGMENTS } from '../../shared/segments';
import { DEFAULT_DESCRIPTION, DEFAULT_HINT, DEFAULT_TITLE, type IWelcomeProps } from './types';

const WelcomeComponent = (props: IWelcomeProps) => {
  const emit = useEmitOptional();

  const title = () => props.title ?? DEFAULT_TITLE;
  const description = () => props.description ?? DEFAULT_DESCRIPTION;
  const hint = () => props.hint ?? DEFAULT_HINT;

  return (
    <Layout.Flex orientation="vertical" align="center" justify="center" gapY={8} h="full" p={12}>
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
              interactive
              onClick={() =>
                emit('onSegmentNavigate', {
                  source: 'WebStudio.Welcome',
                  payload: { nav: 'web-studio', segment: seg.id },
                })
              }
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

/** WebStudio.Welcome — welcome-панель студии с кликабельными карточками разделов. */
export const Welcome = WelcomeComponent;

export default Welcome;
