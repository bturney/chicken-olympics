import { FARMYARD_LAYOUT } from "./layout";

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

export const GREEN_CHICK_POINTS = 5;
export const GREEN_CHICK_SCHEDULE_MIN_MS = 20_000;
export const GREEN_CHICK_SCHEDULE_MAX_MS = 70_000;

export type GreenChickStatus =
  "pending" | "waiting" | "active" | "claimed" | "missed";

export interface GreenChickState {
  status: GreenChickStatus;
  scheduledAtMs: number;
  activeSpotIndex: number | null;
  peekStartedAtMs: number | null;
  claimedAtMs: number | null;
  claimedByPlayerIndex: 0 | 1 | null;
}

export function createGreenChickState(
  matchDurationMs: number,
  random: () => number,
): GreenChickState {
  const range = GREEN_CHICK_SCHEDULE_MAX_MS - GREEN_CHICK_SCHEDULE_MIN_MS;
  const scaledRange = Math.floor(
    (range * matchDurationMs) / PRODUCTION_MATCH_DURATION_MS,
  );
  const scheduledAtMs =
    Math.floor(
      (GREEN_CHICK_SCHEDULE_MIN_MS * matchDurationMs) /
        PRODUCTION_MATCH_DURATION_MS,
    ) + Math.floor(random() * scaledRange);
  return {
    status: "pending",
    scheduledAtMs,
    activeSpotIndex: null,
    peekStartedAtMs: null,
    claimedAtMs: null,
    claimedByPlayerIndex: null,
  };
}

