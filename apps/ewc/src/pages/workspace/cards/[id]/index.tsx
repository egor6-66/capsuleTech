/**
 * Card-by-id (`/workspace/cards/$id`) — детальная карточка происшествия.
 *
 * Рендерится в `<Outlet/>` родительского cards-layout (main-слот).
 *
 * Пока конфига рендера нет — показываем `Views.NoConfig` (центр + «Назад»).
 * Форма-как-данные (`incidentCardSchema` + `@capsuletech/web-renderer`) и реальные
 * данные по id из Feature — вернём позже отдельной итерацией.
 */
import { useRouter } from '@capsuletech/web-router';

const Card = Page(() => {
  const router = useRouter();
  return <Views.NoConfig onBack={() => router.back()} />;
});

export default Card;
