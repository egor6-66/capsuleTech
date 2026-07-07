/**
 * ReadmeBlock — пользовательская документация компонента.
 * Рендерит `<DocPage>` из `@capsuletech/web-docs` когда в манифесте
 * задан `docSlug`. DocPage вместо DocSection — render всю доку (title + все секции).
 * Иначе показывает fallback о временном отсутствии.
 *
 * Весь визуал fallback'ов — props-only из web-ui (Flex/Typography).
 */

import { DocPage } from '@capsuletech/web-docs';
import { Flex } from '@capsuletech/web-ui/flex';
import { Typography } from '@capsuletech/web-ui/typography';
import { Show } from 'solid-js';
import type { IReadmeBlockProps } from './types';

const Note = (props: { children: import('solid-js').JSX.Element }) => (
  <Flex px={2} py={1}>
    <Typography size="xs" tone="muted">
      {props.children}
    </Typography>
  </Flex>
);

export const ReadmeBlock = (props: IReadmeBlockProps) => (
  <Show
    when={props.manifest?.docSlug}
    fallback={
      <Note>
        Документация для <code>{props.type}</code> пока не подключена.
      </Note>
    }
  >
    {(slug) => (
      <DocPage
        slug={slug()}
        loading={<Note>Загрузка…</Note>}
        fallback={
          <Note>
            Документ <code>{slug()}</code> не найден.
          </Note>
        }
      />
    )}
  </Show>
);
