# Bhabi Thulla — Game Asset Pack

Premium **Art Deco** game environment. Keep this emerald + antique-gold language across every asset.

| Asset | Status |
|-------|--------|
| #1 Environment moodboard | Locked (`reference/master-environment.jpg`) |
| #2 Playing table (isolated) | Locked (`table.png`) |
| #3 Card design system (sheet) | Reference only (`reference/card-design-system.jpg`) |
| #4 Production card back | Locked (`card-back.png`) |
| #5 Player frame system | Reference (`reference/player-frame-system.jpg`) + production `player-frame.png` / `.svg` |
| #6 Table composition blueprint | Locked (`table-composition.png` + `tableLayout.ts`) |
| #8 Full mobile game screen | **Master blueprint** — table-relative layout via `useTableBounds` |

## Visual architecture (presentation only)

```
GameScreen
├── EnvironmentLayer   GameBackground / environment.png
├── TableLayer         PlayingTable / table.png
├── PlayerLayer        PlayerSeat + player-frame
├── PlayedCardsLayer   TrickPlayCard (existing plays)
├── EffectsLayer       ThullaOverlay
├── PlayerHandLayer    PlayerHand (existing cards + handlers)
├── HeaderLayer        GameChrome
└── ControlsLayer      Sort / Play → existing store handlers
```

**Debug:** set `DEBUG_GAME_LAYOUT = true` in `gameTheme.ts` to show table/seat/trick/hand bounds.

**Facades:** `src/components/game-ui/` re-exports premium aliases without duplicating logic.

Game engine, Zustand rules, AI, Supabase, and multiplayer are untouched.

## Card system (#7)

One component generates the full deck:

```ts
import { PlayingCard, CardFace, CardBackView } from '@/src/components/cards';

<PlayingCard card={card} />           // ivory Art Deco face
<PlayingCard card={card} faceDown />  // Asset #4 back
<PlayingCard card={card} compact />   // trick size
<PlayingCard card={card} mini faceDown /> // opponent fan
```

- Faces: ivory `#F7F1E3` · gold border `#D6AF55` · suits red `#B22222` / black `#0B0B0B`
- Number cards: classic pip layouts via `PIP_LAYOUTS`
- Court (J/Q/K): gold inner frame + large rank mark
- Backs: `GAME_ASSETS.cardBack` (selected glow / muted supported)

## Composition contract (`TABLE_COMPOSITION`)

Normalized 0–1 scene coords (landscape 16:9):

| Zone | Role |
|------|------|
| `seats.*` | Avatar frame centers |
| `opponentFans.*` | Face-down fans behind frames (toward table) |
| `trick.slots.*` | Center 4-card diamond |
| `hand.zone` | Local hand dock |
| `chrome.*` | Logo, room code, settings, chat, sort, play, deck |
| `uiSafe.*` | Regions reserved for chrome only |

## Palette (locked)

| Token | Hex |
|-------|-----|
| Deep emerald | `#073D32` |
| Rich black | `#0B0B0B` |
| Antique gold | `#D6AF55` |
| Ivory | `#F7F1E3` |
| Suit red | `#B22222` / `#822222` |
| Online | `#00C853` |
| Offline | `#FF3B30` |

**Card language:** ivory faces · black/red suits · black backs · thin gold border · Art Deco geometry.

**Player frames:** circular gold ring · nameplate · card-count badge · active glow · online/offline dots (layered; toggle in code).

## Structure

```
assets/game/
├── reference/
│   ├── master-environment.jpg
│   ├── table-source.jpg
│   ├── card-design-system.jpg
│   ├── card-back-source.jpg
│   ├── player-frame-source.png
│   ├── player-frame-system.jpg      # #5 sheet
│   └── table-composition-source.png
├── environment.png
├── table.png                        # #2
├── table-composition.png            # #6 visual blueprint
├── table-composition-zones.svg      # #6 crisp overlays
├── center-ornament.svg
├── card-back.png                    # #4
├── player-frame.png / .svg          # #5 production
├── thulla-effect.png
├── seats/
└── ui/
```

## Composition contract (`TABLE_COMPOSITION`)

Normalized 0–1 scene coords (landscape 16:9):

| Zone | Role |
|------|------|
| `seats.top/left/right/bottom` | Avatar frame centers |
| `trick.slots.*` | Diamond trick card anchors |
| `opponentFans.*` | Face-down mini fans |
| `hand.zone` | Local hand dock |
| `uiSafe.*` | PASS / Sort / status chrome only |

Import: `import { TABLE_COMPOSITION, resolveRect } from '@/src/constants/tableLayout'`

## Layer order (runtime)

```
0   environment
10  table
20  center-ornament
30  player seats / frames
40  played cards (trick)
50  thulla-effect
60  player hand
70  ui buttons / panels
```

## Next steps for Cursor

1. Drive `GameTable` from `TABLE_COMPOSITION` (seats, trick diamond, fans, chrome)
2. Layer player-frame + nameplate + badge + active glow / online dots
3. Use `PlayingCard` faces + `faceDown` backs everywhere (hand, trick, fans, deck)
4. Keep UI in `chrome` / `uiSafe` only
5. Thulla VFX + button chrome assets
