/** Active table play (not results/pause). */
export function isGameTablePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/game/results' || pathname === '/game/pause') return false;
  return (
    pathname === '/game/local' ||
    pathname === '/game/bluff-local' ||
    /^\/game\/[^/]+$/.test(pathname)
  );
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/index') return '/';
  return pathname.replace(/\/$/, '') || '/';
}

const ANDROID_SYSTEM_CHROME_PATHS = new Set([
  '/',
  '/settings',
  '/stats',
  '/rules',
  '/privacy',
  '/game/results',
  '/game/pause',
]);

/**
 * Android: hide status + nav bars (full app chrome only).
 * Home, settings, stats, rules, and post-game menus keep system bars like iOS.
 */
export function isAndroidImmersivePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = normalizePath(pathname);
  if (ANDROID_SYSTEM_CHROME_PATHS.has(path)) return false;
  return true;
}
