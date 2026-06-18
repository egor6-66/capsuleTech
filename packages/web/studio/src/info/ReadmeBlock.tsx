/**
 * ReadmeBlock — пользовательская документация компонента.
 * Рендерит `<DocPage>` из `@capsuletech/web-docs` когда в манифесте
 * задан `docSlug`. DocPage вместо DocSection — render всю доку (title + все секции).
 * Иначе показывает fallback о временном отсутствии.
 */

import { DocPage } from '@capsuletech/web-docs';
import { Show } from 'solid-js';
import type { IReadmeBlockProps } from './types';

export const ReadmeBlock = (props: IReadmeBlockProps) => (
  <Show
    when={props.manifest?.docSlug}
    fallback={
      <div class="px-2 py-1 text-xs text-muted-foreground">
        Документация для <code>{props.type}</code> пока не подключена.
      </div>
    }
  >
    {(slug) => (
      <DocPage
        slug={slug()}
        loading={<div class="px-2 py-1 text-xs text-muted-foreground">Загрузка…</div>}
        fallback={
          <div class="px-2 py-1 text-xs text-muted-foreground">
            Документ <code>{slug()}</code> не найден.
          </div>
        }
      />
    )}
  </Show>
);
