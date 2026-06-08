import { Activity, Bot, FileText, FolderOpen } from 'lucide-solid';
import type { Component } from 'solid-js';

/**
 * NodeKind — каталог видов нод дашборда (ADR 027). Единый источник данных
 * для палитры (`Shapes.Palette`) и канваса (`Widgets.Canvas`):
 *   - `type`  — ключ вида (палитра тащит его, `createNode` материализует ноду);
 *   - `label` / `icon` — презентация (icon = component-ref);
 *   - `w` / `h` — стартовый размер ноды на канвасе (px).
 */
const NodeKind = Entity(({ zod }) => ({
  schema: zod.array(
    zod.object({
      type: zod.string(),
      label: zod.string(),
      icon: zod.custom<Component<{ class?: string }>>(),
      w: zod.number(),
      h: zod.number(),
    }),
  ),
  defaults: [
    { type: 'files', label: 'Файлы', icon: FolderOpen, w: 300, h: 240 },
    { type: 'monitor', label: 'Мониторинг', icon: Activity, w: 240, h: 180 },
    { type: 'agent', label: 'Агент', icon: Bot, w: 240, h: 180 },
    { type: 'docs', label: 'Доки', icon: FileText, w: 220, h: 160 },
  ],
}));

export default NodeKind;
