export interface IDesktopConfig {
  productName: string;
  identifier: string;
  icon?: string;
  window?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    title?: string;
    /**
     * Tauri window drag-drop handler. Default `false` so HTML5 drag-and-drop
     * (palettes, sortable) works in the webview. Set `true` only if you need
     * native OS file-drop (it suppresses HTML5 DnD).
     */
    dragDropEnabled?: boolean;
  };
}

export interface RunDevOptions {
  app: string;
  devUrl: string;
  desktop: IDesktopConfig;
  cwd?: string;
}

export interface RunBuildOptions {
  app: string;
  dist: string;
  desktop: IDesktopConfig;
  version: string;
  cwd?: string;
}
