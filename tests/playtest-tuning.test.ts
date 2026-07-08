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
  formatDurationMs,
  validateTuning,
  commitDraft,
  stageDefaults,
  loadTuning,
  clearTuning,
  isDefaultTuning,
  type PlaytestTuning,
  type TuningDraft,
} from "../src/match/playtestTuning";

const STORAGE_KEY = "chicken-olympics-playtest-tuning";

describe("PRODUCTION_TUNING", () => {
  it("defaults match duration to 90 seconds", () => {
    expect(PRODUCTION_TUNING.matchDurationMs).toBe(90_000);
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
    const saved: PlaytestTuning = { matchDurationMs: 180_000 };
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
      validateTuning({ matchDurationMs: 180_000 }),
    ).toEqual([]);
  });

  it("rejects negative match duration", () => {
    const errors = validateTuning({ matchDurationMs: -1000 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.field).toBe("matchDurationMs");
  });

  it("rejects zero match duration", () => {
    const errors = validateTuning({ matchDurationMs: 0 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects NaN match duration", () => {
    const errors = validateTuning({ matchDurationMs: Number.NaN });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects Infinity match duration", () => {
    const errors = validateTuning({ matchDurationMs: Number.POSITIVE_INFINITY });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("commitDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("applies the draft as the new applied state", () => {
    const draft = createTuningDraft();
    const modified: TuningDraft = {
      draft: { matchDurationMs: 180_000 },
      applied: draft.applied,
    };
    const result = commitDraft(modified);
    expect(result.applied).toEqual({ matchDurationMs: 180_000 });
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
    expect(loaded).toEqual({ matchDurationMs: 300_000 });
  });

  it("clears localStorage when committed tuning equals production defaults", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ matchDurationMs: 300_000 }));
    const draft = createTuningDraft();
    draft.draft.matchDurationMs = PRODUCTION_TUNING.matchDurationMs;
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
    const saved: PlaytestTuning = { matchDurationMs: 300_000 };
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
    const saved: PlaytestTuning = { matchDurationMs: 120_000 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    expect(loadTuning()).toEqual(saved);
  });

  it("clears saved tuning", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ matchDurationMs: 120_000 }));
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
});

describe("isDefaultTuning", () => {
  it("returns true for production defaults", () => {
    expect(isDefaultTuning(PRODUCTION_TUNING)).toBe(true);
  });

  it("returns false for a non-default value", () => {
    expect(isDefaultTuning({ matchDurationMs: 180_000 })).toBe(false);
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
