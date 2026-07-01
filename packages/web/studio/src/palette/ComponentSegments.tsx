/**
 * ComponentSegments — общий сегментированный список «компонент → его пресеты».
 *
 * ЕДИНЫЙ строительный блок и для store-палитры (`ComponentsPalette`), и для
 * узловой мини-палитры дерева (`tree/NodePalette`). Различаются только:
 *  - **источник** (`manifests` — что показывать, уже отфильтровано потребителем);
 *  - **действие** (`onSelect` — что делает клик по пресету);
 *  - стили обёртки (задаёт потребитель снаружи).
 *
 * Так «добавили компонент/пресет в палитру → он сам появляется в узле» — нет
 * дрейфа между двумя палитрами (мандат USER, бриф `studio-palette-unify-segmented`).
 *
 * Рендер: kit `Accordion multiple` → на каждый manifest `Accordion.Item`
 * (компонент) → его `getPresets(type)` как click-items. Компонент без пресетов —
 * плоская строка без раскрытия (в узле таких не будет — фильтр `manifestsForNode`
 * берёт только `hasPresets`).
 */

import { Accordion } from '@capsuletech/web-ui/accordion';
import { Flex } from '@capsuletech/web-ui/flex';
import {
  getPresets,
  hasPresets,
  type IPreset,
  type IPrimitiveManifestEntry,
} from '@capsuletech/web-ui/manifest';
import { Tooltip } from '@capsuletech/web-ui/tooltip';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import { PresetPreview } from './PresetPreview';

export interface IComponentSegmentsProps {
  /** Манифесты для показа — уже отфильтрованы потребителем (группа / accepted). */
  manifests: readonly IPrimitiveManifestEntry[];
  /** Действие клика по пресету — потребитель решает (loadPreset / insertPreset). */
  onSelect: (preset: IPreset) => void;
  /** id активного пресета для подсветки (store-палитра); узлу не нужен. */
  selectedId?: string | null;
  /** Префикс `data-testid` пресет-кнопок. Дефолт `preset` (store); узел — `node-preset`. */
  testIdPrefix?: string;
}

/**
 * Action-agnostic leaf пресета: визуал один, действие инжектится сверху.
 * На ховере — тултип с живым превью компонента (`<PresetPreview>`), чтобы не
 * гадать «что это за компонент» без перехода в store / вставки в композицию.
 */
const PresetItem = (props: {
  p: IPreset;
  onSelect: (preset: IPreset) => void;
  selectedId?: string | null;
  testIdPrefix: string;
}) => (
  <Tooltip cursorTracking={false} openDelay={250}>
    <Tooltip.Trigger as="div" class="w-full">
      <button
        type="button"
        onClick={() => props.onSelect(props.p)}
        class="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        classList={{ 'bg-accent text-accent-foreground': props.selectedId === props.p.id }}
        data-testid={`${props.testIdPrefix}-${props.p.id}`}
      >
        {props.p.label}
      </button>
    </Tooltip.Trigger>
    <Tooltip.Content class="p-0">
      <PresetPreview schema={props.p.schema} />
    </Tooltip.Content>
  </Tooltip>
);

const ComponentLabel = (props: { m: IPrimitiveManifestEntry }) => (
  <Flex gap={2} align={'center'}>
    <Typography>{props.m.icon()}</Typography>
    <Typography variant={'muted'}>{props.m.label}</Typography>
  </Flex>
);

const ComponentNode = (props: {
  m: IPrimitiveManifestEntry;
  onSelect: (preset: IPreset) => void;
  selectedId?: string | null;
  testIdPrefix: string;
}) => (
  <Show
    when={hasPresets(props.m.type)}
    fallback={
      <div class="flex items-center gap-2 px-2 py-2 text-sm">
        <ComponentLabel m={props.m} />
      </div>
    }
  >
    <Accordion.Item value={props.m.type}>
      <Accordion.Trigger class={'py-2'}>
        <ComponentLabel m={props.m} />
      </Accordion.Trigger>
      <Accordion.Content>
        <div class="flex flex-col pl-3">
          <For each={getPresets(props.m.type)}>
            {(p) => (
              <PresetItem
                p={p}
                onSelect={props.onSelect}
                selectedId={props.selectedId}
                testIdPrefix={props.testIdPrefix}
              />
            )}
          </For>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  </Show>
);

export const ComponentSegments = (props: IComponentSegmentsProps) => (
  <Accordion multiple class="pl-3">
    <For each={props.manifests}>
      {(m) => (
        <ComponentNode
          m={m}
          onSelect={props.onSelect}
          selectedId={props.selectedId}
          testIdPrefix={props.testIdPrefix ?? 'preset'}
        />
      )}
    </For>
  </Accordion>
);
