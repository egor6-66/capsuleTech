import { useParams } from '@tanstack/solid-router';

/**
 * `[id].tsx` в pages/ → `$id.tsx` в .capsule/routes/, route path `/lab/home/card/$id`.
 * Сам файл может оставаться с `[id]` — плагин при эмиссии конвертит, а Vite
 * резолвит `@pages/lab/home/card/[id]` по alias в этот же файл.
 */
const CardDetail = Page(() => {
  const params = useParams({ from: '/lab/home/card/$id' });
  return (
    <div class="space-y-2">
      <h2 class="text-lg font-semibold">
        card #<span class="font-mono">{params().id}</span>
      </h2>
      <p class="text-sm text-muted-foreground">
        <code>useParams</code> читает <code>$id</code> из URL. Источник —{' '}
        <code>pages/lab/home/card/[id].tsx</code>.
      </p>
    </div>
  );
});

export default CardDetail;
