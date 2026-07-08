import { describe, expect, it, beforeEach, vi } from "vitest";

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

import { PRODUCTION_TUNING } from "../src/match/playtestTuning";
import {
  FIELDS,
  createPlaytestMenuState,
  toggleMenu,
  updateFieldValue,
  activateField,
  applyTuning,
  stageDefaultsAction,
  resetDraftAction,
  closeMenu,
  restartWithTuning,
} from "../src/match/playtestMenuManager";

describe("FIELDS", () => {
  it("has all 18 tuning fields", () => {
    expect(FIELDS).toHaveLength(18);
  });

  it("includes bot indecision fields as live-applicable", () => {
    const checkLive = (key: string) => {
      const field = FIELDS.find((f) => f.key === key);
      expect(field).toBeDefined();
      expect(field!.restartRequired).toBe(false);
    };
    checkLive("playerSpeed");
    checkLive("botSpeed");
    checkLive("reactionDelayMinMs");
    checkLive("reactionDelayMaxMs");
    checkLive("indecisionChance");
    checkLive("indecisionDurationMs");
    checkLive("farTargetChance");
  });
});

describe("createPlaytestMenuState", () => {
  it("creates a menu state with default draft, hidden, and no field errors", () => {
    const state = createPlaytestMenuState();
    expect(state.visible).toBe(false);
    expect(state.draft.draft).toEqual(PRODUCTION_TUNING);
    expect(state.draft.applied).toEqual(PRODUCTION_TUNING);
    expect(state.fieldValues[0]).toBe("90000ms");
    expect(state.errors).toEqual([]);
    expect(state.activeFieldIndex).toBe(0);
  });
});

describe("toggleMenu", () => {
  it("toggles visibility from false to true", () => {
    const state = createPlaytestMenuState();
    const toggled = toggleMenu(state);
    expect(toggled.visible).toBe(true);
  });

  it("toggles visibility from true to false", () => {
    const state = { ...createPlaytestMenuState(), visible: true };
    const toggled = toggleMenu(state);
    expect(toggled.visible).toBe(false);
  });

  it("preserves other state when toggling", () => {
    const state = createPlaytestMenuState();
    const toggled = toggleMenu(state);
    expect(toggled.fieldValues).toEqual(state.fieldValues);
    expect(toggled.draft).toBe(state.draft);
  });
});

describe("activateField", () => {
  it("sets activeFieldIndex within bounds", () => {
    const state = createPlaytestMenuState();
    const activated = activateField(state, 2);
    expect(activated.activeFieldIndex).toBe(2);
  });

  it("clamps to zero for negative index", () => {
    const state = createPlaytestMenuState();
    const activated = activateField(state, -1);
    expect(activated.activeFieldIndex).toBe(0);
  });

  it("clamps to max index", () => {
    const state = createPlaytestMenuState();
    const activated = activateField(state, 999);
    expect(activated.activeFieldIndex).toBe(FIELDS.length - 1);
  });
});

describe("updateFieldValue", () => {
  it("updates the active field value and draft for a valid duration string", () => {
    const state = createPlaytestMenuState();
    const updated = updateFieldValue(state, "60000");
    expect(updated.fieldValues[0]).toBe("60000");
    expect(updated.draft.draft.matchDurationMs).toBe(60_000);
    expect(updated.errors).toEqual([]);
  });

  it("parses seconds format for the active field", () => {
    const state = createPlaytestMenuState();
    const withActive = activateField(state, 0);
    const updated = updateFieldValue(withActive, "60s");
    expect(updated.draft.draft.matchDurationMs).toBe(60_000);
    expect(updated.errors).toEqual([]);
  });

  it("reports errors for invalid field value", () => {
    const state = createPlaytestMenuState();
    const updated = updateFieldValue(state, "abc");
    expect(updated.errors.length).toBeGreaterThan(0);
  });

  it("preserves field value even when parsing fails", () => {
    const state = createPlaytestMenuState();
    const updated = updateFieldValue(state, "not-valid");
    expect(updated.fieldValues[0]).toBe("not-valid");
  });

  it("parses a speed multiplier for the playerSpeed field", () => {
    const state = createPlaytestMenuState();
    const speedIndex = FIELDS.findIndex((f) => f.key === "playerSpeed");
    const withActive = activateField(state, speedIndex);
    const updated = updateFieldValue(withActive, "1.5x");
    expect(updated.draft.draft.playerSpeed).toBe(600);
  });

  it("parses a plain number for the botSpeed field", () => {
    const state = createPlaytestMenuState();
    const speedIndex = FIELDS.findIndex((f) => f.key === "botSpeed");
    const withActive = activateField(state, speedIndex);
    const updated = updateFieldValue(withActive, "200");
    expect(updated.draft.draft.botSpeed).toBe(200);
  });
});

