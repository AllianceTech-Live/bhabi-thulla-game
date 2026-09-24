/** Timing for a calmer card-game pace (ms). */
export const GAME_TIMING = {
  /** Delay before AI plays */
  aiThinkMs: 1600,
  /** Extra pause after any card is played before next AI turn */
  afterPlayMs: 900,
  /** Hand card lifts up before committing the play */
  cardLiftMs: 200,
  /** Card fly onto table after lift */
  cardPlayAnimMs: 420,
  /** Hold played cards on table before resolving trick visually */
  trickResolveMs: 900,
  /** Deal animation card stagger */
  dealStaggerMs: 90,
  /** How long the Thulla celebration stays on screen */
  thullaHoldMs: 3600,
  /** Let the Thulla card slam the table before the pile flies away */
  thullaSlamMs: 1500,
  /** Human must play within this window or Auto takes over */
  turnTimeoutMs: 10000,
  /** Once 2+ are seated: auto-deal after this if table never hits 4 */
  lobbyAutoStartMs: 10000,
} as const;
