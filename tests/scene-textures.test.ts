import { describe, expect, it } from "vitest";
import { generateTextureOnce } from "../src/scenes/textures";

function createGraphicsSpy() {
  return {
    generateTextureCalls: [] as Array<{
      key: string;
      width: number;
      height: number;
    }>,
    destroyed: false,
    generateTexture(key: string, width: number, height: number): void {
      this.generateTextureCalls.push({ key, width, height });
    },
    destroy(): void {
      this.destroyed = true;
    },
  };
}

describe("generateTextureOnce", () => {
  it("generates and destroys the texture graphics when the key is missing", () => {
    const graphics = createGraphicsSpy();
    let drawCalls = 0;

    generateTextureOnce({
      key: "chick",
      width: 32,
      height: 32,
      exists: () => false,
      createGraphics: () => graphics,
      draw: () => {
        drawCalls += 1;
      },
    });

    expect(drawCalls).toBe(1);
    expect(graphics.generateTextureCalls).toEqual([
      { key: "chick", width: 32, height: 32 },
    ]);
    expect(graphics.destroyed).toBe(true);
  });

  it("does not regenerate a texture when the key already exists", () => {
    const graphics = createGraphicsSpy();
    let drawCalls = 0;

    generateTextureOnce({
      key: "chick",
      width: 32,
      height: 32,
      exists: (key) => key === "chick",
      createGraphics: () => graphics,
      draw: () => {
        drawCalls += 1;
      },
    });

    expect(drawCalls).toBe(0);
    expect(graphics.generateTextureCalls).toEqual([]);
    expect(graphics.destroyed).toBe(false);
  });
});
