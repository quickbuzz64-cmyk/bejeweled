import { create } from 'zustand';

interface ChatWidgetState {
  isOpen: boolean;
  pendingMessage: string | null;
  openChat: (message?: string) => void;
  closeChat: () => void;
  clearPending: () => void;
}

export const useChatStore = create<ChatWidgetState>((set) => ({
  isOpen: false,
  pendingMessage: null,

  openChat: (message?: string) =>
    set({ isOpen: true, pendingMessage: message ?? null }),

  closeChat: () => set({ isOpen: false }),

  clearPending: () => set({ pendingMessage: null }),
}));
