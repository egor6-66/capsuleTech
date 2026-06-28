/**
 * Widgets.Library.WordInfo — кормит инфо-панель. Читает selectedId + senses из
 * Features.Library, находит выбранный sense и отдаёт во Views.WordInfo.
 *
 * SKELETON: использует поля list-item'а. Rich-деталь (api.learn.sense) — след. шаг.
 */
const WordInfo = Widget(() => {
  const ctx = useCtx() as any;
  const selected = () => {
    const data = ctx.store?.ctx?.data;
    const id = data?.selectedId;
    return ((data?.senses as any[]) ?? []).find((s) => s.id === id) ?? null;
  };

  return <Views.WordInfo sense={selected()} />;
});

export default WordInfo;
