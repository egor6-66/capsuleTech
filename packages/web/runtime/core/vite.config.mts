import { libConfig } from '../../../builders/lib/src';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    create: 'src/create/index.ts',
    providers: 'src/providers/index.ts',
    'app-config': 'src/app-config.ts',
    module: 'src/module.ts',
    'ui-kit': 'src/ui-kit/index.tsx',
    bootstrap: 'src/bootstrap/index.ts',
  },
  name: 'CapsuleCore',
  runtime: 'isomorphic',
});
