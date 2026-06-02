/**
 * Seed-дерево «Карточка происшествия» (112 / ЖКХ) — приблизительная сборка
 * макета ИЗ доступных палитре компонентов, не хардкод-компонент.
 *
 * Каждая секция — `Card` (Header→Title + Content→Grid). Поле — `Field`
 * (Label + Content→Input). Селектов/чекбоксов/textarea в ките пока нет →
 * аппроксимированы через `Input` (по согласованию). Грузится как стартовое
 * дерево Canvas в `editor/store`; вернуть пустой старт — одна строка там.
 *
 * Дерево собирается через `addNode` — он валидирует `canAcceptChild` и
 * подмешивает `defaultProps` из манифестов (поэтому здесь только override'ы).
 */
import { addNode, createEmptyTree, type IEditorTree, updateNode } from '@capsuletech/web-ui-creator/state';

/** Литералы (не шаблон) — чтобы Tailwind увидел классы при purge. */
const SPAN: Record<number, string> = { 2: 'col-span-2', 3: 'col-span-3' };

export const buildIncidentCard = (): IEditorTree => {
  let tree = createEmptyTree('ui.Layout.Flex');
  const root = tree.root;
  tree = updateNode(tree, {
    nodeId: root,
    patch: { props: { direction: 'col', gap: 4, class: 'p-4' } },
  });

  const add = (parentId: string, type: string, props?: Record<string, unknown>): string => {
    const r = addNode(tree, { type, parentId, ...(props ? { props } : {}) });
    tree = r.tree;
    return r.nodeId;
  };

  /** Секция = Card с заголовком и Grid-телом; возвращает id Grid'а для полей. */
  const section = (title: string, cols = 3): string => {
    const card = add(root, 'ui.Card', { class: 'w-full' });
    const header = add(card, 'ui.Card.Header');
    add(header, 'ui.Card.Title', { children: title });
    const content = add(card, 'ui.Card.Content');
    return add(content, 'ui.Layout.Grid', { cols, gap: 4 });
  };

  /** Поле = Field(Label + Content→Input). select/checkbox/textarea → Input. */
  const field = (
    grid: string,
    label: string,
    opts: { span?: number; placeholder?: string } = {},
  ): void => {
    const cls = opts.span ? SPAN[opts.span] : undefined;
    const f = add(grid, 'ui.Field', cls ? { class: cls } : undefined);
    add(f, 'ui.Field.Label', { children: label });
    const c = add(f, 'ui.Field.Content');
    add(c, 'ui.Input', opts.placeholder ? { placeholder: opts.placeholder } : undefined);
  };

  const button = (grid: string, label: string, span?: number): void => {
    add(grid, 'ui.Button', { children: label, class: span ? `w-full ${SPAN[span]}` : 'w-full' });
  };

  // ── Информация
  let g = section('Информация');
  field(g, '№ карточки');
  field(g, 'Дата создания');
  field(g, 'Время регистрации');
  field(g, 'Входящий номер', { placeholder: '+7 (___) ___-__-__' });
  field(g, 'Дата изменения');
  field(g, 'Время изменения');
  field(g, 'Создатель');
  field(g, 'Источник');
  field(g, 'Тип вызова');
  field(g, 'Тип происшествия');
  field(g, 'Подключить службу');

  // ── Данные заявителя
  g = section('Данные заявителя');
  field(g, 'Фамилия');
  field(g, 'Имя');
  field(g, 'Отчество');
  field(g, 'Телефон', { placeholder: '+7 (___) ___-__-__' });
  field(g, 'Организация');
  field(g, 'Запись разговора');
  field(g, 'НП');
  field(g, 'Район');
  field(g, 'Улица');
  field(g, 'Дом');
  field(g, 'Квартира');
  button(g, 'Адрес совпадает с происшествием');

  // ── Описание происшествия
  g = section('Описание происшествия');
  field(g, 'Объект');
  field(g, 'Координаты');
  field(g, 'Консультация');
  field(g, 'НП');
  field(g, 'Район');
  field(g, 'Подведомственность');
  field(g, 'Улица');
  field(g, 'Дом');
  field(g, 'Авария ЖКХ');
  field(g, 'Проблема', { span: 2 });
  button(g, 'Адрес совпадает с заявителем');
  field(g, 'Угроза ЧС');
  field(g, 'ЧС');
  field(g, 'Тип ЧС');
  field(g, 'Содержание', { span: 3 });

  // ── Организация
  g = section('Организация');
  field(g, 'Управляющая компания', { span: 2 });
  field(g, 'Ответственная орг.');

  // ── Служебная информация
  g = section('Служебная информация');
  field(g, 'Статус', { placeholder: 'Новое' });
  field(g, 'Дата установки');
  field(g, 'Время установки');
  field(g, 'Отчет о выполнении', { span: 3 });

  return tree;
};
