/**
 * Контракт событий DataTable — строки, клик, выбор (ADR 032).
 *
 * IDataTableEvents — phantom-маркер для `Feature<EventsOf<typeof Tables.DataTable>>`.
 * Имена выбраны по аналогии с HCA-паттерном (матрица: onLayoutChange).
 *
 * target-форма (ADR 032 §2):
 *   { meta, payload, key?, modifiers? }
 *
 * Поля:
 *  - meta     — из itemMeta(row): { tags: string[], ...user-fields }
 *  - payload  — из itemPayload(row): Record<string, unknown>
 *
 * Оба поля — optional: потребитель может не передавать itemMeta/itemPayload.
 */

export interface IDataTableRowTarget {
  /** itemMeta(row) — теги и произвольные поля строки. */
  meta?: { tags: string[]; [k: string]: unknown };
  /** itemPayload(row) — полезная нагрузка строки. */
  payload?: Record<string, unknown>;
}

/**
 * rowClick — клик по строке таблицы.
 * rowSelect — выбор строки (checkbox / programmatic).
 */
export interface IDataTableEvents {
  onRowClick: IDataTableRowTarget;
  onRowSelect: IDataTableRowTarget;
}
