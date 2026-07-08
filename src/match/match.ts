import {
  createPeekState,
  attemptClaim,
  attemptGreenChickClaim,
  createGreenChickState,
  createMatchState,
  getActiveGreenChickSpotIndex,
  getActiveNormalSpotIndices,
  getActivePeekAnticipations,
  getRemainingMs,
  getWinner,
  isMatchComplete,
  isPeekActive,
  tickGreenChickState,
  tick,
  tickPeekState,
  DEFAULT_PEEK_PRESSURE_CONFIG,
  DEFAULT_GREEN_CHICK_CONFIG,
  type PeekPressureConfig,
  type GreenChickConfig,
  type GreenChickState,
  type MatchState,
  type PlayerIndex,
  type PlayerSlotCount,
  type PeekState,
  type SpotPosition,
} from "./rules";

export interface MatchOptions {
  durationMs?: number;
  playerSlotCount?: PlayerSlotCount;
  spotCount: number;
  spotPositions?: readonly SpotPosition[];
  random?: () => number;
  peekPressureConfig?: Partial<PeekPressureConfig>;
  greenChickConfig?: Partial<GreenChickConfig>;
}

export interface VisibleNormalChick {
  slotIndex: number;
  spotIndex: number;
}

export interface VisibleGreenChick {
  spotIndex: number;
}

export interface VisiblePeekAnticipation {
  slotIndex: number;
  spotIndex: number;
  startedAtMs: number;
}

export interface MatchView {
  scores: number[];
  elapsedMs: number;
  remainingMs: number;
  complete: boolean;
  winner: number | null;
  normalChicks: VisibleNormalChick[];
  peekAnticipations: VisiblePeekAnticipation[];
  greenChick: VisibleGreenChick | null;
}

export type MatchEvent =
  | {
      type: "normalChickClaimed";
      slotIndex: number;
      spotIndex: number;
      playerIndex: PlayerIndex;
    }
  | { type: "greenChickAppeared"; spotIndex: number }
  | { type: "greenChickClaimed"; spotIndex: number; playerIndex: PlayerIndex }
  | { type: "greenChickMissed"; spotIndex: number };

export class Match {
  private matchState: MatchState;
  private peekState: PeekState;
  private greenChickState: GreenChickState;
  private readonly random: () => number;
  private readonly spotCount: number;
  private readonly spotPositions: readonly SpotPosition[] | undefined;
  private readonly peekPressureConfig: PeekPressureConfig;
  private readonly greenChickConfig: GreenChickConfig;

  constructor(options: MatchOptions) {
    this.peekPressureConfig = {
      ...DEFAULT_PEEK_PRESSURE_CONFIG,
      ...options.peekPressureConfig,
    };
    this.greenChickConfig = {
      ...DEFAULT_GREEN_CHICK_CONFIG,
      ...options.greenChickConfig,
    };
    this.matchState = createMatchState({
      durationMs: options.durationMs,
      playerSlotCount: options.playerSlotCount,
    });
    this.peekState = createPeekState(0, this.peekPressureConfig);
    this.random = options.random ?? Math.random;
    this.spotCount = options.spotCount;
    this.spotPositions = options.spotPositions;
    this.greenChickState = createGreenChickState(
      this.matchState.durationMs,
      this.random,
      this.greenChickConfig,
    );
  }

  advance(_deltaMs: number): MatchEvent[] {
    this.matchState = tick(this.matchState, _deltaMs);
    this.peekState = tickPeekState(
      this.peekState,
      this.matchState.elapsedMs,
      this.spotCount,
      this.random,
      this.spotPositions,
      this.peekPressureConfig,
    );
    const previousGreenStatus = this.greenChickState.status;
    const previousGreenSpot = this.greenChickState.activeSpotIndex;
    const previousGreenActiveSpot = getActiveGreenChickSpotIndex(
      this.greenChickState,
      this.matchState.elapsedMs,
      this.peekPressureConfig,
    );
    this.greenChickState = tickGreenChickState(
      this.greenChickState,
      this.peekState,
      this.matchState.elapsedMs,
      this.spotCount,
      this.random,
      this.spotPositions,
      this.peekPressureConfig,
    );
    const greenActiveSpot = getActiveGreenChickSpotIndex(
      this.greenChickState,
      this.matchState.elapsedMs,
      this.peekPressureConfig,
    );
    if (previousGreenActiveSpot === null && greenActiveSpot !== null) {
      return [{ type: "greenChickAppeared", spotIndex: greenActiveSpot }];
    }
    if (
      previousGreenStatus === "active" &&
      this.greenChickState.status === "missed" &&
      previousGreenSpot !== null
    ) {
      return [{ type: "greenChickMissed", spotIndex: previousGreenSpot }];
    }
    return [];
  }

  claim(spotIndex: number, playerIndex: PlayerIndex): MatchEvent[] {
    const now = this.matchState.elapsedMs;
    const greenSpot = getActiveGreenChickSpotIndex(
      this.greenChickState,
      now,
      this.peekPressureConfig,
    );
    if (greenSpot === spotIndex) {
      const result = attemptGreenChickClaim(
        this.matchState,
        this.greenChickState,
        spotIndex,
        playerIndex,
        now,
        this.peekPressureConfig,
        this.greenChickConfig,
      );
      this.matchState = result.matchState;
      this.greenChickState = result.greenChickState;
      if (!result.claimed) return [];
      return [{ type: "greenChickClaimed", spotIndex, playerIndex }];
    }

    const slotIndex = this.peekState.peeks.findIndex(
      (peek) => peek.activeSpotIndex === spotIndex && isPeekActive(peek, now, this.peekPressureConfig),
    );
    const result = attemptClaim(
      this.matchState,
      this.peekState,
      spotIndex,
      playerIndex,
      now,
      this.random,
      this.peekPressureConfig,
    );
    this.matchState = result.matchState;
    this.peekState = result.peekState;

    if (!result.claimed || slotIndex === -1) return [];
    return [{ type: "normalChickClaimed", slotIndex, spotIndex, playerIndex }];
  }

  view(): MatchView {
    const now = this.matchState.elapsedMs;
    const activeSpots = new Set(
      getActiveNormalSpotIndices(this.peekState, now, this.peekPressureConfig),
    );
    return {
      scores: this.matchState.scores,
      elapsedMs: this.matchState.elapsedMs,
      remainingMs: getRemainingMs(this.matchState),
      complete: isMatchComplete(this.matchState),
      winner: getWinner(this.matchState),
      normalChicks: this.peekState.peeks.flatMap((peek, slotIndex) => {
        if (
          peek.activeSpotIndex === null ||
          !isPeekActive(peek, now, this.peekPressureConfig) ||
          !activeSpots.has(peek.activeSpotIndex)
        ) {
          return [];
        }
        return [{ slotIndex, spotIndex: peek.activeSpotIndex }];
      }),
      greenChick:
        getActiveGreenChickSpotIndex(
          this.greenChickState,
          now,
          this.peekPressureConfig,
        ) === null
          ? null
          : {
              spotIndex: getActiveGreenChickSpotIndex(
                this.greenChickState,
                now,
                this.peekPressureConfig,
              )!,
            },
      peekAnticipations: getActivePeekAnticipations(this.peekState, now),
    };
  }
}
