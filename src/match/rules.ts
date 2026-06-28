export interface MatchOptions {
  durationMs?: number;
}

export interface MatchState {
  durationMs: number;
  scores: [number, number];
  elapsedMs: number;
}

export const PRODUCTION_MATCH_DURATION_MS = 90_000;

export function createMatchState(options: MatchOptions = {}): MatchState {
  return {
    durationMs: options.durationMs ?? PRODUCTION_MATCH_DURATION_MS,
    scores: [0, 0],
    elapsedMs: 0,
  };
}

export function tick(state: MatchState, deltaMs: number): MatchState {
  return {
    ...state,
    elapsedMs: state.elapsedMs + deltaMs,
  };
}

export function isMatchComplete(state: MatchState): boolean {
  return state.elapsedMs >= state.durationMs;
}

export function getRemainingMs(state: MatchState): number {
  return Math.max(0, state.durationMs - state.elapsedMs);
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

export const DEFAULT_PEEK_DURATION_MS = 5_000;

export interface PeekState {
  activeSpotIndex: number | null;
  peekStartedAtMs: number | null;
}

export function createPeekState(): PeekState {
  return {
    activeSpotIndex: null,
    peekStartedAtMs: null,
  };
}

export function selectNextPeekSpot(
  spotCount: number,
  randomValue: number,
): number {
  return Math.floor(randomValue * spotCount);
}

export function startPeek(
  state: PeekState,
  currentTimeMs: number,
  spotIndex: number,
): PeekState {
  return {
    activeSpotIndex: spotIndex,
    peekStartedAtMs: currentTimeMs,
  };
}

export function isPeekActive(state: PeekState, currentTimeMs: number): boolean {
  if (state.activeSpotIndex === null || state.peekStartedAtMs === null) {
    return false;
  }
  return currentTimeMs - state.peekStartedAtMs < DEFAULT_PEEK_DURATION_MS;
}

export function expirePeek(_state: PeekState): PeekState {
  return {
    activeSpotIndex: null,
    peekStartedAtMs: null,
  };
}

export interface ClaimResult {
  matchState: MatchState;
  peekState: PeekState;
  claimed: boolean;
}

export function attemptClaim(
  matchState: MatchState,
  peekState: PeekState,
  playerIndex: 0 | 1,
  currentTimeMs: number,
): ClaimResult {
  if (!isPeekActive(peekState, currentTimeMs)) {
    return {
      matchState,
      peekState,
      claimed: false,
    };
  }

  const newMatchState = addScore(matchState, playerIndex, 1);
  const newPeekState = expirePeek(peekState);

  return {
    matchState: newMatchState,
    peekState: newPeekState,
    claimed: true,
  };
}
