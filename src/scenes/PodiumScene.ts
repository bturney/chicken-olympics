import Phaser from "phaser";
import {
  getPlayerChickenColorLabel,
  getPlayerChickenHex,
  type PlayerChickenColor,
} from "../setup/colors";
import { generateTextureOnce } from "./textures";
import { SFX_PODIUM_FANFARE } from "../audio/sfx";
import {
  createSceneAudioAdapter,
  type SceneAudioAdapter,
  type SceneAudioSource,
} from "../audio/scene-audio";
import { WORLD_SCALE } from "../match/layout";

type PodiumSfxId = "podiumFanfare";

interface PodiumData {
  scores?: [number, number];
  winner?: 0 | 1 | null;
  p1Color?: PlayerChickenColor;
  p2Color?: PlayerChickenColor;
}

const PLAYER_RADIUS = 28 * WORLD_SCALE;

const PODIUM_GOLD = 0xffd700;
const PODIUM_SILVER = 0xc0c0c0;
const PODIUM_BRONZE = 0xcd7f32;
const PODIUM_GROUND = 0x4a3a2a;
const PODIUM_BLOCK_TOP = 0x6a5a3a;
const PODIUM_BLOCK_FRONT = 0x3a2a1a;

const GOLD_BLOCK = {
  x: 360 * WORLD_SCALE,
  y: 300 * WORLD_SCALE,
  width: 160 * WORLD_SCALE,
  height: 140 * WORLD_SCALE,
};
const SILVER_BLOCK = {
  x: 200 * WORLD_SCALE,
  y: 360 * WORLD_SCALE,
  width: 140 * WORLD_SCALE,
  height: 80 * WORLD_SCALE,
};
const BRONZE_BLOCK = {
  x: 540 * WORLD_SCALE,
  y: 380 * WORLD_SCALE,
  width: 140 * WORLD_SCALE,
  height: 60 * WORLD_SCALE,
};

function podiumTextureKey(player: 1 | 2, color: PlayerChickenColor): string {
  return `podium_p${player}_${color}`;
}

function goldBlockTextureKey(): string {
  return "podium_block_gold";
}

function silverBlockTextureKey(): string {
  return "podium_block_silver";
}

function bronzeBlockTextureKey(): string {
  return "podium_block_bronze";
}

function podiumBlockTextureKey(label: "gold" | "silver" | "bronze"): string {
  switch (label) {
    case "gold":
      return goldBlockTextureKey();
    case "silver":
      return silverBlockTextureKey();
    case "bronze":
      return bronzeBlockTextureKey();
  }
}

function podiumBlockHex(label: "gold" | "silver" | "bronze"): number {
  switch (label) {
    case "gold":
      return PODIUM_GOLD;
    case "silver":
      return PODIUM_SILVER;
    case "bronze":
      return PODIUM_BRONZE;
  }
}

export class PodiumScene extends Phaser.Scene {
  private audio!: SceneAudioAdapter<PodiumSfxId>;

  get playedSfx(): readonly PodiumSfxId[] {
    return this.audio.played;
  }

  constructor() {
    super("PodiumScene");
  }

  create(data: PodiumData): void {
    const { width, height } = this.scale;
    const [p1Score, p2Score] = data?.scores ?? [0, 0];
    const winner: 0 | 1 | null = data?.winner ?? null;
    const p1Color: PlayerChickenColor = data?.p1Color ?? "blue";
    const p2Color: PlayerChickenColor = data?.p2Color ?? "red";

    this.initAudio();
    this.playSfx("podiumFanfare");

    this.drawPodiumBlocks();
    this.drawGround(width, height);
    const playerImages = this.placePlayers(winner, p1Color, p2Color);
    const title = this.drawTitle(width);
    this.drawScores(width, height, p1Score, p2Score, p1Color, p2Color);
    const result = this.drawResult(width, height, winner);
    this.drawCelebrationBackdrop(width, winner, playerImages);
    this.playCelebrationPop(winner, playerImages, title, result);
    this.drawPlayAgainButton(width, height);
  }

  private initAudio(): void {
    this.audio = createSceneAudioAdapter(
      this.sound as unknown as SceneAudioSource | null,
    );
  }

  private playSfx(id: PodiumSfxId): void {
    this.audio.play(id, SFX_PODIUM_FANFARE);
  }

  private drawPodiumBlocks(): void {
    this.createBlockTexture("gold", GOLD_BLOCK.width, GOLD_BLOCK.height);
    this.createBlockTexture("silver", SILVER_BLOCK.width, SILVER_BLOCK.height);
    this.createBlockTexture("bronze", BRONZE_BLOCK.width, BRONZE_BLOCK.height);

    this.add.image(GOLD_BLOCK.x, GOLD_BLOCK.y, podiumBlockTextureKey("gold"));
    this.add.image(
      SILVER_BLOCK.x,
      SILVER_BLOCK.y,
      podiumBlockTextureKey("silver"),
    );
    this.add.image(
      BRONZE_BLOCK.x,
      BRONZE_BLOCK.y,
      podiumBlockTextureKey("bronze"),
    );
  }

