/**
 * /board/calendar — раздел «Календарь репетиций». Пока матрица плейсхолдер-слотов
 * (структура та же, что у /board/tracks) — наполним на следующей итерации.
 */
const Calendar = Page(() => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      sidebar: {
        children: <Views.SlotPanel title="Фильтры" hint="Состав, площадка, период — скоро." />,
        swapGroup: 'rehearsals',
        initialSize: 0.28,
      },
      main: {
        children: (
          <Views.SlotPanel title="Календарь репетиций" hint="Сетка дат и слотов — скоро." />
        ),
        swapGroup: 'rehearsals',
      },
      rightBar: {
        children: (
          <Views.SlotPanel title="Ближайшие" hint="Список предстоящих репетиций — скоро." />
        ),
        swapGroup: 'rehearsals',
        initialSize: 0.3,
      },
    }}
  />
));

export default Calendar;
