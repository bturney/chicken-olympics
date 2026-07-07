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
}

const CLAIM_FEEDBACK_DURATION_MS = 350;
const CLAIM_POP_PEAK_SCALE = 1.4;
const NORMAL_CHICK_POINTS = 1;
const GREEN_CLAIM_BEAT_DURATION_MS = 850;
const GREEN_CLAIM_BEAT_PEAK_SCALE = 2.8;

interface ClaimAnimation {
  slotIndex: number;
  spotIndex: number;
  playerIndex: PlayerIndex;
  startedAtMs: number;
  durationMs: number;
}

function computeClaimPopScale(startedAtMs: number, now: number): number {
  if (now <= startedAtMs) return 1;
  const elapsed = now - startedAtMs;
  if (elapsed >= CLAIM_FEEDBACK_DURATION_MS) return 0;
  const progress = elapsed / CLAIM_FEEDBACK_DURATION_MS;
  if (progress < 0.5) {
    return 1 + (progress / 0.5) * (CLAIM_POP_PEAK_SCALE - 1);
  }
  return CLAIM_POP_PEAK_SCALE * (1 - (progress - 0.5) / 0.5);
}

interface GreenClaimBeatState {
  spotIndex: number;
  playerIndex: PlayerIndex;
  startedAtMs: number;
}

function computeGreenClaimBeatScale(startedAtMs: number, now: number): number {
  if (now <= startedAtMs) return 1;
  const elapsed = now - startedAtMs;
  if (elapsed >= GREEN_CLAIM_BEAT_DURATION_MS) return 0;
  const progress = elapsed / GREEN_CLAIM_BEAT_DURATION_MS;
  if (progress < 0.45) {
    return 1 + (progress / 0.45) * (GREEN_CLAIM_BEAT_PEAK_SCALE - 1);
  }
  return GREEN_CLAIM_BEAT_PEAK_SCALE * (1 - (progress - 0.45) / 0.55);
}

export class MatchPresentationFeedback {
  private readonly spotPositions: readonly SpotPosition[];
  private readonly playerHexColors: Record<PlayerIndex, number>;
  private readonly playerCssColors: Record<PlayerIndex, string>;
  private claimAnimations: ClaimAnimation[] = [];
  private greenClaimBeat: GreenClaimBeatState | null = null;

  constructor(config: MatchPresentationFeedbackConfig) {
    this.spotPositions = config.spotPositions;
    this.playerHexColors = config.playerHexColors;
    this.playerCssColors = config.playerCssColors;
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
            durationMs: CLAIM_FEEDBACK_DURATION_MS,
          });
          commands.push({
            type: "claimScoreEcho",
            spotIndex: event.spotIndex,
            points: NORMAL_CHICK_POINTS,
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
      const scale = computeClaimPopScale(anim.startedAtMs, elapsedMs);
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
      if (elapsed >= GREEN_CLAIM_BEAT_DURATION_MS) {
        this.greenClaimBeat = null;
      } else {
        const scale = computeGreenClaimBeatScale(beat.startedAtMs, elapsedMs);
        const progress = elapsed / GREEN_CLAIM_BEAT_DURATION_MS;
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
