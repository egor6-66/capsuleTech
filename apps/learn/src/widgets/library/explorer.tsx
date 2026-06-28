/**
 * Widgets.Library.Explorer — композит word-explorer'а.
 *
 * Сейчас тонкая обёртка над `Views.Library.Explorer` (placeholder). Позже здесь
 * появится логика: подтяжка слов/тегов/связей с backend/learn (через Feature/
 * web-query) + проброс данных в View. View останется dumb и переедет в пакет —
 * вся «склейка» живёт тут (канон: композиция только в Widget).
 */
const Explorer = Widget(() => <Views.Library.Explorer />);

export default Explorer;
