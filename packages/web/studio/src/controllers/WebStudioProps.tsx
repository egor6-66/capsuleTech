/**
 * WebStudio.Props — редактор пропсов выбранного пресета.
 *
 * Читает редактируемую `schema()` из shared singleton'а (Solid Store).
 * Резолвит manifest корневой ноды (через `@capsuletech/web-ui/manifest`),
 * конвертирует `propsSchema` (zod) → categories для generic Inspector'а
 * и рендерит его.
 *
 * **Field rules** — гибкий механизм условной видимости/блокировки полей
 * (`@capsuletech/web-ui/manifest` → `applyFieldRule`). Например, для Button: при `size === 'icon'`
 * скрываем поле `children` (текстовый children лишний — иконку рисует
 * child-нода `ui.Icons.<Name>`).
 *
 * **Icon-picker** — если у корневой ноды есть child типа `ui.Icons.X`,
 * `icon` инжектится в категории Inspector'а как обычное select-поле.
 * onChange ветвится по ключу: `icon` → `patchNodeType` (меняет тип
 * child-ноды на `ui.Icons.<Name>`), всё остальное → `patchProps`.
 *
 * Categories мемоизируются (createMemo) — пока тип ноды не меняется, ref
 * массива стабилен → Inspector не remount'ит поля → фокус input'ов
 * сохраняется при вводе.
 */

import { Flex } from '@capsuletech/web-ui/flex';
import { Icons } from '@capsuletech/web-ui/icons';
import { applyFieldRule, getManifest } from '@capsuletech/web-ui/manifest';
import { Typography } from '@capsuletech/web-ui/typography';
import { createMemo, Show } from 'solid-js';
import { Inspector } from '../inspector/Inspector';
import type { ICategory, ISelectField } from '../inspector/types';
import { schemaToInspectorCategories } from '../inspector/zod-to-categories';
import { useSelectedPreset } from '../selection';

const ICON_NAMES = Object.keys(Icons) as ReadonlyArray<keyof typeof Icons>;

const ICON_FIELD: ISelectField = {
  key: 'icon',
  label: 'icon',
  type: 'select',
  options: ICON_NAMES.map((n) => ({ value: n })),
};

export const WebStudioProps = () => {
  const { schema, patchProps, patchNodeType } = useSelectedPreset();

  const rootNode = () => {
    const s = schema();
    if (!s) return null;
    return s.components.nodes[s.components.root] ?? null;
  };

  const manifest = () => {
    const node = rootNode();
    return node ? getManifest(node.type) : undefined;
  };

  const baseCategories = createMemo(() => {
    const m = manifest();
    return m ? schemaToInspectorCategories(m.propsSchema) : [];
  });

  const ruleResult = () => {
    const node = rootNode();
    if (!node) return {};
    return applyFieldRule(node.type, (node.props ?? {}) as Record<string, unknown>);
  };

  // Icon-child: child-нода `ui.Icons.<Name>` корневой ноды (если есть).
  // Для Button size=icon это единственный child; имя иконки = «proxy-prop»
  // самой кнопки, поэтому редактируется через тот же Inspector.
  const iconChild = () => {
    const s = schema();
    const root = rootNode();
    if (!s || !root || root.children.length === 0) return null;
    for (const childId of root.children) {
      const child = s.components.nodes[childId];
      if (child?.type.startsWith('ui.Icons.')) return child;
    }
    return null;
  };

  // hasIcon мемоизируем (===-сравнение по boolean) — иначе смена ИМЕНИ
  // иконки через patchNodeType фиктивно дёргает categories() (iconChild
  // реактивно подписан на child.type) → новый массив + новые category-объекты
  // → <For each={categories}> в Inspector ремаунтит ВСЁ → Select закрывается.
  // hasIcon как boolean-memo не файрит при смене с 'Plus' на 'Settings',
  // поэтому categories() не пересчитывается, Select остаётся открытым
  // (закрытие/открытие — забота closeOnSelection).
  const hasIcon = createMemo(() => iconChild() !== null);

  // Финальные categories: rules применены + icon-поле inject'ится в первую
  // категорию когда у ноды есть icon-child. Это превращает иконку в обычный
  // props-field — рендерится через дефолтный Inspector→SelectField, без
  // отдельного флоу.
  const categories = (): ICategory[] => {
    const base = baseCategories();
    const r = ruleResult();
    const hidden = new Set(r.hidden ?? []);
    const disabled = new Set(r.disabled ?? []);
    const hasIconNow = hasIcon();
    if (hidden.size === 0 && disabled.size === 0 && !hasIconNow) return base;
    return base.map((cat, i) => {
      // Icon-field занимает СЛОТ `children` (тот же логический prop, другой
      // тип ввода). Считаем индекс ДО фильтрации, иначе rule.hidden['children']
      // выкинет его и мы потеряем позицию.
      const childrenIdx =
        hasIconNow && i === 0 ? cat.fields.findIndex((f) => f.key === 'children') : -1;
      const mapped = cat.fields.map((f, idx) => {
        if (idx === childrenIdx) return ICON_FIELD;
        if (disabled.has(f.key)) return { ...f, disabled: true };
        return f;
      });
      const fields = mapped.filter((f) => f.key === ICON_FIELD.key || !hidden.has(f.key));
      // hasIcon с нестандартным manifest'ом (нет `children`) — кладём в конец как fallback.
      if (hasIconNow && i === 0 && childrenIdx === -1)
        return { ...cat, fields: [...fields, ICON_FIELD] };
      return { ...cat, fields };
    });
  };

  const values = (): Record<string, unknown> => {
    const props = (rootNode()?.props ?? {}) as Record<string, unknown>;
    const ch = iconChild();
    if (!ch) return props;
    return { ...props, icon: ch.type.slice('ui.Icons.'.length) };
  };

  const onChange = (key: string, value: unknown) => {
    const node = rootNode();
    if (!node) return;
    if (key === 'icon') {
      const ch = iconChild();
      if (ch) patchNodeType(ch.id, `ui.Icons.${String(value)}`);
      return;
    }
    patchProps(node.id, { [key]: value });
  };

  return (
    <Flex orientation="vertical" gap={2} class="h-full w-full overflow-y-auto">
      <Show
        when={rootNode()}
        fallback={
          <Typography tone="muted" size="sm">
            Выберите пресет в палитре чтобы редактировать пропсы
          </Typography>
        }
      >
        <Show when={categories().length > 0}>
          <Inspector categories={categories()} values={values()} onChange={onChange} />
        </Show>
      </Show>
    </Flex>
  );
};
