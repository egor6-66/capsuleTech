/**
 * @capsuletech/web-remote/capsule — registration manifest (ADR 033).
 *
 * Declares the package's HCA surface so an app can mount it via
 * `capsule.app.ts: packages:` and get `Remote.*` components on the global
 * registry without per-app wiring.
 *
 * After registration:
 *   - `Remote.Provider` → <RemoteProvider> — root provider, mounts above <RouterProvider>.
 *   - `Remote.View`     → <RemoteView>     — thin wrapper over useRemote().Remote.
 *
 * Note: `Remote.Provider` must be placed at app level (inside BaseProviders, above RouterProvider).
 * `Remote.View` is allowed in Widget and Feature layers only (HCA rule, enforced Phase 5+).
 *
 * ADR 015: architecture + transport model.
 * ADR 053: two-channel contract + bootstrap lifecycle.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { RemoteProvider } from './runtime/RemoteProvider';
import { RemoteView } from './runtime/RemoteView';

export default defineCapsuleModule({
  name: 'Remote',
  components: { Provider: RemoteProvider, View: RemoteView },
});