describe("applyTuning", () => {
  it("commits the draft and returns updated state with no errors", () => {
    const state = createPlaytestMenuState();
    const withValue = updateFieldValue(state, "120s");
    const applied = applyTuning(withValue);
    expect(applied.draft.applied.matchDurationMs).toBe(120_000);
    expect(applied.draft.draft).toEqual(applied.draft.applied);
    expect(applied.errors).toEqual([]);
  });

  it("does not apply when there are validation errors", () => {
    const state = createPlaytestMenuState();
    const withError = updateFieldValue(state, "abc");
    const attempted = applyTuning(withError);
    expect(attempted.draft.applied.matchDurationMs).toBe(
      PRODUCTION_TUNING.matchDurationMs,
    );
  });
});

describe("resetDraftAction", () => {
  it("resets the draft to applied values", () => {
    const state = createPlaytestMenuState();
    const withValue = updateFieldValue(state, "120s");
    const applied = applyTuning(withValue);
    const withNewValue = updateFieldValue(applied, "60s");
    const reset = resetDraftAction(withNewValue);
    expect(reset.draft.draft.matchDurationMs).toBe(120_000);
    expect(reset.errors).toEqual([]);
  });
});

describe("stageDefaultsAction", () => {
  it("stages production defaults in the draft without affecting applied", () => {
    const state = createPlaytestMenuState();
    const withValue = updateFieldValue(state, "120s");
    const applied = applyTuning(withValue);
    const staged = stageDefaultsAction(applied);
    expect(staged.draft.draft).toEqual(PRODUCTION_TUNING);
    expect(staged.draft.applied.matchDurationMs).toBe(120_000);
    expect(staged.errors).toEqual([]);
  });

  it("updates fieldValues to match staged defaults", () => {
    const state = createPlaytestMenuState();
    const staged = stageDefaultsAction(state);
    expect(staged.fieldValues[0]).toBe("90000ms");
  });
});

describe("closeMenu", () => {
  it("sets visible to false", () => {
    const state = { ...createPlaytestMenuState(), visible: true };
    const closed = closeMenu(state);
    expect(closed.visible).toBe(false);
  });

  it("resets field values and errors to match draft", () => {
    const state = createPlaytestMenuState();
    const withError = updateFieldValue(state, "abc");
    const closed = closeMenu(withError);
    expect(closed.fieldValues[0]).toBe("90000ms");
    expect(closed.errors).toEqual([]);
  });
});

describe("restartWithTuning", () => {
  it("commits the draft and returns new scene data preserving original setup", () => {
    const sceneData = {
      p1Color: "blue" as const,
      p2Color: "red" as const,
      playerSlotCount: 2 as const,
      botSlots: [1],
    };
    const state = createPlaytestMenuState();
    const withValue = updateFieldValue(state, "120s");
    const result = restartWithTuning(withValue, sceneData);
    expect(result.tuningDraft.applied.matchDurationMs).toBe(120_000);
    expect(result.sceneData).toEqual(sceneData);
  });
});
