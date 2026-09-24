import { create } from 'zustand';
import {
  callBluff,
  chooseBluffAction,
  createBluffGame,
  passBluffTurn,
  playBluffCards,
  type BluffState,
} from '../game/bluff';
import type { AiDifficulty, Rank } from '../game/types';
import type { OfflineSetup } from './gameStore';

interface BluffStore {
  state: BluffState | null;
  lastError: string | null;
  localHumanIds: string[];
  selectedCardIds: string[];
  claimRank: Rank | null;
  startOfflineBluff: (setup: OfflineSetup) => void;
  toggleCard: (cardId: string) => void;
  setClaimRank: (rank: Rank) => void;
  playSelected: (playerId: string, rank?: Rank) => boolean;
  call: (callerId: string) => boolean;
  pass: (playerId: string) => boolean;
  /** AI or human turn timeout — applies chooseBluffAction for current seat. */
  autoPlayCurrentTurn: () => boolean;
  runAiIfNeeded: () => void;
  clear: () => void;
  clearError: () => void;
}

function configsFrom(setup: OfflineSetup) {
  const configs: {
    id: string;
    name: string;
    type: 'human' | 'ai';
    aiDifficulty?: AiDifficulty;
  }[] = [];
  for (let i = 0; i < setup.humanCount; i++) {
    configs.push({
      id: `human-${i + 1}`,
      name: setup.humanNames[i] ?? `Player ${i + 1}`,
      type: 'human',
    });
  }
  for (let i = 0; i < setup.aiCount; i++) {
    configs.push({
      id: `ai-${i + 1}`,
      name: `AI ${i + 1}`,
      type: 'ai',
      aiDifficulty: setup.aiDifficulty,
    });
  }
  return configs;
}

export const useBluffStore = create<BluffStore>((set, get) => ({
  state: null,
  lastError: null,
  localHumanIds: [],
  selectedCardIds: [],
  claimRank: null,

  startOfflineBluff: (setup) => {
    const configs = configsFrom(setup);
    const humans = configs.filter((c) => c.type === 'human').map((c) => c.id);
    set({
      state: createBluffGame({ playerConfigs: configs }),
      localHumanIds: humans,
      selectedCardIds: [],
      claimRank: null,
      lastError: null,
    });
  },

  toggleCard: (cardId) => {
    const { selectedCardIds } = get();
    if (selectedCardIds.includes(cardId)) {
      set({
        selectedCardIds: selectedCardIds.filter((id) => id !== cardId),
      });
      return;
    }
    if (selectedCardIds.length >= 4) return;
    set({ selectedCardIds: [...selectedCardIds, cardId] });
  },

  setClaimRank: (rank) => set({ claimRank: rank }),

  playSelected: (playerId, rank) => {
    const { state, selectedCardIds, claimRank } = get();
    const useRank = rank ?? claimRank;
    if (!state || !useRank || selectedCardIds.length === 0) {
      set({ lastError: 'Select 1–4 cards to throw' });
      return false;
    }
    const result = playBluffCards(state, playerId, selectedCardIds, useRank);
    if (!result.success) {
      set({ lastError: result.error ?? 'Illegal play' });
      return false;
    }
    set({
      state: result.state,
      selectedCardIds: [],
      claimRank: result.state.requiredRank,
      lastError: null,
    });
    return true;
  },

  call: (callerId) => {
    const { state } = get();
    if (!state) return false;
    const result = callBluff(state, callerId);
    if (!result.success) {
      set({ lastError: result.error ?? 'Cannot call' });
      return false;
    }
    set({
      state: result.state,
      selectedCardIds: [],
      claimRank: null,
      lastError: null,
    });
    return true;
  },

  pass: (playerId) => {
    const { state } = get();
    if (!state) return false;
    const result = passBluffTurn(state, playerId);
    if (!result.success) {
      set({ lastError: result.error ?? 'Cannot pass' });
      return false;
    }
    set({
      state: result.state,
      selectedCardIds: [],
      lastError: null,
    });
    return true;
  },

  autoPlayCurrentTurn: () => {
    const { state } = get();
    if (!state || state.phase !== 'playing') return false;
    const turnId = state.currentTurnPlayerId;
    if (!turnId) return false;
    const result = chooseBluffAction(state, turnId);
    if (!result.success) {
      set({ lastError: result.error ?? 'Auto-play failed' });
      return false;
    }
    set({
      state: result.state,
      selectedCardIds: [],
      claimRank: result.state.requiredRank,
      lastError: null,
    });
    return true;
  },

  runAiIfNeeded: () => {
    const { state, autoPlayCurrentTurn } = get();
    if (!state || state.phase !== 'playing') return;
    const turnId = state.currentTurnPlayerId;
    if (!turnId) return;
    const p = state.players.find((x) => x.id === turnId);
    if (!p || p.type !== 'ai') return;
    autoPlayCurrentTurn();
  },

  clear: () =>
    set({
      state: null,
      lastError: null,
      localHumanIds: [],
      selectedCardIds: [],
      claimRank: null,
    }),

  clearError: () => set({ lastError: null }),
}));
