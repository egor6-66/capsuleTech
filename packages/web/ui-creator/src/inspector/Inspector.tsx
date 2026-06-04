import { For } from 'solid-js';
import { DEFAULT_KIT } from './kit';
import { Category } from './Category';
import type { IInspectorProps } from './types';

/**
 * Универсальный редактор пропсов. Принимает список категорий (например
 * «Основное» / «Расширенное»), у каждой — набор типизированных полей.
 *
 * Inspector сам по себе ничего не «знает» о компонентах редактора —
 * это чистая render-функция от описаний полей и текущих значений.
 * Маппинг манифеста компонента → категорий выполняется в host'е.
 *
 * `kit` — UI-кит для рендера полей (по умолчанию @capsuletech/web-ui).
 * Передай собственный объект для кастомизации или мока в тестах.
 */
export const Inspector = (props: IInspectorProps) => {
  const kit = () => props.kit ?? DEFAULT_KIT;

  return (
    <div class={`flex flex-col gap-3 w-full ${props.class ?? ''}`}>
      <For each={props.categories}>
        {(cat) => (
          <Category
            category={cat}
            values={props.values}
            onChange={props.onChange}
            kit={kit()}
          />
        )}
      </For>
    </div>
  );
};
