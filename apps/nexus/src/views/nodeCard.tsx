import type { Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';

/**
 * NodeCard — тело ноды на канвасе: иконка + лейбл вида (данные из `NodeKind`).
 * Один бордер (Ui.Card) + внутренний паддинг (`p-cell`), чтобы контент не
 * прилегал вплотную. Обёртка-нода на канвасе бордера не добавляет.
 */
const NodeCard = View((Ui, props: { label?: string; icon?: Component<{ class?: string }> }) => (
  <Ui.Card class="flex h-full w-full flex-col items-center justify-center gap-2 p-cell">
    <Dynamic component={props.icon} class="size-8 text-muted-foreground" />
    <Ui.Typography variant="h4">{props.label}</Ui.Typography>
  </Ui.Card>
));

export default NodeCard;
