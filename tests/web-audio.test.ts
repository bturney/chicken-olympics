import { describe, it, expect, vi } from "vitest";
import { createWebAudioScheduler } from "../src/audio/web-audio";
import type { SfxEvent } from "../src/audio/sfx";

class FakeGain {
  readonly kind = "gain";
  setValueAtTimeCalls: { value: number; time: number }[] = [];
  linearRampToValueAtTimeCalls: { value: number; time: number }[] = [];
  connectedTo: { kind: string }[] = [];
  gain = {
    setValueAtTime: (value: number, time: number) => {
      this.setValueAtTimeCalls.push({ value, time });
    },
    linearRampToValueAtTime: (value: number, time: number) => {
      this.linearRampToValueAtTimeCalls.push({ value, time });
    },
  };
  connect(dest: { kind: string }): FakeGain {
    this.connectedTo.push({ kind: dest.kind });
    return this;
  }
}

class FakeOscillator {
  readonly kind = "oscillator";
  oscType = "sine";
  frequency = { value: 0 };
  startCalls: number[] = [];
  stopCalls: number[] = [];
  connectedTo: { kind: string }[] = [];
  set type(v: string) {
    this.oscType = v;
  }
  get type() {
    return this.oscType;
  }
  start(at: number): void {
    this.startCalls.push(at);
  }
  stop(at: number): void {
    this.stopCalls.push(at);
  }
  connect(dest: { kind: string }): FakeOscillator {
    this.connectedTo.push({ kind: dest.kind });
    return this;
  }
}

class FakeBufferSource {
  readonly kind = "buffer-source";
  buffer: unknown = null;
  startCalls: number[] = [];
  stopCalls: number[] = [];
  connectedTo: { kind: string }[] = [];
  start(at: number): void {
    this.startCalls.push(at);
  }
  stop(at: number): void {
    this.stopCalls.push(at);
  }
  connect(dest: { kind: string }): FakeBufferSource {
    this.connectedTo.push({ kind: dest.kind });
    return this;
  }
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44_100;
  destination = { kind: "destination" };
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  bufferSources: FakeBufferSource[] = [];

  createOscillator(): FakeOscillator {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  createBuffer(
    _channels: number,
    _frames: number,
    _sampleRate: number,
  ): AudioBuffer {
    const data = new Float32Array(_frames);
    return {
      duration: 1,
      length: _frames,
      sampleRate: _sampleRate,
      numberOfChannels: 1,
      getChannelData: () => data,
    } as unknown as AudioBuffer;
  }

  createBufferSource(): FakeBufferSource {
    const src = new FakeBufferSource();
    this.bufferSources.push(src);
    return src;
  }
}

function toneEvent(
  overrides: Partial<{
    waveform: "sine" | "square" | "triangle" | "sawtooth";
    frequencyHz: number;
    duration: number;
    peakGain: number;
  }> = {},
): SfxEvent {
  return {
    kind: "tone",
    waveform: overrides.waveform ?? "sine",
    frequencyHz: overrides.frequencyHz ?? 440,
    startOffset: 0,
    duration: overrides.duration ?? 0.1,
    peakGain: overrides.peakGain ?? 0.3,
  };
}

function noiseEvent(
  overrides: Partial<{ duration: number; peakGain: number }> = {},
): SfxEvent {
  return {
    kind: "noise",
    startOffset: 0,
    duration: overrides.duration ?? 0.1,
    peakGain: overrides.peakGain ?? 0.2,
  };
}

describe("createWebAudioScheduler", () => {
  it("plays a tone event by configuring an oscillator with the right type and frequency", () => {
    const ctx = new FakeAudioContext();
    const scheduler = createWebAudioScheduler(
      ctx as unknown as Parameters<typeof createWebAudioScheduler>[0],
    );

    scheduler.schedule(
      toneEvent({ waveform: "square", frequencyHz: 880 }),
      1.25,
    );

    expect(ctx.oscillators).toHaveLength(1);
    expect(ctx.oscillators[0]?.oscType).toBe("square");
    expect(ctx.oscillators[0]?.frequency.value).toBe(880);
    expect(ctx.oscillators[0]?.startCalls).toEqual([1.25]);
    expect(ctx.oscillators[0]?.stopCalls).toEqual([1.25 + 0.1 + 0.01]);
  });

  it("envelopes a tone event so the gain starts at zero, ramps to the peak, then back to zero", () => {
    const ctx = new FakeAudioContext();
    const scheduler = createWebAudioScheduler(
      ctx as unknown as Parameters<typeof createWebAudioScheduler>[0],
    );

    scheduler.schedule(toneEvent({ duration: 0.2, peakGain: 0.4 }), 2);

    const gain = ctx.gains[0]!;
    expect(gain.setValueAtTimeCalls).toEqual([{ value: 0, time: 2 }]);
    expect(gain.linearRampToValueAtTimeCalls).toEqual([
      { value: 0.4, time: 2.005 },
      { value: 0, time: 2.2 },
    ]);
  });

  it("plays a noise event by scheduling a buffer source with a non-null buffer", () => {
    const ctx = new FakeAudioContext();
    const scheduler = createWebAudioScheduler(
      ctx as unknown as Parameters<typeof createWebAudioScheduler>[0],
    );

    scheduler.schedule(noiseEvent({ duration: 0.3 }), 0.5);

    expect(ctx.bufferSources).toHaveLength(1);
    const source = ctx.bufferSources[0]!;
    expect(source.buffer).not.toBeNull();
    expect(source.startCalls).toEqual([0.5]);
    expect(source.stopCalls).toEqual([0.3 + 0.5 + 0.01]);
  });

  it("connects both the oscillator and the buffer source through a gain to the destination", () => {
    const ctx = new FakeAudioContext();
    const scheduler = createWebAudioScheduler(
      ctx as unknown as Parameters<typeof createWebAudioScheduler>[0],
    );

    scheduler.schedule(toneEvent(), 0);
    scheduler.schedule(noiseEvent(), 0);

    expect(ctx.oscillators[0]?.connectedTo).toContainEqual({ kind: "gain" });
    expect(ctx.oscillators[0]?.connectedTo).toContainEqual({
      kind: "destination",
    });
    expect(ctx.bufferSources[0]?.connectedTo).toContainEqual({ kind: "gain" });
    expect(ctx.bufferSources[0]?.connectedTo).toContainEqual({
      kind: "destination",
    });
  });

  it("reuses a single pre-generated noise buffer for every noise event", () => {
    const ctx = new FakeAudioContext();
    const createBufferSpy = vi.spyOn(ctx, "createBuffer");

    const scheduler = createWebAudioScheduler(
      ctx as unknown as Parameters<typeof createWebAudioScheduler>[0],
    );

    scheduler.schedule(noiseEvent(), 0);
    scheduler.schedule(noiseEvent(), 0.5);
    scheduler.schedule(noiseEvent(), 1);

    expect(createBufferSpy).toHaveBeenCalledTimes(1);
    const sourceA = ctx.bufferSources[0]?.buffer;
    const sourceB = ctx.bufferSources[1]?.buffer;
    const sourceC = ctx.bufferSources[2]?.buffer;
    expect(sourceA).toBe(sourceB);
    expect(sourceB).toBe(sourceC);
  });
});
