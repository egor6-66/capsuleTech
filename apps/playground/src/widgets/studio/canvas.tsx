// ITERATION 1 SMOKE — canvas→host via auto-subscribe on*-prop (ADR-053
// Decision 5). `onMounted` ловится `RemoteComponent`-ом host-side (event
// 'mounted' приходит из bootstrap'а universal-canvas через channel.send).
// Никаких app-импортов, чистый канон.
const Canvas = Widget((Ui) => (
  <Ui.Layout.Flex justify={'center'} align={'center'} h={'full'} w={'full'}>
    <Remote.View
      name="universal-canvas"
      onMounted={(payload: unknown) =>
        console.log('[playground] canvas mounted →', payload)
      }
    />
  </Ui.Layout.Flex>
));

export default Canvas;
