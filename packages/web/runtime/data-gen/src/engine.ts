import { fuzzProps } from './fuzzer';
import { coin, createRng, pickWeighted, type Rng, randomInt, seededId } from './rng';
import type {
  IEditorNode,
  IEditorTree,
  IGenerateOptions,
  IPreset,
  ISlotPick,
  ISlotRule,
  NodeId,
} from './types';

/**
 * Procedurally генерит `IEditorTree` (формат-совместим с `ISchema.components`
 * у renderer'а) на основе preset'а. Каждый запуск с одним seed → одинаковый
 * tree.
 *
 * Алгоритм (recursive descent):
 *   1. Выбирает root через `pickWeighted(rootCandidates)`.
 *   2. Для каждого `ISlotRule` в `pick.slots`:
 *      - coin(probability) — появляется ли слот.
 *      - randomInt(countRange) — сколько детей вставить.
 *      - для каждого ребёнка — pickWeighted(rule.pick) → рекурсия.
 *   3. Каждый узел получает id через seededId(rng) (тот же seed → тот же id).
 *   4. Props заполняются через `options.resolveManifest?.(type)` → fuzz'инг
 *      на основе propsSchema + defaultProps. Если resolver не задан или
 *      manifest не найден — узел создаётся с пустыми props.
 *   5. После fuzz'инга — `pick.refineProps?.(props)` для зависимых полей.
 */
export const generate = (preset: IPreset, options: IGenerateOptions = {}): IEditorTree => {
  const rng: Rng = options.rng ?? createRng(options.seed ?? Date.now());
  const resolve = options.resolveManifest;

  const rootPick = pickRootPick(rng, preset);
  const nodes: Record<NodeId, IEditorNode> = {};
  const rootId = buildNode(rng, rootPick, null, nodes, resolve);

  return { root: rootId, nodes };
};

const pickRootPick = (rng: Rng, preset: IPreset): ISlotPick => {
  if (preset.rootCandidates.length === 0) {
    throw new Error(`generate: preset "${preset.name}" has no rootCandidates`);
  }
  const weights = preset.rootCandidates.map((c) => c.weight ?? 1);
  return pickWeighted(rng, preset.rootCandidates, weights);
};

const buildNode = (
  rng: Rng,
  spec: ISlotPick,
  parentId: NodeId | null,
  nodes: Record<NodeId, IEditorNode>,
  resolve: IGenerateOptions['resolveManifest'],
): NodeId => {
  const id = seededId(rng);
  const manifest = resolve?.(spec.type);

  let props: Record<string, unknown> = manifest?.propsSchema
    ? fuzzProps(rng, manifest.propsSchema, manifest.defaultProps ?? {})
    : {};
  if (spec.refineProps) props = spec.refineProps(props);

  const node: IEditorNode = {
    id,
    type: spec.type,
    parentId,
    children: [],
    props,
    meta: {},
    styles: {},
  };
  nodes[id] = node;

  if (spec.slots) {
    for (const slot of spec.slots) {
      const ids = buildSlotChildren(rng, slot, id, nodes, resolve);
      node.children.push(...ids);
    }
  }

  return id;
};

const buildSlotChildren = (
  rng: Rng,
  slot: ISlotRule,
  parentId: NodeId,
  nodes: Record<NodeId, IEditorNode>,
  resolve: IGenerateOptions['resolveManifest'],
): NodeId[] => {
  const probability = slot.probability ?? 1;
  if (!coin(rng, probability)) return [];

  if (slot.pick.length === 0) return [];

  const [min, max] = slot.countRange ?? [1, 1];
  const count = randomInt(rng, min, max);
  if (count <= 0) return [];

  const weights = slot.pick.map((p) => p.weight ?? 1);
  const ids: NodeId[] = [];
  for (let i = 0; i < count; i++) {
    const spec = pickWeighted(rng, slot.pick, weights);
    ids.push(buildNode(rng, spec, parentId, nodes, resolve));
  }
  return ids;
};
