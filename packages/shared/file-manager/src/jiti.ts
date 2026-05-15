import { createJiti } from 'jiti';

interface IOpts {
  useImport?: boolean;
  aliases?: Record<string, string>;
  metaUrl?: string;
}

const jiti = (path: string, opts?: IOpts) => {
  const Jiti = createJiti(opts?.metaUrl || import.meta.url, {
    interopDefault: true,
    alias: opts?.aliases,
  });
  if (opts?.useImport) {
    return Jiti.import(path);
  }
  const imported = Jiti(path);

  return imported.default || imported;
};

export { jiti };
