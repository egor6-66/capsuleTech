/**
 * Incidents — shared state hub для группы виджетов, работающих
 * с единым списком карточек происшествий.
 *
 * State machine:
 *   idle → loading → loaded
 *                 ↘ error
 *
 * Single source of truth: виджеты читают данные через store. Выбор карточки —
 * через универсальный `onClick`-роутер (ниже): клик по строке таблицы или
 * маркеру карты несёт тег `incident` + payload `{ id }`; роутер резолвит
 * incident из `items` и кладёт **готовый объект** в `store.selected`. Виджеты
 * НЕ знают про id/поиск — читают `selected` и рисуют.
 *
 * Wiring:
 * ```tsx
 * <Features.Incidents>
 *   <Widgets.Tables.Incidents />
 *   <Widgets.Maps.World />
 *   <Widgets.Sidebars.Main />
 * </Features.Incidents>
 * ```
 *
 * Context shape (user fields живут в `context.data`, доступ через
 * `store.ctx.data.X` или handler param `context.data.X`):
 * ```ts
 * {
 *   items: Entities.Incident.Row[];           // загруженный список
 *   selected: Entities.Incident.Row | null;   // выбранная карточка (готова к отрисовке)
 *   error: string | null;         // последнее сообщение об ошибке
 * }
 * ```
 *
 * Mutations: только через `store.update({ field: value })` — direct
 * `context.X = Y` запрещено Solid Store (выкинет "Cannot mutate a Store
 * directly"). Read через `context.data.X`.
 */