  private createBlockTexture(
    label: "gold" | "silver" | "bronze",
    blockWidth: number,
    blockHeight: number,
  ): void {
    generateTextureOnce({
      key: podiumBlockTextureKey(label),
      width: blockWidth,
      height: blockHeight,
      exists: (key) => this.textures.exists(key),
      createGraphics: () => this.make.graphics({ x: 0, y: 0 }, false),
      draw: (gfx) => {
        const radius = 6 * WORLD_SCALE;
        const topStrip = 8 * WORLD_SCALE;
        gfx.fillStyle(podiumBlockHex(label), 1);
        gfx.fillRoundedRect(0, 0, blockWidth, blockHeight, radius);
        gfx.fillStyle(PODIUM_BLOCK_TOP, 1);
        gfx.fillRoundedRect(0, 0, blockWidth, topStrip, {
          tl: radius,
          tr: radius,
          bl: 0,
          br: 0,
        });
        gfx.lineStyle(2 * WORLD_SCALE, PODIUM_BLOCK_FRONT, 1);
        gfx.strokeRoundedRect(0, 0, blockWidth, blockHeight, radius);
      },
    });
  }

  private drawGround(width: number, height: number): void {
    const ground = this.add.graphics();
    const groundY = 440 * WORLD_SCALE;
    ground.fillStyle(PODIUM_GROUND, 1);
    ground.fillRect(0, groundY, width, height - groundY);
    ground.lineStyle(2 * WORLD_SCALE, 0x2a1a0a, 1);
    ground.beginPath();
    ground.moveTo(0, groundY);
    ground.lineTo(width, groundY);
    ground.strokePath();
  }

  private placePlayers(
    winner: 0 | 1 | null,
    p1Color: PlayerChickenColor,
    p2Color: PlayerChickenColor,
  ): [Phaser.GameObjects.Image, Phaser.GameObjects.Image] {
    this.createPlayerTexture(1, p1Color);
    this.createPlayerTexture(2, p2Color);

    if (winner === null) {
      const goldTopY = GOLD_BLOCK.y;
      const p1 = this.add
        .image(
          GOLD_BLOCK.x - 24 * WORLD_SCALE,
          goldTopY - PLAYER_RADIUS,
          podiumTextureKey(1, p1Color),
        )
        .setOrigin(0.5, 1);
      const p2 = this.add
        .image(
          GOLD_BLOCK.x + 24 * WORLD_SCALE,
          goldTopY - PLAYER_RADIUS,
          podiumTextureKey(2, p2Color),
        )
        .setOrigin(0.5, 1);
      return [p1, p2];
    }

    if (winner === 0) {
      const p1 = this.add
        .image(
          GOLD_BLOCK.x,
          GOLD_BLOCK.y - PLAYER_RADIUS,
          podiumTextureKey(1, p1Color),
        )
        .setOrigin(0.5, 1);
      const p2 = this.add
        .image(
          SILVER_BLOCK.x,
          SILVER_BLOCK.y - PLAYER_RADIUS,
          podiumTextureKey(2, p2Color),
        )
        .setOrigin(0.5, 1);
      return [p1, p2];
    }

    const p1 = this.add
      .image(
        SILVER_BLOCK.x,
        SILVER_BLOCK.y - PLAYER_RADIUS,
        podiumTextureKey(1, p1Color),
      )
      .setOrigin(0.5, 1);
    const p2 = this.add
      .image(
        GOLD_BLOCK.x,
        GOLD_BLOCK.y - PLAYER_RADIUS,
        podiumTextureKey(2, p2Color),
      )
      .setOrigin(0.5, 1);
    return [p1, p2];
  }

  private createPlayerTexture(player: 1 | 2, color: PlayerChickenColor): void {
    generateTextureOnce({
      key: podiumTextureKey(player, color),
      width: PLAYER_RADIUS * 2,
      height: PLAYER_RADIUS * 2,
      exists: (key) => this.textures.exists(key),
      createGraphics: () => this.make.graphics({ x: 0, y: 0 }, false),
      draw: (gfx) => {
        gfx.fillStyle(getPlayerChickenHex(color), 1);
        gfx.fillCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
        gfx.lineStyle(2 * WORLD_SCALE, 0x222222, 1);
        gfx.strokeCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
      },
    });
  }

  private drawTitle(width: number): Phaser.GameObjects.Text {
    return this.add
      .text(width / 2, 60 * WORLD_SCALE, "Podium Ceremony", {
        fontSize: `${32 * WORLD_SCALE}px`,
        color: "#ffd700",
      })
      .setOrigin(0.5);
  }

