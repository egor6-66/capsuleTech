export const get = defineEndpoint((z) => ({
  method: 'GET',
  path: '/users/:id',
  request: z.object({ id: z.string() }),
  response: z.object({
    id: z.string(),
    email: z.string(),
    createdAt: z.string(),
  }),
  map: (dto) => ({ ...dto, createdAt: new Date(dto.createdAt) }),
}));

export const update = defineEndpoint((z) => ({
  method: 'PATCH',
  path: '/users/:id',
  request: z.object({
    id: z.string(),
    email: z.string().email().optional(),
  }),
  response: z.object({
    id: z.string(),
    email: z.string(),
  }),
}));

export const list = defineEndpoint((z) => ({
  method: 'GET',
  path: '/users',
  request: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
  response: z.object({
    items: z.array(z.object({ id: z.string(), email: z.string() })),
    total: z.number(),
  }),
}));
