import { create } from 'zustand';

interface UIStore {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  currentPage: string;
  modals: {
    [key: string]: boolean;
  };
  
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'light',
  sidebarCollapsed: false,
  currentPage: 'device-list',
  modals: {},

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: newTheme };
    });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setCurrentPage: (page: string) => {
    set({ currentPage: page });
  },

  openModal: (modalId: string) => {
    set((state) => ({
      modals: { ...state.modals, [modalId]: true }
    }));
  },

  closeModal: (modalId: string) => {
    set((state) => ({
      modals: { ...state.modals, [modalId]: false }
    }));
  },
}));
