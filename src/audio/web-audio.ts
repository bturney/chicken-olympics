import type { SfxScheduler, SfxEvent } from "./sfx";

export interface AudioContextLike {
  readonly currentTime: number;
  readonly destination: AudioNode;
  readonly sampleRate: number;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
  createBuffer(
    channels: number,
    frames: number,
    sampleRate: number,
  ): AudioBuffer;
  createBufferSource(): AudioBufferSourceNode;
}

const ENVELOPE_ATTACK_SECONDS = 0.005;
const RELEASE_TAIL_SECONDS = 0.01;

function scheduleEnvelope(
  gainParam: AudioParam,
  peak: number,
  startSeconds: number,
  durationSeconds: number,
): void {
  gainParam.setValueAtTime(0, startSeconds);
  gainParam.linearRampToValueAtTime(
    peak,
    startSeconds + ENVELOPE_ATTACK_SECONDS,
  );
  gainParam.linearRampToValueAtTime(0, startSeconds + durationSeconds);
}

export function createWebAudioScheduler(
  context: AudioContextLike,
): SfxScheduler {
  const noiseBuffer = context.createBuffer(
    1,
    context.sampleRate,
    context.sampleRate,
  );
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  return {
    schedule(event: SfxEvent, atSeconds: number) {
      if (event.kind === "tone") {
        const oscillator = context.createOscillator();
        oscillator.type = event.waveform;
        oscillator.frequency.value = event.frequencyHz;

        const gain = context.createGain();
        scheduleEnvelope(gain.gain, event.peakGain, atSeconds, event.duration);

        oscillator.connect(gain).connect(context.destination);
        oscillator.start(atSeconds);
        oscillator.stop(atSeconds + event.duration + RELEASE_TAIL_SECONDS);
        return;
      }

      const source = context.createBufferSource();
      source.buffer = noiseBuffer;

      const gain = context.createGain();
      scheduleEnvelope(gain.gain, event.peakGain, atSeconds, event.duration);

      source.connect(gain).connect(context.destination);
      source.start(atSeconds);
      source.stop(atSeconds + event.duration + RELEASE_TAIL_SECONDS);
    },
  };
}
