/**
 * Точечный grip-индикатор по центру handle. Шесть кружков как в shadcn.
 * Поворот для vertical-orientation — через CSS-селектор у родителя handle
 * (`[&[data-orientation=vertical]>div]:rotate-90` в `resizableHandleCva`).
 *
 * Намеренно `position: absolute` — выпадает из flex-потока handle'а, чтобы
 * mount/unmount grip'а не влиял на layout-размер 1px-handle'а (нет layout shift).
 * Родительский handle имеет `position: relative` и держит размер сам по себе.
 *
 * @param class — optional override for the outer wrapper (e.g. remove border when
 *   embedded inside a styled button).
 */
export const GripIcon = (props: { class?: string }) => (
  <div
    class={
      props.class ??
      'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border'
    }
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-2.5"
      role="presentation"
      aria-hidden="true"
    >
      <path d="M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    </svg>
  </div>
);
