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
 *   Доменная под-навигация library — в `features/library.tsx` (канон app-фич:
 *   root App = только глобальные концерны).
 *
 * Озвучка (ADR 067) — app-глобальный concern, живёт тут:
 *   context.engines — список TTS-движков с voice-сервиса (напрямую, capability публичен);
 *   context.engine  — выбор юзера, персистится в localStorage (переживает рестарт);
 *   onPick (Shell.Picker в хедере, name='engine') — смена движка;
 *   onSpeak (Learn.Library.Words/Info, именованное событие пакета) — проигрывание,
 *   payload.audioUrl = готовая ссылка learn-композиции на voice (null — voice лежал).
 *
 * Картинки слов (ADR 067/068) — тот же app-глобальный concern, зеркало озвучки:
 *   context.imageEngines / context.imageEngine — список и выбор image-движка
 *   (backend/image напрямую, capability публичен), персист в localStorage;
 *   onPick (второй Shell.Picker в хедере, name='image-engine') — смена движка.
 *   Прокидывание выбора в реальные запросы картинок — будущий шаг (когда
 *   learn-выдача принесёт image.url, `&engine=` добавляется как в 🔊-onSpeak).
 *
 * `Learn.Library.*` — вложенный namespace-блок, codegen per-component `.Events`
 * агрегат не видит вложенные ключи (nested-нюанс, см. `web-learn/src/capsule.ts`) —
 * `IOnSpeakEvent` ниже типизирует payload вручную (форма зеркалит `IWordsEvents`/
 * `IInfoEvents` пакета, без импорта).
 */

// Persist через голый localStorage — осознанный compliance-warn (native-js):
// в services/Utils нет storage-хелпера (SSR/desktop-safe) — framework gap,
// кандидат на mini-brief owner-shared. Заменить на Utils.storage когда появится.
const VOICE_ENGINE_KEY = 'learn-voice-engine';
const IMAGE_ENGINE_KEY = 'learn-image-engine';

interface IOnSpeakEvent {
  onSpeak: { audioUrl: string | null };
}

const App = Feature<Learn.Welcome.Events & Shell.Picker.Events & IOnSpeakEvent>(
  ({ router, api }) => ({
    initial: 'idle',

    context: {
      engines: [] as string[],
      engine: localStorage.getItem(VOICE_ENGINE_KEY) ?? 'kokoro',
      imageEngines: [] as string[],
      imageEngine: localStorage.getItem(IMAGE_ENGINE_KEY) ?? 'sdxl-turbo',
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

          // Image-движки — тот же флоу, отдельный capability-сервис.
          const img = await api.image.engines({});
          store.update({ imageEngines: img.engines });
          const currentImage = (store.ctx as any)?.data?.imageEngine as string | undefined;
          if (currentImage && !img.engines.includes(currentImage)) {
            store.update({ imageEngine: img.default });
            localStorage.setItem(IMAGE_ENGINE_KEY, img.default);
          }
        },
      },
    },

    // Навигация из welcome-карточек: payload — id раздела (lessons/exercises/progress/library/guides).
    onNavigate: ({ target }) => {
      router.goTo(`/${target.payload}`);
    },

    // Shell.Picker (хедер): выбор движка. Два пикера различаются по name.
    onPick: ({ target, store }) => {
      const name = target.payload?.name;
      if (name === 'engine') {
        const engine = target.payload.value;
        store.update({ engine });
        localStorage.setItem(VOICE_ENGINE_KEY, engine);
        return;
      }
      if (name === 'image-engine') {
        const imageEngine = target.payload.value;
        store.update({ imageEngine });
        localStorage.setItem(IMAGE_ENGINE_KEY, imageEngine);
      }
    },

    // Озвучка: именованное событие из Learn.Library.Words/Info (payload несёт
    // audio.url, null = voice лежал при выдаче — learn кэширует недоступность 30с;
    // слово без озвучки — молча скипаем, ре-фетч слов самолечит).
    onSpeak: ({ target, store }) => {
      const audioUrl = target.payload?.audioUrl;
      if (!audioUrl) return;
      const engine = ((store.ctx as any)?.data?.engine as string | undefined) ?? 'kokoro';
      void new Audio(`${audioUrl}&engine=${engine}`).play();
    },
  }),
);

export default App;
