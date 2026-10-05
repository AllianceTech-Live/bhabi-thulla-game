/** Timing for a calmer card-game pace (ms). */
export const GAME_TIMING = {
  /** Delay before AI plays */
  aiThinkMs: 1600,
  /** Extra pause after any card is played before next AI turn */
  afterPlayMs: 900,
  /** Hand card lifts up before committing the play */
  cardLiftMs: 200,
  /** Card fly onto table after lift (throw arc + flip) */
  cardPlayAnimMs: 640,
  /** Hold completed trick on table so both cards are seen, then clear */
  trickResolveMs: 1400,
  /** Deal animation card stagger */
  dealStaggerMs: 90,
  /** How long the Thulla celebration stays on screen */
  thullaHoldMs: 3600,
  /** Let the Thulla card slam the table before the pile flies to the collector */
  thullaSlamMs: 1500,
  /** Brief pause after throw finishes, then cards fly to the discard deck */
  trickCollectDelayMs: 640 + 350,
  /** Human turn clock — on zero, Auto play engages until the player rejoins */
  turnTimeoutMs: 15000,
  /** Brief pause before Auto / timeout plays a card */
  autoPlayDelayMs: 450,
  /** Once 2+ are seated: auto-deal after this if table never hits 4 */
  lobbyAutoStartMs: 10000,
} as const;
