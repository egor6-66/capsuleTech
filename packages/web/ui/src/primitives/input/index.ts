// Input barrel — Input only.
// Select and Textarea live in this folder for code-locality (form-family),
// but their public exports go through dedicated subpaths
// (@capsuletech/web-ui/select, @capsuletech/web-ui/textarea) to keep the
// input subpath tree-shake friendly.
//
// Top-level shims `primitives/select/index.ts` + `primitives/textarea/index.ts`
// re-export from here.
export * from './input';
export type * as IInput from './interfaces';
