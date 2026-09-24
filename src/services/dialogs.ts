import {
  useDialogStore,
  type DialogButton,
  type DialogTone,
} from '@/src/store/dialogStore';

function inferTone(title: string): DialogTone {
  const t = title.toLowerCase();
  if (
    t.includes('reject') ||
    t.includes('error') ||
    t.includes('could not') ||
    t.includes('invalid') ||
    t.includes('failed') ||
    t.includes('need')
  ) {
    return 'error';
  }
  if (t.includes('saved') || t.includes('success')) return 'success';
  return 'info';
}

/**
 * In-app alert (Art Deco modal). Works on web — no window.alert.
 */
export function showAlert(title: string, message?: string): void {
  useDialogStore.getState().open({
    title,
    message,
    tone: inferTone(title),
    buttons: [{ text: 'OK' }],
  });
}

/**
 * Confirm / multi-button dialog.
 */
export function showConfirm(
  title: string,
  message: string,
  buttons: DialogButton[]
): void {
  useDialogStore.getState().open({
    title,
    message,
    tone: inferTone(title),
    buttons,
  });
}
