// `MainNav` (`WebStudio.Nav.Main`) — единственный экспорт nav-модуля.
// Сегменты (`SEGMENTS`/`ISegment`/`SegmentId`) переехали в `shared/segments`
// (атом; читают nav + welcome). `useStudioMode`/`StudioMode` — в `core/`.
// Своих `__events` у nav нет — контракт события из `Shell.SegmentNav.Events`.
export { default as MainNav } from './MainNav';
