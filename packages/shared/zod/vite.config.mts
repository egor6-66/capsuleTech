import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    gen: 'src/gen/index.ts',
  },
  name: 'CapsuleZod',
  // @faker-js/faker тяжёлый — бандлим только в gen-entry, основной index его не импортирует.
  // Явно включаем faker в bundle (bundleDependencies) — он не в BROWSER_EXTERNAL libConfig'а,
  // но задаём явно для документации намерения.
  bundleDependencies: ['@faker-js/faker'],
});
