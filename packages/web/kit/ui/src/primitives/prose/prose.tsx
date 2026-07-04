import { createStyle } from '@capsuletech/web-style';
import { mergeProps, Show, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useTrace } from '../../internal/useTrace';
import type { IProseProps } from './interfaces';
import { proseCva } from './variants';

/**
 * Prose — контейнер типографики для rendered-markdown (заголовки, списки, таблицы,
 * код, цитаты) на design-tokens. Стилизует вложенный html/children через
 * descendant-селекторы CVA — потребитель пишет `<Prose innerHTML={html}/>` или
 * `<Prose>{jsx}</Prose>` и ничего больше; тёмная тема — автоматически через токены.
 *
 * Закрывает гэп: `renderMarkdown` (web-docs) отдаёт голый HTML, а Tailwind preflight
 * сбрасывает браузерные стили — без Prose проза/грамматические таблицы выглядят кашей.
 */
export const Prose = (props: IProseProps) => {
  useTrace('web-ui.prose'); // ADR 062

  const merged = mergeProps({ size: 'md' as const, as: 'div' as const }, props);

  const [local, variantProps, others] = splitProps(
    merged,
    ['class', 'style', 'as', 'innerHTML', 'children'],
    ['size'],
  );

  const styleProps = mergeProps(variantProps, {
    get class() {
      return local.class;
    },
    get style() {
      return local.style;
    },
  });
  const { className, style } = createStyle(proseCva, styleProps);

  // innerHTML и children взаимоисключимы — разводим на две ветки, чтобы на
  // элемент никогда не попали одновременно innerHTML-присваивание и insert
  // детей (порядок между ними в Solid-runtime не гарантирован).
  return (
    <Show
      when={local.innerHTML != null}
      fallback={
        <Dynamic component={local.as} class={className()} style={style()} {...others}>
          {local.children}
        </Dynamic>
      }
    >
      <Dynamic
        component={local.as}
        class={className()}
        style={style()}
        innerHTML={local.innerHTML}
        {...others}
      />
    </Show>
  );
};
