/**
 * Icons subpath — re-exports all lucide-solid icons tree-shakeably.
 *
 * @example
 * ```tsx
 * import { ChevronRight, X, Settings } from '@capsuletech/web-ui/icons';
 * ```
 *
 * web-ui is the single owner of lucide-solid in the project;
 * other packages import icons from here instead of lucide-solid directly.
 *
 * The curated {@link iconRegistry} / {@link IconName} / {@link resolveIcon} let
 * data-driven composites reference icons by serializable string name.
 */
export * from 'lucide-solid';
export * from './registry';
