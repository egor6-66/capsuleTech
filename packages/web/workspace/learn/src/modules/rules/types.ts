/**
 * rules/types — контракты справочника правил (ADR 067 / ADR 069). Плейн-формы
 * learn-BFF (пакетный слой не знает про Entity/zod). Тело правила — markdown-
 * строка (`body`). Детальное правило композирует ЕГО дриллы (`IDrill` из
 * `../drills/types` — rule → drill, канон координации «сверху вниз»).
 */
import type { IDrill } from '../drills/types';

/**
 * Категория правила = раздел справочника (ADR 069). Дефолт выводится из папки
 * vault'а (`grammar/`→grammar и т.д.). Ru-подписи/порядок групп — в блоке `Rules`.
 */
export type RuleCategory = 'phonetics' | 'grammar' | 'speech';

/** Правило — справочник (markdown-тело). */
export interface IRule {
  id: string;
  title: string;
  body: string;
  tags: string[];
}

/**
 * Элемент списка `/learn/rules` — карточка справочника (без тела).
 * `category`/`sortOrder` — группировка/порядок для аккордеона (ADR 069).
 */
export interface IRuleSummary {
  id: string;
  title: string;
  tags: string[];
  category: RuleCategory;
  sortOrder: number;
}

/**
 * Детальное правило `/learn/rules/{id}` — тело справочника + ЕГО дриллы
 * («Практика»). Дриллы скомпонованы теми же механиками, что урок: item'ы
 * санитизированы (без ключа ответа) + `words_resolved` обогащены (ADR 069).
 */
export interface IRuleDetail extends IRule {
  drills: IDrill[];
}
