/**
 * Incident — карточка происшествия (incident card / emergency report).
 *
 * Заявитель звонит → диспетчер заносит карточку: кто заявитель, где
 * (координаты), что произошло. Каждое обращение — отдельная карточка.
 *
 * Single-item shape (`z.object`). Списки строятся через Shape
 * (`z.array(...schema)`) — см. shapes/incidentsTable.tsx.
 */
const Incident = Entity((z) => ({
  schema: z.object({
    id: z.string(),
    applicant: z.object({
      name: z.string(),
      phone: z.string(),
    }),
    location: z.object({
      lng: z.number(),
      lat: z.number(),
    }),
    description: z.string(),
    createdAt: z.string(), // ISO timestamp
  }),
}));

export default Incident;
