/**
 * ReadmeBlock — пользовательская документация компонента. Placeholder
 * до подключения markdown'а от owner-web-ui через
 * `@capsuletech/web-docs`.
 */

import type { IReadmeBlockProps } from './types';

export const ReadmeBlock = (props: IReadmeBlockProps) => (
  <div class="px-2 py-1 text-xs text-muted-foreground">
    Документация для <code>{props.type}</code> готовится owner-web-ui.
    Подключим markdown через <code>@capsuletech/web-docs</code> когда
    появится файл.
  </div>
);
