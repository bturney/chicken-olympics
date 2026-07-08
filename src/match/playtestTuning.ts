const STORAGE_KEY = "chicken-olympics-playtest-tuning";

export interface PlaytestTuning {
  matchDurationMs: number;
}

export const PRODUCTION_TUNING: PlaytestTuning = {
  matchDurationMs: 90_000,
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

export function validateTuning(tuning: PlaytestTuning): ValidationError[] {
  const errors: ValidationError[] = [];
  if (
    typeof tuning.matchDurationMs !== "number" ||
    !Number.isFinite(tuning.matchDurationMs) ||
    tuning.matchDurationMs <= 0
  ) {
    errors.push({
      field: "matchDurationMs",
      message: "Must be a positive finite number",
    });
  }
  return errors;
}

export function commitDraft(draft: TuningDraft): TuningDraft {
  const newApplied: PlaytestTuning = {
    matchDurationMs: draft.draft.matchDurationMs,
  };
  if (isDefaultTuning(newApplied)) {
    clearTuning();
  } else {
    saveTuning(newApplied);
  }
  return { draft: { ...newApplied }, applied: newApplied };
}

export function stageDefaults(_draft: TuningDraft): TuningDraft {
  return {
    draft: { ...PRODUCTION_TUNING },
    applied: _draft.applied,
  };
}

export function isDefaultTuning(tuning: PlaytestTuning): boolean {
  return tuning.matchDurationMs === PRODUCTION_TUNING.matchDurationMs;
}

export function saveTuning(tuning: PlaytestTuning): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
}

export function loadTuning(): PlaytestTuning | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.matchDurationMs !== "number") return null;
    if (
      !Number.isFinite(candidate.matchDurationMs) ||
      candidate.matchDurationMs <= 0
    )
      return null;
    return { matchDurationMs: candidate.matchDurationMs };
  } catch {
    return null;
  }
}

export function clearTuning(): void {
  localStorage.removeItem(STORAGE_KEY);
}
