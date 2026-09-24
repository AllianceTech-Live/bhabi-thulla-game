import {
  callBluff,
  createBluffGame,
  passBluffTurn,
  playBluffCards,
} from '../../src/game/bluff';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('Bluff engine', () => {
  it('deals to 4 players and starts', () => {
    const state = createBluffGame({
      randomFn: seededRandom(7),
      playerConfigs: [
        { id: 'a', name: 'A', type: 'human' },
        { id: 'b', name: 'B', type: 'human' },
        { id: 'c', name: 'C', type: 'ai' },
        { id: 'd', name: 'D', type: 'ai' },
      ],
    });
    expect(state.kind).toBe('bluff');
    expect(state.players).toHaveLength(4);
    expect(state.players.reduce((n, p) => n + p.hand.length, 0)).toBe(52);
    expect(state.currentTurnPlayerId).toBe('a');
  });

  it('allows a free claim play then requires that rank', () => {
    const state = createBluffGame({
      randomFn: seededRandom(3),
      playerConfigs: [
        { id: 'a', name: 'A', type: 'human' },
        { id: 'b', name: 'B', type: 'human' },
      ],
    });
    const a = state.players[0]!;
    const card = a.hand[0]!;
    const r1 = playBluffCards(state, 'a', [card.id], card.rank);
    expect(r1.success).toBe(true);
    expect(r1.state.requiredRank).toBe(card.rank);
    expect(r1.state.pile).toHaveLength(1);
    expect(r1.state.currentTurnPlayerId).toBe('b');
  });

  it('catches a liar on call bluff', () => {
    let state = createBluffGame({
      randomFn: seededRandom(11),
      playerConfigs: [
        { id: 'a', name: 'A', type: 'human' },
        { id: 'b', name: 'B', type: 'human' },
      ],
    });
    const a = state.players[0]!;
    // Claim Ace but play a non-Ace if possible
    const liarCard = a.hand.find((c) => c.rank !== 'A') ?? a.hand[0]!;
    const claim = 'A' as const;
    const played = playBluffCards(state, 'a', [liarCard.id], claim);
    expect(played.success).toBe(true);
    state = played.state;

    const before = state.players.find((p) => p.id === 'a')!.hand.length;
    const called = callBluff(state, 'b');
    expect(called.success).toBe(true);
    const after = called.state.players.find((p) => p.id === 'a')!.hand.length;
    if (liarCard.rank !== 'A') {
      expect(after).toBeGreaterThan(before);
    }
  });

  it('allows pass to next player when a claim is on the table', () => {
    let state = createBluffGame({
      randomFn: seededRandom(3),
      playerConfigs: [
        { id: 'a', name: 'A', type: 'human' },
        { id: 'b', name: 'B', type: 'human' },
      ],
    });
    const card = state.players[0]!.hand[0]!;
    state = playBluffCards(state, 'a', [card.id], card.rank).state;
    expect(state.currentTurnPlayerId).toBe('b');
    const passed = passBluffTurn(state, 'b');
    expect(passed.success).toBe(true);
    expect(passed.state.currentTurnPlayerId).toBe('a');
    expect(passed.state.pile.length).toBe(1);
  });
});
