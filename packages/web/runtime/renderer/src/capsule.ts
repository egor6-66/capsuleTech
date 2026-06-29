/**
 * @capsuletech/web-renderer/capsule — registration manifest (ADR 033).
 *
 * Declares the package's HCA surface so an app can mount it via
 * `capsule.app.ts: packages:` and get `Renderer.*` components on the global
 * registry without per-app wiring. Apps cannot `import` from packages directly
 * (compliance `app-package-import` = structural error) — the global is the only
 * legal way in.
 *
 * After registration:
 *   - `Renderer.View` → <Renderer> — renders a UI tree from a JSON schema +
 *     component registry. Allowed in Widget / Feature layers (HCA rule).
 *
 * The renderer engine is stateless and unchanged — this is only the manifest
 * wrapper, mirroring @capsuletech/web-remote/capsule.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { Renderer } from './renderer';

export default defineCapsuleModule({
  name: 'Renderer', // НЕ JS-builtin → TS2451 не грозит
  components: { View: Renderer },
});
