/**
 * Sidebar — слот `sidebar` хаба: каталог развёрнутых приложений.
 *
 * Читает `Features.Catalog` через 2-й аргумент `store` (Bridge родительской
 * фичи), подаёт `list` + `selected.name` в stateless `Views.AppList`.
 * Обёртка — скролл-контейнер на полную высоту слота.
 */
import type { ICatalogContext } from '../features/catalog';

const Sidebar = Widget((Ui, store) => {
  const data = () => store?.ctx.data as ICatalogContext | undefined;

  return (
    <div class="h-full w-full overflow-y-auto bg-background">
      <Views.AppList items={data()?.list ?? []} selectedName={data()?.selected?.name} />
    </div>
  );
});

export default Sidebar;
