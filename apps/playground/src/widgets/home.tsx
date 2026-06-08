/**
 * Home — контент приватной главной (`/workspace/home`).
 *
 * Читает вьювера из корневой `Features.App` через `useCtx().store.ctx.data.viewer`.
 * Logout живёт в `Widgets.Header` (shell-меню) — здесь только приветствие.
 */
const Home = Widget((Ui) => {
  const ctx = useCtx();

  return (
    <Ui.Layout.Flex class="min-h-full flex-col items-center justify-center gap-cell p-cell">
      <Ui.Typography variant="h2" class="text-2xl font-semibold text-foreground">
        Привет, {ctx?.store.ctx.data.viewer?.role ?? 'гость'} 👋
      </Ui.Typography>
      <Ui.Typography variant="p" class="text-muted-foreground">
        Вы вошли в эталонный app фреймворка Capsule.
      </Ui.Typography>
    </Ui.Layout.Flex>
  );
});

export default Home;
