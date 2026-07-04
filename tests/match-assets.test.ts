import { describe, expect, it } from "vitest";
import {
  MATCH_SLICE_ASSET_KEYS,
  preloadMatchSliceRuntimeAssets,
  registerMatchSliceGeneratedTextures,
} from "../src/scenes/matchAssets";

function createGraphicsSpy() {
  return {
    fillStyleCalls: [] as Array<{ color: number; alpha?: number }>,
    fillCircleCalls: [] as Array<{ x: number; y: number; radius: number }>,
    lineStyleCalls: [] as Array<{
      width: number;
      color: number;
      alpha?: number;
    }>,
    strokeCircleCalls: [] as Array<{ x: number; y: number; radius: number }>,
    generatedTextures: [] as Array<{
      key: string;
      width: number;
      height: number;
    }>,
    destroyed: false,
    fillStyle(color: number, alpha?: number): void {
      this.fillStyleCalls.push({ color, alpha });
    },
    fillCircle(x: number, y: number, radius: number): void {
      this.fillCircleCalls.push({ x, y, radius });
    },
    lineStyle(width: number, color: number, alpha?: number): void {
      this.lineStyleCalls.push({ width, color, alpha });
    },
    strokeCircle(x: number, y: number, radius: number): void {
      this.strokeCircleCalls.push({ x, y, radius });
    },
    generateTexture(key: string, width: number, height: number): void {
      this.generatedTextures.push({ key, width, height });
    },
    destroy(): void {
      this.destroyed = true;
    },
  };
}

describe("match slice asset registration", () => {
  it("provides stable presentation keys for match slice chick assets", () => {
    expect(MATCH_SLICE_ASSET_KEYS.normalChick).toBe("match.chick.normal");
    expect(MATCH_SLICE_ASSET_KEYS.greenChick).toBe("match.chick.green");
    expect(MATCH_SLICE_ASSET_KEYS.normalClaimSfx).toBe(
      "match.sfx.normalClaim",
    );
  });

  it("preloads registered runtime image and audio assets through stable keys", () => {
    const imageCalls: Array<{ key: string; path: string }> = [];
    const audioCalls: Array<{ key: string; paths: string | string[] }> = [];

    preloadMatchSliceRuntimeAssets(
      {
        image(key, path) {
          imageCalls.push({ key, path });
        },
        audio(key, paths) {
          audioCalls.push({ key, paths });
        },
      },
      [
        {
          type: "image",
          key: MATCH_SLICE_ASSET_KEYS.normalChick,
          path: "/assets/match/chick.png",
        },
        {
          type: "audio",
          key: MATCH_SLICE_ASSET_KEYS.normalClaimSfx,
          paths: ["/assets/match/normal-claim.ogg"],
        },
      ],
    );

    expect(imageCalls).toEqual([
      {
        key: MATCH_SLICE_ASSET_KEYS.normalChick,
        path: "/assets/match/chick.png",
      },
    ]);
    expect(audioCalls).toEqual([
      {
        key: MATCH_SLICE_ASSET_KEYS.normalClaimSfx,
        paths: ["/assets/match/normal-claim.ogg"],
      },
    ]);
  });

  it("registers generated match slice chick textures once at the presentation boundary", () => {
    const normalGraphics = createGraphicsSpy();
    const greenGraphics = createGraphicsSpy();
    const graphics = [normalGraphics, greenGraphics];

    registerMatchSliceGeneratedTextures({
      chickSize: 32,
      exists: () => false,
      createGraphics: () => graphics.shift()!,
    });

    expect(normalGraphics.generatedTextures).toEqual([
      { key: MATCH_SLICE_ASSET_KEYS.normalChick, width: 64, height: 64 },
    ]);
    expect(greenGraphics.generatedTextures).toEqual([
      { key: MATCH_SLICE_ASSET_KEYS.greenChick, width: 64, height: 64 },
    ]);
    expect(normalGraphics.fillStyleCalls[0]).toEqual({ color: 0xffdd44 });
    expect(greenGraphics.fillStyleCalls[0]).toEqual({ color: 0x44cc44 });
    expect(normalGraphics.destroyed).toBe(true);
    expect(greenGraphics.destroyed).toBe(true);
  });

  it("does not regenerate a match slice texture when its registered key already exists", () => {
    const normalGraphics = createGraphicsSpy();
    const greenGraphics = createGraphicsSpy();
    const graphics = [normalGraphics, greenGraphics];

    registerMatchSliceGeneratedTextures({
      chickSize: 32,
      exists: (key) => key === MATCH_SLICE_ASSET_KEYS.normalChick,
      createGraphics: () => graphics.shift()!,
    });

    expect(normalGraphics.generatedTextures).toEqual([
      { key: MATCH_SLICE_ASSET_KEYS.greenChick, width: 64, height: 64 },
    ]);
    expect(greenGraphics.generatedTextures).toEqual([]);
  });
});
