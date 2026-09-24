import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface GameStats {
  gamesPlayed: number;
  gamesEscaped: number;
  timesBhabhi: number;
  thullasCreated: number;
  offlineWins: number;
}

interface StatsState extends GameStats {
  recordGameEnd: (payload: {
    escaped: boolean;
    wasBhabhi: boolean;
    thullas: number;
    offline: boolean;
  }) => void;
  resetStats: () => void;
}

const initial: GameStats = {
  gamesPlayed: 0,
  gamesEscaped: 0,
  timesBhabhi: 0,
  thullasCreated: 0,
  offlineWins: 0,
};

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      ...initial,
      recordGameEnd: ({ escaped, wasBhabhi, thullas, offline }) =>
        set((s) => ({
          gamesPlayed: s.gamesPlayed + 1,
          gamesEscaped: s.gamesEscaped + (escaped ? 1 : 0),
          timesBhabhi: s.timesBhabhi + (wasBhabhi ? 1 : 0),
          thullasCreated: s.thullasCreated + thullas,
          offlineWins: s.offlineWins + (offline && escaped ? 1 : 0),
        })),
      resetStats: () => set(initial),
    }),
    {
      name: 'bhabi-thulla-stats',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
