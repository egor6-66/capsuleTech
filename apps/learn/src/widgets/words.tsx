/**
 * Widgets.Library.Words — кормит сетку слов. Читает senses из Features.Library
 * (страничный Feature) через useCtx, маппит в { id, text, translation:gloss } и отдаёт
 * во Views.WordList. Выбор/поиск — на стороне Feature (тайлы несут meta+payload).
 */
const Words = Widget(() => {
  const ctx = useCtx() as any;
  const words = () =>
    ((ctx.store?.ctx?.data?.senses as any[]) ?? []).map((s) => ({
      id: s.id,
      text: s.text,
      translation: s.gloss,
      audioUrl: s.audio?.url ?? null,
    }));
  const selectedId = () => ctx.store?.ctx?.data?.selectedId ?? null;

  return <Views.WordList words={words()} selectedId={selectedId()} />;
});

export default Words;
