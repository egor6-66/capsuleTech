/**
 * Learn.Library.Search — поисковая строка библиотеки слов. Пишет query в
 * `libraryStore` и триггерит `load` на каждый keystroke (без debounce —
 * дёшево на малом наборе, зеркало исходной `apps/learn` Feature).
 *
 * Регистрируется как `Learn.Library.Search` через `../capsule` (ADR 033).
 */
import { Input } from '@capsuletech/web-ui/input';
import { Layout } from '@capsuletech/web-ui/layout';
import { useApiBase } from '../core/apiContext';
import { libraryStore } from './store';

export interface ISearchProps {
  class?: string;
  placeholder?: string;
}

export const Search = (props: ISearchProps) => {
  const apiBase = useApiBase();

  return (
    <Layout.Flex p={1} class={props.class}>
      <Input
        value={libraryStore.query()}
        placeholder={props.placeholder ?? 'Поиск слова…'}
        onInput={(e) => void libraryStore.load(apiBase, e.currentTarget.value)}
      />
    </Layout.Flex>
  );
};

export default Search;
