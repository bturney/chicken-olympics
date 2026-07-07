import { describe, it, expect } from "vitest";
import {
  MatchPresentationFeedback,
  type FeedbackCommand,
} from "../src/scenes/MatchPresentationFeedback";
import type { MatchEvent } from "../src/match/match";

const SPOT_POSITIONS = [
  { x: 100, y: 200 },
  { x: 300, y: 400 },
];

const PLAYER_HEX_COLORS: Record<number, number> = {
  0: 0x4488ff,
  1: 0xff4444,
};

const PLAYER_CSS_COLORS: Record<number, string> = {
  0: "#4488ff",
  1: "#ff4444",
};

const CLAIM_DURATION_MS = 350;
const GREEN_CLAIM_BEAT_DURATION_MS = 850;

function createFeedback(): MatchPresentationFeedback {
  return new MatchPresentationFeedback({
    spotPositions: SPOT_POSITIONS,
    playerHexColors: PLAYER_HEX_COLORS,
    playerCssColors: PLAYER_CSS_COLORS,
  });
}

function findBeat(
  commands: FeedbackCommand[],
): Extract<FeedbackCommand, { type: "normalClaimBeat" }> | undefined {
  return commands.find(
    (c): c is Extract<FeedbackCommand, { type: "normalClaimBeat" }> =>
      c.type === "normalClaimBeat",
  );
}

function findEcho(
  commands: FeedbackCommand[],
): Extract<FeedbackCommand, { type: "claimScoreEcho" }> | undefined {
  return commands.find(
    (c): c is Extract<FeedbackCommand, { type: "claimScoreEcho" }> =>
      c.type === "claimScoreEcho",
  );
}

function findSfx(
  commands: FeedbackCommand[],
): Extract<FeedbackCommand, { type: "sfx" }> | undefined {
  return commands.find(
    (c): c is Extract<FeedbackCommand, { type: "sfx" }> => c.type === "sfx",
  );
}

function findScoreBump(
  commands: FeedbackCommand[],
): Extract<FeedbackCommand, { type: "scoreBump" }> | undefined {
  return commands.find(
    (c): c is Extract<FeedbackCommand, { type: "scoreBump" }> =>
      c.type === "scoreBump",
  );
}

function findGreenBeat(
  commands: FeedbackCommand[],
): Extract<FeedbackCommand, { type: "greenClaimBeat" }> | undefined {
  return commands.find(
    (c): c is Extract<FeedbackCommand, { type: "greenClaimBeat" }> =>
      c.type === "greenClaimBeat",
  );
}

const CLAIM_EVENTS: MatchEvent[] = [
  { type: "normalChickClaimed", slotIndex: 0, spotIndex: 1, playerIndex: 0 },
];

