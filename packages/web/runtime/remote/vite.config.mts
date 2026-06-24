import { libConfig } from '../../../builders/lib/src';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    // capsule — ADR 033 registration manifest. Registers Remote.Provider + Remote.View globals.
    capsule: 'src/capsule.ts',
  },
  name: 'CapsuleRemote',
});
