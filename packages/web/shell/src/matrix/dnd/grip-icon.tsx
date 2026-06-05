/**
 * Точечный grip-индикатор по центру handle. Шесть кружков.
 * Локальная копия для Matrix DragBadge — не тянет web-ui/Flex internals.
 *
 * @param class — optional override for the outer wrapper.
 */
export const GripIcon = (props: { class?: string }) => (
  <div
    class={
      props.class ?? 'z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border'
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
