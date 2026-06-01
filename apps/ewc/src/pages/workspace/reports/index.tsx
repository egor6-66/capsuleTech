/**
 * Reports stub (`/workspace/reports`) — placeholder для будущей отчётной зоны.
 *
 * Рендерится внутри workspace shell'а (см. `../index.tsx`) через Outlet.
 * Пока конфига нет — показываем `Views.NoConfig` (центр + «Назад»).
 * Реальный контент — позже отдельной итерацией.
 */
import { useRouter } from '@capsuletech/web-router';

const Reports = Page(() => {
  const router = useRouter();
  return <Views.NoConfig onBack={() => router.back()} />;
});

export default Reports;
