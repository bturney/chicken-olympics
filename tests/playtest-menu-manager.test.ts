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
  createPlaytestMenuState,
  toggleMenu,
  updateFieldValue,
  applyTuning,
  stageDefaultsAction,
  resetDraftAction,
  closeMenu,
  restartWithTuning,
} from "../src/match/playtestMenuManager";

describe("createPlaytestMenuState", () => {
  it("creates a menu state with default draft, hidden, and no field errors", () => {
    const state = createPlaytestMenuState();
    expect(state.visible).toBe(false);
    expect(state.draft.draft).toEqual(PRODUCTION_TUNING);
    expect(state.draft.applied).toEqual(PRODUCTION_TUNING);
    expect(state.fieldValue).toBe("90000ms");
    expect(state.errors).toEqual([]);
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
    expect(toggled.fieldValue).toBe(state.fieldValue);
    expect(toggled.draft).toBe(state.draft);
  });
});

describe("updateFieldValue", () => {
  it("updates field value and draft for a valid duration string", () => {
    const state = createPlaytestMenuState();
    const updated = updateFieldValue(state, "60000");
    expect(updated.fieldValue).toBe("60000");
    expect(updated.draft.draft.matchDurationMs).toBe(60_000);
    expect(updated.errors).toEqual([]);
  });

  it("parses seconds format", () => {
    const state = createPlaytestMenuState();
    const updated = updateFieldValue(state, "60s");
    expect(updated.draft.draft.matchDurationMs).toBe(60_000);
    expect(updated.errors).toEqual([]);
  });

  it("parses minutes format", () => {
    const state = createPlaytestMenuState();
    const updated = updateFieldValue(state, "2m");
    expect(updated.draft.draft.matchDurationMs).toBe(120_000);
    expect(updated.errors).toEqual([]);
  });

  it("reports errors for invalid duration", () => {
    const state = createPlaytestMenuState();
    const updated = updateFieldValue(state, "abc");
    expect(updated.errors.length).toBeGreaterThan(0);
  });

  it("reports errors for negative duration", () => {
    const state = createPlaytestMenuState();
    const updated = updateFieldValue(state, "-1000");
    expect(updated.errors.length).toBeGreaterThan(0);
  });

  it("preserves field value even when parsing fails", () => {
    const state = createPlaytestMenuState();
    const updated = updateFieldValue(state, "not-valid");
    expect(updated.fieldValue).toBe("not-valid");
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

  it("updates fieldValue to match staged defaults", () => {
    const state = createPlaytestMenuState();
    const staged = stageDefaultsAction(state);
    expect(staged.fieldValue).toBe("90000ms");
  });
});

describe("closeMenu", () => {
  it("sets visible to false", () => {
    const state = { ...createPlaytestMenuState(), visible: true };
    const closed = closeMenu(state);
    expect(closed.visible).toBe(false);
  });

  it("resets field value and errors to match draft", () => {
    const state = createPlaytestMenuState();
    const withError = updateFieldValue(state, "abc");
    const closed = closeMenu(withError);
    expect(closed.fieldValue).toBe("90000ms");
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
