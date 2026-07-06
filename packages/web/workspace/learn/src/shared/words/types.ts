/**
 * ISense — форма list-item ответа `/learn/lang/senses` (learn-композиция,
 * ADR 067: `audio` — готовая ссылка на voice-сервис, не байты; `ru` —
 * перевод, lang разделил gloss/ru). Плейн-контракт (пакетный слой не знает
 * про Entity/zod — та машинерия app-layer'а).
 *
 * Живёт в `shared/words/` — атом слова переиспользуется многими модулями
 * (список слов как контент ИЛИ быстрый поиск), не собственность `library`.
 */
export interface ISenseTag {
  name: string;
  kind: string;
}

export interface ISenseAudio {
  url: string;
  engines: string[];
}

export interface ISense {
  id: number;
  text: string;
  gloss: string | null;
  ru?: string | null;
  pos: string;
  level: string | null;
  register: string | null;
  frequency: string | null;
  pron_ru: string | null;
  connotation: string | null;
  synset: string | null;
  tags: ISenseTag[];
  audio?: ISenseAudio | null;
}