  private drawScores(
    width: number,
    height: number,
    p1Score: number,
    p2Score: number,
    p1Color: PlayerChickenColor,
    p2Color: PlayerChickenColor,
  ): void {
    this.add
      .text(
        width / 2,
        height - 135 * WORLD_SCALE,
        `Player 1 (${getPlayerChickenColorLabel(p1Color)}): ${p1Score}`,
        {
          fontSize: `${20 * WORLD_SCALE}px`,
          color: hexToCssHex(getPlayerChickenHex(p1Color)),
        },
      )
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height - 100 * WORLD_SCALE,
        `Player 2 (${getPlayerChickenColorLabel(p2Color)}): ${p2Score}`,
        {
          fontSize: `${20 * WORLD_SCALE}px`,
          color: hexToCssHex(getPlayerChickenHex(p2Color)),
        },
      )
      .setOrigin(0.5);
  }

  private drawResult(
    width: number,
    height: number,
    winner: 0 | 1 | null,
  ): Phaser.GameObjects.Text {
    let result: string;
    if (winner === 0) {
      result = "Player 1 Wins!";
    } else if (winner === 1) {
      result = "Player 2 Wins!";
    } else {
      result = "It's a Tie!";
    }

    return this.add
      .text(width / 2, height - 60 * WORLD_SCALE, result, {
        fontSize: `${26 * WORLD_SCALE}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }

  private playCelebrationPop(
    winner: 0 | 1 | null,
    playerImages: [Phaser.GameObjects.Image, Phaser.GameObjects.Image],
    title: Phaser.GameObjects.Text,
    result: Phaser.GameObjects.Text,
  ): void {
    this.popIn(title, 1.22, 420, 0);
    this.popIn(result, 1.12, 360, 60);

    if (winner === null) {
      this.popIn(playerImages[0], 1.32, 520, 0);
      this.popIn(playerImages[1], 1.32, 520, 0);
      return;
    }

    this.popIn(playerImages[winner], 1.38, 560, 0);
  }

  private drawCelebrationBackdrop(
    width: number,
    winner: 0 | 1 | null,
    playerImages: [Phaser.GameObjects.Image, Phaser.GameObjects.Image],
  ): void {
    const centerX = winner === null ? width / 2 : playerImages[winner].x;
    const centerY =
      winner === null
        ? GOLD_BLOCK.y - PLAYER_RADIUS
        : playerImages[winner].y - PLAYER_RADIUS;
    const gfx = this.add.graphics();
    gfx.setDepth(-1);

    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14;
      const inner = 42 * WORLD_SCALE;
      const outer = 170 * WORLD_SCALE;
      gfx.lineStyle(5 * WORLD_SCALE, i % 2 === 0 ? 0xfff2a0 : 0xffffff, 0.45);
      gfx.beginPath();
      gfx.moveTo(
        centerX + Math.cos(angle) * inner,
        centerY + Math.sin(angle) * inner,
      );
      gfx.lineTo(
        centerX + Math.cos(angle) * outer,
        centerY + Math.sin(angle) * outer,
      );
      gfx.strokePath();
    }

    for (let i = 0; i < 28; i++) {
      const x = 70 * WORLD_SCALE + ((i * 53) % 660) * WORLD_SCALE;
      const y = (80 + ((i * 37) % 260)) * WORLD_SCALE;
      gfx.fillStyle(
        i % 3 === 0 ? 0xffd700 : i % 3 === 1 ? 0xff66aa : 0x66ddff,
        0.85,
      );
      gfx.fillRect(x, y, 8 * WORLD_SCALE, 12 * WORLD_SCALE);
    }
  }

  private popIn(
    target: Phaser.GameObjects.Image | Phaser.GameObjects.Text,
    startScale: number,
    duration: number,
    delay: number,
  ): void {
    target.setData("celebrationPopStartScale", startScale);
    target.setScale(startScale);
    this.tweens.add({
      targets: target,
      scaleX: 1,
      scaleY: 1,
      duration,
      delay,
      ease: "Quad.Out",
    });
  }

  private drawPlayAgainButton(width: number, height: number): void {
    const button = this.add
      .text(width / 2, height - 20 * WORLD_SCALE, "[ Play Again ]", {
        fontSize: `${20 * WORLD_SCALE}px`,
        color: "#44ff44",
        backgroundColor: "#333355",
        padding: { x: 16 * WORLD_SCALE, y: 6 * WORLD_SCALE },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setColor("#88ff88"));
    button.on("pointerout", () => button.setColor("#44ff44"));
    button.on("pointerdown", () => {
      this.scene.start("SetupScene");
    });
  }
}

function hexToCssHex(value: number): string {
  return "#" + value.toString(16).padStart(6, "0");
}
