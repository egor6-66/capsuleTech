/**
 * Learn.Search — поисковая строка по словам. Пишет query в `wordsStore` и
 * триггерит `load` на каждый keystroke (без debounce — дёшево на малом наборе).
 *
 * Атом `shared/search/` — поиск слов learn-wide (не собственность `library`).
 * Промоутнут `Learn.Library.Search` → `Learn.Search`. Импортит `wordsStore`
 * из `shared/words/` (word-search). Направление строгое: `shared/ → shared/`
 * ОК, `shared/ → modules/` — НИКОГДА.
 *
 * Регистрируется как `Learn.Search` через `../../capsule` (ADR 033).
 */
import { Input } from '@capsuletech/web-ui/input';
import { Layout } from '@capsuletech/web-ui/layout';
import { useApiBase } from '../../core/apiContext';
import { wordsStore } from '../words/store';

export interface ISearchProps {
  class?: string;
  placeholder?: string;
}

export const Search = (props: ISearchProps) => {
  const apiBase = useApiBase();

  return (
    <Layout.Flex p={1} class={props.class}>
      <Input
        value={wordsStore.query()}
        placeholder={props.placeholder ?? 'Поиск слова…'}
        onInput={(e) => void wordsStore.load(apiBase, e.currentTarget.value)}
      />
    </Layout.Flex>
  );
};

export default Search;
