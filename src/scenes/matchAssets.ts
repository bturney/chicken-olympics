import { type PlayerChickenColor } from "../setup/colors";
import { generateTextureOnce } from "./textures";

interface GeneratedTextureGraphics {
  fillStyle(color: number, alpha?: number): void;
  fillCircle(x: number, y: number, radius: number): void;
  lineStyle(width: number, color: number, alpha?: number): void;
  strokeCircle(x: number, y: number, radius: number): void;
  generateTexture(key: string, width: number, height: number): void;
  destroy(): void;
}

interface RegisterMatchSliceGeneratedTexturesOptions<
  Graphics extends GeneratedTextureGraphics,
> {
  chickSize: number;
  exists: (key: string) => boolean;
  createGraphics: () => Graphics;
}

interface MatchSliceAssetLoader {
  image(key: string, path: string): unknown;
  audio(key: string, paths: string | string[]): unknown;
}

export type MatchSliceRuntimeAsset =
  | {
      type: "image";
      key: string;
      path: string;
    }
  | {
      type: "audio";
      key: string;
      paths: string[];
    };

export const MATCH_SLICE_ASSET_KEYS = {
  normalChick: "match.chick.normal",
  greenChick: "match.chick.green",
  normalClaimSfx: "match.sfx.normalClaim",
  playerChicken(player: 1 | 2, color: PlayerChickenColor): string {
    return `match.p${player}.chicken.${color}`;
  },
} as const;

export const MATCH_SLICE_RUNTIME_ASSETS: readonly MatchSliceRuntimeAsset[] = [];

export function preloadMatchSliceRuntimeAssets(
  loader: MatchSliceAssetLoader,
  assets: readonly MatchSliceRuntimeAsset[] = MATCH_SLICE_RUNTIME_ASSETS,
): void {
  for (const asset of assets) {
    switch (asset.type) {
      case "image":
        loader.image(asset.key, asset.path);
        break;
      case "audio":
        loader.audio(asset.key, asset.paths);
        break;
    }
  }
}

export function registerMatchSliceGeneratedTextures<
  Graphics extends GeneratedTextureGraphics,
>(options: RegisterMatchSliceGeneratedTexturesOptions<Graphics>): void {
  const size = options.chickSize;

  generateTextureOnce({
    key: MATCH_SLICE_ASSET_KEYS.normalChick,
    width: size * 2,
    height: size * 2,
    exists: options.exists,
    createGraphics: options.createGraphics,
    draw: (gfx) => {
      gfx.fillStyle(0xffdd44);
      gfx.fillCircle(size, size, size);
    },
  });

  generateTextureOnce({
    key: MATCH_SLICE_ASSET_KEYS.greenChick,
    width: size * 2,
    height: size * 2,
    exists: options.exists,
    createGraphics: options.createGraphics,
    draw: (gfx) => {
      gfx.fillStyle(0x44cc44);
      gfx.fillCircle(size, size, size);
      gfx.lineStyle(3, 0xd8ffd0, 1);
      gfx.strokeCircle(size, size, size - 1);
      gfx.lineStyle(2, 0x1e7a1e, 1);
      gfx.strokeCircle(size, size, size - 4);
    },
  });
}
