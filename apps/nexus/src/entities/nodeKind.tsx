import { Activity, Bot, FileText, FolderOpen } from 'lucide-solid';
import type { Component } from 'solid-js';

/**
 * NodeKind — каталог видов нод дашборда (ADR 027). Единый источник данных
 * для палитры (`Shapes.Palette`) и канваса (`Widgets.Canvas`):
 *   - `type`  — ключ вида (палитра тащит его, `createNode` материализует ноду);
 *   - `label` / `icon` — презентация (icon = component-ref);
 *   - `w` / `h` — стартовый размер ноды на канвасе (px).
 */
const NodeKind = Entity((z) => ({
  schema: z.array(
    z.object({
      type: z.string(),
      label: z.string(),
      icon: z.custom<Component<{ class?: string }>>(),
      w: z.number(),
      h: z.number(),
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
