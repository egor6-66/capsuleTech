/**
 * shared/words — атом слова: данные (`wordsStore`/`fetchSenses`/`ISense`) +
 * презентация (`Words`-грид, `WordTile`-тайл). Переиспользуется многими
 * модулями (`library`, будущий быстрый выбор слова). Направление строгое:
 * `modules/ → shared/`, НИКОГДА обратно.
 */
export { fetchSenses, type IFetchSensesParams } from './api';
export { type IWordsStore, wordsStore } from './store';
export type { ISense, ISenseAudio, ISenseTag } from './types';
export { type IWordsEvents, type IWordsProps, Words } from './Words';
export { type IWordTileProps, WordTile } from './WordTile';
