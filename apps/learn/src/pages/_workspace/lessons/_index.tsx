/**
 * /lessons — index: master-detail уроков из пакетных блоков `Learn.Lessons.*`
 * (стор внутри пакета). `List` слева (узкий sidebar) — индекс уроков; `View`
 * справа (широкий main) — открытый урок (концепт-проза → правило-таблицы →
 * дриллы). Клик по уроку в `List` открывает его в `View` через общий стор пакета.
 */
const LessonsHome = Page(() => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      sidebar: {
        children: <Learn.Lessons.List />,
      },
      main: {
        children: <Learn.Lessons.View />,
      },
    }}
  />
));

export default LessonsHome;
