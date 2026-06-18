import { create } from 'zustand';

interface NavStore {
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
}

export const useNavStore = create<NavStore>((set) => ({
  pendingHref: null,
  setPendingHref: (href) => set({ pendingHref: href }),
}));
