/**
 * Incident — карточка происшествия (incident card / emergency report).
 *
 * Заявитель звонит → диспетчер заносит карточку: кто заявитель, где
 * (координаты), что произошло. Каждое обращение — отдельная карточка.
 *
 * Single-item shape (`z.object`). Списки строятся через Shape
 * (`z.array(...schema)`) — см. shapes/incidentsTable.tsx.
 *
 * `mock` — 200 сидированных карточек для dev (DataTable scroll/DnD/карта).
 * Генерится ОДИН раз на module-load (фабрика Entity вызывается единожды) и
 * читается как `Entities.Incident.mock` — глобал, без импорта, ровно как
 * `Entities.Incident.schema`. В prod-сборке `import.meta.env.DEV` → `false`,
 * тернарник сворачивается в `[]`, а `makeMock` вместе со словарями
 * имён/описаний вырезается tree-shaking'ом — ни скрипт, ни данные не едут в
 * bundle. Реальные данные придут через `services.api.incidents.list()`.
 */
const Incident = Entity((z) => {
  const schema = z.object({
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
  });

  // Dev-only генератор. Всё (словари + RNG + сборка) живёт внутри makeMock,
  // поэтому при сворачивании тернарника minifier дропает функцию одним куском.
  const makeMock = () => {
    // mulberry32-light LCG — детерминированный сид, без drift при HMR.
    let rng = 42;
    const rand = (): number => {
      rng = (rng * 1664525 + 1013904223) | 0;
      return ((rng >>> 0) % 1_000_000) / 1_000_000;
    };
    const inRange = (min: number, max: number): number => min + rand() * (max - min);
    const pick = (list: readonly string[]): string => list[Math.floor(rand() * list.length)];
    const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

    // SPb bounding box (центр + ближайшие пригороды) — иначе маркеры улетят с карты.
    const SPB_LAT = [59.83, 60.05] as const;
    const SPB_LNG = [30.1, 30.55] as const;

    const FIRST_NAMES = [
      'Алексей', 'Мария', 'Иван', 'Ольга', 'Дмитрий', 'Анна', 'Сергей', 'Татьяна',
      'Михаил', 'Екатерина', 'Андрей', 'Наталья', 'Павел', 'Светлана', 'Виктор',
    ];
    const LAST_NAMES = [
      'Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Соколов',
      'Михайлов', 'Новиков', 'Фёдоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев',
    ];
    const DESCRIPTIONS = [
      'ДТП на перекрёстке, есть пострадавшие',
      'Возгорание в подвале жилого дома',
      'Утечка газа в квартире',
      'Подозрительный предмет на остановке',
      'Прорыв трубы холодного водоснабжения',
      'Падение крупного ветки на припаркованную машину',
      'Конфликт между жильцами с угрозой здоровью',
      'Ребёнок застрял в лифте',
      'Пожилому человеку плохо на улице',
      'Кошка на дереве, не может слезть',
      'Прорыв канализации',
      'Срабатывание сигнализации в магазине',
      'Возгорание автомобиля во дворе',
      'Затопление подвала после ливня',
      'Подозрение на отравление угарным газом',
    ];

    const makePhone = (): string => {
      const a = 900 + Math.floor(rand() * 99);
      const b = 100 + Math.floor(rand() * 899);
      const c = 10 + Math.floor(rand() * 89);
      const d = 10 + Math.floor(rand() * 89);
      return `+7 (${a}) ${b}-${pad2(c)}-${pad2(d)}`;
    };

    const makeIsoDate = (): string => {
      // Распределяем карточки за последние 30 дней.
      const offsetMinutes = Math.floor(rand() * 60 * 24 * 30);
      const d = new Date(Date.now() - offsetMinutes * 60 * 1000);
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(
        d.getUTCHours(),
      )}:${pad2(d.getUTCMinutes())}:00Z`;
    };

    return Array.from({ length: 200 }, (_, i) => ({
      id: `incident-${String(i + 1).padStart(4, '0')}`,
      applicant: {
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        phone: makePhone(),
      },
      location: {
        lng: Number(inRange(SPB_LNG[0], SPB_LNG[1]).toFixed(5)),
        lat: Number(inRange(SPB_LAT[0], SPB_LAT[1]).toFixed(5)),
      },
      description: pick(DESCRIPTIONS),
      createdAt: makeIsoDate(),
    }));
  };

  return {
    schema,
    mock: import.meta.env.DEV ? makeMock() : [],
  };
});

export default Incident;
