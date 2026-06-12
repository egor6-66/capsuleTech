# @capsuletech/web-renderer

Чистый runtime для рендера UI по JSON-схеме. Принимает дерево (`ISchema.components.nodes`) + `registry` (объект с компонентами по dot-path'у вроде `'ui.Button'` или `'Entities.Viewer.LoginForm'`) и эмиттит Solid JSX.

Без deps на zod/manifests — authoring концерны живут в `@capsuletech/studio`. Этот пакет можно подключить в прод-приложение, которое отображает редактируемые страницы, без overhead'а редакторской зоны.

Сборка: `pnpm nx build @capsuletech/web-renderer`.
