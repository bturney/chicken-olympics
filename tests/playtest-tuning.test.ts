import { describe, expect, it, beforeEach, vi } from "vitest";
import { Match } from "../src/match/match";

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((_index: number) => null as string | null),
  };
}

let mockStorage: Storage;

beforeEach(() => {
  mockStorage = createMockStorage();
  vi.stubGlobal("localStorage", mockStorage);
});
import {
  PRODUCTION_TUNING,
  createTuningDraft,
  parseDurationMs,
  parseCount,
  parseBoolean,
  parseSpeed,
  formatDurationMs,
  validateTuning,
  commitDraft,
  stageDefaults,
  loadTuning,
  clearTuning,
  isDefaultTuning,
  cloneTuning,
  type PlaytestTuning,
  type TuningDraft,
} from "../src/match/playtestTuning";

const STORAGE_KEY = "chicken-olympics-playtest-tuning";

function fullTuning(overrides?: Partial<PlaytestTuning>): PlaytestTuning {
  return { ...PRODUCTION_TUNING, ...overrides };
}

describe("PRODUCTION_TUNING", () => {
  it("defaults match duration to 90 seconds", () => {
    expect(PRODUCTION_TUNING.matchDurationMs).toBe(90_000);
  });

  it("defaults normal peek count to 3", () => {
    expect(PRODUCTION_TUNING.normalPeekCount).toBe(3);
  });

  it("defaults green chick enabled to true", () => {
    expect(PRODUCTION_TUNING.greenChickEnabled).toBe(true);
  });

  it("defaults player speed to 400 px/s", () => {
    expect(PRODUCTION_TUNING.playerSpeed).toBe(400);
  });

  it("defaults bot speed to 400 px/s", () => {
    expect(PRODUCTION_TUNING.botSpeed).toBe(400);
  });
});

describe("parseCount", () => {
  it("parses a positive whole number", () => {
    expect(parseCount("5")).toBe(5);
  });

  it("rejects zero", () => {
    expect(parseCount("0")).toBeNull();
  });

  it("rejects negative numbers", () => {
    expect(parseCount("-3")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseCount("abc")).toBeNull();
  });

  it("rejects decimals", () => {
    expect(parseCount("3.5")).toBeNull();
  });
});

