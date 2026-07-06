/**
 * Header — app-shell хедер learn-workspace (зеркало playground, единый UI/UX-флоу).
 *
 * Слева — `Learn.Nav.Main` (пакетный header-nav; app лишь монтит и роутит его событие).
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
  const imageEngines = () => ((store?.ctx as any)?.data?.imageEngines as string[]) ?? [];
  const imageEngine = () => (store?.ctx as any)?.data?.imageEngine as string | undefined;

  return (
    <Shell.Header>
      <Learn.Nav.Main />
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
          <Shell.Header.Menu.Label>Движки</Shell.Header.Menu.Label>
          <Shell.Picker
            mode="sub"
            name="engine"
            options={engines()}
            value={engine}
            triggerLabel={`озвучка: ${engine() ?? '—'}`}
          />
          <Shell.Picker
            mode="sub"
            name="image-engine"
            options={imageEngines()}
            value={imageEngine}
            triggerLabel={`картинки: ${imageEngine() ?? '—'}`}
          />
        </Shell.Header.Menu.Group>
      </Shell.Header.Menu>
    </Shell.Header>
  );
});

export default Header;
