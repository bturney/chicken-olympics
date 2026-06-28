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

export const NORMAL_PEEK_COUNT = 3;
export const NORMAL_PEEK_DURATION_MS = 5_000;
export const NORMAL_REFILL_MIN_MS = 500;
export const NORMAL_REFILL_MAX_MS = 1_500;
export const NORMAL_CHICK_POINTS = 1;

export interface NormalPeek {
  activeSpotIndex: number | null;
  peekStartedAtMs: number | null;
  nextRefillAtMs: number | null;
}

export interface PeekState {
  peeks: NormalPeek[];
}

export function createPeekState(now: number = 0): PeekState {
  return {
    peeks: Array.from({ length: NORMAL_PEEK_COUNT }, () => ({
      activeSpotIndex: null,
      peekStartedAtMs: null,
      nextRefillAtMs: now,
    })),
  };
}

export function isPeekActive(peek: NormalPeek, currentTimeMs: number): boolean {
  if (peek.activeSpotIndex === null || peek.peekStartedAtMs === null) {
    return false;
  }
  return currentTimeMs - peek.peekStartedAtMs < NORMAL_PEEK_DURATION_MS;
}

export function getActiveNormalSpotIndices(
  peekState: PeekState,
  currentTimeMs: number,
): readonly number[] {
  const out: number[] = [];
  for (const peek of peekState.peeks) {
    if (isPeekActive(peek, currentTimeMs) && peek.activeSpotIndex !== null) {
      out.push(peek.activeSpotIndex);
    }
  }
  return out;
}

export function computeRefillDelayMs(randomValue: number): number {
  const clamped = Math.max(0, Math.min(1, randomValue));
  return (
    NORMAL_REFILL_MIN_MS +
    clamped * (NORMAL_REFILL_MAX_MS - NORMAL_REFILL_MIN_MS)
  );
}

export function selectFreeSpotIndex(
  peekState: PeekState,
  currentTimeMs: number,
  spotCount: number,
  randomValue: number,
): number | null {
  const active = new Set(getActiveNormalSpotIndices(peekState, currentTimeMs));
  const free: number[] = [];
  for (let i = 0; i < spotCount; i++) {
    if (!active.has(i)) free.push(i);
  }
  if (free.length === 0) return null;
  const index = Math.floor(randomValue * free.length);
  return free[Math.min(index, free.length - 1)] ?? null;
}

function fillSlotAt(
  peek: NormalPeek,
  spotIndex: number,
  currentTimeMs: number,
): NormalPeek {
  return {
    activeSpotIndex: spotIndex,
    peekStartedAtMs: currentTimeMs,
    nextRefillAtMs: null,
  };
}

function expireSlot(
  peek: NormalPeek,
  currentTimeMs: number,
  random: () => number,
): NormalPeek {
  return {
    activeSpotIndex: null,
    peekStartedAtMs: null,
    nextRefillAtMs: currentTimeMs + computeRefillDelayMs(random()),
  };
}

export function tickPeekState(
  peekState: PeekState,
  currentTimeMs: number,
  spotCount: number,
  random: () => number,
): PeekState {
  const peeks: NormalPeek[] = [];
  let workingState = peekState;
  for (const peek of peekState.peeks) {
    if (peek.activeSpotIndex !== null && peek.peekStartedAtMs !== null) {
      if (currentTimeMs - peek.peekStartedAtMs >= NORMAL_PEEK_DURATION_MS) {
        const expired = expireSlot(peek, currentTimeMs, random);
        peeks.push(expired);
        workingState = { peeks };
      } else {
        peeks.push(peek);
      }
      continue;
    }
    if (peek.nextRefillAtMs !== null && currentTimeMs >= peek.nextRefillAtMs) {
      const spot = selectFreeSpotIndex(
        workingState,
        currentTimeMs,
        spotCount,
        random(),
      );
      if (spot === null) {
        peeks.push(peek);
      } else {
        peeks.push(fillSlotAt(peek, spot, currentTimeMs));
        workingState = { peeks };
      }
      continue;
    }
    peeks.push(peek);
  }
  return workingState;
}

export interface ClaimResult {
  matchState: MatchState;
  peekState: PeekState;
  claimed: boolean;
}

export const CLAIM_FEEDBACK_DURATION_MS = 350;
export const CLAIM_POP_PEAK_SCALE = 1.4;

export interface ClaimAnimation {
  slotIndex: number;
  spotIndex: number;
  playerIndex: 0 | 1;
  startedAtMs: number;
  durationMs: number;
}

export interface ClaimAnimationState {
  animations: ClaimAnimation[];
}

export function createClaimAnimationState(): ClaimAnimationState {
  return { animations: [] };
}

export function startClaimAnimation(
  state: ClaimAnimationState,
  slotIndex: number,
  spotIndex: number,
  playerIndex: 0 | 1,
  now: number,
  durationMs: number = CLAIM_FEEDBACK_DURATION_MS,
): ClaimAnimationState {
  return {
    animations: [
      ...state.animations,
      { slotIndex, spotIndex, playerIndex, startedAtMs: now, durationMs },
    ],
  };
}

export function getActiveClaimAnimation(
  state: ClaimAnimationState,
  slotIndex: number,
  now: number,
): ClaimAnimation | null {
  let latest: ClaimAnimation | null = null;
  for (const anim of state.animations) {
    if (anim.slotIndex !== slotIndex) continue;
    if (now - anim.startedAtMs >= anim.durationMs) continue;
    if (latest === null || anim.startedAtMs > latest.startedAtMs) {
      latest = anim;
    }
  }
  return latest;
}

export function tickClaimAnimations(
  state: ClaimAnimationState,
  now: number,
): ClaimAnimationState {
  return {
    animations: state.animations.filter(
      (anim) => now - anim.startedAtMs < anim.durationMs,
    ),
  };
}

export function computeClaimPopScale(
  startedAtMs: number,
  now: number,
  durationMs: number = CLAIM_FEEDBACK_DURATION_MS,
): number {
  if (now <= startedAtMs) return 1;
  const elapsed = now - startedAtMs;
  if (elapsed >= durationMs) return 0;
  const progress = elapsed / durationMs;
  if (progress < 0.5) {
    return 1 + (progress / 0.5) * (CLAIM_POP_PEAK_SCALE - 1);
  }
  return CLAIM_POP_PEAK_SCALE * (1 - (progress - 0.5) / 0.5);
}

export function attemptClaim(
  matchState: MatchState,
  peekState: PeekState,
  spotIndex: number,
  playerIndex: 0 | 1,
  currentTimeMs: number,
  random: () => number,
): ClaimResult {
  const slotIndex = peekState.peeks.findIndex(
    (p) => p.activeSpotIndex === spotIndex && isPeekActive(p, currentTimeMs),
  );
  if (slotIndex === -1) {
    return { matchState, peekState, claimed: false };
  }
  const claimed = peekState.peeks[slotIndex]!;
  const newPeeks = peekState.peeks.map((p, i) =>
    i === slotIndex ? expireSlot(claimed, currentTimeMs, random) : p,
  );
  return {
    matchState: addScore(matchState, playerIndex, NORMAL_CHICK_POINTS),
    peekState: { peeks: newPeeks },
    claimed: true,
  };
}
