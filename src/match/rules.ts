export interface MatchState {
  scores: [number, number];
  elapsedMs: number;
  isComplete: boolean;
}

export const DEFAULT_MATCH_DURATION_MS = 15_000;

export function createMatchState(): MatchState {
  return {
    scores: [0, 0],
    elapsedMs: 0,
    isComplete: false,
  };
}

export function tick(state: MatchState, deltaMs: number): MatchState {
  const elapsedMs = state.elapsedMs + deltaMs;
  return {
    ...state,
    elapsedMs,
    isComplete: elapsedMs >= DEFAULT_MATCH_DURATION_MS,
  };
}

export function addScore(
  state: MatchState,
  playerIndex: 0 | 1,
  points: number,
): MatchState {
  const scores: [number, number] = [...state.scores];
  scores[playerIndex] += points;
  return { ...state, scores };
}

export function getWinner(state: MatchState): 0 | 1 | null {
  const [p1, p2] = state.scores;
  if (p1 > p2) return 0;
  if (p2 > p1) return 1;
  return null;
}
