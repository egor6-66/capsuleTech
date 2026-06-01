import { FolderOpen } from 'lucide-solid';

/**
 * FilePicker widget — composes FilePicker feature with FilePickerCard view.
 * Provides Tauri-powered file selection in desktop mode; degrades gracefully
 * in browser. Passes the lucide icon down so the card renders compact (icon)
 * in the rail and full (pick UI) in main.
 */
const FilePicker = Widget(() => (
  <Features.FilePicker>
    <Views.FilePickerCard icon={FolderOpen} />
  </Features.FilePicker>
));

export default FilePicker;
