import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    role: 'src/role/index.ts',
    credentials: 'src/credentials/index.ts',
    oauth2: 'src/oauth2/index.ts',
    qr: 'src/qr/index.ts',
    session: 'src/session/index.ts',
    controllers: 'src/controllers/index.tsx',
    ui: 'src/ui/index.ts',
    capsule: 'src/capsule.ts',
  },
  name: 'CapsuleAuth',
});
