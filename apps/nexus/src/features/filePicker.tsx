/**
 * FilePicker feature — открывает нативный диалог выбора файла через Tauri.
 *
 * Dynamic import('@tauri-apps/plugin-dialog') — чтобы browser-dev build
 * не падал при отсутствии Tauri runtime.
 *
 * После выбора: store.update({ path }) — реактивно появляется в Views.FilePickerCard.
 * При ошибке (не Tauri): store.update({ error: '...' }).
 */
const FilePicker = Feature(() => ({
  initial: 'idle',

  states: {
    idle: {
      onClick: async ({ target, next, store }) => {
        const tags = (target.meta?.tags ?? []) as readonly string[];
        if (!tags.includes('pick')) return next();

        try {
          const { open } = await import('@tauri-apps/plugin-dialog');
          const selected = await open({
            multiple: false,
            directory: false,
            title: 'Выберите файл',
          });
          if (typeof selected === 'string') {
            store.update({ path: selected });
          }
        } catch (_e) {
          store.update({ error: 'Доступ к ФС только в desktop-режиме (Tauri).' });
        }
      },
    },
  },
}));

export default FilePicker;
