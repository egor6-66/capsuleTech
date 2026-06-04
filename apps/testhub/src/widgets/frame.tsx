/**
 * Frame — слот `main` хаба: iframe выбранного приложения.
 *
 * Читает `Features.Catalog` через 2-й аргумент `store`, подаёт
 * `selected.url` в stateless `Views.AppFrame` (iframe-изоляция приложения).
 */
import type { ICatalogContext } from '../features/catalog';

const Frame = Widget((_Ui, store) => {
  const data = () => store?.ctx.data as ICatalogContext | undefined;

  return <Views.AppFrame url={data()?.selected?.url} />;
});

export default Frame;
