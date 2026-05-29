/**
 * Дефолтная схема карточки происшествия для `@capsuletech/web-renderer`.
 *
 * Это ДАННЫЕ (ISchema), а не JSX — именно поэтому форму можно будет позже
 * редактировать через `@capsuletech/web-ui-creator` (addNode/moveNode работают
 * над деревом IEditorNode, манифесты описывают каждый `ui.*` тип).
 *
 * Рендерится в `pages/workspace/cards/[id]` через `<Renderer schema registry
 * mode="static" />`. Registry собирается в самой Page из проксированного `Ui`
 * (`{ ui: Ui }`), поэтому здесь — только типы компонентов (dot-path'ы).
 *
 * ⚠️ Заглушки (нет соответствующих примитивов в @capsuletech/web-ui):
 *   - `select`   → `ui.Input` (readonly, placeholder «— выберите —»)
 *   - `textarea` → `ui.Input` (single-line, увеличенная высота)
 *   - `checkbox` → `ui.Toggle` (switch)
 *   - `audio`    → `ui.Typography` (текстовый placeholder плеера)
 * Иконки (звонок/карта/скачать) и маски ввода (+7) тоже отсутствуют — опущены.
 */
import type { IEditorNode, ISchema, NodeId } from '@capsuletech/web-renderer';

type Ctrl =
  | 'text'
  | 'tel'
  | 'date'
  | 'time'
  | 'select'
  | 'checkbox'
  | 'textarea'
  | 'audio'
  | 'button';

interface IFieldSpec {
  /** Подпись поля. Для `button` — текст кнопки. */
  label?: string;
  ctrl: Ctrl;
  /** Мок-значение (пока baked-in; позже придёт из Feature). */
  value?: string;
  /** Растянуть на всю ширину строки сетки. */
  full?: boolean;
}

interface ISectionSpec {
  title: string;
  /** Колонок в сетке секции (default 3). */
  cols?: number;
  fields: IFieldSpec[];
}

/** `grid-column: 1 / -1` — полноширинная ячейка в сетке секции. */
const FULL_SPAN: Record<string, string> = { 'grid-column': '1 / -1' };

const buildSchema = (sections: ISectionSpec[]): ISchema => {
  const nodes: Record<NodeId, IEditorNode> = {};
  let seq = 0;
  const nid = (prefix: string): NodeId => `${prefix}-${seq++}`;

  /** Создаёт ноду и линкует её к родителю (порядок = порядок вызова). */
  const add = (
    type: string,
    parentId: NodeId | null,
    props?: Record<string, unknown>,
  ): NodeId => {
    const id = nid(type.split('.').pop() ?? 'n');
    nodes[id] = { id, type, parentId, children: [], props };
    if (parentId) nodes[parentId].children.push(id);
    return id;
  };

  const makeControl = (f: IFieldSpec, parentId: NodeId): NodeId => {
    switch (f.ctrl) {
      case 'tel':
        return add('ui.Input', parentId, {
          type: 'tel',
          value: f.value,
          placeholder: '+7 (___) ___-__-__',
        });
      case 'date':
        return add('ui.Input', parentId, { type: 'date', value: f.value });
      case 'time':
        return add('ui.Input', parentId, { type: 'time', value: f.value });
      case 'select':
        // ЗАГЛУШКА: нет Select → readonly Input с hint.
        return add('ui.Input', parentId, {
          type: 'text',
          value: f.value,
          placeholder: '— выберите —',
          readonly: true,
          class: 'cursor-pointer',
        });
      case 'textarea':
        // ЗАГЛУШКА: нет Textarea → высокий single-line Input.
        return add('ui.Input', parentId, {
          type: 'text',
          value: f.value,
          placeholder: 'Введите текст…',
          class: 'h-20',
        });
      case 'audio':
        // ЗАГЛУШКА: нет Audio-плеера.
        return add('ui.Typography', parentId, {
          variant: 'muted',
          class: 'text-sm',
          children: '▶ 00:00 / 06:12   ⬇',
        });
      default:
        return add('ui.Input', parentId, { type: 'text', value: f.value });
    }
  };

  const makeField = (f: IFieldSpec, parentId: NodeId): void => {
    // button — самостоятельная кнопка, без подписи.
    if (f.ctrl === 'button') {
      add('ui.Button', parentId, {
        variant: 'outline',
        size: 'sm',
        children: f.label ?? '',
        ...(f.full ? { style: FULL_SPAN } : {}),
      });
      return;
    }

    // checkbox — горизонтальный Field: [Toggle, Label].
    if (f.ctrl === 'checkbox') {
      const field = add('ui.Field', parentId, {
        class: 'flex-row items-center gap-2',
        ...(f.full ? { style: FULL_SPAN } : {}),
      });
      add('ui.Toggle', field);
      add('ui.Field.Label', field, { children: f.label ?? '' });
      return;
    }

    // обычное поле — Field: [Label, Content > control].
    const field = add('ui.Field', parentId, f.full ? { style: FULL_SPAN } : undefined);
    add('ui.Field.Label', field, { children: f.label ?? '' });
    const content = add('ui.Field.Content', field);
    makeControl(f, content);
  };

  // root — вертикальный стек секций (Grid без cols → одна колонка).
  const root = add('ui.Layout.Grid', null, { gap: 8, class: 'p-1' });

  for (const section of sections) {
    const sec = add('ui.Layout.Grid', root, { gap: 3 });
    add('ui.Typography', sec, {
      variant: 'p',
      class: 'text-sm font-semibold uppercase tracking-wide text-foreground/80',
      children: section.title,
    });
    add('ui.Separator', sec);
    const grid = add('ui.Layout.Grid', sec, { cols: section.cols ?? 3, gap: 4 });
    for (const f of section.fields) makeField(f, grid);
  }

  return { components: { root, nodes } };
};

