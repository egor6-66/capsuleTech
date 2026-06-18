// Empty setup file — present so vite-plugin-solid does not auto-inject
// `@testing-library/jest-dom/vitest` as a setupFile (which it does when
// no setupFiles are configured). Our tests don't use jest-dom matchers;
// they query the rendered DOM directly via `div.querySelector` etc.
