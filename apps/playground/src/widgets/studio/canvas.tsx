// ITERATION 1 SMOKE — canvas→host via auto-subscribe on*-prop (ADR-053
// Decision 5). onMounted ловится RemoteComponent-ом host-side (event
// 'mounted' приходит из bootstrap'а universal-canvas через channel.send).
// Никаких app-импортов, чистый канон.
//
// Phase 1b SMOKE (2026-06-22): useRemote() — без ручного import.
// AutoImport инжектит из @capsuletech/web-remote (HOOK_IMPORTS allowlist).
// compliance:check должен быть clean (нет app-package-import violation).
const Canvas = Widget((Ui) => {
  // useRemote() — глобал через AutoImport (см. HOOK_IMPORTS в compliance/check.ts).
  // Не требует ручного import — compliance allowlist пропускает его как hook.
  const { remote } = useRemote();

  return (
    <Ui.Layout.Flex justify={'center'} align={'center'} h={'full'} w={'full'}>
      <Remote.View
        name="universal-canvas"
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
