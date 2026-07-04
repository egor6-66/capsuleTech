/**
 * `/` — единственная страница auth-аппа: центрированная карточка входа
 * (Widgets.Gate: guest ↔ authed). Redirect-флоу `?next=` — в root Features.App.
 */
const Index = Page(() => <Widgets.Gate />);

export default Index;
