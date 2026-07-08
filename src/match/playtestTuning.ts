const STORAGE_KEY = "chicken-olympics-playtest-tuning";

export interface PlaytestTuning {
  matchDurationMs: number;
  normalPeekCount: number;
  normalPeekDurationMs: number;
  normalRefillMinMs: number;
  normalRefillMaxMs: number;
  peekAnticipationDurationMs: number;
  normalChickPoints: number;
  greenChickEnabled: boolean;
  greenChickPoints: number;
  greenChickScheduleMinMs: number;
  greenChickScheduleMaxMs: number;
}

export const PRODUCTION_TUNING: PlaytestTuning = {
  matchDurationMs: 90_000,
  normalPeekCount: 3,
  normalPeekDurationMs: 5_000,
  normalRefillMinMs: 900,
  normalRefillMaxMs: 1_900,
  peekAnticipationDurationMs: 700,
  normalChickPoints: 1,
  greenChickEnabled: true,
  greenChickPoints: 5,
  greenChickScheduleMinMs: 20_000,
  greenChickScheduleMaxMs: 70_000,
};

export interface TuningDraft {
  draft: PlaytestTuning;
  applied: PlaytestTuning;
}

export function createTuningDraft(): TuningDraft {
  const saved = loadTuning();
  const applied = saved ?? PRODUCTION_TUNING;
  return { draft: { ...applied }, applied };
}

export function parseCount(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const match = trimmed.match(/^(\d+)$/);
  if (!match) return null;
  const val = parseInt(match[1]!, 10);
  if (!Number.isFinite(val) || val < 1) return null;
  return val;
}

export function parseBoolean(input: string): boolean | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "true" || trimmed === "1" || trimmed === "yes") return true;
  if (trimmed === "false" || trimmed === "0" || trimmed === "no") return false;
  return null;
}

export function parseDurationMs(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const msMatch = trimmed.match(/^(-?\d+)$/);
  if (msMatch) {
    const val = parseInt(msMatch[1]!, 10);
    if (val < 0) return null;
    return val;
  }

  const sMatch = trimmed.match(/^(-?(\d+(?:\.\d+)?))s$/);
  if (sMatch) {
    const val = parseFloat(sMatch[1]!);
    if (val < 0) return null;
    return Math.round(val * 1000);
  }

  const mMatch = trimmed.match(/^(-?(\d+(?:\.\d+)?))m$/);
  if (mMatch) {
    const val = parseFloat(mMatch[1]!);
    if (val < 0) return null;
    return Math.round(val * 60 * 1000);
  }

  return null;
}

export function formatDurationMs(ms: number): string {
  return `${ms}ms`;
}

export interface ValidationError {
  field: string;
  message: string;
}

function isPositiveFinite(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val) && val > 0;
}

function isPositiveInteger(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val) && val >= 1 && Number.isInteger(val);
}

export function validateTuning(tuning: PlaytestTuning): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isPositiveFinite(tuning.matchDurationMs)) {
    errors.push({
      field: "matchDurationMs",
      message: "Must be a positive finite number",
    });
  }
  if (tuning.greenChickScheduleMinMs >= tuning.greenChickScheduleMaxMs) {
    errors.push({
      field: "greenChickScheduleMaxMs",
      message: "Schedule max must be greater than min",
    });
  }
  if (!isPositiveFinite(tuning.greenChickScheduleMinMs)) {
    errors.push({
      field: "greenChickScheduleMinMs",
      message: "Must be a positive finite number",
    });
  }
  if (!isPositiveFinite(tuning.greenChickScheduleMaxMs)) {
    errors.push({
      field: "greenChickScheduleMaxMs",
      message: "Must be a positive finite number",
    });
  }
  if (tuning.normalRefillMinMs >= tuning.normalRefillMaxMs) {
    errors.push({
      field: "normalRefillMaxMs",
      message: "Refill max must be greater than min",
    });
  }
  if (!isPositiveFinite(tuning.normalRefillMinMs)) {
    errors.push({
      field: "normalRefillMinMs",
      message: "Must be a positive finite number",
    });
  }
  if (!isPositiveFinite(tuning.normalRefillMaxMs)) {
    errors.push({
      field: "normalRefillMaxMs",
      message: "Must be a positive finite number",
    });
  }
  if (!isPositiveFinite(tuning.normalPeekDurationMs)) {
    errors.push({
      field: "normalPeekDurationMs",
      message: "Must be a positive finite number",
    });
  }
  if (!isPositiveFinite(tuning.peekAnticipationDurationMs)) {
    errors.push({
      field: "peekAnticipationDurationMs",
      message: "Must be a positive finite number",
    });
  }
  if (!isPositiveInteger(tuning.normalPeekCount)) {
    errors.push({
      field: "normalPeekCount",
      message: "Must be a positive whole number",
    });
  }
  if (!isPositiveInteger(tuning.normalChickPoints)) {
    errors.push({
      field: "normalChickPoints",
      message: "Must be a positive whole number",
    });
  }
  if (!isPositiveInteger(tuning.greenChickPoints)) {
    errors.push({
      field: "greenChickPoints",
      message: "Must be a positive whole number",
    });
  }
  if (typeof tuning.greenChickEnabled !== "boolean") {
    errors.push({
      field: "greenChickEnabled",
      message: "Must be true or false",
    });
  }
  return errors;
}

