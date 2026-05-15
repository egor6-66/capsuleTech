import { libConfig } from '../vite/src/defines/libConfig.ts';

export default libConfig({
  entry: 'src/index.ts',
  name: 'CapsuleFileManager',
  runtime: 'node',
});
