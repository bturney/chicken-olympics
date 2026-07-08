import type { MatchEvent } from "../match/match";
import type { PlayerIndex, SpotPosition } from "../match/rules";
import type { MatchSfxId } from "./MatchScene";

export type FeedbackCommand =
  | {
      type: "normalClaimBeat";
      slotIndex: number;
      spotIndex: number;
      playerIndex: PlayerIndex;
      scale: number;
      hexColor: number;
    }
  | {
      type: "greenClaimBeat";
      spotIndex: number;
      playerIndex: PlayerIndex;
      scale: number;
      progress: number;
      hexColor: number;
    }
  | {
      type: "claimScoreEcho";
      spotIndex: number;
      points: number;
      cssColor: string;
    }
  | { type: "scoreBump"; playerIndex: PlayerIndex }
  | { type: "sfx"; id: MatchSfxId };

export interface MatchPresentationFeedbackConfig {
  spotPositions: readonly SpotPosition[];
  playerHexColors: Record<number, number>;
  playerCssColors: Record<number, string>;
  claimFeedbackDurationMs?: number;
  claimPopPeakScale?: number;
  greenClaimBeatDurationMs?: number;
  greenClaimBeatPeakScale?: number;
}

const PRODUCTION_CONFIG = {
  claimFeedbackDurationMs: 350,
  claimPopPeakScale: 1.4,
  greenClaimBeatDurationMs: 850,
  greenClaimBeatPeakScale: 2.8,
} as const;

interface ClaimAnimation {
  slotIndex: number;
  spotIndex: number;
  playerIndex: PlayerIndex;
  startedAtMs: number;
  durationMs: number;
}

function computeClaimPopScale(startedAtMs: number, now: number, durationMs: number, peakScale: number): number {
  if (now <= startedAtMs) return 1;
  const elapsed = now - startedAtMs;
  if (elapsed >= durationMs) return 0;
  const progress = elapsed / durationMs;
  if (progress < 0.5) {
    return 1 + (progress / 0.5) * (peakScale - 1);
  }
  return peakScale * (1 - (progress - 0.5) / 0.5);
}

interface GreenClaimBeatState {
  spotIndex: number;
  playerIndex: PlayerIndex;
  startedAtMs: number;
}

function computeGreenClaimBeatScale(startedAtMs: number, now: number, durationMs: number, peakScale: number): number {
  if (now <= startedAtMs) return 1;
  const elapsed = now - startedAtMs;
  if (elapsed >= durationMs) return 0;
  const progress = elapsed / durationMs;
  if (progress < 0.45) {
    return 1 + (progress / 0.45) * (peakScale - 1);
  }
  return peakScale * (1 - (progress - 0.45) / 0.55);
}

export class MatchPresentationFeedback {
  private readonly spotPositions: readonly SpotPosition[];
  private readonly playerHexColors: Record<PlayerIndex, number>;
  private readonly playerCssColors: Record<PlayerIndex, string>;
  private claimAnimations: ClaimAnimation[] = [];
  private greenClaimBeat: GreenClaimBeatState | null = null;
  private claimFeedbackDurationMs: number;
  private claimPopPeakScale: number;
  private greenClaimBeatDurationMs: number;
  private greenClaimBeatPeakScale: number;

  constructor(config: MatchPresentationFeedbackConfig) {
    this.spotPositions = config.spotPositions;
    this.playerHexColors = config.playerHexColors;
    this.playerCssColors = config.playerCssColors;
    this.claimFeedbackDurationMs = config.claimFeedbackDurationMs ?? PRODUCTION_CONFIG.claimFeedbackDurationMs;
    this.claimPopPeakScale = config.claimPopPeakScale ?? PRODUCTION_CONFIG.claimPopPeakScale;
    this.greenClaimBeatDurationMs = config.greenClaimBeatDurationMs ?? PRODUCTION_CONFIG.greenClaimBeatDurationMs;
    this.greenClaimBeatPeakScale = config.greenClaimBeatPeakScale ?? PRODUCTION_CONFIG.greenClaimBeatPeakScale;
  }

  applyConfig(config: { claimFeedbackDurationMs?: number; claimPopPeakScale?: number; greenClaimBeatDurationMs?: number; greenClaimBeatPeakScale?: number }): void {
    if (config.claimFeedbackDurationMs !== undefined) this.claimFeedbackDurationMs = config.claimFeedbackDurationMs;
    if (config.claimPopPeakScale !== undefined) this.claimPopPeakScale = config.claimPopPeakScale;
    if (config.greenClaimBeatDurationMs !== undefined) this.greenClaimBeatDurationMs = config.greenClaimBeatDurationMs;
    if (config.greenClaimBeatPeakScale !== undefined) this.greenClaimBeatPeakScale = config.greenClaimBeatPeakScale;
  }

  update(events: MatchEvent[], elapsedMs: number): FeedbackCommand[] {
    const commands: FeedbackCommand[] = [];

    for (const event of events) {
      switch (event.type) {
        case "normalChickClaimed":
          this.claimAnimations.push({
            slotIndex: event.slotIndex,
            spotIndex: event.spotIndex,
            playerIndex: event.playerIndex,
            startedAtMs: elapsedMs,
            durationMs: this.claimFeedbackDurationMs,
          });
          commands.push({
            type: "claimScoreEcho",
            spotIndex: event.spotIndex,
            points: event.points,
            cssColor: this.playerCssColors[event.playerIndex],
          });
          commands.push({ type: "sfx", id: "normalClaim" });
          commands.push({ type: "scoreBump", playerIndex: event.playerIndex });
          break;
        case "greenChickAppeared":
          commands.push({ type: "sfx", id: "greenChickAppear" });
          break;
        case "greenChickClaimed":
          this.greenClaimBeat = {
            spotIndex: event.spotIndex,
            playerIndex: event.playerIndex,
            startedAtMs: elapsedMs,
          };
          commands.push({ type: "sfx", id: "greenChickClaim" });
          break;
      }
    }

    this.claimAnimations = this.claimAnimations.filter(
      (anim) => elapsedMs - anim.startedAtMs < anim.durationMs,
    );

    for (const anim of this.claimAnimations) {
      const scale = computeClaimPopScale(anim.startedAtMs, elapsedMs, this.claimFeedbackDurationMs, this.claimPopPeakScale);
      if (scale > 0) {
        commands.push({
          type: "normalClaimBeat",
          slotIndex: anim.slotIndex,
          spotIndex: anim.spotIndex,
          playerIndex: anim.playerIndex,
          scale,
          hexColor: this.playerHexColors[anim.playerIndex],
        });
      }
    }

    if (this.greenClaimBeat !== null) {
      const beat = this.greenClaimBeat;
      const elapsed = elapsedMs - beat.startedAtMs;
      if (elapsed >= this.greenClaimBeatDurationMs) {
        this.greenClaimBeat = null;
      } else {
        const scale = computeGreenClaimBeatScale(beat.startedAtMs, elapsedMs, this.greenClaimBeatDurationMs, this.greenClaimBeatPeakScale);
        const progress = elapsed / this.greenClaimBeatDurationMs;
        commands.push({
          type: "greenClaimBeat",
          spotIndex: beat.spotIndex,
          playerIndex: beat.playerIndex,
          scale,
          progress,
          hexColor: this.playerHexColors[beat.playerIndex],
        });
      }
    }

    return commands;
  }
}
