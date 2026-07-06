/**
 * shared/search — атом поиска (по словам). Композирует `shared/words/`
 * (`wordsStore`), переиспользуется learn-wide. Направление строгое:
 * `modules/ → shared/`, НИКОГДА обратно.
 */
export { type ISearchProps, Search } from './Search';
