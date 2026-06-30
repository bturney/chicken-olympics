interface GeneratedTextureGraphics {
  generateTexture(key: string, width: number, height: number): void;
  destroy(): void;
}

interface GenerateTextureOnceOptions<Graphics extends GeneratedTextureGraphics> {
  key: string;
  width: number;
  height: number;
  exists: (key: string) => boolean;
  createGraphics: () => Graphics;
  draw: (graphics: Graphics) => void;
}

export function generateTextureOnce<Graphics extends GeneratedTextureGraphics>(
  options: GenerateTextureOnceOptions<Graphics>,
): void {
  if (options.exists(options.key)) return;

  const graphics = options.createGraphics();
  options.draw(graphics);
  graphics.generateTexture(options.key, options.width, options.height);
  graphics.destroy();
}