describe("parseBoolean", () => {
  it("parses 'true' as true", () => {
    expect(parseBoolean("true")).toBe(true);
  });

  it("parses 'false' as false", () => {
    expect(parseBoolean("false")).toBe(false);
  });

  it("parses '1' as true", () => {
    expect(parseBoolean("1")).toBe(true);
  });

  it("parses '0' as false", () => {
    expect(parseBoolean("0")).toBe(false);
  });

  it("parses 'yes' as true", () => {
    expect(parseBoolean("yes")).toBe(true);
  });

  it("parses 'no' as false", () => {
    expect(parseBoolean("no")).toBe(false);
  });

  it("rejects invalid input", () => {
    expect(parseBoolean("maybe")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(parseBoolean("TRUE")).toBe(true);
    expect(parseBoolean("False")).toBe(false);
  });
});

describe("parseDurationMs", () => {
  it("parses a plain number string as milliseconds", () => {
    expect(parseDurationMs("600000")).toBe(600_000);
  });

  it("parses seconds with an s suffix", () => {
    expect(parseDurationMs("600s")).toBe(600_000);
  });

  it("parses fractional seconds with an s suffix", () => {
    expect(parseDurationMs("1.5s")).toBe(1_500);
  });

  it("parses minutes with an m suffix", () => {
    expect(parseDurationMs("10m")).toBe(600_000);
  });

  it("parses fractional minutes with an m suffix", () => {
    expect(parseDurationMs("1.5m")).toBe(90_000);
  });

  it("returns null for an empty string", () => {
    expect(parseDurationMs("")).toBeNull();
  });

  it("returns null for non-numeric text", () => {
    expect(parseDurationMs("abc")).toBeNull();
  });

  it("returns null for negative milliseconds", () => {
    expect(parseDurationMs("-1000")).toBeNull();
  });

  it("returns null for infinity-like input", () => {
    expect(parseDurationMs("inf")).toBeNull();
    expect(parseDurationMs("Infinity")).toBeNull();
    expect(parseDurationMs("NaN")).toBeNull();
  });

  it("returns null for a bare m suffix without digits", () => {
    expect(parseDurationMs("ms")).toBeNull();
  });

  it("returns null for a bare s suffix without digits", () => {
    expect(parseDurationMs("s")).toBeNull();
  });
});

describe("formatDurationMs", () => {
  it("formats milliseconds as a ms string", () => {
    expect(formatDurationMs(90_000)).toBe("90000ms");
  });
});

describe("parseSpeed", () => {
  it("parses a plain number as pixels per second", () => {
    expect(parseSpeed("400", 400)).toBe(400);
  });

  it("parses a number different from production default", () => {
    expect(parseSpeed("600", 400)).toBe(600);
  });

  it("parses a multiplier syntax 1.5x", () => {
    expect(parseSpeed("1.5x", 400)).toBe(600);
  });

  it("parses a multiplier syntax 0.5x", () => {
    expect(parseSpeed("0.5x", 400)).toBe(200);
  });

  it("parses a multiplier syntax 2x", () => {
    expect(parseSpeed("2x", 400)).toBe(800);
  });

  it("parses zero as a valid speed", () => {
    expect(parseSpeed("0", 400)).toBe(0);
  });

  it("returns null for negative plain number", () => {
    expect(parseSpeed("-100", 400)).toBeNull();
  });

  it("returns null for negative multiplier", () => {
    expect(parseSpeed("-1.5x", 400)).toBeNull();
  });

  it("returns null for non-numeric text", () => {
    expect(parseSpeed("abc", 400)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSpeed("", 400)).toBeNull();
  });

  it("returns null for infinity", () => {
    expect(parseSpeed("Infinity", 400)).toBeNull();
  });

  it("uses the correct production default for multiplier", () => {
    expect(parseSpeed("2x", 500)).toBe(1000);
  });
});

describe("cloneTuning", () => {
  it("creates an independent copy", () => {
    const copy = cloneTuning(PRODUCTION_TUNING);
    expect(copy).toEqual(PRODUCTION_TUNING);
    copy.matchDurationMs = 999;
    expect(PRODUCTION_TUNING.matchDurationMs).toBe(90_000);
  });
});

describe("createTuningDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a draft with production defaults when no saved tuning exists", () => {
    const draft = createTuningDraft();
    expect(draft.draft).toEqual(PRODUCTION_TUNING);
    expect(draft.applied).toEqual(PRODUCTION_TUNING);
  });

  it("creates a draft from saved tuning when it exists", () => {
    const saved = fullTuning({ matchDurationMs: 180_000 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const draft = createTuningDraft();
    expect(draft.draft).toEqual(saved);
    expect(draft.applied).toEqual(saved);
  });

  it("falls back to production defaults when saved tuning is corrupted", () => {
    localStorage.setItem(STORAGE_KEY, "not valid json");
    const draft = createTuningDraft();
    expect(draft.draft).toEqual(PRODUCTION_TUNING);
  });

  it("falls back to production defaults when saved tuning has invalid matchDurationMs", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ matchDurationMs: "not a number" }),
    );
    const draft = createTuningDraft();
    expect(draft.draft).toEqual(PRODUCTION_TUNING);
  });

  it("falls back to production defaults when saved tuning has negative matchDurationMs", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ matchDurationMs: -1000 }),
    );
    const draft = createTuningDraft();
    expect(draft.draft).toEqual(PRODUCTION_TUNING);
  });

  it("falls back to production defaults when saved tuning has Infinity matchDurationMs", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ matchDurationMs: Infinity }),
    );
    const draft = createTuningDraft();
    expect(draft.draft).toEqual(PRODUCTION_TUNING);
  });
});