describe("MatchPresentationFeedback", () => {
  it("returns no commands when no events are received", () => {
    const feedback = createFeedback();
    const commands = feedback.update([], 0);
    expect(commands).toEqual([]);
  });

  it("returns a normalClaimBeat command when a normal chick is claimed", () => {
    const feedback = createFeedback();
    const commands = feedback.update(CLAIM_EVENTS, 1000);
    const beat = findBeat(commands);
    expect(beat).toBeDefined();
    expect(beat!.slotIndex).toBe(0);
    expect(beat!.spotIndex).toBe(1);
    expect(beat!.playerIndex).toBe(0);
    expect(beat!.hexColor).toBe(0x4488ff);
    expect(beat!.scale).toBeCloseTo(1, 6);
  });

  it("scales above 1 halfway through the claim beat", () => {
    const feedback = createFeedback();
    feedback.update(CLAIM_EVENTS, 1000);
    const commands = feedback.update([], 1000 + CLAIM_DURATION_MS / 2);
    const beat = findBeat(commands);
    expect(beat).toBeDefined();
    expect(beat!.scale).toBeGreaterThan(1);
    expect(beat!.scale).toBeLessThanOrEqual(1.5);
  });

  it("returns scale 0 at the end of the claim beat duration", () => {
    const feedback = createFeedback();
    feedback.update(CLAIM_EVENTS, 1000);
    const commands = feedback.update([], 1000 + CLAIM_DURATION_MS);
    const beat = findBeat(commands);
    expect(beat).toBeUndefined();
  });

  it("stops returning the claim beat command after duration elapses", () => {
    const feedback = createFeedback();
    feedback.update(CLAIM_EVENTS, 1000);
    const commands = feedback.update([], 1000 + CLAIM_DURATION_MS + 50);
    const beat = findBeat(commands);
    expect(beat).toBeUndefined();
  });

  it("returns a claimScoreEcho command when a normal chick is claimed", () => {
    const feedback = createFeedback();
    const commands = feedback.update(CLAIM_EVENTS, 1000);
    const echo = findEcho(commands);
    expect(echo).toBeDefined();
    expect(echo!.spotIndex).toBe(1);
    expect(echo!.points).toBe(1);
    expect(echo!.cssColor).toBe("#4488ff");
  });

  it("returns an sfx command with normalClaim when a normal chick is claimed", () => {
    const feedback = createFeedback();
    const commands = feedback.update(CLAIM_EVENTS, 1000);
    const sfx = findSfx(commands);
    expect(sfx).toBeDefined();
    expect(sfx!.id).toBe("normalClaim");
  });

  it("returns a scoreBump command when a normal chick is claimed", () => {
    const feedback = createFeedback();
    const commands = feedback.update(CLAIM_EVENTS, 1000);
    const bump = findScoreBump(commands);
    expect(bump).toBeDefined();
    expect(bump!.playerIndex).toBe(0);
  });

  it("returns an sfx command with greenChickAppear when the green chick appears", () => {
    const feedback = createFeedback();
    const events: MatchEvent[] = [
      { type: "greenChickAppeared", spotIndex: 0 },
    ];
    const commands = feedback.update(events, 5000);
    const sfx = findSfx(commands);
    expect(sfx).toBeDefined();
    expect(sfx!.id).toBe("greenChickAppear");
  });

  it("returns a greenClaimBeat command when the green chick is claimed", () => {
    const feedback = createFeedback();
    const events: MatchEvent[] = [
      { type: "greenChickClaimed", spotIndex: 0, playerIndex: 1 },
    ];
    const commands = feedback.update(events, 5000);
    const beat = findGreenBeat(commands);
    expect(beat).toBeDefined();
    expect(beat!.spotIndex).toBe(0);
    expect(beat!.playerIndex).toBe(1);
    expect(beat!.hexColor).toBe(0xff4444);
    expect(beat!.scale).toBeCloseTo(1, 6);
    expect(beat!.progress).toBeCloseTo(0, 6);
  });

  it("returns an sfx command with greenChickClaim when the green chick is claimed", () => {
    const feedback = createFeedback();
    const events: MatchEvent[] = [
      { type: "greenChickClaimed", spotIndex: 0, playerIndex: 0 },
    ];
    const commands = feedback.update(events, 5000);
    const sfx = findSfx(commands);
    expect(sfx).toBeDefined();
    expect(sfx!.id).toBe("greenChickClaim");
  });

  it("returns greenClaimBeat with increasing progress over time", () => {
    const feedback = createFeedback();
    const events: MatchEvent[] = [
      { type: "greenChickClaimed", spotIndex: 0, playerIndex: 0 },
    ];
    feedback.update(events, 5000);
    const commands = feedback.update([], 5000 + GREEN_CLAIM_BEAT_DURATION_MS / 2);
    const beat = findGreenBeat(commands);
    expect(beat).toBeDefined();
    expect(beat!.progress).toBeGreaterThan(0);
    expect(beat!.progress).toBeLessThan(1);
    expect(beat!.scale).toBeGreaterThan(1);
  });

  it("stops returning greenClaimBeat after duration elapses", () => {
    const feedback = createFeedback();
    const events: MatchEvent[] = [
      { type: "greenChickClaimed", spotIndex: 0, playerIndex: 0 },
    ];
    feedback.update(events, 5000);
    const commands = feedback.update([], 5000 + GREEN_CLAIM_BEAT_DURATION_MS + 50);
    const beat = findGreenBeat(commands);
    expect(beat).toBeUndefined();
  });

  it("handles greenChickMissed events without crashing", () => {
    const feedback = createFeedback();
    const events: MatchEvent[] = [
      { type: "greenChickMissed", spotIndex: 0 },
    ];
    const commands = feedback.update(events, 5000);
    expect(commands).toEqual([]);
  });
});
