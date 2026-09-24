/**
 * Premium visual presentation layer (Assets 1–8).
 * Facades over existing game components — no engine / store changes.
 */
export { GameBackground as GameEnvironment } from '../table/GameBackground';
export { PlayingTable as PremiumPlayingTable } from '../table/PlayingTable';
export { PlayerSeat as PremiumPlayerSeat } from '../game/PlayerSeat';
export { PlayingCard as PremiumCard } from '../cards/PlayingCard';
export { CardBackView as PremiumCardBack } from '../cards/CardBackView';
export { PlayerHand as PremiumPlayerHand } from '../game/PlayerHand';
export { GameTable as PremiumTrickScene } from '../game/GameTable';
export {
  GameChrome as PremiumGameHeader,
  ActionCluster as PremiumGameControls,
  ChromeIconButton as PremiumGameButton,
} from '../game/GameChrome';
export { ThullaOverlay as PremiumThullaEffect } from '../game/ThullaOverlay';
export { LayoutDebug } from './LayoutDebug';
export { DEBUG_GAME_LAYOUT, GAME_THEME } from '../../constants/gameTheme';