describe("validateTuning", () => {
  it("passes for production defaults", () => {
    expect(validateTuning(PRODUCTION_TUNING)).toEqual([]);
  });

  it("passes for a valid tuned value", () => {
    expect(
      validateTuning(fullTuning({ matchDurationMs: 180_000 })),
    ).toEqual([]);
  });

  it("rejects negative match duration", () => {
    const errors = validateTuning(fullTuning({ matchDurationMs: -1000 }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.field).toBe("matchDurationMs");
  });

  it("rejects zero match duration", () => {
    const errors = validateTuning(fullTuning({ matchDurationMs: 0 }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects NaN match duration", () => {
    const errors = validateTuning(fullTuning({ matchDurationMs: Number.NaN }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects Infinity match duration", () => {
    const errors = validateTuning(fullTuning({ matchDurationMs: Number.POSITIVE_INFINITY }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects refill min >= refill max", () => {
    const errors = validateTuning(fullTuning({ normalRefillMinMs: 2000, normalRefillMaxMs: 1000 }));
    expect(errors.some((e) => e.field === "normalRefillMaxMs")).toBe(true);
  });

  it("rejects green chick schedule min >= max", () => {
    const errors = validateTuning(fullTuning({ greenChickScheduleMinMs: 50000, greenChickScheduleMaxMs: 30000 }));
    expect(errors.some((e) => e.field === "greenChickScheduleMaxMs")).toBe(true);
  });

  it("rejects non-integer normalPeekCount", () => {
    const errors = validateTuning(fullTuning({ normalPeekCount: 2.5 }));
    expect(errors.some((e) => e.field === "normalPeekCount")).toBe(true);
  });

  it("rejects negative peek duration", () => {
    const errors = validateTuning(fullTuning({ normalPeekDurationMs: -100 }));
    expect(errors.some((e) => e.field === "normalPeekDurationMs")).toBe(true);
  });

  it("rejects non-boolean greenChickEnabled", () => {
    const errors = validateTuning(fullTuning({ greenChickEnabled: "yes" as unknown as boolean }));
    expect(errors.some((e) => e.field === "greenChickEnabled")).toBe(true);
  });

  it("rejects negative playerSpeed", () => {
    const errors = validateTuning(fullTuning({ playerSpeed: -1 }));
    expect(errors.some((e) => e.field === "playerSpeed")).toBe(true);
  });

  it("accepts zero playerSpeed", () => {
    const errors = validateTuning(fullTuning({ playerSpeed: 0 }));
    expect(errors.some((e) => e.field === "playerSpeed")).toBe(false);
  });

  it("rejects NaN playerSpeed", () => {
    const errors = validateTuning(fullTuning({ playerSpeed: Number.NaN }));
    expect(errors.some((e) => e.field === "playerSpeed")).toBe(true);
  });

  it("rejects Infinity playerSpeed", () => {
    const errors = validateTuning(fullTuning({ playerSpeed: Number.POSITIVE_INFINITY }));
    expect(errors.some((e) => e.field === "playerSpeed")).toBe(true);
  });

  it("rejects negative botSpeed", () => {
    const errors = validateTuning(fullTuning({ botSpeed: -100 }));
    expect(errors.some((e) => e.field === "botSpeed")).toBe(true);
  });

  it("accepts zero botSpeed", () => {
    const errors = validateTuning(fullTuning({ botSpeed: 0 }));
    expect(errors.some((e) => e.field === "botSpeed")).toBe(false);
  });
});

describe("commitDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("applies the draft as the new applied state", () => {
    const draft = createTuningDraft();
    const modified: TuningDraft = {
      draft: fullTuning({ matchDurationMs: 180_000 }),
      applied: draft.applied,
    };
    const result = commitDraft(modified);
    expect(result.applied.matchDurationMs).toBe(180_000);
  });

  it("copies draft to applied on commit", () => {
    const draft = createTuningDraft();
    draft.draft.matchDurationMs = 300_000;
    const result = commitDraft(draft);
    expect(result.applied.matchDurationMs).toBe(300_000);
  });

  it("persists non-default tuning to localStorage", () => {
    const draft = createTuningDraft();
    draft.draft.matchDurationMs = 300_000;
    commitDraft(draft);
    const loaded = loadTuning();
    expect(loaded!.matchDurationMs).toBe(300_000);
  });

  it("clears localStorage when committed tuning equals production defaults", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullTuning({ matchDurationMs: 300_000 })));
    const draft = createTuningDraft();
    draft.draft.matchDurationMs = PRODUCTION_TUNING.matchDurationMs;
    draft.draft.normalPeekCount = PRODUCTION_TUNING.normalPeekCount;
    commitDraft(draft);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("stageDefaults", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sets the draft to production defaults without modifying applied state", () => {
    const draft = createTuningDraft();
    draft.draft.matchDurationMs = 300_000;
    const staged = stageDefaults(draft);
    expect(staged.draft).toEqual(PRODUCTION_TUNING);
    expect(staged.applied).toEqual(draft.applied);
  });

  it("does not clear localStorage", () => {
    const saved = fullTuning({ matchDurationMs: 300_000 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const draft = createTuningDraft();
    stageDefaults(draft);
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
  });
});

describe("loadTuning / clearTuning", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no tuning is saved", () => {
    expect(loadTuning()).toBeNull();
  });

  it("loads saved tuning", () => {
    const saved = fullTuning({ matchDurationMs: 120_000 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    expect(loadTuning()).toEqual(saved);
  });

  it("clears saved tuning", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullTuning({ matchDurationMs: 120_000 })));
    clearTuning();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null for corrupted JSON saved data", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    expect(loadTuning()).toBeNull();
  });

  it("returns null when saved data is not an object", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify("string"));
    expect(loadTuning()).toBeNull();
  });

  it("loads partial saved data with fallback defaults for missing fields", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ matchDurationMs: 120_000 }),
    );
    const loaded = loadTuning();
    expect(loaded!.matchDurationMs).toBe(120_000);
    expect(loaded!.normalPeekCount).toBe(PRODUCTION_TUNING.normalPeekCount);
    expect(loaded!.playerSpeed).toBe(PRODUCTION_TUNING.playerSpeed);
    expect(loaded!.botSpeed).toBe(PRODUCTION_TUNING.botSpeed);
  });

  it("loads saved data with playerSpeed and botSpeed", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ matchDurationMs: 120_000, playerSpeed: 600, botSpeed: 200 }),
    );
    const loaded = loadTuning();
    expect(loaded!.playerSpeed).toBe(600);
    expect(loaded!.botSpeed).toBe(200);
  });

  it("falls back to production playerSpeed when saved data has invalid value", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ matchDurationMs: 120_000, playerSpeed: "fast" }),
    );
    const loaded = loadTuning();
    expect(loaded!.playerSpeed).toBe(PRODUCTION_TUNING.playerSpeed);
  });
});

