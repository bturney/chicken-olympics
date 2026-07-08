import { createArena } from "./arena";

export interface MatchOptions {
  durationMs?: number;
  playerSlotCount?: PlayerSlotCount;
}

export interface SpotPosition {
  x: number;
  y: number;
}

export type PlayerSlotCount = 2 | 3 | 4;
export type PlayerIndex = 0 | 1 | 2 | 3;

export interface MatchState {
  durationMs: number;
  scores: number[];
  elapsedMs: number;
}

export const PRODUCTION_MATCH_DURATION_MS = 90_000;

export function createMatchState(options: MatchOptions = {}): MatchState {
  const playerSlotCount = options.playerSlotCount ?? 2;
  return {
    durationMs: options.durationMs ?? PRODUCTION_MATCH_DURATION_MS,
    scores: Array.from({ length: playerSlotCount }, () => 0),
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
  playerIndex: PlayerIndex,
  points: number,
): MatchState {
  if (playerIndex < 0 || playerIndex >= state.scores.length) return state;
  const scores = [...state.scores];
  scores[playerIndex] = (scores[playerIndex] ?? 0) + points;
  return { ...state, scores };
}

export function getWinner(state: MatchState): number | null {
  let winner: number | null = null;
  let winningScore = Number.NEGATIVE_INFINITY;
  let tied = false;
  for (let i = 0; i < state.scores.length; i++) {
    const score = state.scores[i]!;
    if (score > winningScore) {
      winner = i;
      winningScore = score;
      tied = false;
    } else if (score === winningScore) {
      tied = true;
    }
  }
  if (tied) return null;
  return winner;
}

export const NORMAL_PEEK_COUNT = 3;
export const NORMAL_PEEK_DURATION_MS = 5_000;
export const NORMAL_REFILL_MIN_MS = 900;
export const NORMAL_REFILL_MAX_MS = 1_900;
export const PEEK_ANTICIPATION_DURATION_MS = 700;
export const NORMAL_CHICK_POINTS = 1;

export const GREEN_CHICK_POINTS = 5;
export const GREEN_CHICK_SCHEDULE_MIN_MS = 20_000;
export const GREEN_CHICK_SCHEDULE_MAX_MS = 70_000;

export interface PeekPressureConfig {
  normalPeekCount: number;
  normalPeekDurationMs: number;
  normalRefillMinMs: number;
  normalRefillMaxMs: number;
  peekAnticipationDurationMs: number;
  normalChickPoints: number;
}

export const DEFAULT_PEEK_PRESSURE_CONFIG: PeekPressureConfig = {
  normalPeekCount: NORMAL_PEEK_COUNT,
  normalPeekDurationMs: NORMAL_PEEK_DURATION_MS,
  normalRefillMinMs: NORMAL_REFILL_MIN_MS,
  normalRefillMaxMs: NORMAL_REFILL_MAX_MS,
  peekAnticipationDurationMs: PEEK_ANTICIPATION_DURATION_MS,
  normalChickPoints: NORMAL_CHICK_POINTS,
};

export interface GreenChickConfig {
  enabled: boolean;
  points: number;
  scheduleMinMs: number;
  scheduleMaxMs: number;
}

export const DEFAULT_GREEN_CHICK_CONFIG: GreenChickConfig = {
  enabled: true,
  points: GREEN_CHICK_POINTS,
  scheduleMinMs: GREEN_CHICK_SCHEDULE_MIN_MS,
  scheduleMaxMs: GREEN_CHICK_SCHEDULE_MAX_MS,
};

export type GreenChickStatus =
  "pending" | "waiting" | "active" | "claimed" | "missed";

export interface GreenChickState {
  status: GreenChickStatus;
  scheduledAtMs: number;
  activeSpotIndex: number | null;
  peekStartedAtMs: number | null;
  claimedAtMs: number | null;
  claimedByPlayerIndex: PlayerIndex | null;
}

export function createGreenChickState(
  matchDurationMs: number,
  random: () => number,
  config: GreenChickConfig = DEFAULT_GREEN_CHICK_CONFIG,
): GreenChickState {
  const range = config.scheduleMaxMs - config.scheduleMinMs;
  const scaledRange = Math.floor(
    (range * matchDurationMs) / PRODUCTION_MATCH_DURATION_MS,
  );
  const scheduledAtMs =
    Math.floor(
      (config.scheduleMinMs * matchDurationMs) /
        PRODUCTION_MATCH_DURATION_MS,
    ) + Math.floor(random() * scaledRange);
  return {
    status: config.enabled ? "pending" : "missed",
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
  spotPositions?: readonly SpotPosition[],
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): number | null {
  return createArena({
    spotCount,
    spotPositions,
    occupiedSpotIndices: [
      ...getOccupiedNormalSpotIndices(peekState, currentTimeMs, config),
      ...(greenChickState.activeSpotIndex === null
        ? []
        : [greenChickState.activeSpotIndex]),
    ],
    reservedSpotIndices: getReservedNormalSpotIndices(peekState, currentTimeMs),
    recentSpotIndices: peekState.recentSpotIndices,
  }).allocateSpot(randomValue);
}

export function isGreenChickPeekActive(
  greenChickState: GreenChickState,
  currentTimeMs: number,
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): boolean {
  if (
    greenChickState.status !== "active" ||
    greenChickState.peekStartedAtMs === null
  ) {
    return false;
  }
  return (
    currentTimeMs - greenChickState.peekStartedAtMs < config.normalPeekDurationMs
  );
}

export function getActiveGreenChickSpotIndex(
  greenChickState: GreenChickState,
  currentTimeMs: number,
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): number | null {
  if (!isGreenChickPeekActive(greenChickState, currentTimeMs, config)) {
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
  spotPositions?: readonly SpotPosition[],
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
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
    currentTimeMs - greenChickState.peekStartedAtMs >= config.normalPeekDurationMs
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
    spotPositions,
    config,
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
  playerIndex: PlayerIndex,
  currentTimeMs: number,
  peekConfig: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
  greenConfig: GreenChickConfig = DEFAULT_GREEN_CHICK_CONFIG,
): GreenChickClaimResult {
  if (
    !isGreenChickPeekActive(greenChickState, currentTimeMs, peekConfig) ||
    greenChickState.activeSpotIndex !== spotIndex
  ) {
    return { matchState, greenChickState, claimed: false };
  }
  return {
    matchState: addScore(matchState, playerIndex, greenConfig.points),
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
  anticipationStartedAtMs: number | null;
  anticipatedSpotIndex: number | null;
}

export interface PeekState {
  peeks: NormalPeek[];
  recentSpotIndices: number[];
}

const RECENT_SPOT_MEMORY = 2;

export function createPeekState(
  now: number = 0,
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): PeekState {
  return {
    peeks: Array.from({ length: config.normalPeekCount }, () => ({
      activeSpotIndex: null,
      peekStartedAtMs: null,
      nextRefillAtMs: now,
      anticipationStartedAtMs: null,
      anticipatedSpotIndex: null,
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

function isPeekAnticipating(peek: NormalPeek, currentTimeMs: number): boolean {
  return (
    peek.anticipatedSpotIndex !== null &&
    peek.anticipationStartedAtMs !== null &&
    peek.peekStartedAtMs !== null &&
    currentTimeMs < peek.peekStartedAtMs
  );
}

export function isPeekActive(
  peek: NormalPeek,
  currentTimeMs: number,
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): boolean {
  if (peek.activeSpotIndex === null || peek.peekStartedAtMs === null) {
    return false;
  }
  return currentTimeMs - peek.peekStartedAtMs < config.normalPeekDurationMs;
}

export function getActiveNormalSpotIndices(
  peekState: PeekState,
  currentTimeMs: number,
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): readonly number[] {
  return getOccupiedNormalSpotIndices(peekState, currentTimeMs, config);
}

function getOccupiedNormalSpotIndices(
  peekState: PeekState,
  currentTimeMs: number,
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): readonly number[] {
  const out: number[] = [];
  for (const peek of peekState.peeks) {
    if (isPeekActive(peek, currentTimeMs, config) && peek.activeSpotIndex !== null) {
      out.push(peek.activeSpotIndex);
    }
  }
  return out;
}

function getReservedNormalSpotIndices(
  peekState: PeekState,
  currentTimeMs: number,
): readonly number[] {
  const out = new Set<number>();
  for (const peek of peekState.peeks) {
    if (
      isPeekAnticipating(peek, currentTimeMs) &&
      peek.anticipatedSpotIndex !== null
    ) {
      out.add(peek.anticipatedSpotIndex);
    }
  }
  return [...out];
}

export function computeRefillDelayMs(
  randomValue: number,
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): number {
  const clamped = Math.max(0, Math.min(1, randomValue));
  return (
    config.normalRefillMinMs +
    clamped * (config.normalRefillMaxMs - config.normalRefillMinMs)
  );
}

export function selectFreeSpotIndex(
  peekState: PeekState,
  currentTimeMs: number,
  spotCount: number,
  randomValue: number,
  spotPositions?: readonly SpotPosition[],
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): number | null {
  return createArena({
    spotCount,
    spotPositions,
    occupiedSpotIndices: getOccupiedNormalSpotIndices(peekState, currentTimeMs, config),
    reservedSpotIndices: getReservedNormalSpotIndices(peekState, currentTimeMs),
    recentSpotIndices: peekState.recentSpotIndices,
  }).allocateSpot(randomValue);
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
    anticipationStartedAtMs: null,
    anticipatedSpotIndex: null,
  };
}

function startAnticipation(
  peek: NormalPeek,
  spotIndex: number,
  currentTimeMs: number,
  activationTimeMs: number,
): NormalPeek {
  return {
    activeSpotIndex: null,
    peekStartedAtMs: activationTimeMs,
    nextRefillAtMs: null,
    anticipationStartedAtMs: currentTimeMs,
    anticipatedSpotIndex: spotIndex,
  };
}

function activateAnticipation(
  peek: NormalPeek,
  currentTimeMs: number,
): NormalPeek {
  if (peek.anticipatedSpotIndex === null) {
    return peek;
  }
  return fillSlotAt(peek, peek.anticipatedSpotIndex, currentTimeMs);
}

function expireSlot(
  peek: NormalPeek,
  currentTimeMs: number,
  random: () => number,
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): NormalPeek {
  return {
    activeSpotIndex: null,
    peekStartedAtMs: null,
    nextRefillAtMs: currentTimeMs + computeRefillDelayMs(random(), config),
    anticipationStartedAtMs: null,
    anticipatedSpotIndex: null,
  };
}

export function tickPeekState(
  peekState: PeekState,
  currentTimeMs: number,
  spotCount: number,
  random: () => number,
  spotPositions?: readonly SpotPosition[],
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): PeekState {
  const peeks: NormalPeek[] = [];
  let workingState = peekState;
  const syncWorkingPeeks = (): void => {
    workingState = {
      ...workingState,
      peeks: [...peeks, ...peekState.peeks.slice(peeks.length)],
    };
  };
  for (const peek of peekState.peeks) {
    if (peek.activeSpotIndex !== null && peek.peekStartedAtMs !== null) {
      if (currentTimeMs - peek.peekStartedAtMs >= config.normalPeekDurationMs) {
        const expired = expireSlot(peek, currentTimeMs, random, config);
        peeks.push(expired);
        syncWorkingPeeks();
        workingState = rememberSpot(workingState, peek.activeSpotIndex);
      } else {
        peeks.push(peek);
        syncWorkingPeeks();
      }
      continue;
    }

    if (
      peek.anticipatedSpotIndex !== null &&
      peek.anticipationStartedAtMs !== null &&
      peek.peekStartedAtMs !== null
    ) {
      if (currentTimeMs >= peek.peekStartedAtMs) {
        const activated = activateAnticipation(peek, currentTimeMs);
        peeks.push(activated);
        syncWorkingPeeks();
        if (activated.activeSpotIndex !== null) {
          workingState = rememberSpot(workingState, activated.activeSpotIndex);
        }
      } else {
        peeks.push(peek);
        syncWorkingPeeks();
      }
      continue;
    }

    if (
      peek.nextRefillAtMs !== null &&
      currentTimeMs >= peek.nextRefillAtMs - config.peekAnticipationDurationMs
    ) {
      const spot = selectFreeSpotIndex(
        workingState,
        currentTimeMs,
        spotCount,
        random(),
        spotPositions,
        config,
      );
      if (spot === null) {
        peeks.push(peek);
        syncWorkingPeeks();
      } else {
        const anticipationStartedAtMs = currentTimeMs;
        const anticipated = startAnticipation(
          peek,
          spot,
          anticipationStartedAtMs,
          peek.nextRefillAtMs,
        );
        if (currentTimeMs >= anticipated.peekStartedAtMs!) {
          const activated = activateAnticipation(anticipated, currentTimeMs);
          peeks.push(activated);
          syncWorkingPeeks();
          workingState = rememberSpot(workingState, spot);
        } else {
          peeks.push(anticipated);
          syncWorkingPeeks();
        }
      }
      continue;
    }
    peeks.push(peek);
    syncWorkingPeeks();
  }
  return { ...workingState, peeks };
}

export interface PeekAnticipation {
  slotIndex: number;
  spotIndex: number;
  startedAtMs: number;
}

export function getActivePeekAnticipations(
  peekState: PeekState,
  currentTimeMs: number,
): PeekAnticipation[] {
  return peekState.peeks.flatMap((peek, slotIndex) => {
    if (!isPeekAnticipating(peek, currentTimeMs)) {
      return [];
    }
    if (
      peek.anticipatedSpotIndex === null ||
      peek.anticipationStartedAtMs === null
    ) {
      return [];
    }
    return [
      {
        slotIndex,
        spotIndex: peek.anticipatedSpotIndex,
        startedAtMs: peek.anticipationStartedAtMs,
      },
    ];
  });
}

export interface ClaimResult {
  matchState: MatchState;
  peekState: PeekState;
  claimed: boolean;
}

export function attemptClaim(
  matchState: MatchState,
  peekState: PeekState,
  spotIndex: number,
  playerIndex: PlayerIndex,
  currentTimeMs: number,
  random: () => number,
  config: PeekPressureConfig = DEFAULT_PEEK_PRESSURE_CONFIG,
): ClaimResult {
  const slotIndex = peekState.peeks.findIndex(
    (p) => p.activeSpotIndex === spotIndex && isPeekActive(p, currentTimeMs, config),
  );
  if (slotIndex === -1) {
    return { matchState, peekState, claimed: false };
  }
  const claimed = peekState.peeks[slotIndex]!;
  const newPeeks = peekState.peeks.map((p, i) =>
    i === slotIndex ? expireSlot(claimed, currentTimeMs, random, config) : p,
  );
  return {
    matchState: addScore(matchState, playerIndex, config.normalChickPoints),
    peekState: rememberSpot({ ...peekState, peeks: newPeeks }, spotIndex),
    claimed: true,
  };
}
