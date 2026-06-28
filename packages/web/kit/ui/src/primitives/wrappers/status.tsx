import { type ComponentStatus, STATUS_VARIABLES } from '@capsuletech/web-style';
import { children, type JSX } from 'solid-js';
import { useTrace } from '../../internal/useTrace';

interface StatusProps {
  status?: ComponentStatus;
  children: JSX.Element;
}

export const Status = (props: StatusProps) => {
  useTrace('web-ui.status'); // ADR 062
  // Получаем реактивный доступ к детям
  const resolved = children(() => props.children);

  return (
    // Мы оборачиваем в span (или div) с display: contents,
    // чтобы он не влиял на верстку, но передавал CSS-переменную
    <div
      style={STATUS_VARIABLES[props.status || 'idle'] as JSX.CSSProperties}
      class="contents"
      data-slot="status-wrapper"
    >
      {resolved()}
    </div>
  );
};
