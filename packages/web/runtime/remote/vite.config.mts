import { libConfig } from '../../../builders/lib/src';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    // boot.js — iframe-side shell, separate dist-asset.
    // Imported in RemoteComponent via: import bootUrl from '@capsuletech/web-remote/boot.js?url'
    // ADR-053 consequences-negative: shell is too heavy for inline srcdoc.
    boot: 'src/shell/boot.ts',
  },
  name: 'CapsuleRemote',
});
