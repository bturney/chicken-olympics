import {
  createPeekState,
  attemptClaim,
  attemptGreenChickClaim,
  createGreenChickState,
  createMatchState,
  getActiveGreenChickSpotIndex,
  getActiveNormalSpotIndices,
  getRemainingMs,
  getWinner,
  isMatchComplete,
  isPeekActive,
  tickGreenChickState,
  tick,
  tickPeekState,
  type GreenChickState,
  type MatchState,
  type PeekState,
} from "./rules";

export interface MatchOptions {
  durationMs?: number;
  spotCount: number;
  random?: () => number;
}

export interface VisibleNormalChick {
  slotIndex: number;
  spotIndex: number;
}

export interface VisibleGreenChick {
  spotIndex: number;
}

export interface MatchView {
  scores: [number, number];
  elapsedMs: number;
  remainingMs: number;
  complete: boolean;
  winner: 0 | 1 | null;
  normalChicks: VisibleNormalChick[];
  greenChick: VisibleGreenChick | null;
}

export type MatchEvent =
  | {
      type: "normalChickClaimed";
      slotIndex: number;
      spotIndex: number;
      playerIndex: 0 | 1;
    }
  | { type: "greenChickAppeared"; spotIndex: number }
  | { type: "greenChickClaimed"; spotIndex: number; playerIndex: 0 | 1 }
  | { type: "greenChickMissed"; spotIndex: number };

export class Match {
  private matchState: MatchState;
  private peekState: PeekState;
  private greenChickState: GreenChickState;
  private readonly random: () => number;
  private readonly spotCount: number;

  constructor(options: MatchOptions) {
    this.matchState = createMatchState({ durationMs: options.durationMs });
    this.peekState = createPeekState(0);
    this.random = options.random ?? Math.random;
    this.spotCount = options.spotCount;
    this.greenChickState = createGreenChickState(
      this.matchState.durationMs,
      this.random,
    );
  }

  advance(_deltaMs: number): MatchEvent[] {
    this.matchState = tick(this.matchState, _deltaMs);
    this.peekState = tickPeekState(
      this.peekState,
      this.matchState.elapsedMs,
      this.spotCount,
      this.random,
    );
    const previousGreenStatus = this.greenChickState.status;
    const previousGreenSpot = this.greenChickState.activeSpotIndex;
    const previousGreenActiveSpot = getActiveGreenChickSpotIndex(
      this.greenChickState,
      this.matchState.elapsedMs,
    );
    this.greenChickState = tickGreenChickState(
      this.greenChickState,
      this.peekState,
      this.matchState.elapsedMs,
      this.spotCount,
      this.random,
    );
    const greenActiveSpot = getActiveGreenChickSpotIndex(
      this.greenChickState,
      this.matchState.elapsedMs,
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

  claim(spotIndex: number, playerIndex: 0 | 1): MatchEvent[] {
    const now = this.matchState.elapsedMs;
    const greenSpot = getActiveGreenChickSpotIndex(this.greenChickState, now);
    if (greenSpot === spotIndex) {
      const result = attemptGreenChickClaim(
        this.matchState,
        this.greenChickState,
        spotIndex,
        playerIndex,
        now,
      );
      this.matchState = result.matchState;
      this.greenChickState = result.greenChickState;
      if (!result.claimed) return [];
      return [{ type: "greenChickClaimed", spotIndex, playerIndex }];
    }

    const slotIndex = this.peekState.peeks.findIndex(
      (peek) => peek.activeSpotIndex === spotIndex && isPeekActive(peek, now),
    );
    const result = attemptClaim(
      this.matchState,
      this.peekState,
      spotIndex,
      playerIndex,
      now,
      this.random,
    );
    this.matchState = result.matchState;
    this.peekState = result.peekState;

    if (!result.claimed || slotIndex === -1) return [];
    return [{ type: "normalChickClaimed", slotIndex, spotIndex, playerIndex }];
  }

  view(): MatchView {
    const now = this.matchState.elapsedMs;
    const activeSpots = new Set(getActiveNormalSpotIndices(this.peekState, now));
    return {
      scores: this.matchState.scores,
      elapsedMs: this.matchState.elapsedMs,
      remainingMs: getRemainingMs(this.matchState),
      complete: isMatchComplete(this.matchState),
      winner: getWinner(this.matchState),
      normalChicks: this.peekState.peeks.flatMap((peek, slotIndex) => {
        if (
          peek.activeSpotIndex === null ||
          !isPeekActive(peek, now) ||
          !activeSpots.has(peek.activeSpotIndex)
        ) {
          return [];
        }
        return [{ slotIndex, spotIndex: peek.activeSpotIndex }];
      }),
      greenChick:
        getActiveGreenChickSpotIndex(this.greenChickState, now) === null
          ? null
          : {
              spotIndex: getActiveGreenChickSpotIndex(
                this.greenChickState,
                now,
              )!,
            },
    };
  }
}
