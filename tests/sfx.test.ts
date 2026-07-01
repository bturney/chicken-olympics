import { describe, it, expect } from "vitest";
import {
  SFX_NORMAL_CHICK_CLAIM,
  SFX_GREEN_CHICK_APPEAR,
  SFX_GREEN_CHICK_CLAIM,
  SFX_PODIUM_FANFARE,
  momentDuration,
  playSfxMoment,
  type SfxEvent,
  type SfxMoment,
  type SfxScheduler,
} from "../src/audio/sfx";

function captureScheduler(): {
  calls: { event: SfxEvent; atSeconds: number }[];
  scheduler: SfxScheduler;
} {
  const calls: { event: SfxEvent; atSeconds: number }[] = [];
  return {
    calls,
    scheduler: {
      schedule(event, atSeconds) {
        calls.push({ event, atSeconds });
      },
    },
  };
}

describe("SFX_NORMAL_CHICK_CLAIM", () => {
  it("contains at least one event so a sound actually plays", () => {
    expect(SFX_NORMAL_CHICK_CLAIM.events.length).toBeGreaterThan(0);
  });

  it("stays short so it can be triggered many times during a Match", () => {
    expect(momentDuration(SFX_NORMAL_CHICK_CLAIM)).toBeLessThan(0.5);
  });
});

describe("SFX_GREEN_CHICK_APPEAR", () => {
  it("contains at least one event so a sound actually plays", () => {
    expect(SFX_GREEN_CHICK_APPEAR.events.length).toBeGreaterThan(0);
  });

  it("stays short so it does not delay the Match", () => {
    expect(momentDuration(SFX_GREEN_CHICK_APPEAR)).toBeLessThan(0.5);
  });
});

describe("SFX_GREEN_CHICK_CLAIM", () => {
  it("contains at least one event so a sound actually plays", () => {
    expect(SFX_GREEN_CHICK_CLAIM.events.length).toBeGreaterThan(0);
  });

  it("includes a crowd-like noise layer for the rare celebration", () => {
    const noise = SFX_GREEN_CHICK_CLAIM.events.filter(
      (e) => e.kind === "noise",
    );

    expect(noise.length).toBeGreaterThanOrEqual(1);
    expect(noise[0]?.duration).toBeGreaterThanOrEqual(0.6);
  });

  it("stays short enough that the Match does not stop for it", () => {
    expect(momentDuration(SFX_GREEN_CHICK_CLAIM)).toBeLessThan(1);
  });
});

describe("SFX_PODIUM_FANFARE", () => {
  it("contains at least one event so a sound actually plays", () => {
    expect(SFX_PODIUM_FANFARE.events.length).toBeGreaterThan(0);
  });

  it("feels celebratory by containing multiple distinct tones", () => {
    const tones = SFX_PODIUM_FANFARE.events.filter((e) => e.kind === "tone");
    const frequencies = new Set(tones.map((e) => e.frequencyHz));
    expect(tones.length).toBeGreaterThanOrEqual(2);
    expect(frequencies.size).toBeGreaterThanOrEqual(2);
  });

  it("adds a light crowd bed under the fanfare", () => {
    expect(SFX_PODIUM_FANFARE.events.some((e) => e.kind === "noise")).toBe(
      true,
    );
  });
});

describe("the four MVP sound moments", () => {
  function momentSignature(moment: SfxMoment): string {
    return JSON.stringify(
      moment.events.map((e) =>
        e.kind === "tone"
          ? { kind: e.kind, waveform: e.waveform, hz: e.frequencyHz }
          : { kind: e.kind },
      ),
    );
  }

  it("are pairwise distinct so each feedback moment is recognizable", () => {
    const moments = [
      SFX_NORMAL_CHICK_CLAIM,
      SFX_GREEN_CHICK_APPEAR,
      SFX_GREEN_CHICK_CLAIM,
      SFX_PODIUM_FANFARE,
    ];
    const signatures = new Set(moments.map(momentSignature));
    expect(signatures.size).toBe(moments.length);
  });
});

describe("playSfxMoment", () => {
  it("schedules every event from the moment with its start offset added to the base time", () => {
    const { calls, scheduler } = captureScheduler();
    const moment: SfxMoment = {
      events: [
        {
          kind: "tone",
          waveform: "sine",
          frequencyHz: 440,
          startOffset: 0,
          duration: 0.1,
          peakGain: 0.3,
        },
        {
          kind: "tone",
          waveform: "sine",
          frequencyHz: 660,
          startOffset: 0.1,
          duration: 0.2,
          peakGain: 0.3,
        },
      ],
    };

    playSfxMoment(scheduler, moment, 1.5);

    expect(calls).toEqual([
      { event: moment.events[0], atSeconds: 1.5 },
      { event: moment.events[1], atSeconds: 1.6 },
    ]);
  });

  it("does not schedule anything for a moment with no events", () => {
    const { calls, scheduler } = captureScheduler();

    playSfxMoment(scheduler, { events: [] }, 0);

    expect(calls).toEqual([]);
  });

  it("does not mutate the moment passed in", () => {
    const { scheduler } = captureScheduler();
    const moment: SfxMoment = {
      events: [
        {
          kind: "tone",
          waveform: "sine",
          frequencyHz: 440,
          startOffset: 0,
          duration: 0.1,
          peakGain: 0.3,
        },
      ],
    };
    const snapshot = JSON.stringify(moment);

    playSfxMoment(scheduler, moment, 0);

    expect(JSON.stringify(moment)).toBe(snapshot);
  });
});