describe("isDefaultTuning", () => {
  it("returns true for production defaults", () => {
    expect(isDefaultTuning(PRODUCTION_TUNING)).toBe(true);
  });

  it("returns false for a non-default match duration", () => {
    expect(isDefaultTuning(fullTuning({ matchDurationMs: 180_000 }))).toBe(false);
  });

  it("returns false for a non-default peek count", () => {
    expect(isDefaultTuning(fullTuning({ normalPeekCount: 5 }))).toBe(false);
  });

  it("returns false for a non-default green chick state", () => {
    expect(isDefaultTuning(fullTuning({ greenChickEnabled: false }))).toBe(false);
  });

  it("returns false for a non-default player speed", () => {
    expect(isDefaultTuning(fullTuning({ playerSpeed: 600 }))).toBe(false);
  });

  it("returns false for a non-default bot speed", () => {
    expect(isDefaultTuning(fullTuning({ botSpeed: 200 }))).toBe(false);
  });
});

describe("Match with tuned duration", () => {
  it("can be constructed with a tuned match length through explicit options", () => {
    const match = new Match({
      durationMs: 180_000,
      spotCount: 6,
    });
    expect(match.view().remainingMs).toBe(180_000);
  });

  it("honours the tuned duration throughout the match lifecycle", () => {
    const match = new Match({
      durationMs: 30_000,
      spotCount: 6,
    });
    expect(match.view().remainingMs).toBe(30_000);
    match.advance(15_000);
    expect(match.view().remainingMs).toBe(15_000);
    match.advance(15_000);
    expect(match.view().complete).toBe(true);
  });
});

describe("Match with tuned Peek Pressure", () => {
  it("uses tuned normalPeekCount to control the number of simultaneous normal chicks", () => {
    const match = new Match({
      durationMs: 10_000,
      spotCount: 10,
      random: () => 0,
      peekPressureConfig: { normalPeekCount: 1 },
    });
    match.advance(0);
    expect(match.view().normalChicks).toHaveLength(1);
  });

  it("uses tuned normalPeekDurationMs to control how long chicks stay visible", () => {
    const match = new Match({
      durationMs: 10_000,
      spotCount: 10,
      random: () => 0,
      peekPressureConfig: {
        normalPeekDurationMs: 100,
        normalRefillMinMs: 10_000,
        normalRefillMaxMs: 10_000,
      },
    });
    match.advance(0);
    expect(match.view().normalChicks).toHaveLength(3);
    match.advance(200);
    expect(match.view().normalChicks).toHaveLength(0);
  });
});

describe("Match with tuned Green Chick", () => {
  it("does not spawn a green chick when greenChickEnabled is false", () => {
    const match = new Match({
      durationMs: 10_000,
      spotCount: 6,
      random: () => 0,
      greenChickConfig: { enabled: false },
    });
    match.advance(10_000);
    expect(match.view().greenChick).toBeNull();
  });

  it("uses tuned greenChickPoints for scoring", () => {
    const match = new Match({
      durationMs: 9_000,
      spotCount: 6,
      random: () => 0,
      greenChickConfig: { points: 10 },
    });
    match.advance(0);
    match.advance(2_000);
    const greenSpot = match.view().greenChick?.spotIndex ?? 0;
    match.claim(greenSpot, 0);
    expect(match.view().scores).toEqual([10, 0]);
  });

  it("uses tuned schedule to control green chick appearance timing", () => {
    const match = new Match({
      durationMs: 100_000,
      spotCount: 6,
      random: () => 0,
      greenChickConfig: { scheduleMinMs: 1_000, scheduleMaxMs: 1_000 },
    });
    match.advance(0);
    expect(match.view().greenChick).toBeNull();
    // schedule is scaled: 1000 * 100000 / 90000 ≈ 1111ms
    match.advance(1_200);
    expect(match.view().greenChick).not.toBeNull();
  });
});

describe("Match with tuned speed", () => {
  it("speed tuning is not passed to Match (uses scene-level live apply)", () => {
    // Speed tuning is live-applicable at the scene level, not via MatchOptions.
    // The computeMoveVelocity and tickBotChickenController seams already accept
    // explicit speed parameters, so tuning is verified through those seams.
    const match = new Match({ durationMs: 10_000, spotCount: 6 });
    expect(match.view().remainingMs).toBe(10_000);
  });
});
