/**
 * Learn endpoints — контракт к backend/learn (`/learn/lang/*`, ADR 064/064-A).
 *
 * `services.api.learn.senses(input)` — генерируется EndpointsRegistryPlugin'ом,
 * вызывается из Features (services.api). zod-схемы матчат backend SensesResponse
 * (schemas.py). enum-поля как string (loose) — не дублируем backend-enum'ы.
 *
 * База — `capsule.app.ts api.bases.default` (dev: http://127.0.0.1:8003).
 */

export const senses = defineEndpoint(({ zod }) => {
  const tag = zod.object({ name: zod.string(), kind: zod.string() });

  // Композиция ADR 067: готовая ссылка на voice-сервис (не байты). null = voice лежит.
  const audio = zod.object({ url: zod.string(), engines: zod.array(zod.string()) }).nullable();

  const senseListItem = zod.object({
    id: zod.number(),
    text: zod.string(),
    gloss: zod.string().nullable(),
    pos: zod.string(),
    level: zod.string().nullable(),
    register: zod.string().nullable(),
    frequency: zod.string().nullable(),
    pron_ru: zod.string().nullable(),
    connotation: zod.string().nullable(),
    synset: zod.string().nullable(),
    tags: zod.array(tag),
    audio,
  });

  return {
    method: 'GET' as const,
    path: '/learn/lang/senses',
    request: zod.object({
      lang: zod.string().optional(),
      pos: zod.string().optional(),
      level: zod.string().optional(),
      register: zod.string().optional(),
      domain: zod.string().optional(),
      tag: zod.string().optional(),
      tier: zod.string().optional(),
      synset: zod.string().optional(),
      q: zod.string().optional(),
    }),
    response: zod.object({ senses: zod.array(senseListItem) }),
  };
});

/** GET /learn/lang/sense/{id} — rich-деталь значения (SenseDetail, ADR 064-A). */
export const sense = defineEndpoint(({ zod }) => {
  const tag = zod.object({ name: zod.string(), kind: zod.string() });

  return {
    method: 'GET' as const,
    path: '/learn/lang/sense/:id',
    request: zod.object({ id: zod.number() }),
    response: zod.object({
      id: zod.number(),
      word: zod.object({ text: zod.string(), lang: zod.string() }),
      gloss: zod.string().nullable(),
      pos: zod.string(),
      level: zod.string().nullable(),
      register: zod.string().nullable(),
      frequency: zod.string().nullable(),
      source: zod.string(),
      pron_ru: zod.string().nullable(),
      ipa: zod.string().nullable(),
      image: zod.string().nullable(),
      connotation: zod.string().nullable(),
      intensity: zod.number().nullable(),
      synset: zod.string().nullable(),
      nuance: zod.string().nullable(),
      valency: zod.string().nullable(),
      forms: zod.record(zod.string(), zod.string()),
      collocations: zod.array(zod.string()),
      tags: zod.array(tag),
      examples: zod.array(
        zod.object({
          text: zod.string(),
          pron_ru: zod.string().nullable(),
          ru: zod.string().nullable(),
          ipa: zod.string().nullable(),
        }),
      ),
      relations: zod.array(zod.object({ type: zod.string(), target: zod.string() })),
      audio: zod.object({ url: zod.string(), engines: zod.array(zod.string()) }).nullable(),
    }),
  };
});

/** GET /learn/lang/senses/related?sense={id} — контекстный свап (synset-aware ранкинг). */
export const related = defineEndpoint(({ zod }) => {
  const tag = zod.object({ name: zod.string(), kind: zod.string() });

  return {
    method: 'GET' as const,
    path: '/learn/lang/senses/related',
    request: zod.object({
      sense: zod.number(),
      context: zod.string().optional(),
      limit: zod.number().optional(),
    }),
    response: zod.object({
      related: zod.array(
        zod.object({
          id: zod.number(),
          text: zod.string(),
          gloss: zod.string().nullable(),
          sharedTags: zod.number(),
          sameSynset: zod.boolean(),
          connotation: zod.string().nullable(),
          intensity: zod.number().nullable(),
          synset: zod.string().nullable(),
          tags: zod.array(tag),
        }),
      ),
    }),
  };
});
