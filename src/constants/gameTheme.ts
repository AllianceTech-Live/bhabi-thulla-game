/**
 * Premium Bhabi Thulla visual theme — Assets 1–8.
 * Presentation only. Does not affect game rules.
 */
export const DEBUG_GAME_LAYOUT = false;

export const GAME_THEME = {
  colors: {
    felt: '#073D32',
    feltMid: '#06483A',
    feltLight: '#0A5140',
    feltDark: '#032A23',
    feltDeep: '#021C17',

    gold: '#D6AF55',
    goldLight: '#F0D58A',
    goldMid: '#C89B3C',
    goldDark: '#A87924',
    goldDeep: '#8C641E',
    brass: '#B8893A',

    black: '#080B0B',
    blackSoft: '#111414',
    charcoal: '#121416',
    marble: '#1A1C1E',
    marbleLight: '#2A2E32',

    ivory: '#F7F1E3',
    red: '#B22222',
    suitRed: '#B22222',

    room: '#060708',
    roomMid: '#0C0E10',
    lampGlow: 'rgba(240, 200, 120, 0.18)',
    vignette: 'rgba(0, 0, 0, 0.55)',
    online: '#00C853',
    offline: '#FF3B30',
  },

  fonts: {
    display: 'Georgia',
    body: 'System',
  },

  radius: {
    table: 999,
    control: 10,
    pill: 999,
  },

  /**
   * Table as fraction of the game scene (Asset #8 proportions).
   * Tuned for landscape phones ~16:9.
   */
  layout: {
    tableWidthPct: 0.96,
    tableHeightPct: 0.8,
    minTableHeight: 160,
    maxTableHeight: 560,
    /** Seat sits ON the rim, not floating off-screen */
    seatOutset: -0.02,
  },

  shadows: {
    table: {
      shadowColor: '#000',
      shadowOpacity: 0.65,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 18,
    },
  },

  /** Spec §25 z-index contract */
  layers: {
    background: 0,
    playingTable: 10,
    tableDecorations: 20,
    playerSeats: 30,
    opponentCards: 40,
    playedCards: 50,
    effects: 60,
    playerHand: 70,
    gameControls: 80,
    notifications: 90,
    modal: 100,
    /** aliases used by older screens */
    thullaAnimation: 90,
    systemOverlay: 100,
  },
} as const;

export type GameTheme = typeof GAME_THEME;
