/**
 * Header — app-shell хедер learn-workspace (зеркало playground, единый UI/UX-флоу).
 *
 * Слева — `Shapes.ShellNavigation` (через `Shell.Header.Navigation`).
 * Справа — `Shell.Header.Menu` с `Shell.Appearance` (тема/dark/finish, config-driven)
 * и `Shell.Picker` озвучки: шелл даёт каркас селекта, данные (движки) — из
 * Features.App (store 2-м аргументом виджета; список взят с voice-сервиса).
 * Выбор эмитится named-событием `onPick` → ловит Features.App (ADR 032).
 *
 * Без account/logout (авторизации пока нет) и без ModeToggle (resize/dnd — studio-специфика,
 * в learn-контенте нет редактируемого канваса). Chrome тот же, что в playground.
 *
 * Всё — глобалы и `Ui`-примитивы; ни одного `import` (эталонный app).
 */
const Header = Widget((Ui, store) => {
  const engines = () => ((store?.ctx as any)?.data?.engines as string[]) ?? [];
  const engine = () => (store?.ctx as any)?.data?.engine as string | undefined;

  return (
    <Shell.Header>
      <Shapes.ShellNavigation />
      <Shell.Header.Menu>
        <Shell.Appearance />
        <Shell.Header.Menu.Separator />
        <Shell.Header.Menu.Group>
          <Shell.Header.Menu.Label>Режим</Shell.Header.Menu.Label>
          <Shell.ModeToggle mode="resize" />
          <Shell.ModeToggle mode="dnd" />
        </Shell.Header.Menu.Group>
        <Shell.Header.Menu.Separator />
        <Shell.Header.Menu.Group>
          <Shell.Header.Menu.Label>Озвучка</Shell.Header.Menu.Label>
          <Shell.Picker
            mode="sub"
            name="engine"
            options={engines()}
            value={engine}
            triggerLabel={`Движок: ${engine() ?? '—'}`}
          />
        </Shell.Header.Menu.Group>
        <Shell.Header.Menu.Separator />
      </Shell.Header.Menu>
    </Shell.Header>
  );
});

export default Header;
