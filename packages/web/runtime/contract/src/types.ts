/**
 * Базовые типы leaf-протокола контрактов. Zero-dep: ничего не импортируем
 * (даже solid). Контракт — чистые данные + функция `validate`.
 */

/**
 * Роль сущности в экосистеме capsule. Два яруса:
 * - **UI-kit тиры** (`@capsuletech/web-ui`) — `primitive` (лист: Button, Input),
 *   `composition` (compound со слотами: Card, Field);
 * - **HCA-слои** (`apps/<app>/src`) — view / shape / widget / page /
 *   controller / feature / entity.
 *
 * `(string & {})` — щель для сторонних либ. Семантику внешних договоров
 * проектируем позже; пока сюда ничего каноничного не кладём.
 */
export type EntityKind =
  // UI-kit тиры
  | 'primitive'
  | 'composition'
  // HCA-слои
  | 'view'
  | 'shape'
  | 'widget'
  | 'page'
  | 'controller'
  | 'feature'
  | 'entity'
  // щель для сторонних либ (семантика — позже)
  | (string & {});

/**
 * Жёсткость правила (ADR-спека contracts.md, правило №1):
 * - `constraint` — блокирует (невалидный проп / недопустимый потомок);
 * - `recommendation` — подсказывает/варнит, но разрешает.
 */
export type Severity = 'constraint' | 'recommendation';

/** Результат сработавшего check'а. */
export interface Violation {
  ruleId: string;
  severity: Severity;
  message: string;
}

/** Один демо-кейс компонента — витрина стенда (catalog) рендерит его. */
export interface Example {
  name: string;
  props?: Record<string, unknown>;
  /** Опц. дети для композиций — рендерер катит их в слот. */
  children?: unknown;
}

/**
 * Минимальная zod-совместимая форма. Leaf не импортит zod (zero-dep) —
 * принимает любой объект с `safeParse`. Компонент кладёт сюда `Zod`-схему
 * (Zod — глобал из @capsuletech/shared-zod), leaf лишь хранит и дёргает.
 */
export interface SchemaLike {
  safeParse(value: unknown): { success: boolean; error?: unknown };
}

/** Инстанс-контекст, над которым прогоняются check'и правил. */
export interface RuleContext {
  /** Props инстанса (для props/variants/recommend). */
  props?: Record<string, unknown>;
  /** Дети-инстансы (для accepts/isLeaf). Каждый несёт kind и/или name. */
  children?: ReadonlyArray<{ kind?: EntityKind; name?: string }>;
  /** Произвольные предикат-флаги для recommend (напр. `hasLabel`). */
  [key: string]: unknown;
}

/**
 * Декларативный «срез» поверхности компонента. Каждое правило докидывает
 * сюда свой facet; собранный surface читают редакторы/стенд/доки.
 */
export interface ContractSurface {
  /** Лист — не принимает детей. */
  isLeaf?: boolean;
  /** Какие типы детей допустимы (parent-side, single source вложенности). */
  accepts?: readonly string[];
  /** Схема props (zod-совместимая). */
  props?: SchemaLike;
  /** Закрытый список вариантов (напр. variant/size). */
  variants?: readonly string[];
  /** Темизируемые слоты — их видит style-редактор. */
  styleSlots?: readonly string[];
  /** Data-bindable форма — её видит data-редактор. */
  data?: SchemaLike | Record<string, unknown>;
  /** Трассируемые события — их видит монитор. */
  events?: readonly string[];
  /** Демо-кейсы для стенда. */
  examples?: readonly Example[];
}

/** Правило-примитив: декларативный facet + опц. валидация инстанса. */
export interface Rule {
  /** Идентификатор примитива: 'isLeaf' | 'accepts' | 'props' | … */
  readonly id: string;
  readonly severity: Severity;
  /** Декларативный вклад в surface (мерджится в contract.surface). */
  readonly facet?: Partial<ContractSurface>;
  /** Валидация инстанса. Нет check → правило чисто декларативное. */
  check?(ctx: RuleContext): Violation | null;
}

/**
 * База контракта — обязательное ядро. Без неё окружение НЕ воспринимает
 * сущность. `defineContract` штампует её всегда; минимальный контракт —
 * `defineContract({ name, kind })` без правил.
 */
export interface ContractBase {
  /** Уникальное имя сущности (палитра/реестр ссылаются на него). */
  name: string;
  /** Роль в окружении. */
  kind: EntityKind;
}

/** Собранный контракт сущности. */
export interface Contract extends ContractBase {
  /** Накопленные декларативные facets всех правил. */
  readonly surface: ContractSurface;
  /** Сырые правила — для повторной инспекции/прогона. */
  readonly rules: readonly Rule[];
  /** Прогон всех check'ов над инстансом → список нарушений. */
  validate(ctx: RuleContext): Violation[];
}
