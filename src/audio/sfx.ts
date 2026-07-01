export type SfxWaveform = "sine" | "square" | "triangle" | "sawtooth";

export interface SfxToneEvent {
  kind: "tone";
  waveform: SfxWaveform;
  frequencyHz: number;
  startOffset: number;
  duration: number;
  peakGain: number;
}

export interface SfxNoiseEvent {
  kind: "noise";
  startOffset: number;
  duration: number;
  peakGain: number;
}

export type SfxEvent = SfxToneEvent | SfxNoiseEvent;

export interface SfxMoment {
  events: readonly SfxEvent[];
}

export interface SfxScheduler {
  schedule(event: SfxEvent, atSeconds: number): void;
}

export const SFX_NORMAL_CHICK_CLAIM: SfxMoment = {
  events: [
    {
      kind: "tone",
      waveform: "sine",
      frequencyHz: 660,
      startOffset: 0,
      duration: 0.08,
      peakGain: 0.4,
    },
    {
      kind: "tone",
      waveform: "sine",
      frequencyHz: 880,
      startOffset: 0.07,
      duration: 0.12,
      peakGain: 0.35,
    },
  ],
};

export const SFX_GREEN_CHICK_APPEAR: SfxMoment = {
  events: [
    {
      kind: "tone",
      waveform: "triangle",
      frequencyHz: 392,
      startOffset: 0,
      duration: 0.15,
      peakGain: 0.35,
    },
    {
      kind: "tone",
      waveform: "triangle",
      frequencyHz: 523,
      startOffset: 0.1,
      duration: 0.15,
      peakGain: 0.35,
    },
    {
      kind: "tone",
      waveform: "triangle",
      frequencyHz: 659,
      startOffset: 0.2,
      duration: 0.25,
      peakGain: 0.4,
    },
  ],
};

export const SFX_GREEN_CHICK_CLAIM: SfxMoment = {
  events: [
    {
      kind: "noise",
      startOffset: 0,
      duration: 0.65,
      peakGain: 0.22,
    },
    {
      kind: "tone",
      waveform: "sawtooth",
      frequencyHz: 196,
      startOffset: 0,
      duration: 0.28,
      peakGain: 0.16,
    },
    {
      kind: "tone",
      waveform: "square",
      frequencyHz: 659,
      startOffset: 0.03,
      duration: 0.12,
      peakGain: 0.28,
    },
    {
      kind: "tone",
      waveform: "square",
      frequencyHz: 988,
      startOffset: 0.12,
      duration: 0.14,
      peakGain: 0.3,
    },
    {
      kind: "tone",
      waveform: "square",
      frequencyHz: 1319,
      startOffset: 0.23,
      duration: 0.22,
      peakGain: 0.34,
    },
  ],
};

export const SFX_PODIUM_FANFARE: SfxMoment = {
  events: [
    {
      kind: "tone",
      waveform: "triangle",
      frequencyHz: 523,
      startOffset: 0,
      duration: 0.18,
      peakGain: 0.35,
    },
    {
      kind: "tone",
      waveform: "triangle",
      frequencyHz: 659,
      startOffset: 0.16,
      duration: 0.18,
      peakGain: 0.35,
    },
    {
      kind: "tone",
      waveform: "triangle",
      frequencyHz: 784,
      startOffset: 0.32,
      duration: 0.2,
      peakGain: 0.4,
    },
    {
      kind: "tone",
      waveform: "sine",
      frequencyHz: 1047,
      startOffset: 0.5,
      duration: 0.65,
      peakGain: 0.42,
    },
    {
      kind: "noise",
      startOffset: 0.12,
      duration: 0.8,
      peakGain: 0.12,
    },
  ],
};

export function momentDuration(moment: SfxMoment): number {
  let end = 0;
  for (const event of moment.events) {
    const eventEnd = event.startOffset + event.duration;
    if (eventEnd > end) end = eventEnd;
  }
  return end;
}

export function playSfxMoment(
  scheduler: SfxScheduler,
  moment: SfxMoment,
  atSeconds: number,
): void {
  for (const event of moment.events) {
    scheduler.schedule(event, atSeconds + event.startOffset);
  }
}
