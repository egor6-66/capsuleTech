// Публичный контракт universal-canvas (ADR 060). Интерфейс аппа, агностичен к встраиванию.
// defineContract — глобал (auto-import).
export default defineContract((z) => ({
  // host → app: данные, инжектируемые в корневую HCA-шину канваса
  in: {
    ping: z.object({
      value: z.string(),
      ts: z.number(),
    }),
  },
  // app → host: событие собственной кнопки канваса с данными. Standalone —
  // обрабатывается локально; embedded — форвардится хосту ВМЕСТО локального
  // хендлера (ADR 060 D1), хост ловит у себя.
  out: {
    canvasClick: z.object({
      value: z.string(),
      ts: z.number(),
    }),
  },
}));
