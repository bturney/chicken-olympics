import {
  type PlaytestTuning,
  type TuningDraft,
  type ValidationError,
  createTuningDraft,
  commitDraft,
  stageDefaults,
  validateTuning,
  parseDurationMs,
  parseCount,
  parseBoolean,
  parseSpeed,
  formatDurationMs,
  PRODUCTION_TUNING,
  cloneTuning,
} from "./playtestTuning";

export type FieldParser = (raw: string) => { parsed: unknown; error: string | null };

export interface FieldDef {
  key: string;
  label: string;
  unitHint: string;
  restartRequired: boolean;
  parser: FieldParser;
}

export function parseDurationField(raw: string): { parsed: unknown; error: string | null } {
  const val = parseDurationMs(raw);
  if (val === null) return { parsed: null, error: "Invalid duration" };
  return { parsed: val, error: null };
}

export function parseCountField(raw: string): { parsed: unknown; error: string | null } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { parsed: null, error: null };
  const val = parseCount(raw);
  if (val === null) return { parsed: null, error: "Invalid whole number" };
  return { parsed: val, error: null };
}

export function parseBooleanField(raw: string): { parsed: unknown; error: string | null } {
  const val = parseBoolean(raw);
  if (val === null) return { parsed: null, error: 'Must be true/false, 1/0, or yes/no' };
  return { parsed: val, error: null };
}

export function parseSpeedField(raw: string, productionDefault: number): { parsed: unknown; error: string | null } {
  const val = parseSpeed(raw, productionDefault);
  if (val === null) return { parsed: null, error: "Invalid speed; use px/s or multiplier like 1.5x" };
  return { parsed: val, error: null };
}

export function formatFieldValue(key: string, tuning: PlaytestTuning): string {
  const tuningRecord = tuning as unknown as Record<string, unknown>;
  const val = tuningRecord[key];
  if (key === "matchDurationMs" && typeof val === "number") return formatDurationMs(val);
  if (key === "playerSpeed" || key === "botSpeed") return String(val);
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number" || typeof val === "string") return String(val);
  return "";
}

export const FIELDS: FieldDef[] = [
  { key: "matchDurationMs", label: "Match Length", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField },
  { key: "normalPeekCount", label: "Normal Peek count", unitHint: "(whole number)", restartRequired: true, parser: parseCountField },
  { key: "normalPeekDurationMs", label: "Peek duration", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField },
  { key: "normalRefillMinMs", label: "Refill min", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField },
  { key: "normalRefillMaxMs", label: "Refill max", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField },
  { key: "peekAnticipationDurationMs", label: "Peek Anticipation", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField },
  { key: "normalChickPoints", label: "Normal chick points", unitHint: "(whole number)", restartRequired: true, parser: parseCountField },
  { key: "greenChickEnabled", label: "Green Chick enabled", unitHint: "(true/false)", restartRequired: true, parser: parseBooleanField },
  { key: "greenChickPoints", label: "Green Chick points", unitHint: "(whole number)", restartRequired: true, parser: parseCountField },
  { key: "greenChickScheduleMinMs", label: "Green Chick schedule min", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField },
  { key: "greenChickScheduleMaxMs", label: "Green Chick schedule max", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField },
  { key: "playerSpeed", label: "Player Speed", unitHint: "(px/s, 1.5x)", restartRequired: false, parser: (raw) => parseSpeedField(raw, PRODUCTION_TUNING.playerSpeed) },
  { key: "botSpeed", label: "Bot Speed", unitHint: "(px/s, 1.5x)", restartRequired: false, parser: (raw) => parseSpeedField(raw, PRODUCTION_TUNING.botSpeed) },
];

function buildFieldValues(tuning: PlaytestTuning): string[] {
  return FIELDS.map((f) => formatFieldValue(f.key, tuning));
}

function applyFieldValues(
  draft: TuningDraft,
  fieldValues: string[],
): { draft: TuningDraft; errors: ValidationError[] } {
  const newDraft = cloneTuning(draft.draft);
  const fieldErrors: ValidationError[] = [];

  for (let i = 0; i < FIELDS.length; i++) {
    const field = FIELDS[i]!;
    const raw = fieldValues[i] ?? "";
    const { parsed, error } = field.parser(raw);
    if (error !== null) {
      fieldErrors.push({ field: field.key, message: error });
    } else if (parsed !== null) {
      (newDraft as unknown as Record<string, unknown>)[field.key] = parsed;
    }
  }

  const tuningErrors = validateTuning(newDraft);
  const allErrors = [...fieldErrors, ...tuningErrors];

  return {
    draft: { draft: newDraft, applied: draft.applied },
    errors: allErrors,
  };
}

export interface PlaytestMenuState {
  visible: boolean;
  draft: TuningDraft;
  fieldValues: string[];
  activeFieldIndex: number;
  errors: ValidationError[];
}

export function createPlaytestMenuState(): PlaytestMenuState {
  const draft = createTuningDraft();
  return {
    visible: false,
    draft,
    fieldValues: buildFieldValues(draft.draft),
    activeFieldIndex: 0,
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
    fieldValues: buildFieldValues(draft.draft),
    activeFieldIndex: 0,
    errors: [],
  };
}

export function activateField(
  state: PlaytestMenuState,
  index: number,
): PlaytestMenuState {
  const clamped = Math.max(0, Math.min(FIELDS.length - 1, index));
  return { ...state, activeFieldIndex: clamped };
}

export function updateFieldValue(
  state: PlaytestMenuState,
  raw: string,
): PlaytestMenuState {
  const newFieldValues = [...state.fieldValues];
  newFieldValues[state.activeFieldIndex] = raw;
  const { draft, errors } = applyFieldValues(state.draft, newFieldValues);
  return { ...state, draft, fieldValues: newFieldValues, errors };
}

export function updateFieldValueAt(
  state: PlaytestMenuState,
  index: number,
  raw: string,
): PlaytestMenuState {
  const newFieldValues = [...state.fieldValues];
  newFieldValues[index] = raw;
  const { draft, errors } = applyFieldValues(state.draft, newFieldValues);
  return { ...state, draft, fieldValues: newFieldValues, errors };
}

export function applyTuning(state: PlaytestMenuState): PlaytestMenuState {
  if (state.errors.length > 0) return state;
  const newDraft = commitDraft(state.draft);
  return {
    ...state,
    draft: newDraft,
    fieldValues: buildFieldValues(newDraft.draft),
    errors: [],
  };
}

export function resetDraftAction(state: PlaytestMenuState): PlaytestMenuState {
  return {
    ...state,
    draft: {
      draft: cloneTuning(state.draft.applied),
      applied: state.draft.applied,
    },
    fieldValues: buildFieldValues(state.draft.applied),
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
    fieldValues: buildFieldValues(staged.draft),
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
