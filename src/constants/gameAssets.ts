/**
 * Bhabi Thulla — Asset #1 pack registry
 * Emerald + antique-gold Art Deco language (shared across all assets).
 */
export const GAME_ASSETS = {
  environment: require('../../assets/game/environment.png'),
  table: require('../../assets/game/table.png'),
  tableComposition: require('../../assets/game/table-composition.png'),
  cardBack: require('../../assets/game/card-back.png'),
  thullaEffect: require('../../assets/game/thulla-effect.png'),
  playerFrame: require('../../assets/game/player-frame.png'),
} as const;

/** Vector paths (load via react-native-svg / expo-asset as needed) */
export const GAME_ASSET_PATHS = {
  centerOrnament: 'assets/game/center-ornament.svg',
  playerFrameSvg: 'assets/game/player-frame.svg',
  tableCompositionZones: 'assets/game/table-composition-zones.svg',
  seats: {
    top: 'assets/game/seats/seat-top.svg',
    left: 'assets/game/seats/seat-left.svg',
    right: 'assets/game/seats/seat-right.svg',
    bottom: 'assets/game/seats/seat-bottom.svg',
  },
  ui: {
    btnPass: 'assets/game/ui/btn-pass.svg',
    btnPrimary: 'assets/game/ui/btn-primary.svg',
    btnGhost: 'assets/game/ui/btn-ghost.svg',
    panel: 'assets/game/ui/panel.svg',
    nameTag: 'assets/game/ui/name-tag.svg',
  },
} as const;

/** Palette locked to card design system + table reference */
export const ART_DECO_PALETTE = {
  emerald: '#073D32',
  emeraldMid: '#06483A',
  emeraldLight: '#0A5140',
  emeraldDark: '#043927',
  gold: '#D6AF55',
  goldLight: '#F0D58A',
  goldMid: '#C89B3C',
  goldDark: '#A87924',
  goldDeep: '#8C641E',
  rail: '#0B0B0B',
  charcoal: '#121416',
  ivory: '#F7F1E3',
  suitRed: '#B22222',
  online: '#00C853',
  offline: '#FF3B30',
  room: '#060708',
} as const;
