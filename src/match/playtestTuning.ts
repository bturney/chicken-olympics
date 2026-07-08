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
  playerSpeed: number;
  botSpeed: number;
  reactionDelayMinMs: number;
  reactionDelayMaxMs: number;
  indecisionChance: number;
  indecisionDurationMs: number;
  farTargetChance: number;
  claimFeedbackDurationMs: number;
  claimPopPeakScale: number;
  greenClaimBeatDurationMs: number;
  greenClaimBeatPeakScale: number;
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
  playerSpeed: 400,
  botSpeed: 400,
  reactionDelayMinMs: 300,
  reactionDelayMaxMs: 550,
  indecisionChance: 0.25,
  indecisionDurationMs: 120,
  farTargetChance: 0.15,
  claimFeedbackDurationMs: 350,
  claimPopPeakScale: 1.4,
  greenClaimBeatDurationMs: 850,
  greenClaimBeatPeakScale: 2.8,
};

export interface TuningDraft {
  draft: PlaytestTuning;
  applied: PlaytestTuning;
}

export interface TuningValidationContext {
  hidingSpotCount?: number;
}

export function createTuningDraft(
  context?: TuningValidationContext,
): TuningDraft {
  const saved = loadTuning(context);
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

  const explicitMsMatch = trimmed.match(/^(-?\d+)ms$/);
  if (explicitMsMatch) {
    const val = parseInt(explicitMsMatch[1]!, 10);
    if (val < 0) return null;
    return val;
  }

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

export function parseChance(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    const val = parseFloat(percentMatch[1]!);
    if (!Number.isFinite(val) || val < 0 || val > 100) return null;
    return val / 100;
  }

  const decimalMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (decimalMatch) {
    const val = parseFloat(decimalMatch[1]!);
    if (!Number.isFinite(val) || val < 0 || val > 1) return null;
    return val;
  }

  return null;
}

export function parseSpeed(
  input: string,
  productionDefault: number,
): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const xMatch = trimmed.match(/^(\d+(?:\.\d+)?)x$/);
  if (xMatch) {
    const multiplier = parseFloat(xMatch[1]!);
    if (!Number.isFinite(multiplier) || multiplier < 0) return null;
    return multiplier * productionDefault;
  }

  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]!);
    if (!Number.isFinite(val) || val < 0) return null;
    return val;
  }

  return null;
}

export interface ValidationError {
  field: string;
  message: string;
}

function isPositiveFinite(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val) && val > 0;
}

function isNonNegativeFinite(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val) && val >= 0;
}

function isPositiveInteger(val: unknown): val is number {
  return (
    typeof val === "number" &&
    Number.isFinite(val) &&
    val >= 1 &&
    Number.isInteger(val)
  );
}

