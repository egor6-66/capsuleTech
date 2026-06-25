// Публичный контракт universal-canvas (ADR 060). Агностичен к встраиванию —
// это интерфейс аппа, не remote-схема. defineContract — глобал (auto-import).
export default defineContract((z) => ({
  // host → app: события, диспатчащиеся в корень канваса
  in: {
    setMarkers: z.object({
      markers: z.array(
        z.object({
          id: z.string(),
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        }),
      ),
    }),
  },
  // app → host: корневой surface канваса
  out: {
    mounted: z.object({ name: z.string(), ts: z.number() }),
  },
}));
