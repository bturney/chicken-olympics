import { describe, it, expect, vi } from "vitest";
import { createSceneAudioAdapter } from "../src/audio/scene-audio";
import {
  SFX_NORMAL_CHICK_CLAIM,
  SFX_GREEN_CHICK_APPEAR,
  SFX_PODIUM_FANFARE,
} from "../src/audio/sfx";
import type { AudioContextLike } from "../src/audio/web-audio";

function asAudioContextLike(value: unknown): AudioContextLike {
  return value as AudioContextLike;
}

function makeFakeContext(initialTime: number) {
  const startCalls: number[] = [];
  const createOscillatorMock = vi.fn(() => ({
    type: "sine",
    frequency: { value: 0 },
    start(at: number) {
      startCalls.push(at);
    },
    stop: vi.fn(),
    connect: vi.fn(function connect(this: unknown) {
      return this;
    }),
  }));
  const createGainMock = vi.fn(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(function connect(this: unknown) {
      return this;
    }),
  }));
  const createBufferMock = vi.fn(
    (_channels: number, frames: number, _sampleRate: number) =>
      ({
        duration: 1,
        length: frames,
        sampleRate: _sampleRate,
        numberOfChannels: _channels,
        getChannelData: () => new Float32Array(frames),
      }) as unknown as AudioBuffer,
  );
  const createBufferSourceMock = vi.fn(() => ({
    buffer: null,
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(function connect(this: unknown) {
      return this;
    }),
  }));
  const handle: {
    currentTime: number;
    createOscillatorMock: ReturnType<typeof vi.fn>;
    createGainMock: ReturnType<typeof vi.fn>;
    createBufferSourceMock: ReturnType<typeof vi.fn>;
    createBufferMock: ReturnType<typeof vi.fn>;
    startCalls: number[];
    asContext: unknown;
  } = {
    currentTime: initialTime,
    createOscillatorMock,
    createGainMock,
    createBufferSourceMock,
    createBufferMock,
    startCalls,
    asContext: undefined,
  };
  handle.asContext = {
    get currentTime() {
      return handle.currentTime;
    },
    destination: {} as AudioNode,
    sampleRate: 44_100,
    createOscillator: createOscillatorMock,
    createGain: createGainMock,
    createBuffer: createBufferMock,
    createBufferSource: createBufferSourceMock,
  };
  return handle;
}

describe("createSceneAudioAdapter", () => {
  it("records each played id in the played log so the e2e suite can observe audio fires", () => {
    const adapter = createSceneAudioAdapter(null);

    adapter.play("normalClaim", SFX_NORMAL_CHICK_CLAIM);
    adapter.play("greenChickAppear", SFX_GREEN_CHICK_APPEAR);

    expect(adapter.played).toEqual(["normalClaim", "greenChickAppear"]);
  });

  it("stays a safe no-op for the audio side when the scene has no audio context", () => {
    const adapter = createSceneAudioAdapter(null);

    expect(() =>
      adapter.play("normalClaim", SFX_NORMAL_CHICK_CLAIM),
    ).not.toThrow();
    expect(adapter.played).toEqual(["normalClaim"]);
  });

  it("stays a safe no-op when the source's context field is null", () => {
    const adapter = createSceneAudioAdapter({ context: null });

    expect(() =>
      adapter.play("podiumFanfare", SFX_PODIUM_FANFARE),
    ).not.toThrow();
    expect(adapter.played).toEqual(["podiumFanfare"]);
  });

  it("gives each adapter its own played log so scenes do not share state", () => {
    const a = createSceneAudioAdapter(null);
    const b = createSceneAudioAdapter(null);

    a.play("normalClaim", SFX_NORMAL_CHICK_CLAIM);

    expect(a.played).toEqual(["normalClaim"]);
    expect(b.played).toEqual([]);
  });

  it("schedules a moment's tone events at the audio context's current time", () => {
    const handle = makeFakeContext(2.5);
    const adapter = createSceneAudioAdapter({
      context: asAudioContextLike(handle.asContext),
    });

    adapter.play("normalClaim", SFX_NORMAL_CHICK_CLAIM);

    expect(handle.createOscillatorMock).toHaveBeenCalledTimes(
      SFX_NORMAL_CHICK_CLAIM.events.length,
    );
    expect(handle.startCalls).toEqual([2.5, 2.5 + 0.07]);
  });

  it("reads the current audio time at play time, not at adapter creation", () => {
    const handle = makeFakeContext(0);
    const adapter = createSceneAudioAdapter({
      context: asAudioContextLike(handle.asContext),
    });

    handle.currentTime = 7.25;
    adapter.play("podiumFanfare", SFX_PODIUM_FANFARE);

    expect(handle.startCalls[0]).toBe(7.25);
  });
});
