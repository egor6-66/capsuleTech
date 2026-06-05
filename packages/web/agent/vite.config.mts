import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client/index.ts',
    tools: 'src/tools/index.ts',
    personas: 'src/personas/index.ts',
    controllers: 'src/controllers/index.ts',
    ui: 'src/ui/index.ts',
    capsule: 'src/capsule.ts',
  },
  name: 'CapsuleAgent',
});
