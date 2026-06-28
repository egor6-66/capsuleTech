/**
 * /exercises — layout раздела. Слот под `Learn.ExercisesNav` (пакет); пока Outlet.
 */
const Exercises = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" gapY={2} class="min-h-full flex-col p-2">
    {/* TODO: <Learn.ExercisesNav /> */}
    <Ui.Outlet />
  </Ui.Layout.Flex>
));

export default Exercises;
