import type { DesktopAPI } from '../main/preload';

declare global {
  interface Window {
    desktopAPI: DesktopAPI;
  }
}
