/**
 * App — карточка приложения из каталога (catalog row).
 *
 * Сервер preview возвращает список развёрнутых приложений (имя, base URL,
 * URL открытия, дата развёртывания). Каждая запись — одна карточка для UI.
 *
 * Single-item shape (`z.object`). Списки строятся через Shape
 * (`z.array(...schema)`) — см. shapes/appsList.tsx.
 *
 * `mock` — статический каталог для мок-сборки (playground без API).
 * В сборке без моков `__CAPSULE_MOCKS__` → `false`, тернарник сворачивается в `[]`.
 * Реальные данные придут через `services.api.apps.list()` или Shape fetch'ер.
 */
const App = Entity((z) => {
  const schema = z.object({
    name: z.string(),
    base: z.string(),
    url: z.string(),
    deployedAt: z.string().nullable(),
  });

  return {
    schema,
    mock: __CAPSULE_MOCKS__
      ? [
          { name: 'ewc', base: '/ewc/', url: '/ewc/', deployedAt: '2026-06-02T10:00:00Z' },
          {
            name: 'ui-creator',
            base: '/ui-creator/',
            url: '/ui-creator/',
            deployedAt: '2026-06-01T18:30:00Z',
          },
        ]
      : [],
  };
});

export default App;