function selectFreeSpotForGreenChick(
  peekState: PeekState,
  greenChickState: GreenChickState,
  currentTimeMs: number,
  spotCount: number,
  randomValue: number,
): number | null {
  const occupied = new Set(
    getActiveNormalSpotIndices(peekState, currentTimeMs),
  );
  if (greenChickState.activeSpotIndex !== null) {
    occupied.add(greenChickState.activeSpotIndex);
  }
  const free: number[] = [];
  for (let i = 0; i < spotCount; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  if (free.length === 0) return null;
  const index = Math.floor(randomValue * free.length);
  return free[Math.min(index, free.length - 1)] ?? null;
}

export function isGreenChickPeekActive(
  greenChickState: GreenChickState,
  currentTimeMs: number,
): boolean {
  if (
    greenChickState.status !== "active" ||
    greenChickState.peekStartedAtMs === null
  ) {
    return false;
  }
  return (
    currentTimeMs - greenChickState.peekStartedAtMs < NORMAL_PEEK_DURATION_MS
  );
}

export function getActiveGreenChickSpotIndex(
  greenChickState: GreenChickState,
  currentTimeMs: number,
): number | null {
  if (!isGreenChickPeekActive(greenChickState, currentTimeMs)) {
    return null;
  }
  return greenChickState.activeSpotIndex;
}

export function tickGreenChickState(
  greenChickState: GreenChickState,
  peekState: PeekState,
  currentTimeMs: number,
  spotCount: number,
  random: () => number,
): GreenChickState {
  if (greenChickState.status === "claimed") {
    return greenChickState;
  }

  if (greenChickState.status === "missed") {
    return greenChickState;
  }

  if (
    greenChickState.status === "active" &&
    greenChickState.peekStartedAtMs !== null &&
    currentTimeMs - greenChickState.peekStartedAtMs >= NORMAL_PEEK_DURATION_MS
  ) {
    return {
      ...greenChickState,
      status: "missed",
      activeSpotIndex: null,
      peekStartedAtMs: null,
    };
  }

  if (currentTimeMs < greenChickState.scheduledAtMs) {
    return greenChickState.status === "pending"
      ? greenChickState
      : { ...greenChickState, status: "pending" };
  }

  if (greenChickState.status === "active") {
    return greenChickState;
  }

  const spot = selectFreeSpotForGreenChick(
    peekState,
    greenChickState,
    currentTimeMs,
    spotCount,
    random(),
  );

  if (spot === null) {
    return greenChickState.status === "waiting"
      ? greenChickState
      : { ...greenChickState, status: "waiting" };
  }

  return {
    ...greenChickState,
    status: "active",
    activeSpotIndex: spot,
    peekStartedAtMs: currentTimeMs,
  };
}

export interface GreenChickClaimResult {
  matchState: MatchState;
  greenChickState: GreenChickState;
  claimed: boolean;
}

export function attemptGreenChickClaim(
  matchState: MatchState,
  greenChickState: GreenChickState,
  spotIndex: number,
  playerIndex: 0 | 1,
  currentTimeMs: number,
): GreenChickClaimResult {
  if (
    !isGreenChickPeekActive(greenChickState, currentTimeMs) ||
    greenChickState.activeSpotIndex !== spotIndex
  ) {
    return { matchState, greenChickState, claimed: false };
  }
  return {
    matchState: addScore(matchState, playerIndex, GREEN_CHICK_POINTS),
    greenChickState: {
      ...greenChickState,
      status: "claimed",
      activeSpotIndex: null,
      peekStartedAtMs: null,
      claimedAtMs: currentTimeMs,
      claimedByPlayerIndex: playerIndex,
    },
    claimed: true,
  };
}

export interface NormalPeek {
  activeSpotIndex: number | null;
  peekStartedAtMs: number | null;
  nextRefillAtMs: number | null;
}

export interface PeekState {
  peeks: NormalPeek[];
  recentSpotIndices: number[];
}

const RECENT_SPOT_MEMORY = 2;

export function createPeekState(now: number = 0): PeekState {
  return {
    peeks: Array.from({ length: NORMAL_PEEK_COUNT }, () => ({
      activeSpotIndex: null,
      peekStartedAtMs: null,
      nextRefillAtMs: now,
    })),
    recentSpotIndices: [],
  };
}

function rememberSpot(peekState: PeekState, spotIndex: number): PeekState {
  return {
    ...peekState,
    recentSpotIndices: [
      spotIndex,
      ...peekState.recentSpotIndices.filter((recent) => recent !== spotIndex),
    ].slice(0, RECENT_SPOT_MEMORY),
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

  const recent = peekState.recentSpotIndices.filter((spot) => spot < spotCount);
  const recentSet = new Set(recent);
  const candidates =
    recent.length > 0
      ? free.filter((spot) => !recentSet.has(spot))
      : free;
  const pool = candidates.length > 0 ? candidates : free;

  let bestDistance = -1;
  const scored = pool.map((spot) => {
    let distance = 0;
    if (recent.length > 0) {
      const spotPosition = FARMYARD_LAYOUT.hidingSpots[spot];
      if (spotPosition !== undefined) {
        let shortest = Number.POSITIVE_INFINITY;
        for (const recentSpot of recent) {
          const recentPosition = FARMYARD_LAYOUT.hidingSpots[recentSpot];
          if (recentPosition === undefined) continue;
          const dx = spotPosition.x - recentPosition.x;
          const dy = spotPosition.y - recentPosition.y;
          const d = Math.hypot(dx, dy);
          if (d < shortest) shortest = d;
        }
        if (shortest !== Number.POSITIVE_INFINITY) {
          distance = shortest;
        }
      }
    }
    if (distance > bestDistance) {
      bestDistance = distance;
    }
    return { spot, distance };
  });

  const best =
    recent.length > 0
      ? scored.filter((candidate) => candidate.distance === bestDistance)
      : scored;
  const index = Math.floor(randomValue * best.length);
  return best[Math.min(index, best.length - 1)]?.spot ?? null;
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
        workingState = rememberSpot({ ...workingState, peeks }, peek.activeSpotIndex);
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
        workingState = rememberSpot({ ...workingState, peeks }, spot);
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
    peekState: rememberSpot({ ...peekState, peeks: newPeeks }, spotIndex),
    claimed: true,
  };
}
