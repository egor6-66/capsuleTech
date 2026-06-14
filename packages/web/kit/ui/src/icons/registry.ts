/**
 * Curated icon registry — maps a typed string name to a lucide-solid component.
 *
 * Data-driven composites (e.g. `Ui.Menu`) reference icons by NAME (a string),
 * not by component ref, so their item descriptors stay serializable (JSON) and
 * fit config-driven / agent-generated / alternative-renderer use. The renderer
 * resolves the name to a component via {@link resolveIcon}.
 *
 * Tree-shaking is preserved: only the icons listed here are imported, so the
 * bundle never pulls in all of lucide. Grow the registry as new icons are needed.
 *
 * @example
 * ```ts
 * import { resolveIcon, type IconName } from '@capsuletech/web-ui/icons';
 * const Comp = resolveIcon('log-out');
 * ```
 */
import {
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Image,
  Info,
  LogIn,
  LogOut,
  Maximize2,
  Menu,
  Moon,
  Move,
  Palette,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-solid';

/**
 * Name → component map. Keys are kebab-case lucide names. Add an entry here to
 * make an icon referenceable by string from data-driven composites.
 */
export const iconRegistry = {
  bell: Bell,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'grip-vertical': GripVertical,
  image: Image,
  info: Info,
  'log-in': LogIn,
  'log-out': LogOut,
  'maximize-2': Maximize2,
  menu: Menu,
  moon: Moon,
  move: Move,
  palette: Palette,
  plus: Plus,
  search: Search,
  settings: Settings,
  'sliders-horizontal': SlidersHorizontal,
  sparkles: Sparkles,
  sun: Sun,
  'trash-2': Trash2,
  user: User,
  x: X,
} as const;

/**
 * PascalCase namespace suitable for use as `Ui.Icons.*` in app-layer code.
 *
 * Keys match lucide-solid component names so app authors write
 * `<Ui.Icons.GripVertical />` — identical to the lucide export name.
 *
 * This object is the authoritative whitelist: only icons listed here (and in
 * {@link iconRegistry}) are pulled into app bundles, keeping tree-shaking intact.
 * Add to both maps when a new icon is needed.
 */
export const Icons = {
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Image,
  Info,
  LogIn,
  LogOut,
  Maximize2,
  Menu,
  Moon,
  Move,
  Palette,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  User,
  X,
} as const;

/** Union of all registered icon names — the typed `icon` value in data contracts. */
export type IconName = keyof typeof iconRegistry;

/** A lucide-solid icon component as stored in the registry. */
export type IconComponent = (typeof iconRegistry)[IconName];

/** Resolve a registered icon name to its component. */
export function resolveIcon(name: IconName): IconComponent {
  return iconRegistry[name];
}
