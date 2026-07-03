/**
 * App — root feature learn-app'а.
 *
 * RouterPlugin монтирует `src/features/app.tsx` в `__root` выше `<Outlet/>` (mount-once)
 * → даёт логик-контекст всем страницам. Шелл — pathless-группа `pages/_workspace/`
 * (layout оборачивает все секции, URL'ы плоские: `/`, `/lessons`, `/library/explorer`).
 * `_public/` — для auth-роутов (login и т.п.), заведём с авторизацией.
 *
 * Без авторизации (пока). Роутинг по событиям навигации (ADR 032):
 *   onNavigate (Learn.Welcome) — раздел `/<segment>`.
 *   onLibraryNavigate (Learn.LibraryNav) — под-раздел `/library/<segment>`.
 *
 * Озвучка (ADR 067) — app-глобальный concern, живёт тут:
 *   context.engines — список TTS-движков с voice-сервиса (напрямую, capability публичен);
 *   context.engine  — выбор юзера, персистится в localStorage (переживает рестарт);
 *   onPick (Shell.Picker в хедере, name='engine') — смена движка;
 *   onClick c payload.audioUrl — проигрывание: клики 🔊 бабблятся сюда из
 *   Features.Library через next(), url = готовая ссылка learn-композиции на voice.
 */

// Persist через голый localStorage — осознанный compliance-warn (native-js):
// в services/Utils нет storage-хелпера (SSR/desktop-safe) — framework gap,
// кандидат на mini-brief owner-shared. Заменить на Utils.storage когда появится.
const VOICE_ENGINE_KEY = 'learn-voice-engine';

const App = Feature<Learn.Welcome.Events & Learn.LibraryNav.Events & Shell.Picker.Events>(
  ({ router, api }) => ({
    initial: 'idle',

    context: {
      engines: [] as string[],
      engine: localStorage.getItem(VOICE_ENGINE_KEY) ?? 'kokoro',
    },

    states: {
      idle: {
        onInit: async ({ store }) => {
          if (!api) return;
          const res = await api.voice.engines({});
          store.update({ engines: res.engines });
          // Персист мог указывать на движок, которого больше нет — откат на default.
          // Свой стейт читаем через store (собственный Bridge), НЕ через `context`.
          const current = (store.ctx as any)?.data?.engine as string | undefined;
          if (current && !res.engines.includes(current)) {
            store.update({ engine: res.default });
            localStorage.setItem(VOICE_ENGINE_KEY, res.default);
          }
        },
      },
    },

    // Навигация из welcome-карточек: payload — id раздела (lessons/exercises/progress/library/guides).
    onNavigate: ({ target }) => {
      router.goTo(`/${target.payload}`);
    },

    // Под-навигация library (Learn.LibraryNav, ADR 032): payload — explorer|collections.
    onLibraryNavigate: ({ target }) => {
      router.goTo(`/library/${target.payload}`);
    },

    // Shell.Picker (хедер): выбор TTS-движка.
    onPick: ({ target, store }) => {
      if (target.payload?.name !== 'engine') return;
      const engine = target.payload.value;
      store.update({ engine });
      localStorage.setItem(VOICE_ENGINE_KEY, engine);
    },

    // Озвучка: 🔊-клики бабблятся из Features.Library (payload несёт audio.url,
    // null = voice лежал при выдаче — learn кэширует недоступность 30с; слово без
    // озвучки, молча скипаем — ре-фетч слов самолечит).
    // ⚠️ НЕ читать движок из `context`: при баббле next() хендлер получает контекст
    // РЕБЁНКА (Library), не свой (controller-proxy callParent). Свой стейт — store.
    onClick: ({ target, store }) => {
      const p = target.payload as { audioUrl?: string | null } | undefined;
      if (!p || !('audioUrl' in p) || !p.audioUrl) return;
      const engine = ((store.ctx as any)?.data?.engine as string | undefined) ?? 'kokoro';
      void new Audio(`${p.audioUrl}&engine=${engine}`).play();
    },
  }),
);

export default App;
