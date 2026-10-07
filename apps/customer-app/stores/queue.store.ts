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
  activeSpot: {
    hasActiveSpot: true,
    position: 3,
    estimatedWait: 15,
    status: 'WAITING',
    partySize: 2,
  },
  setActiveSpot: (spot) =>
    set((state) => ({
      activeSpot: spot
        ? {
            ...(state.activeSpot || {
              position: 3,
              estimatedWait: 15,
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