const Incidents = Feature<Tables.DataTable.Events>(({ api, router }) => ({
  initial: 'idle' as const,

  // Источник правды для типа контекста — TCtx инферится отсюда (CtxOf<typeof Features.Incidents>).
  context: {
    items: [] as Entities.Incident.Row[],
    selected: null as Entities.Incident.Row | null,
    error: null as string | null,
    // Cross-widget sync prefs (opt-in, флипаются из settings-strip Matrix'а):
    flyToSelected: false, //  карта подлетает к выбору ИЗ ТАБЛИЦЫ («Синк с таблицей»)
    scrollToSelected: false, //  таблица скроллит к выбору ИЗ КАРТЫ («Синк с картой»)
    // Self-click center prefs (opt-in, реагируют на выбор из СВОЕГО виджета):
    centerOnClick: false, //  клик по строке центрирует её («Скроллить к выбранному»)
    flyOnClick: false, //  клик по маркеру подлетает к нему («Подлететь к выбранному»)
    // Кто инициировал выбор: sync-prefs реагируют на ЧУЖОЙ источник, self — на СВОЙ.
    selectionSource: null as 'table' | 'map' | null,
  },

  /**
   * onRowClick — именованное событие от `Tables.DataTable` (ADR 032, шелл-флоу
   * как `Features.Shell.onLayoutChange`). Пакет эмиттит его через useEmit с
   * плоским target: `target.payload` = `itemPayload(row)` = `{ id }`.
   * Резолвим incident по id и кладём готовый объект в `selected`.
   */
  onRowClick: ({ target, store }) => {
    const id = (target.payload as { id?: string } | undefined)?.id;
    if (!id || store.ctx.data.selected?.id === id) return;
    const item = store.ctx.data.items.find((i) => i.id === id);
    store.update({
      selected: item ?? null,
      selectionSource: 'table',
    });
  },

  /**
   * onRowDblClick — даблклик по строке таблицы → сразу детальная карточка.
   */
  onRowDblClick: ({ target }) => {
    const id = (target.payload as { id?: string } | undefined)?.id;
    if (id) router.goTo(`/workspace/cards/${id}`);
  },

  /**
   * onClick — универсальный роутер кликов по `target.meta.tags` (карта-маркеры,
   * settings-тоглы, open-card). Таблица теперь шлёт именованный `onRowClick`.
   *
   * Top-level (вне `states`) → ControllerProxy находит его как fallback после
   * `states[current]`, значит ловит клик в любом стейте.
   *   `incident`  → select: резолвит incident из `items` (по payload `{ id }`)
   *                 и кладёт готовый объект в `selected` (idempotent), чтобы
   *                 виджеты читали его без знания про id/поиск.
   *   `open-card` → navigate: переход на детальную карточку выбранного incident'а.
   */
  onClick: ({ target, store }) => {
    const tags = (target as { meta?: { tags?: string[] } }).meta?.tags ?? [];

    if (tags.includes('incident')) {
      const id = (target as { payload?: { id?: string } }).payload?.id;
      if (!id || store.ctx.data.selected?.id === id) return;
      const item = store.ctx.data.items.find((i) => i.id === id);
      // Сюда incident приходит только с карты (таблица шлёт именованный onRowClick).
      store.update({
        selected: item ?? null,
        selectionSource: 'map',
      });
    }

    if (tags.includes('open-card')) {
      const id = store.ctx.data.selected?.id;
      if (id) router.goTo(`/workspace/cards/${id}`);
    }

    // Widget-settings toggles (rendered in the Matrix settings strip when
    // global settingsMode is on). Each flips an opt-in pref.
    //   cross-widget sync:
    if (tags.includes('toggle-fly')) {
      store.update({ flyToSelected: !store.ctx.data.flyToSelected });
    }
    if (tags.includes('toggle-scroll')) {
      store.update({ scrollToSelected: !store.ctx.data.scrollToSelected });
    }
    //   self-click center:
    if (tags.includes('toggle-center')) {
      store.update({ centerOnClick: !store.ctx.data.centerOnClick });
    }
    if (tags.includes('toggle-fly-self')) {
      store.update({ flyOnClick: !store.ctx.data.flyOnClick });
    }
  },

  /**
   * onDblClick — даблклик по строке таблицы или маркеру (тег `incident`) →
   * сразу переход на детальную карточку по payload `{ id }` (минуя выбор).
   * Single-click фиксирует `selected`, double-click открывает.
   */
  onDblClick: ({ target }) => {
    const tags = (target as { meta?: { tags?: string[] } }).meta?.tags ?? [];
    if (tags.includes('incident')) {
      const id = (target as { payload?: { id?: string } }).payload?.id;
      if (id) router.goTo(`/workspace/cards/${id}`);
    }
  },

  states: {
    /**
     * idle — стартовое состояние. onInit немедленно запускает загрузку:
     * переходит в `loading`, не делая сам API-вызов (разделение ответственности).
     */
    idle: {
      onInit: ({ state }) => {
        state.set('loading');
      },
    },

    /**
     * loading — единственный стейт, где происходит API-вызов.
     * На success → `loaded`, на error → `error`.
     */
    loading: {
      onInit: async ({ store, state }) => {
        if (!api) {
          // eslint-disable-next-line no-console
          console.error('[incidents] api client not initialized — check capsule.app.ts > api');
          store.update({ error: 'API client not initialized' });
          state.set('error');
          return;
        }

        // Логический сигнал загрузки — фича знает ТОЛЬКО про «идёт загрузка»,
        // не про presentation. Виджеты (table/map) сами решают, какой лоадер
        // показать через 2-й колбэк `Widget(content, loader)`. Снимаем в finally,
        // чтобы флаг гарантированно сбросился и на success, и на error.
        store.setLoading(true);
        try {
          const result = await api.incidents.list({});
          const items = Entities.Incident.schema.array().parse(result) as Entities.Incident.Row[];

          store.update({ items, error: null });
          state.set('loaded');
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // eslint-disable-next-line no-console
          console.error('[incidents] load failed:', message);
          store.update({ error: message });
          state.set('error');
        } finally {
          store.setLoading(false);
        }
      },
    },

    /** loaded — данные загружены. Выбор карточки идёт через top-level `onClick`. */
    loaded: {},

    /** error — загрузка не удалась; `context.error` содержит сообщение. */
    error: {},
  },
}));

export default Incidents;
