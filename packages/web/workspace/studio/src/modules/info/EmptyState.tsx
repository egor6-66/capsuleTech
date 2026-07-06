/**
 * EmptyState — заглушка info-панели, когда узел не выбран. Kit-плейсхолдер
 * `Placeholders.Empty` (как в learn), без ручной вёрстки.
 */

import { Empty } from '@capsuletech/web-placeholders';

export const EmptyState = () => (
  <Empty
    compact
    title="Выберите компонент"
    description="Контракт и описание появятся здесь."
  />
);
