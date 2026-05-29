/**
 * Main sidebar Widget — карточка выбранного происшествия.
 *
 * Данные из родительского `<Features.Incidents>` store (2-й арг фабрики):
 * `selectedId` + `items` → выбранный incident подаётся в stateless
 * `Shapes.IncidentPreview` через props. Пусто, пока ничего не выбрано.
 */
import type { IIncidentsContext } from '../../features/incidents';

const Main = Widget((Ui, store) => {
  const selectedIncident = () => {
    const data = store?.ctx.data as IIncidentsContext | undefined;
    if (!data?.selectedId) return undefined;
    return data.items.find((i) => i.id === data.selectedId);
  };

  return (
    <Ui.Card class="h-full rounded-none border-l border-t-0 border-b-0 border-r-0">
      <Ui.Card.Header>
        <Ui.Card.Title>Карточка происшествия</Ui.Card.Title>
      </Ui.Card.Header>
      <Ui.Card.Content class="overflow-y-auto">
        <Shapes.IncidentPreview data={selectedIncident()} />
      </Ui.Card.Content>
    </Ui.Card>
  );
});

export default Main;
