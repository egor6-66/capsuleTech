/**
 * App — корневой оркестратор bandspace (root feature, mount-once в __root ВЫШЕ
 * <Outlet/> → живёт один раз на всё приложение, переживает навигации).
 *
 * Держит список треков в `context.data.tracks`. UiProxy биндит meta-tagged
 * элементы страницы (она — потомок этого scope) в его FSM:
 *   submit  — собрать значения формы `store.values(['@input'])` → новый трек `pending`.
 *   approve — `target.payload` = id трека → статус `approved` (улетает в сет-лист).
 *   reject  — `target.payload` = id трека → статус `rejected`.
 *
 * Read во вьюхах/виджетах: `useCtx().store.ctx.data.tracks`.
 * Хранение — пока in-memory (первая итерация). Backend/БД — следующий шаг.
 */

type TrackRow = Entities.Track.Row;

const SEED: TrackRow[] = [
  {
    id: 'seed-1',
    title: 'Полночь',
    author: 'Гитарист',
    lyrics: 'Город спит, а мы играем до утра…',
    audioUrl: 'https://example.com/midnight.mp3',
    tabUrl: 'https://example.com/midnight.gp5',
    status: 'pending',
  },
  {
    id: 'seed-2',
    title: 'Дорога домой',
    author: 'Басист',
    lyrics: 'Длинный путь под фонарями…',
    audioUrl: 'https://example.com/road.mp3',
    tabUrl: '',
    status: 'approved',
  },
];

const App = Feature<Record<string, never>, { tracks: TrackRow[] }>(({ router }) => ({
  initial: 'ready',

  context: {
    tracks: SEED,
  },

  states: {
    ready: {
      // Дефолтный раздел: с корня и с голого /board уводим на /board/tracks.
      onInit: () => {
        const path = router.current();
        if (path === '/' || path === '/board') router.goTo('/board/tracks');
      },

      onClick: ({ target, context, store }) => {
        const tags = (target.meta?.tags ?? []) as string[];
        // Хендлеру приходит УЖЕ распакованный user-context (ControllerProxy: context = store.ctx.data),
        // поэтому читаем context.tracks напрямую (не context.data.tracks).
        const tracks = (context.tracks ?? []) as TrackRow[];

        // ─── Предложить трек ──────────────────────────────────────────────
        if (tags.includes('submit')) {
          const v = store.values(['@input']) as Record<string, string>;
          // Минимальная валидация: без названия не добавляем.
          if (!v.title?.trim()) return;
          const track: TrackRow = {
            id: `t-${Date.now()}`,
            title: v.title.trim(),
            author: v.author?.trim() ?? '',
            lyrics: v.lyrics?.trim() ?? '',
            audioUrl: v.audioUrl?.trim() ?? '',
            tabUrl: v.tabUrl?.trim() ?? '',
            status: 'pending',
          };
          store.update({ tracks: [track, ...tracks] });
          return;
        }

        // ─── Ревью: одобрить / отклонить ──────────────────────────────────
        if (tags.includes('approve') || tags.includes('reject')) {
          const id = target.payload as string;
          const status: TrackRow['status'] = tags.includes('approve') ? 'approved' : 'rejected';
          store.update({
            tracks: tracks.map((t) => (t.id === id ? { ...t, status } : t)),
          });
        }
      },
    },
  },
}));

export default App;
