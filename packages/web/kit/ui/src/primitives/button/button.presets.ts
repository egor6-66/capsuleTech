/**
 * Button presets — именованные варианты Button-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Один пресет на variant из kit'а (CVA `variant` enum: default / destructive /
 * outline / secondary / ghost / link) + отдельный icon-only пресет.
 *
 * Скопировано 1:1 из `packages/web/studio/src/palette/presets/button.tsx`
 * (phase 2-3 item C — kit canonical home). Studio-файл будет удалён в phase 4.
 */

import type { IPreset } from '../../manifest/types';

/** Вспомогательный helper: строит схему с одной кнопкой + опциональной иконкой. */
const singleButton = (props: Record<string, unknown>, iconChild?: string): IPreset['schema'] => {
  const nodes: IPreset['schema']['components']['nodes'] = {
    btn: {
      id: 'btn',
      type: 'ui.Button',
      parentId: null,
      children: iconChild ? ['icon'] : [],
      props,
    },
  };
  if (iconChild) {
    nodes.icon = {
      id: 'icon',
      type: `ui.Icons.${iconChild}`,
      parentId: 'btn',
      children: [],
    };
  }
  return { components: { root: 'btn', nodes } };
};

const variantPreset = (
  id: string,
  label: string,
  variant: string,
  description?: string,
): IPreset => ({
  id,
  label,
  schema: singleButton({ variant, children: label }),
  description,
});

export const buttonPresets: readonly IPreset[] = [
  variantPreset(
    'default',
    'Default',
    'default',
    'Основное действие экрана/формы. Один Default на блок — иначе теряется иерархия. Примеры: «Сохранить», «Войти», «Создать».',
  ),
  variantPreset(
    'secondary',
    'Secondary',
    'secondary',
    'Поддерживающее действие рядом с Default. Чуть менее заметна, та же логика. Примеры: «Отмена», «Назад» рядом с «Сохранить».',
  ),
  variantPreset(
    'outline',
    'Outline',
    'outline',
    'Нейтральное действие в плотных группах (toolbar, фильтры). Контурная — не вытягивает внимание из контента.',
  ),
  variantPreset(
    'ghost',
    'Ghost',
    'ghost',
    'Фоновое действие — кнопка читается только при hover. Использовать в меню, списках, тулбарах. НЕ для primary-флоу.',
  ),
  variantPreset(
    'destructive',
    'Destructive',
    'destructive',
    'Опасное необратимое действие (удалить, обнулить). Всегда требует подтверждения в диалоге. НЕ ставить рядом с Default без зазора.',
  ),
  variantPreset(
    'link',
    'Link',
    'link',
    'Inline-действие внутри текста или у заголовка карточки. Визуально = ссылка, поведенчески = кнопка. НЕ использовать в формах вместо submit.',
  ),
  {
    id: 'icon',
    label: 'Icon',
    schema: singleButton({ variant: 'ghost', size: 'icon', 'aria-label': 'Action' }, 'Plus'),
    description:
      'Квадратная кнопка только с иконкой — для toolbar/панелей. Требует `aria-label` (озвучивается скринридером). Дети не задаются текстом — иконка приходит из словаря `ui.Icons.*`.',
  },
];
