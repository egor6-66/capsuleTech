/**
 * Editor.Inspector — инспектор пропсов выбранного узла (ADR 032, фаза 6, чанк 4).
 *
 * Портировано из `apps/ui-creator/src/widgets/inspector.tsx` с расширениями:
 *  - `ctx.store.ctx as IEditorCtx` → `useEditor()` (без кастов);
 *  - read-only панель → полноценное редактирование пропсов через generic Inspector;
 *  - маппинг `manifest.propsSchema` → `ICategory[]` через `schemaToInspectorCategories()`;
 *  - мутации через `useEmit('onUpdateNodeProps', ...)` → EditorController.onUpdateNodeProps.
 *
 * Показывает:
 *  - шапку с icon/label/type/id/count детей (meta-секция, read-only);
 *  - редактируемые поля пропсов через generic Inspector (зависит от propsSchema);
 *  - fallback «Выберите компонент» если нет selectedId.
 *
 * Нет внешних props — всё из useEditor() + useEmit().
 */

import type { ZodTypeAny } from '@capsuletech/shared-zod';
import { useEmit } from '@capsuletech/web-core';
import { Flex } from '@capsuletech/web-ui/flex';
import { For, Show } from 'solid-js';
import { Inspector } from '../inspector/Inspector';
import type { ICategory, IFieldDef } from '../inspector/types';
import { getManifest } from '../manifests/registry';
import type { IOnUpdateNodePropsPayload } from './EditorController';
import { useEditor } from './useEditor';

// ── Zod-shape → ICategory[] ────────────────────────────────────────────────────

/**
 * Конвертирует `propsSchema` (ZodObject) в список категорий для generic Inspector.
 *
 * Поддерживает: ZodString, ZodEnum, ZodBoolean, ZodNumber, ZodOptional (unwrap).
 * Неизвестные типы пропускаются (graceful degradation).
 *
 * Возвращает единственную категорию «Пропсы» — расширить на несколько при
 * появлении meta-групп в manifest.
 */
export const schemaToInspectorCategories = (
  schema: ZodTypeAny,
  values: Record<string, unknown>,
): ICategory[] => {
  // Пытаемся получить ZodObject._def.shape()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)?._def;
  if (!def) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shape: Record<string, ZodTypeAny> =
    typeof def.shape === 'function' ? def.shape() : (def.shape ?? {});

  const fields: IFieldDef[] = [];

  for (const [key, rawField] of Object.entries(shape)) {
    // Пропускаем data-* — служебные
    if (key.startsWith('data-')) continue;

    // Unwrap ZodOptional / ZodDefault
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let field: any = rawField;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    while (field?._def?.typeName === 'ZodOptional' || field?._def?.typeName === 'ZodDefault') {
      field = field._def.innerType ?? field._def.schema;
    }

    const typeName: string = field?._def?.typeName ?? '';

    if (typeName === 'ZodString') {
      fields.push({ key, label: key, type: 'text', placeholder: String(values[key] ?? '') });
    } else if (typeName === 'ZodEnum') {
      const options: { value: string; label?: string }[] = (field._def.values as string[]).map(
        (v) => ({ value: v }),
      );
      fields.push({ key, label: key, type: 'select', options });
    } else if (typeName === 'ZodBoolean') {
      fields.push({ key, label: key, type: 'boolean' });
    } else if (typeName === 'ZodNumber') {
      fields.push({ key, label: key, type: 'number' });
    }
    // Неизвестные типы пропускаются
  }

  if (fields.length === 0) return [];

  return [
    {
      id: 'props',
      label: 'Пропсы',
      fields,
    },
  ];
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Editor.Inspector — монтируется внутри `<Editor.Provider>`.
 *
 * Читает selectedId + tree через `useEditor()`.
 * Эмитит `onUpdateNodeProps` при изменении любого поля.
 */
export const EditorInspector = () => {
  const ed = useEditor();
  const emit = useEmit();

  const node = () => {
    const id = ed.selectedId;
    return id ? (ed.tree.nodes[id] ?? null) : null;
  };

  const manifest = () => {
    const n = node();
    return n ? getManifest(n.type) : undefined;
  };

  /** Категории для Inspector — строятся из propsSchema выбранной ноды. */
  const categories = () => {
    const m = manifest();
    const n = node();
    if (!m || !n) return [];
    return schemaToInspectorCategories(m.propsSchema, n.props);
  };

  /** Текущие значения пропсов (плоская map key → value). */
  const values = (): Record<string, unknown> => node()?.props ?? {};

  /** Обработчик изменения поля — эмитит onUpdateNodeProps в EditorController. */
  const handleChange = (key: string, value: unknown) => {
    const n = node();
    if (!n) return;
    const payload: IOnUpdateNodePropsPayload = {
      nodeId: n.id,
      props: { [key]: value },
    };
    emit('onUpdateNodeProps', { payload });
  };

  return (
    <Flex orientation="vertical" class="h-full">
      <div class="shrink-0 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
        Инспектор
      </div>
      <Show
        when={node()}
        fallback={
          <Flex class="flex-1 items-center justify-center text-sm text-foreground/40">
            Выберите компонент
          </Flex>
        }
      >
        <div class="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
          {/* Meta-секция: иконка, label, type, id, кол-во детей */}
          <Flex class="mb-3 items-center gap-2">
            <span class="text-foreground/60">{manifest()?.icon()}</span>
            <span class="font-medium">{manifest()?.label ?? node()?.type}</span>
          </Flex>

          <dl class="mb-3 space-y-1.5" data-testid="inspector-meta">
            <Flex class="items-center justify-between gap-2">
              <dt class="shrink-0 text-foreground/50">Тип</dt>
              <dd class="truncate font-mono text-xs">{node()?.type}</dd>
            </Flex>
            <Flex class="items-center justify-between gap-2">
              <dt class="shrink-0 text-foreground/50">ID</dt>
              <dd class="truncate font-mono text-xs">{node()?.id}</dd>
            </Flex>
            <Flex class="items-center justify-between gap-2">
              <dt class="shrink-0 text-foreground/50">Детей</dt>
              <dd data-testid="inspector-children-count">{node()?.children.length}</dd>
            </Flex>
          </dl>

          {/* Редактируемые пропсы через generic Inspector */}
          <Show when={categories().length > 0}>
            <div class="border-t pt-3" data-testid="inspector-props">
              <Inspector categories={categories()} values={values()} onChange={handleChange} />
            </div>
          </Show>

          {/* Fallback: у ноды нет propsSchema или schema пустая */}
          <Show when={categories().length === 0}>
            <For each={Object.entries(node()?.props ?? {}).filter(([k]) => !k.startsWith('data-'))}>
              {([k, v]) => (
                <Flex class="items-center justify-between gap-2 border-t pt-1.5 first:border-t-0">
                  <dt class="shrink-0 text-foreground/50">{k}</dt>
                  <dd class="truncate font-mono text-xs text-foreground/70">{String(v)}</dd>
                </Flex>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </Flex>
  );
};
