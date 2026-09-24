import { create } from 'zustand';

export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type DialogTone = 'info' | 'error' | 'success';

type DialogPayload = {
  title: string;
  message?: string;
  tone?: DialogTone;
  buttons: DialogButton[];
};

type DialogState = {
  visible: boolean;
  title: string;
  message: string;
  tone: DialogTone;
  buttons: DialogButton[];
  open: (payload: DialogPayload) => void;
  close: () => void;
};

export const useDialogStore = create<DialogState>((set) => ({
  visible: false,
  title: '',
  message: '',
  tone: 'info',
  buttons: [{ text: 'OK' }],
  open: ({ title, message, tone = 'info', buttons }) =>
    set({
      visible: true,
      title,
      message: message ?? '',
      tone,
      buttons: buttons.length ? buttons : [{ text: 'OK' }],
    }),
  close: () => set({ visible: false }),
}));
