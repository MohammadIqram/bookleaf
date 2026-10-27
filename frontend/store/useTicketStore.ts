import { create } from 'zustand';

export interface TicketFilters {
  status: string;
  category: string;
  priority: string;
  assignedTo: string;
  search: string;
  page: number;
}

const DEFAULT_FILTERS: TicketFilters = {
  status: '',
  category: '',
  priority: '',
  assignedTo: '',
  search: '',
  page: 1,
};

export interface TicketStoreState {
  selectedTicketId: string | null;
  filters: TicketFilters;
  sseTriggerCount: number;

  // Actions
  setSelectedTicketId: (id: string | null) => void;
  setFilter: <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => void;
  resetFilters: () => void;
  triggerRealtimeRefresh: () => void;
}

export const useTicketStore = create<TicketStoreState>((set) => ({
  selectedTicketId: null,
  filters: { ...DEFAULT_FILTERS },
  sseTriggerCount: 0,

  setSelectedTicketId: (id) => set({ selectedTicketId: id }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
        // Reset page to 1 when changing other filters
        ...(key !== 'page' ? { page: 1 } : {}),
      },
    })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  triggerRealtimeRefresh: () =>
    set((state) => ({ sseTriggerCount: state.sseTriggerCount + 1 })),
}));
