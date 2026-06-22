// ITERATION 1 SMOKE — canvas→host via auto-subscribe on*-prop (ADR-053
// Decision 5). onMounted ловится RemoteComponent-ом host-side (event
// 'mounted' приходит из bootstrap'а universal-canvas через channel.send).
// Никаких app-импортов, чистый канон.
//
// Phase 1b SMOKE (2026-06-22): useRemote() — без ручного import.
// AutoImport инжектит из @capsuletech/web-remote (HOOK_IMPORTS allowlist).
// compliance:check должен быть clean (нет app-package-import violation).
//
// ITERATION 2 SMOKE — host→canvas reactive props (ADR-053 Decision 4).
// Кнопка тикает signal'ом на хосте → framework пушит prop через канал →
// canvas (apps/universal-canvas/src/remote.ts) ловит изменение через
// createEffect(() => ctx.props.clickCount) и логирует в iframe console.
// Event-driven push, никаких таймеров. Любое изменение signal'а на хосте
// (клик / API / store update) даст один диф-апдейт через единственный
// канал iframe'а — пропсы бандлятся в один envelope.
import { createSignal } from 'solid-js';

const Canvas = Widget((Ui) => {
  // useRemote() — глобал через AutoImport (см. HOOK_IMPORTS в compliance/check.ts).
  // Не требует ручного import — compliance allowlist пропускает его как hook.
  const { remote } = useRemote();

  const [clickCount, setClickCount] = createSignal(0);

  return (
    <Ui.Layout.Flex
      direction={'column'}
      gap={'sm'}
      justify={'center'}
      align={'center'}
      h={'full'}
      w={'full'}
    >
      <Ui.Button onClick={() => setClickCount((c) => c + 1)}>
        Send to canvas (current: {clickCount()})
      </Ui.Button>
      <Remote.View
        name="universal-canvas"
        clickCount={clickCount()}
        onMounted={(payload: unknown) => {
          console.log('[playground] canvas mounted →', payload);
          // Phase 1b smoke: отправляем ping в канвас после монтирования.
          // Канвас (iframe-side) должен получить 'ping' через ctx.channel.on('ping').
          remote('universal-canvas').send('ping', { ts: Date.now() });
        }}
      />
    </Ui.Layout.Flex>
  );
});

export default Canvas;