export function cloneTuning(tuning: PlaytestTuning): PlaytestTuning {
  return { ...tuning };
}

export function commitDraft(draft: TuningDraft): TuningDraft {
  const newApplied = cloneTuning(draft.draft);
  if (isDefaultTuning(newApplied)) {
    clearTuning();
  } else {
    saveTuning(newApplied);
  }
  return { draft: cloneTuning(newApplied), applied: newApplied };
}

export function stageDefaults(_draft: TuningDraft): TuningDraft {
  return {
    draft: { ...PRODUCTION_TUNING },
    applied: _draft.applied,
  };
}

export function isDefaultTuning(tuning: PlaytestTuning): boolean {
  return (
    tuning.matchDurationMs === PRODUCTION_TUNING.matchDurationMs &&
    tuning.normalPeekCount === PRODUCTION_TUNING.normalPeekCount &&
    tuning.normalPeekDurationMs === PRODUCTION_TUNING.normalPeekDurationMs &&
    tuning.normalRefillMinMs === PRODUCTION_TUNING.normalRefillMinMs &&
    tuning.normalRefillMaxMs === PRODUCTION_TUNING.normalRefillMaxMs &&
    tuning.peekAnticipationDurationMs === PRODUCTION_TUNING.peekAnticipationDurationMs &&
    tuning.normalChickPoints === PRODUCTION_TUNING.normalChickPoints &&
    tuning.greenChickEnabled === PRODUCTION_TUNING.greenChickEnabled &&
    tuning.greenChickPoints === PRODUCTION_TUNING.greenChickPoints &&
    tuning.greenChickScheduleMinMs === PRODUCTION_TUNING.greenChickScheduleMinMs &&
    tuning.greenChickScheduleMaxMs === PRODUCTION_TUNING.greenChickScheduleMaxMs
  );
}

export function saveTuning(tuning: PlaytestTuning): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function loadTuning(): PlaytestTuning | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const c = parsed;
    if (typeof c.matchDurationMs !== "number" || !Number.isFinite(c.matchDurationMs) || c.matchDurationMs <= 0) return null;
    return {
      matchDurationMs: c.matchDurationMs,
      normalPeekCount: typeof c.normalPeekCount === "number" && Number.isInteger(c.normalPeekCount) && c.normalPeekCount >= 1 ? c.normalPeekCount : PRODUCTION_TUNING.normalPeekCount,
      normalPeekDurationMs: typeof c.normalPeekDurationMs === "number" && Number.isFinite(c.normalPeekDurationMs) && c.normalPeekDurationMs > 0 ? c.normalPeekDurationMs : PRODUCTION_TUNING.normalPeekDurationMs,
      normalRefillMinMs: typeof c.normalRefillMinMs === "number" && Number.isFinite(c.normalRefillMinMs) && c.normalRefillMinMs > 0 ? c.normalRefillMinMs : PRODUCTION_TUNING.normalRefillMinMs,
      normalRefillMaxMs: typeof c.normalRefillMaxMs === "number" && Number.isFinite(c.normalRefillMaxMs) && c.normalRefillMaxMs > 0 ? c.normalRefillMaxMs : PRODUCTION_TUNING.normalRefillMaxMs,
      peekAnticipationDurationMs: typeof c.peekAnticipationDurationMs === "number" && Number.isFinite(c.peekAnticipationDurationMs) && c.peekAnticipationDurationMs > 0 ? c.peekAnticipationDurationMs : PRODUCTION_TUNING.peekAnticipationDurationMs,
      normalChickPoints: typeof c.normalChickPoints === "number" && Number.isInteger(c.normalChickPoints) && c.normalChickPoints >= 1 ? c.normalChickPoints : PRODUCTION_TUNING.normalChickPoints,
      greenChickEnabled: typeof c.greenChickEnabled === "boolean" ? c.greenChickEnabled : PRODUCTION_TUNING.greenChickEnabled,
      greenChickPoints: typeof c.greenChickPoints === "number" && Number.isInteger(c.greenChickPoints) && c.greenChickPoints >= 1 ? c.greenChickPoints : PRODUCTION_TUNING.greenChickPoints,
      greenChickScheduleMinMs: typeof c.greenChickScheduleMinMs === "number" && Number.isFinite(c.greenChickScheduleMinMs) && c.greenChickScheduleMinMs > 0 ? c.greenChickScheduleMinMs : PRODUCTION_TUNING.greenChickScheduleMinMs,
      greenChickScheduleMaxMs: typeof c.greenChickScheduleMaxMs === "number" && Number.isFinite(c.greenChickScheduleMaxMs) && c.greenChickScheduleMaxMs > 0 ? c.greenChickScheduleMaxMs : PRODUCTION_TUNING.greenChickScheduleMaxMs,
    };
  } catch {
    return null;
  }
}

export function clearTuning(): void {
  localStorage.removeItem(STORAGE_KEY);
}
