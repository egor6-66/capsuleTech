export default defineAppConfig({
  // Теги UI-событий, которые ловит корневой Features.App:
  //  - submit/approve/reject — действия (на кнопках);
  //  - input + поля формы (title/author/…) — собираются через store.values(['@input']).
  meta: {
    tags: [
      'click',
      'submit',
      'approve',
      'reject',
      'input',
      'title',
      'author',
      'lyrics',
      'audioUrl',
      'tabUrl',
    ],
  },
  // @input раскрывается в kind-тег 'input' (его UiProxy навешивает на Ui.Input
  // автоматически) → store.values(['@input']) собирает значения всех полей формы.
  aliases: {
    '@input': ['input'],
  },
  // Пакеты, чьи глобалы (Shell.*, Layouts.*) регистрируются в app (ADR 033):
  //  - web-shell  → Shell.Header/Menu/Appearance/ModeToggle (app-shell хром).
  //  - boost-layout → Layouts.Matrix (матрица виджетов с resize/dnd).
  packages: ['@capsuletech/web-shell', '@capsuletech/boost-layout'],
});
