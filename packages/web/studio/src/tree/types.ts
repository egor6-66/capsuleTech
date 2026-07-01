import type { IEditorNode } from '@capsuletech/web-renderer';
import type { IPreset } from '@capsuletech/web-ui/manifest';

/**
 * Stateless-пропсы для `<Tree>` — резолвятся в `TreePanel` connected-обёртке из
 * `useDocument()`. Tree сам не читает store, чтобы быть тестируемым с любым
 * shape'ом nodes/selection.
 */
export interface ITreeProps {
  /** Map всех нод композиции (`schema.components.nodes`). */
  nodes: Record<string, IEditorNode>;
  /** ID корневой ноды (`schema.components.root`). */
  rootId: string;
  /** Текущий выбранный nodeId или null. */
  selectedNodeId: string | null;
  /** Callback при клике по строке — потребитель решает что писать в стор. */
  onSelect: (id: string) => void;
  /** Вставка пресета ребёнком в узел `parentId` (мини-палитра, creator-mode). */
  onInsert: (preset: IPreset, parentId: string) => void;
  /** Открыта ли строка-контейнер `id` (persist вне Kobalte; дефолт закрыто). */
  isExpanded: (id: string) => boolean;
  /** Сменить open-состояние строки-контейнера. */
  onToggleExpand: (id: string, open: boolean) => void;
}

export interface ITreeRowProps extends ITreeProps {
  /** Какую ноду рисует строка. */
  nodeId: string;
  /** Уровень вложенности — для отступа `padding-left`. */
  depth: number;
}
