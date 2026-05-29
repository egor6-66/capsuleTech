import { useRouter } from '@capsuletech/web-router';
import { Show } from 'solid-js';

/**
 * Cards layout (`/workspace/cards`) — Matrix header + main.
 *
 * `main` переключается по маршруту (master-detail-replace):
 *   /workspace/cards       → список карточек (Widgets.Tables.Incidents)
 *   /workspace/cards/:id   → детальная карточка (<Outlet/> → [id])
 *
 * Переключатель реактивен: `useRouter().current()` читает router-store через
 * Solid-сигнал, поэтому `Show` перерисовывается на каждую навигацию.
 * `:id` активен, когда последний сегмент пути не `cards`.
 */
const Cards = Page((Ui) => {
  const router = useRouter();
  const isDetail = () => router.current().split('/').filter(Boolean).at(-1) !== 'cards';

  return (
    <Ui.Layout.Matrix
      layoutMode="view"
      preset="app-shell"
      slots={{
        header: {
          children: (
            <Ui.Typography variant="lead" class="px-4 py-2 font-semibold">
              Карточки
            </Ui.Typography>
          ),
          resizable: false,
          initialSize: 0.06,
        },
        main: {
          children: (
            <Show
              when={isDetail()}
              fallback={
                <Features.Incidents>
                  <Widgets.Tables.Incidents />
                </Features.Incidents>
              }
            >
              <Ui.Outlet />
            </Show>
          ),
          resizable: false,
        },
      }}
    />
  );
});

export default Cards;
