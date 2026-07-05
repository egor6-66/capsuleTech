/**
 * lessons/types — формы ответов learn-BFF по урокам (ADR 067 / ADR 069).
 * Плейн-контракт (пакетный слой не знает про Entity/zod — та машинерия
 * app-layer'а; зеркало `library/types.ts`).
 *
 * Тело концептов/правил — markdown-строка (`body`), рендерится фронтом через
 * `@capsuletech/web-docs` `renderMarkdown`. Item'ы дрилла в выдаче урока
 * САНИТИЗИРОВАНЫ (`IDrillItem` — без ключа ответа): проверка только через
 * `POST /learn/drills/{id}/check` (канон user: фронт = интерфейс).
 */

/** Готовая ссылка на озвучку (voice-сервис) + доступные движки — не байты. */
export interface ILessonAudio {
  url: string;
  engines: string[];
}

/** Готовая ссылка на картинку слова — не байты. */
export interface ILessonImage {
  url: string;
}

/** Слово дрилла, обогащённое sense-выдачей (`words_resolved[]`, ADR 069 ф.1). */
export interface IResolvedWord {
  text: string;
  senseId: number | null;
  ru: string | null;
  pron_ru: string | null;
  pos: string | null;
  audio: ILessonAudio | null;
  image: ILessonImage | null;
}

export interface ILessonExample {
  en: string;
  ru: string;
  image?: string | null;
}

/**
 * Фасет группировки концепта в аккордеон-IA (ADR 069). `approach` — дефолт при
 * отсутствии `kind` во frontmatter. Ru-подписи/порядок групп — в блоке `Concepts`.
 */
export type ConceptKind = 'approach' | 'pattern' | 'recommendation';

/**
 * Категория правила = раздел справочника (ADR 069). Дефолт выводится из папки
 * vault'а (`grammar/`→grammar и т.д.). Ru-подписи/порядок групп — в блоке `Rules`.
 */
export type RuleCategory = 'phonetics' | 'grammar' | 'speech';

/** Концепт урока — проза (принцип + markdown-тело). */
export interface IConcept {
  id: string;
  title: string;
  principle: string;
  body: string;
  tags: string[];
  examples: ILessonExample[];
  relatedRules: string[];
  relatedConcepts: string[];
}

/**
 * Элемент списка `/learn/concepts` — карточка библиотеки прозы (без тела).
 * `kind`/`sortOrder` — группировка/порядок для аккордеона (ADR 069).
 */
export interface IConceptSummary {
  id: string;
  title: string;
  principle: string;
  tags: string[];
  kind: ConceptKind;
  sortOrder: number;
}

/** Правило урока — справочник (markdown-тело). */
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

/** Санитизированный item дрилла (без ключа ответа) — `index` адресует его в check. */
export interface IDrillItem {
  index: number;
  promptRu: string;
  context: string | null;
}

/** Дрилл урока — интерактив: items (санитизированные) + обогащённые слова. */
export interface IDrill {
  id: string;
  title: string;
  level: string;
  tags: string[];
  rule: string;
  graboTag: string;
  words: string[];
  concepts: string[];
  items: IDrillItem[];
  words_resolved: IResolvedWord[];
}

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

/** Вердикт проверки ответа дрилла (ADR 069 ф.2). */
export type Verdict = 'correct' | 'near_miss' | 'wrong';

/** Тело `POST /learn/drills/{id}/check` — snake_case под бэковый контракт. */
export interface ICheckRequest {
  item_index: number;
  answer: string;
  reveal?: boolean;
}

/** Ответ чекера: `hint` на near_miss, `answer` на reveal (иначе отсутствуют). */
export interface ICheckResult {
  verdict: Verdict;
  hint?: string;
  answer?: string;
}
