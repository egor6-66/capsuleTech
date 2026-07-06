/**
 * drills/types — контракты интерактива дрилла (ADR 067 / ADR 069). Плейн-формы
 * ответов learn-BFF (пакетный слой не знает про Entity/zod). Дрилл — низшая
 * сущность lessons-домена: сюда же переехали обогащённые слова (`IResolvedWord`
 * + audio/image) — их использует только дрилл.
 *
 * Item'ы дрилла в выдаче урока/правила САНИТИЗИРОВАНЫ (`IDrillItem` — без ключа
 * ответа): проверка только через `POST /learn/drills/{id}/check` (канон user:
 * фронт = интерфейс).
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

/** Санитизированный item дрилла (без ключа ответа) — `index` адресует его в check. */
export interface IDrillItem {
  index: number;
  promptRu: string;
  context: string | null;
}

/** Дрилл — интерактив: items (санитизированные) + обогащённые слова. */
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
