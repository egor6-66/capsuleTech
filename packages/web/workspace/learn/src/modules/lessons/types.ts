/**
 * lessons/types — контракты урока (ADR 067 / ADR 069). Плейн-формы learn-BFF
 * (пакетный слой не знает про Entity/zod). Урок — higher-order сущность
 * lessons-домена: композирует концепты/правила/дриллы, поэтому импортит их типы
 * из sibling-модулей (`IConcept`/`IRule`/`IDrill` — сверху вниз, канон).
 */
import type { IConcept } from '../concepts/types';
import type { IDrill } from '../drills/types';
import type { IRule } from '../rules/types';

/** Элемент списка `/learn/lessons`. */
export interface ILessonSummary {
  id: string;
  title: string;
  level: string;
  tags: string[];
}

/** Полный урок `/learn/lessons/{id}` — intro + упорядоченные concepts/rules/drills. */
export interface ILessonDetail {
  id: string;
  title: string;
  level: string;
  tags: string[];
  intro: string | null;
  concepts: IConcept[];
  rules: IRule[];
  drills: IDrill[];
}
