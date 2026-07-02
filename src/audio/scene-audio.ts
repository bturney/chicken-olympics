import { playSfxMoment, type SfxMoment, type SfxScheduler } from "./sfx";
import { createWebAudioScheduler, type AudioContextLike } from "./web-audio";

export interface SceneAudioSource {
  readonly context: AudioContextLike | null | undefined;
}

export interface SceneAudioAdapter<TId extends string = string> {
  play(playedId: TId, moment: SfxMoment): void;
  readonly played: readonly TId[];
}

export function createSceneAudioAdapter<TId extends string = string>(
  source: SceneAudioSource | null | undefined,
): SceneAudioAdapter<TId> {
  const context = source?.context ?? null;
  const scheduler: SfxScheduler = context
    ? createWebAudioScheduler(context)
    : { schedule: () => {} };
  const now = (): number => context?.currentTime ?? 0;
  const log: TId[] = [];
  return {
    play(playedId, moment) {
      log.push(playedId);
      playSfxMoment(scheduler, moment, now());
    },
    get played() {
      return log;
    },
  };
}
