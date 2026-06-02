/**
 * AppList — вертикальный список развёрнутых приложений в сайдбаре.
 *
 * Stateless: список приходит через `props.items` (родительский Widget читает
 * его из Feature.Catalog store и подаёт сюда). View не знает про useCtx/store.
 *
 * Корень — обычный `<div>` + solid-control-flow (`Show`/`For`), НЕ `Ui.*`-контейнер:
 * UiProxy подмешивает props View'а (`items`/`selectedName`) в каждый `Ui.*`-элемент
 * (dynamicMeta-flow), и `items` столкнулся бы с reserved render-prop `Ui.List.items`.
 * Поэтому данные рисуем через solid `For`, а `Ui.Button` — лист с `meta`/`payload`.
 *
 * Каждая строка — `Ui.Button` с `meta.tags=['app-select']` + `payload.name`;
 * web-core UiProxy навешивает клик, Feature.Catalog.onClick роутит по тегам.
 * Выбранное приложение (selectedName) подсвечено.
 */

import { For, Show } from 'solid-js';
import type { IApp } from '../features/catalog';

const AppList = View((Ui, props: { items?: IApp[]; selectedName?: string }) => {
  const apps = () => props.items ?? [];

  return (
    <div class="flex w-full flex-col gap-1 p-2">
      <Show
        when={apps().length > 0}
        fallback={
          <div class="p-3 text-center text-xs text-muted-foreground">
            Нет развёрнутых приложений
          </div>
        }
      >
        <For each={apps()}>
          {(app) => (
            <Ui.Button
              variant="ghost"
              class={`h-auto w-full justify-start px-3 py-2 text-left ${
                app.name === props.selectedName ? 'bg-accent text-accent-foreground' : ''
              }`}
              meta={{ tags: ['app-select'] }}
              payload={{ name: app.name }}
            >
              <span class="flex flex-col items-start gap-0.5">
                <span class="font-semibold text-sm">{app.name}</span>
                <span class="text-xs text-muted-foreground">{app.base}</span>
                <Show when={app.deployedAt}>
                  <span class="text-xs text-muted-foreground">
                    {new Date(app.deployedAt as string).toLocaleString()}
                  </span>
                </Show>
              </span>
            </Ui.Button>
          )}
        </For>
      </Show>
    </div>
  );
});

export default AppList;
