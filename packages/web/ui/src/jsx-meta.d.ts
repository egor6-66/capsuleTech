import 'solid-js';

declare global {
  /**
   * Реестры тегов и алиасов приложения. Пустые по умолчанию — заполняются
   * AppConfigPlugin'ом по `apps/<app>/capsule.app.ts`.
   *
   * - `CapsuleTags` — обычные теги (для автокомплита; open type).
   * - `CapsuleAliases` — `@`-литералы; whitelist для CompliancePlugin lint'а.
   */
  interface CapsuleTags {}
  interface CapsuleAliases {}

  /**
   * Закрытый union — только зарегистрированные теги/алиасы. Незарегистрированный
   * литерал → TS-ошибка в IDE. Регистрация: `apps/<app>/capsule.app.ts`.
   */
  type CapsuleTag = (keyof CapsuleTags & string) | (keyof CapsuleAliases & string);
}

declare module 'solid-js' {
  namespace JSX {
    interface CustomAttributes<T> {
      /**
       * Идентификация UI-элемента для HCA. Содержит только теги (роли) —
       * через них контроллер находит элемент в реестре (`store.pick`, `store.patch`).
       *
       * Произвольные данные элемента (href, value-формат, etc) — в `payload`.
       */
      meta?: { tags?: CapsuleTag[] };
      /** Сценарная окраска от Widget'а — добавляется к `meta.tags` каждого ребёнка Entity. */
      dynamicMeta?: { tags?: CapsuleTag[] };
      /**
       * Произвольные данные, которые автор Entity прикрепляет к элементу
       * для контроллера. Контроллер читает через `comp.payload?.X` после
       * `store.pick(...)` / `store.patch(...)`. Пример nav-итема:
       * `<Nav.Item meta={{tags:['nav']}} payload={{href:'/branches'}} />`.
       */
      payload?: Record<string, unknown>;
    }
  }
}