export function validateTuning(
  tuning: PlaytestTuning,
  context: TuningValidationContext = {},
): ValidationError[] {
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
  if (
    context.hidingSpotCount !== undefined &&
    isPositiveInteger(tuning.normalPeekCount) &&
    tuning.normalPeekCount > context.hidingSpotCount
  ) {
    errors.push({
      field: "normalPeekCount",
      message: `Must be no more than ${context.hidingSpotCount} Hiding Spots`,
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
  if (!isNonNegativeFinite(tuning.playerSpeed)) {
    errors.push({
      field: "playerSpeed",
      message: "Must be a non-negative finite number",
    });
  }
  if (!isNonNegativeFinite(tuning.botSpeed)) {
    errors.push({
      field: "botSpeed",
      message: "Must be a non-negative finite number",
    });
  }
  if (!isNonNegativeFinite(tuning.reactionDelayMinMs)) {
    errors.push({
      field: "reactionDelayMinMs",
      message: "Must be a non-negative finite number",
    });
  }
  if (!isNonNegativeFinite(tuning.reactionDelayMaxMs)) {
    errors.push({
      field: "reactionDelayMaxMs",
      message: "Must be a non-negative finite number",
    });
  }
  if (tuning.reactionDelayMinMs >= tuning.reactionDelayMaxMs) {
    errors.push({
      field: "reactionDelayMaxMs",
      message: "Reaction delay max must be greater than min",
    });
  }
  if (
    typeof tuning.indecisionChance !== "number" ||
    !Number.isFinite(tuning.indecisionChance) ||
    tuning.indecisionChance < 0 ||
    tuning.indecisionChance > 1
  ) {
    errors.push({
      field: "indecisionChance",
      message: "Must be a number between 0 and 1",
    });
  }
  if (!isPositiveFinite(tuning.indecisionDurationMs)) {
    errors.push({
      field: "indecisionDurationMs",
      message: "Must be a positive finite number",
    });
  }
  if (
    typeof tuning.farTargetChance !== "number" ||
    !Number.isFinite(tuning.farTargetChance) ||
    tuning.farTargetChance < 0 ||
    tuning.farTargetChance > 1
  ) {
    errors.push({
      field: "farTargetChance",
      message: "Must be a number between 0 and 1",
    });
  }
  if (!isPositiveFinite(tuning.claimFeedbackDurationMs)) {
    errors.push({
      field: "claimFeedbackDurationMs",
      message: "Must be a positive finite number",
    });
  }
  if (!isNonNegativeFinite(tuning.claimPopPeakScale)) {
    errors.push({
      field: "claimPopPeakScale",
      message: "Must be a non-negative finite number",
    });
  }
  if (!isPositiveFinite(tuning.greenClaimBeatDurationMs)) {
    errors.push({
      field: "greenClaimBeatDurationMs",
      message: "Must be a positive finite number",
    });
  }
  if (!isNonNegativeFinite(tuning.greenClaimBeatPeakScale)) {
    errors.push({
      field: "greenClaimBeatPeakScale",
      message: "Must be a non-negative finite number",
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
    tuning.peekAnticipationDurationMs ===
      PRODUCTION_TUNING.peekAnticipationDurationMs &&
    tuning.normalChickPoints === PRODUCTION_TUNING.normalChickPoints &&
    tuning.greenChickEnabled === PRODUCTION_TUNING.greenChickEnabled &&
    tuning.greenChickPoints === PRODUCTION_TUNING.greenChickPoints &&
    tuning.greenChickScheduleMinMs ===
      PRODUCTION_TUNING.greenChickScheduleMinMs &&
    tuning.greenChickScheduleMaxMs ===
      PRODUCTION_TUNING.greenChickScheduleMaxMs &&
    tuning.playerSpeed === PRODUCTION_TUNING.playerSpeed &&
    tuning.botSpeed === PRODUCTION_TUNING.botSpeed &&
    tuning.reactionDelayMinMs === PRODUCTION_TUNING.reactionDelayMinMs &&
    tuning.reactionDelayMaxMs === PRODUCTION_TUNING.reactionDelayMaxMs &&
    tuning.indecisionChance === PRODUCTION_TUNING.indecisionChance &&
    tuning.indecisionDurationMs === PRODUCTION_TUNING.indecisionDurationMs &&
    tuning.farTargetChance === PRODUCTION_TUNING.farTargetChance &&
    tuning.claimFeedbackDurationMs ===
      PRODUCTION_TUNING.claimFeedbackDurationMs &&
    tuning.claimPopPeakScale === PRODUCTION_TUNING.claimPopPeakScale &&
    tuning.greenClaimBeatDurationMs ===
      PRODUCTION_TUNING.greenClaimBeatDurationMs &&
    tuning.greenClaimBeatPeakScale === PRODUCTION_TUNING.greenClaimBeatPeakScale
  );
}

export function saveTuning(tuning: PlaytestTuning): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function loadTuning(
  context?: TuningValidationContext,
): PlaytestTuning | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const c = parsed;
    if (
      typeof c.matchDurationMs !== "number" ||
      !Number.isFinite(c.matchDurationMs) ||
      c.matchDurationMs <= 0
    )
      return null;
    const candidate: PlaytestTuning = {
      matchDurationMs: c.matchDurationMs,
      normalPeekCount:
        typeof c.normalPeekCount === "number" &&
        Number.isInteger(c.normalPeekCount) &&
        c.normalPeekCount >= 1
          ? c.normalPeekCount
          : PRODUCTION_TUNING.normalPeekCount,
      normalPeekDurationMs:
        typeof c.normalPeekDurationMs === "number" &&
        Number.isFinite(c.normalPeekDurationMs) &&
        c.normalPeekDurationMs > 0
          ? c.normalPeekDurationMs
          : PRODUCTION_TUNING.normalPeekDurationMs,
      normalRefillMinMs:
        typeof c.normalRefillMinMs === "number" &&
        Number.isFinite(c.normalRefillMinMs) &&
        c.normalRefillMinMs > 0
          ? c.normalRefillMinMs
          : PRODUCTION_TUNING.normalRefillMinMs,
      normalRefillMaxMs:
        typeof c.normalRefillMaxMs === "number" &&
        Number.isFinite(c.normalRefillMaxMs) &&
        c.normalRefillMaxMs > 0
          ? c.normalRefillMaxMs
          : PRODUCTION_TUNING.normalRefillMaxMs,
      peekAnticipationDurationMs:
        typeof c.peekAnticipationDurationMs === "number" &&
        Number.isFinite(c.peekAnticipationDurationMs) &&
        c.peekAnticipationDurationMs > 0
          ? c.peekAnticipationDurationMs
          : PRODUCTION_TUNING.peekAnticipationDurationMs,
      normalChickPoints:
        typeof c.normalChickPoints === "number" &&
        Number.isInteger(c.normalChickPoints) &&
        c.normalChickPoints >= 1
          ? c.normalChickPoints
          : PRODUCTION_TUNING.normalChickPoints,
      greenChickEnabled:
        typeof c.greenChickEnabled === "boolean"
          ? c.greenChickEnabled
          : PRODUCTION_TUNING.greenChickEnabled,
      greenChickPoints:
        typeof c.greenChickPoints === "number" &&
        Number.isInteger(c.greenChickPoints) &&
        c.greenChickPoints >= 1
          ? c.greenChickPoints
          : PRODUCTION_TUNING.greenChickPoints,
      greenChickScheduleMinMs:
        typeof c.greenChickScheduleMinMs === "number" &&
        Number.isFinite(c.greenChickScheduleMinMs) &&
        c.greenChickScheduleMinMs > 0
          ? c.greenChickScheduleMinMs
          : PRODUCTION_TUNING.greenChickScheduleMinMs,
      greenChickScheduleMaxMs:
        typeof c.greenChickScheduleMaxMs === "number" &&
        Number.isFinite(c.greenChickScheduleMaxMs) &&
        c.greenChickScheduleMaxMs > 0
          ? c.greenChickScheduleMaxMs
          : PRODUCTION_TUNING.greenChickScheduleMaxMs,
      playerSpeed:
        typeof c.playerSpeed === "number" &&
        Number.isFinite(c.playerSpeed) &&
        c.playerSpeed >= 0
          ? c.playerSpeed
          : PRODUCTION_TUNING.playerSpeed,
      botSpeed:
        typeof c.botSpeed === "number" &&
        Number.isFinite(c.botSpeed) &&
        c.botSpeed >= 0
          ? c.botSpeed
          : PRODUCTION_TUNING.botSpeed,
      reactionDelayMinMs:
        typeof c.reactionDelayMinMs === "number" &&
        Number.isFinite(c.reactionDelayMinMs) &&
        c.reactionDelayMinMs >= 0
          ? c.reactionDelayMinMs
          : PRODUCTION_TUNING.reactionDelayMinMs,
      reactionDelayMaxMs:
        typeof c.reactionDelayMaxMs === "number" &&
        Number.isFinite(c.reactionDelayMaxMs) &&
        c.reactionDelayMaxMs >= 0
          ? c.reactionDelayMaxMs
          : PRODUCTION_TUNING.reactionDelayMaxMs,
      indecisionChance:
        typeof c.indecisionChance === "number" &&
        Number.isFinite(c.indecisionChance) &&
        c.indecisionChance >= 0 &&
        c.indecisionChance <= 1
          ? c.indecisionChance
          : PRODUCTION_TUNING.indecisionChance,
      indecisionDurationMs:
        typeof c.indecisionDurationMs === "number" &&
        Number.isFinite(c.indecisionDurationMs) &&
        c.indecisionDurationMs > 0
          ? c.indecisionDurationMs
          : PRODUCTION_TUNING.indecisionDurationMs,
      farTargetChance:
        typeof c.farTargetChance === "number" &&
        Number.isFinite(c.farTargetChance) &&
        c.farTargetChance >= 0 &&
        c.farTargetChance <= 1
          ? c.farTargetChance
          : PRODUCTION_TUNING.farTargetChance,
      claimFeedbackDurationMs:
        typeof c.claimFeedbackDurationMs === "number" &&
        Number.isFinite(c.claimFeedbackDurationMs) &&
        c.claimFeedbackDurationMs > 0
          ? c.claimFeedbackDurationMs
          : PRODUCTION_TUNING.claimFeedbackDurationMs,
      claimPopPeakScale:
        typeof c.claimPopPeakScale === "number" &&
        Number.isFinite(c.claimPopPeakScale) &&
        c.claimPopPeakScale >= 0
          ? c.claimPopPeakScale
          : PRODUCTION_TUNING.claimPopPeakScale,
      greenClaimBeatDurationMs:
        typeof c.greenClaimBeatDurationMs === "number" &&
        Number.isFinite(c.greenClaimBeatDurationMs) &&
        c.greenClaimBeatDurationMs > 0
          ? c.greenClaimBeatDurationMs
          : PRODUCTION_TUNING.greenClaimBeatDurationMs,
      greenClaimBeatPeakScale:
        typeof c.greenClaimBeatPeakScale === "number" &&
        Number.isFinite(c.greenClaimBeatPeakScale) &&
        c.greenClaimBeatPeakScale >= 0
          ? c.greenClaimBeatPeakScale
          : PRODUCTION_TUNING.greenClaimBeatPeakScale,
    };
    return validateTuning(candidate, context).length === 0 ? candidate : null;
  } catch {
    return null;
  }
}

export function clearTuning(): void {
  localStorage.removeItem(STORAGE_KEY);
}
