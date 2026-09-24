import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { GAME_ASSETS } from '../constants/gameAssets';

export type CatalogGameId = 'thulla' | 'bluff';

export type CatalogGame = {
  id: CatalogGameId;
  title: string;
  blurb: string;
  glyph: string;
  image: number;
};

export const CATALOG_GAMES: CatalogGame[] = [
  {
    id: 'thulla',
    title: 'Bhabi Thulla',
    blurb: 'Follow suit · Thulla · don’t be last',
    glyph: '♠',
    image: GAME_ASSETS.table,
  },
  {
    id: 'bluff',
    title: 'Bluff',
    blurb: 'Claim a rank · call the liar',
    glyph: '‽',
    image: GAME_ASSETS.thullaEffect,
  },
];

interface GameCatalogState {
  selectedGameId: CatalogGameId;
  setSelectedGame: (id: CatalogGameId) => void;
}

export const useGameCatalogStore = create<GameCatalogState>()(
  persist(
    (set) => ({
      selectedGameId: 'thulla',
      setSelectedGame: (selectedGameId) => set({ selectedGameId }),
    }),
    {
      name: 'bhabi-game-catalog',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function getSelectedGame(): CatalogGame {
  const id = useGameCatalogStore.getState().selectedGameId;
  return CATALOG_GAMES.find((g) => g.id === id) ?? CATALOG_GAMES[0]!;
}
