/**
 * @capsuletech/web-shell/capsule — registration manifest (ADR 033).
 *
 * Declares the package's HCA surface so an app can mount it via
 * `capsule.app.ts: packages:` and get `Shell.*` components on the global
 * registry without per-app wiring.
 *
 * Matrix is no longer part of Shell — relocated to `@capsuletech/boost-layout`
 * per ADR 046 (amended 2026-06-12). Consumers now register boost-layout
 * separately and use `Layouts.Matrix` / `Ui.Layout.Matrix`.
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';

import {
  Appearance,
  FinishSettings,
  Header,
  LocalePicker,
  ModeToggle,
  Picker,
  ThemePicker,
} from './ui';

export default defineCapsuleModule({
  name: 'Shell',
  components: { Appearance, FinishSettings, Header, LocalePicker, ModeToggle, Picker, ThemePicker },
});
