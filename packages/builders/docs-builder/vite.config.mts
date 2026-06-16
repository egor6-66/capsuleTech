import { libConfig } from '../lib/src/libConfig';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    bin: 'src/bin.ts',
  },
  name: 'CapsuleDocsBuilder',
  runtime: 'node',
});
