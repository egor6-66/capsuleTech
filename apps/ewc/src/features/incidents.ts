/**
 * Incidents — shared state hub для группы виджетов, работающих
 * с единым списком карточек происшествий.
 *
 * State machine:
 *   idle → loading → loaded
 *                 ↘ error → loading (retry)
 *   loaded → loading (retry / refresh)
 *
 * Single source of truth: все три виджета читают данные через store,
 * операции (select / toggle visibility) диспатчатся через controller
 * next()-bubbling к этому Feature.
 *
 * Wiring (Phase 2):
 * ```tsx
 * <Features.Incidents>
 *   <Widgets.Tables.Incidents />
 *   <Widgets.Maps.World />
 *   <Widgets.Sidebars.Main />
 * </Features.Incidents>
 * ```
 *
 * Context shape:
 * ```ts
 * {
 *   items: IIncident[];          // загруженный список
 *   visibleIds: Set<string>;     // ids видимых на карте маркеров
 *   selectedId: string | null;   // выбранный incident (sidebar)
 *   error: string | null;        // последнее сообщение об ошибке
 * }
 * ```
 */

import type { z } from 'zod';

type IIncident = z.infer<typeof Entities.Incident.schema>;

const Incidents = Feature(({ api }) => ({
  initial: 'idle' as const,

  context: {
    items: [] as IIncident[],
    visibleIds: new Set<string>(),
    selectedId: null as string | null,
    error: null as string | null,
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
     * onInit вызывается при каждом входе (включая retry/refresh).
     * На success → `loaded`, на error → `error`.
     */
    loading: {
      onInit: async ({ store, state, context }) => {
        if (!api) {
          // eslint-disable-next-line no-console
          console.error('[incidents] api client not initialized — check capsule.app.ts > api');
          context.error = 'API client not initialized';
          state.set('error');
          return;
        }

        try {
          const result = await api.incidents.list({});
          const items = Entities.Incident.schema.array().parse(result) as IIncident[];

          context.items = items;
          context.visibleIds = new Set(items.map((i: IIncident) => i.id));
          context.error = null;

          state.set('loaded');
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // eslint-disable-next-line no-console
          console.error('[incidents] load failed:', message);
          context.error = message;
          state.set('error');
        }
      },
    },

    /**
     * loaded — основной рабочий стейт. Доступны все методы управления
     * списком: выбор, visibility-фильтрация, refresh.
     */
    loaded: {
      /**
       * selectOne — устанавливает выбранный incident.
       * Idempotent: повторный вызов с тем же id ничего не меняет.
       */
      selectOne: ({ target, context }) => {
        const id = (target as { payload?: { id?: string } }).payload?.id;
        if (!id) return;
        if (context.selectedId === id) return;
        context.selectedId = id;
      },

      /**
       * clearSelection — сбрасывает выбор (sidebar переходит в пустое состояние).
       */
      clearSelection: ({ context }) => {
        context.selectedId = null;
      },

      /**
       * toggleVisible — переключает видимость одного маркера на карте.
       * Иммутабельное обновление через new Set.
       */
      toggleVisible: ({ target, context }) => {
        const id = (target as { payload?: { id?: string } }).payload?.id;
        if (!id) return;
        const next = new Set(context.visibleIds);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        context.visibleIds = next;
      },

      /**
       * setAllVisible — массовое управление видимостью.
       * visible=true → показать все; visible=false → скрыть все.
       */
      setAllVisible: ({ target, context }) => {
        const visible = (target as { payload?: { visible?: boolean } }).payload?.visible;
        if (visible === true) {
          context.visibleIds = new Set(context.items.map((i: IIncident) => i.id));
        } else {
          context.visibleIds = new Set();
        }
      },

      /**
       * retry — форсированный refresh: сбрасывает данные и уходит в loading.
       * Доступен из loaded (ручное обновление), а также пробрасывается из error.
       */
      retry: ({ context, state }) => {
        context.items = [];
        context.visibleIds = new Set();
        context.error = null;
        state.set('loading');
      },
    },

    /**
     * error — стейт ошибки загрузки. context.error содержит сообщение.
     * Единственный выход — retry().
     */
    error: {
      /**
       * retry — сброс в loading для повторной попытки загрузки.
       */
      retry: ({ context, state }) => {
        context.error = null;
        state.set('loading');
      },
    },
  },
}));

export default Incidents;
