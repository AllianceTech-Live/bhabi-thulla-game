import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';

type NameGateState = {
  visible: boolean;
  force: boolean;
  resolve: ((name: string) => void) | null;
  reject: (() => void) | null;
  open: (force?: boolean) => Promise<string>;
  complete: (name: string) => void;
  cancel: () => void;
};

const DEFAULT_NAMES = new Set(['player', 'host', 'guest', 'you']);

function isPlaceholderName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return !n || DEFAULT_NAMES.has(n);
}

/** True when we still need the one-time name prompt. */
export function needsPlayerName(): boolean {
  const s = useSettingsStore.getState();
  const n = s.displayName.trim();
  if (isPlaceholderName(n)) return true;
  return !s.nameConfirmed;
}

export function getConfirmedPlayerName(): string {
  const n = useSettingsStore.getState().displayName.trim();
  return isPlaceholderName(n) ? 'Player' : n;
}

function waitForSettingsHydration(): Promise<void> {
  const api = useSettingsStore.persist;
  if (api.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = api.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

/**
 * Resolves with the saved name. Opens the one-time name modal if needed.
 * Pass `{ force: true }` to edit even when already confirmed.
 */
export async function requirePlayerName(opts?: {
  force?: boolean;
}): Promise<string> {
  await waitForSettingsHydration();
  if (!opts?.force && !needsPlayerName()) {
    return getConfirmedPlayerName();
  }
  return useNameGateStore.getState().open(Boolean(opts?.force));
}

export const useNameGateStore = create<NameGateState>((set, get) => ({
  visible: false,
  force: false,
  resolve: null,
  reject: null,
  open: (force = false) =>
    new Promise<string>((resolve, reject) => {
      if (!force && !needsPlayerName()) {
        resolve(getConfirmedPlayerName());
        return;
      }
      set({
        visible: true,
        force,
        resolve,
        reject: () => reject(new Error('cancelled')),
      });
    }),
  complete: (name: string) => {
    const { resolve } = get();
    set({ visible: false, force: false, resolve: null, reject: null });
    resolve?.(name);
  },
  cancel: () => {
    const { reject, resolve, force } = get();
    set({ visible: false, force: false, resolve: null, reject: null });
    if (force && !needsPlayerName()) {
      resolve?.(getConfirmedPlayerName());
      return;
    }
    reject?.();
  },
}));
