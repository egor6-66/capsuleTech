/**
 * Learn.BookmarkButton — закладка словарной единицы. SKELETON: плейсхолдер
 * поверх web-ui Button (toggle-логика — следующая итерация).
 */
import { Button } from '@capsuletech/web-ui/button';
import type { Component } from 'solid-js';

export interface IBookmarkButtonProps {
  word: string;
  bookmarked?: boolean;
}

export const BookmarkButton: Component<IBookmarkButtonProps> = (props) => (
  <Button data-stub="Learn.BookmarkButton">
    {props.bookmarked ? '★' : '☆'} {props.word}
  </Button>
);
