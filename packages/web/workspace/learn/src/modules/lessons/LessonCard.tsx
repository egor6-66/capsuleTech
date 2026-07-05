/**
 * LessonCard — один item-шаблон списка уроков (internal building-block `List`,
 * отдельно НЕ регистрируется). Сущностный `Ui.Card` (пресет-сущность,
 * component-model canon): только данные по слотам — title, уровень в badge,
 * теги. Ноль ручной вёрстки/бейджей. Роль/клавиатура вшиты в Card
 * (interactive + onClick → role=button + Enter/Space). Извлечён под batch-режим
 * `Ui.List` (`item.use`).
 *
 * `#`-префикс тегов — контент потребителя (не забота Card/Badge).
 */
import { Card } from '@capsuletech/web-ui/card';
import type { ILessonSummary } from './types';

export interface ILessonCardProps {
  lesson: ILessonSummary;
  selected: boolean;
  onSelect: (id: string) => void;
}

export const LessonCard = (props: ILessonCardProps) => (
  <Card
    interactive
    selected={props.selected}
    onClick={() => props.onSelect(props.lesson.id)}
    title={props.lesson.title}
    badge={props.lesson.level}
    tags={props.lesson.tags.map((t) => `#${t}`)}
  />
);

export default LessonCard;
