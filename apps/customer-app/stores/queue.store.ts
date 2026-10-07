import { create } from 'zustand';

export interface ActiveQueueState {
  hasActiveSpot: boolean;
  position: number;
  estimatedWait: number;
  status: 'WAITING' | 'NOTIFIED' | 'TABLE_READY' | 'SEATED';
  partySize: number;
  tableLabel?: string;
  customerName?: string;
  restaurantId?: string;
}

interface QueueStore {
  activeSpot: ActiveQueueState | null;
  setActiveSpot: (spot: Partial<ActiveQueueState> | null) => void;
  clearActiveSpot: () => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  activeSpot: null,
  setActiveSpot: (spot) =>
    set((state) => ({
      activeSpot: spot
        ? {
            ...(state.activeSpot || {
              position: 1,
              estimatedWait: 5,
              status: 'WAITING' as const,
              partySize: 2,
            }),
            ...spot,
            hasActiveSpot: true,
          }
        : null,
    })),
  clearActiveSpot: () => set({ activeSpot: null }),
}));