/**
 * Поля и расположение — приближённо по эталонному скрину (5 секций).
 * Значения — мок (один incident); пустые поля остаются пустыми.
 */
const SECTIONS: ISectionSpec[] = [
  {
    title: 'Информация',
    fields: [
      { label: '№ карточки', ctrl: 'text', value: 'incident-0001' },
      { label: 'Дата создания', ctrl: 'date', value: '2026-05-29' },
      { label: 'Время регистрации', ctrl: 'time', value: '14:30' },
      { label: 'Входящий номер', ctrl: 'tel', value: '+7 (912) 345-67-89' },
      { label: 'Дата изменения', ctrl: 'date' },
      { label: 'Время изменения', ctrl: 'time' },
      { label: 'Создатель', ctrl: 'text', value: 'Диспетчер' },
      { label: 'Источник', ctrl: 'select' },
      { label: 'Тип вызова', ctrl: 'select' },
      { label: 'Тип происшествия', ctrl: 'select' },
      { label: 'Подключить службу', ctrl: 'select' },
    ],
  },
  {
    title: 'Данные заявителя',
    fields: [
      { label: 'Фамилия', ctrl: 'text', value: 'Иванов' },
      { label: 'Имя', ctrl: 'text', value: 'Алексей' },
      { label: 'Отчество', ctrl: 'text' },
      { label: 'Телефон', ctrl: 'tel', value: '+7 (912) 345-67-89' },
      { label: 'Организация', ctrl: 'text' },
      { label: 'Запись разговора', ctrl: 'audio' },
      { label: 'НП', ctrl: 'select' },
      { label: 'Район', ctrl: 'select' },
      { label: 'Улица', ctrl: 'select' },
      { label: 'Дом', ctrl: 'select' },
      { label: 'Квартира', ctrl: 'text' },
      { label: 'Адрес совпадает с происшествием', ctrl: 'button' },
    ],
  },
  {
    title: 'Описание происшествия',
    fields: [
      { label: 'Объект', ctrl: 'select' },
      { label: 'Координаты', ctrl: 'text', value: '59.93860, 30.31413' },
      { label: 'Консультация', ctrl: 'checkbox' },
      { label: 'НП', ctrl: 'select' },
      { label: 'Район', ctrl: 'select' },
      { label: 'Подведомственность', ctrl: 'checkbox' },
      { label: 'Улица', ctrl: 'select' },
      { label: 'Дом', ctrl: 'select' },
      { label: 'Авария ЖКХ', ctrl: 'checkbox' },
      { label: 'Проблема', ctrl: 'select' },
      { label: 'Квартира', ctrl: 'text' },
      { label: 'Адрес совпадает с заявителем', ctrl: 'button' },
      { label: 'Угроза ЧС', ctrl: 'checkbox' },
      { label: 'ЧС', ctrl: 'checkbox' },
      { label: 'Тип ЧС', ctrl: 'select' },
      { label: 'Содержание', ctrl: 'textarea', value: 'ДТП на перекрёстке, есть пострадавшие', full: true },
    ],
  },
  {
    title: 'Организация',
    fields: [
      { label: 'Управляющая компания', ctrl: 'select' },
      { label: 'Ответственная орг.', ctrl: 'text' },
    ],
  },
  {
    title: 'Служебная информация',
    fields: [
      { label: 'Статус', ctrl: 'select', value: 'Новое' },
      { label: 'Дата установки', ctrl: 'date' },
      { label: 'Время установки', ctrl: 'time' },
      { label: 'Отчёт о выполнении', ctrl: 'textarea', full: true },
    ],
  },
];

export const incidentCardSchema: ISchema = buildSchema(SECTIONS);
