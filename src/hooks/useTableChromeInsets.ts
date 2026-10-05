import { useAppChromeInsets } from './useAppChromeInsets';

/** Table screens — same chrome rules as play hub / menus on Android. */
export function useTableChromeInsets() {
  return useAppChromeInsets();
}
