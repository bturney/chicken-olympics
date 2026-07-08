import {
  type PlaytestTuning,
  type TuningDraft,
  type TuningValidationContext,
  type ValidationError,
  createTuningDraft,
  commitDraft,
  stageDefaults,
  validateTuning,
  parseDurationMs,
  parseCount,
  parseBoolean,
  parseChance,
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
  section: string;
}

export const SECTIONS: string[] = [
  "Match",
  "Chicken Cursor Responsiveness",
  "Peek Pressure",
  "Green Chick",
  "Bot Chicken Indecision",
  "Claim Feedback",
];

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

export function parseChanceField(raw: string): { parsed: unknown; error: string | null } {
  const val = parseChance(raw);
  if (val === null) return { parsed: null, error: "Invalid chance; use decimal (0-1) or percent (0%-100%)" };
  return { parsed: val, error: null };
}

export function parseScaleField(raw: string): { parsed: unknown; error: string | null } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { parsed: null, error: null };
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return { parsed: null, error: "Must be a non-negative finite number" };
  }
  const val = parseFloat(trimmed);
  if (!Number.isFinite(val) || val < 0) return { parsed: null, error: "Must be a non-negative finite number" };
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
  { key: "matchDurationMs", label: "Match Length", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField, section: "Match" },

  { key: "playerSpeed", label: "Player Speed", unitHint: "(px/s, 1.5x)", restartRequired: false, parser: (raw) => parseSpeedField(raw, PRODUCTION_TUNING.playerSpeed), section: "Chicken Cursor Responsiveness" },
  { key: "botSpeed", label: "Bot Speed", unitHint: "(px/s, 1.5x)", restartRequired: false, parser: (raw) => parseSpeedField(raw, PRODUCTION_TUNING.botSpeed), section: "Chicken Cursor Responsiveness" },

  { key: "normalPeekCount", label: "Normal Peek count", unitHint: "(whole number)", restartRequired: true, parser: parseCountField, section: "Peek Pressure" },
  { key: "normalPeekDurationMs", label: "Peek duration", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField, section: "Peek Pressure" },
  { key: "normalRefillMinMs", label: "Refill min", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField, section: "Peek Pressure" },
  { key: "normalRefillMaxMs", label: "Refill max", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField, section: "Peek Pressure" },
  { key: "peekAnticipationDurationMs", label: "Peek Anticipation", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField, section: "Peek Pressure" },
  { key: "normalChickPoints", label: "Normal chick points", unitHint: "(whole number)", restartRequired: true, parser: parseCountField, section: "Peek Pressure" },

  { key: "greenChickEnabled", label: "Green Chick enabled", unitHint: "(true/false)", restartRequired: true, parser: parseBooleanField, section: "Green Chick" },
  { key: "greenChickPoints", label: "Green Chick points", unitHint: "(whole number)", restartRequired: true, parser: parseCountField, section: "Green Chick" },
  { key: "greenChickScheduleMinMs", label: "Green Chick schedule min", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField, section: "Green Chick" },
  { key: "greenChickScheduleMaxMs", label: "Green Chick schedule max", unitHint: "(ms, s, m)", restartRequired: true, parser: parseDurationField, section: "Green Chick" },

  { key: "reactionDelayMinMs", label: "Bot Reaction Delay min", unitHint: "(ms, s, m)", restartRequired: false, parser: parseDurationField, section: "Bot Chicken Indecision" },
  { key: "reactionDelayMaxMs", label: "Bot Reaction Delay max", unitHint: "(ms, s, m)", restartRequired: false, parser: parseDurationField, section: "Bot Chicken Indecision" },
  { key: "indecisionChance", label: "Bot Indecision chance", unitHint: "(0-1, 0%-100%)", restartRequired: false, parser: parseChanceField, section: "Bot Chicken Indecision" },
  { key: "indecisionDurationMs", label: "Bot Indecision duration", unitHint: "(ms, s, m)", restartRequired: false, parser: parseDurationField, section: "Bot Chicken Indecision" },
  { key: "farTargetChance", label: "Bot Far Target chance", unitHint: "(0-1, 0%-100%)", restartRequired: false, parser: parseChanceField, section: "Bot Chicken Indecision" },

  { key: "claimFeedbackDurationMs", label: "Claim Beat duration", unitHint: "(ms, s, m)", restartRequired: false, parser: parseDurationField, section: "Claim Feedback" },
  { key: "claimPopPeakScale", label: "Claim Beat scale", unitHint: "(non-negative number)", restartRequired: false, parser: parseScaleField, section: "Claim Feedback" },
  { key: "greenClaimBeatDurationMs", label: "Green Claim Beat duration", unitHint: "(ms, s, m)", restartRequired: false, parser: parseDurationField, section: "Claim Feedback" },
  { key: "greenClaimBeatPeakScale", label: "Green Claim Beat scale", unitHint: "(non-negative number)", restartRequired: false, parser: parseScaleField, section: "Claim Feedback" },
];

function buildFieldValues(tuning: PlaytestTuning): string[] {
  return FIELDS.map((f) => formatFieldValue(f.key, tuning));
}

function applyFieldValues(
  draft: TuningDraft,
  fieldValues: string[],
  validationContext: TuningValidationContext,
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

  const tuningErrors = validateTuning(newDraft, validationContext);
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
  validationContext: TuningValidationContext;
}

export function createPlaytestMenuState(
  validationContext: TuningValidationContext = {},
): PlaytestMenuState {
  const draft = createTuningDraft(validationContext);
  return {
    visible: false,
    draft,
    fieldValues: buildFieldValues(draft.draft),
    activeFieldIndex: 0,
    errors: [],
    validationContext,
  };
}

export function toggleMenu(state: PlaytestMenuState): PlaytestMenuState {
  return { ...state, visible: !state.visible };
}

export function closeMenu(_state: PlaytestMenuState): PlaytestMenuState {
  const draft = createTuningDraft(_state.validationContext);
  return {
    visible: false,
    draft,
    fieldValues: buildFieldValues(draft.draft),
    activeFieldIndex: 0,
    errors: [],
    validationContext: _state.validationContext,
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
  const { draft, errors } = applyFieldValues(state.draft, newFieldValues, state.validationContext);
  return { ...state, draft, fieldValues: newFieldValues, errors };
}

export function updateFieldValueAt(
  state: PlaytestMenuState,
  index: number,
  raw: string,
): PlaytestMenuState {
  const newFieldValues = [...state.fieldValues];
  newFieldValues[index] = raw;
  const { draft, errors } = applyFieldValues(state.draft, newFieldValues, state.validationContext);
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
