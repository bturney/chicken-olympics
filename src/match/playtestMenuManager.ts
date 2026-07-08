import {
  type TuningDraft,
  type ValidationError,
  createTuningDraft,
  commitDraft,
  stageDefaults,
  validateTuning,
  parseDurationMs,
  formatDurationMs,
} from "./playtestTuning";

export interface PlaytestMenuState {
  visible: boolean;
  draft: TuningDraft;
  fieldValue: string;
  errors: ValidationError[];
}

export function createPlaytestMenuState(): PlaytestMenuState {
  const draft = createTuningDraft();
  return {
    visible: false,
    draft,
    fieldValue: formatDurationMs(draft.draft.matchDurationMs),
    errors: [],
  };
}

export function toggleMenu(state: PlaytestMenuState): PlaytestMenuState {
  return { ...state, visible: !state.visible };
}

export function closeMenu(_state: PlaytestMenuState): PlaytestMenuState {
  const draft = createTuningDraft();
  return {
    visible: false,
    draft,
    fieldValue: formatDurationMs(draft.draft.matchDurationMs),
    errors: [],
  };
}

export function updateFieldValue(
  state: PlaytestMenuState,
  raw: string,
): PlaytestMenuState {
  const parsed = parseDurationMs(raw);
  if (parsed === null) {
    const errors: ValidationError[] = [
      { field: "matchDurationMs", message: "Invalid duration" },
    ];
    return { ...state, fieldValue: raw, errors };
  }
  const newDraft: TuningDraft = {
    draft: { matchDurationMs: parsed },
    applied: state.draft.applied,
  };
  const errors = validateTuning(newDraft.draft);
  return { ...state, draft: newDraft, fieldValue: raw, errors };
}

export function applyTuning(state: PlaytestMenuState): PlaytestMenuState {
  if (state.errors.length > 0) return state;
  const newDraft = commitDraft(state.draft);
  return {
    ...state,
    draft: newDraft,
    fieldValue: formatDurationMs(newDraft.draft.matchDurationMs),
    errors: [],
  };
}

export function resetDraftAction(state: PlaytestMenuState): PlaytestMenuState {
  return {
    ...state,
    draft: {
      draft: { ...state.draft.applied },
      applied: state.draft.applied,
    },
    fieldValue: formatDurationMs(state.draft.applied.matchDurationMs),
    errors: [],
  };
}

export function stageDefaultsAction(
  state: PlaytestMenuState,
): PlaytestMenuState {
  const staged = stageDefaults(state.draft);
  return {
    ...state,
    draft: staged,
    fieldValue: formatDurationMs(staged.draft.matchDurationMs),
    errors: [],
  };
}

export interface RestartWithTuningResult {
  tuningDraft: TuningDraft;
  sceneData: Record<string, unknown>;
}

export function restartWithTuning(
  state: PlaytestMenuState,
  sceneData: Record<string, unknown>,
): RestartWithTuningResult {
  const newDraft = commitDraft(state.draft);
  return {
    tuningDraft: newDraft,
    sceneData,
  };
}
