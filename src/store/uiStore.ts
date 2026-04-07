import { create } from 'zustand';
import { nanoid } from 'nanoid';

interface ToastEntry {
  message: string;
  type: 'success' | 'error' | 'info';
  id: string;
}

interface UIStore {
  activeModal: string | null;
  modalProps: Record<string, unknown>;
  toast: ToastEntry | null;
  // Actions
  openModal(id: string, props?: Record<string, unknown>): void;
  closeModal(): void;
  showToast(message: string, type?: 'success' | 'error' | 'info'): void;
  dismissToast(): void;
}

export const useUIStore = create<UIStore>()((set) => ({
  activeModal: null,
  modalProps: {},
  toast: null,

  openModal(id: string, props: Record<string, unknown> = {}) {
    set({ activeModal: id, modalProps: props });
  },

  closeModal() {
    set({ activeModal: null, modalProps: {} });
  },

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    set({ toast: { message, type, id: nanoid(8) } });
  },

  dismissToast() {
    set({ toast: null });
  },
}));
