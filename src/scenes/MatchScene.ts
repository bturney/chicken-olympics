import Phaser from "phaser";
import {
  type PlayerSlotCount,
} from "../match/rules";
import { Match } from "../match/match";
import { FARMYARD_LAYOUT, WORLD_SCALE } from "../match/layout";
import {
  FIELDS,
  type PlaytestMenuState,
  createPlaytestMenuState,
  toggleMenu,
  updateFieldValue,
  activateField,
  applyTuning,
  resetDraftAction,
  stageDefaultsAction,
  closeMenu,
} from "../match/playtestMenuManager";

import {
  createBotChickenController,
  tickBotChickenController,
  type BotChickenController,
  type BotChickenTarget,
  type BotChickenConfig,
} from "../match/botChickenController";
import { computeMoveVelocity } from "../match/movement";
import {
  getPlayerChickenColorLabel,
  getPlayerChickenCssHex,
  getPlayerChickenHex,
  type PlayerChickenColor,
} from "../setup/colors";
import { computeChickenCursorPersonality } from "./chickenCursorPersonality";
import {
  SFX_NORMAL_CHICK_CLAIM,
  SFX_GREEN_CHICK_APPEAR,
  SFX_GREEN_CHICK_CLAIM,
  type SfxMoment,
} from "../audio/sfx";
import {
  createSceneAudioAdapter,
  type SceneAudioAdapter,
  type SceneAudioSource,
} from "../audio/scene-audio";
import {
  MatchPresentationFeedback,
  type FeedbackCommand,
} from "./MatchPresentationFeedback";
import {
  MATCH_SLICE_ASSET_KEYS,
  preloadMatchSliceRuntimeAssets,
  registerMatchSliceGeneratedTextures,
} from "./matchAssets";
import { generateTextureOnce } from "./textures";

interface MatchSceneData {
  p1Color?: PlayerChickenColor;
  p2Color?: PlayerChickenColor;
  playerSlotCount?: PlayerSlotCount;
  botSlots?: number[];
}

export type MatchSfxId = "normalClaim" | "greenChickAppear" | "greenChickClaim";

const MATCH_SFX_MOMENTS: Record<MatchSfxId, SfxMoment> = {
  normalClaim: SFX_NORMAL_CHICK_CLAIM,
  greenChickAppear: SFX_GREEN_CHICK_APPEAR,
  greenChickClaim: SFX_GREEN_CHICK_CLAIM,
};

const PLAYER_SIZE = 28 * WORLD_SCALE;
const CHICK_SIZE = 16 * WORLD_SCALE;

const GREEN_CHICK_VISIBLE_SCALE = 1.35;

export class MatchScene extends Phaser.Scene {
  private match!: Match;
  presentationFeedback!: MatchPresentationFeedback;
  private timerText!: Phaser.GameObjects.Text;
  private p1ScoreText!: Phaser.GameObjects.Text;
  private p2ScoreText!: Phaser.GameObjects.Text;
  private p1Label!: Phaser.GameObjects.Text;
  private p2Label!: Phaser.GameObjects.Text;
  private transitioned = false;
  private p1Color: PlayerChickenColor = "blue";
  private p2Color: PlayerChickenColor = "red";
  private playerSlotCount: PlayerSlotCount = 2;
  private botSlots: number[] = [];
  private botControllers = new Map<number, BotChickenController>();

  private menuState!: PlaytestMenuState;
  private menuContainer!: Phaser.GameObjects.Container;
  private menuActive = false;
  private sceneData!: MatchSceneData;
  private menuFieldTexts: Phaser.GameObjects.Text[] = [];
  private menuFieldBgs: Phaser.GameObjects.Graphics[] = [];
  private menuErrorTexts: Phaser.GameObjects.Text[] = [];
  private menuSectionHeaders: Phaser.GameObjects.Text[] = [];
  /** Precomputed Y-positions for each field row (accounts for section headers) */
  private menuFieldYs: number[] = [];
  private menuApplyBtn!: Phaser.GameObjects.Text;
  private menuRestartBtn!: Phaser.GameObjects.Text;
  private normalPeekCount = 3;

  private p1Chicken!: Phaser.Physics.Arcade.Sprite;
  private p2Chicken!: Phaser.Physics.Arcade.Sprite;
  private p1Shadow!: Phaser.GameObjects.Ellipse;
  private p2Shadow!: Phaser.GameObjects.Ellipse;
  private chickBodies: Phaser.Physics.Arcade.Sprite[] = [];
  private greenChickBody!: Phaser.Physics.Arcade.Sprite;
  private peekAnticipationLayer!: Phaser.GameObjects.Graphics;
  private greenClaimBurstLayer!: Phaser.GameObjects.Graphics;
  private audio!: SceneAudioAdapter<MatchSfxId>;

  get playedSfx(): readonly MatchSfxId[] {
    return this.audio.played;
  }
  private feedbackCommands: FeedbackCommand[] = [];
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private arrows!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super("MatchScene");
  }

  init(data: MatchSceneData): void {
    this.sceneData = data;
    if (data.p1Color) this.p1Color = data.p1Color;
    if (data.p2Color) this.p2Color = data.p2Color;
    if (data.playerSlotCount) this.playerSlotCount = data.playerSlotCount;
    if (data.botSlots) this.botSlots = data.botSlots;
  }

  preload(): void {
    preloadMatchSliceRuntimeAssets(this.load);
  }

  create(): void {
    const { width } = this.scale;

    this.menuState = createPlaytestMenuState({
      hidingSpotCount: FARMYARD_LAYOUT.hidingSpots.length,
    });
    this.menuActive = false;

    const applied = this.menuState.draft.applied;
    this.normalPeekCount = applied.normalPeekCount;

    this.match = new Match({
      durationMs: applied.matchDurationMs,
      spotCount: FARMYARD_LAYOUT.hidingSpots.length,
      spotPositions: FARMYARD_LAYOUT.hidingSpots,
      playerSlotCount: this.playerSlotCount,
      random: () => Math.random(),
      peekPressureConfig: {
        normalPeekCount: applied.normalPeekCount,
        normalPeekDurationMs: applied.normalPeekDurationMs,
        normalRefillMinMs: applied.normalRefillMinMs,
        normalRefillMaxMs: applied.normalRefillMaxMs,
        peekAnticipationDurationMs: applied.peekAnticipationDurationMs,
        normalChickPoints: applied.normalChickPoints,
      },
      greenChickConfig: {
        enabled: applied.greenChickEnabled,
        points: applied.greenChickPoints,
        scheduleMinMs: applied.greenChickScheduleMinMs,
        scheduleMaxMs: applied.greenChickScheduleMaxMs,
      },
    });
    this.presentationFeedback = new MatchPresentationFeedback({
      spotPositions: FARMYARD_LAYOUT.hidingSpots,
      playerHexColors: {
        0: getPlayerChickenHex(this.p1Color),
        1: getPlayerChickenHex(this.p2Color),
      },
      playerCssColors: {
        0: getPlayerChickenCssHex(this.p1Color),
        1: getPlayerChickenCssHex(this.p2Color),
      },
      claimFeedbackDurationMs: applied.claimFeedbackDurationMs,
      claimPopPeakScale: applied.claimPopPeakScale,
      greenClaimBeatDurationMs: applied.greenClaimBeatDurationMs,
      greenClaimBeatPeakScale: applied.greenClaimBeatPeakScale,
    });
    this.transitioned = false;
    this.chickBodies = [];
    this.botControllers = new Map(
      this.botSlots.map((slot) => [slot, createBotChickenController()]),
    );
    this.initAudio();

    this.physics.world.setBounds(
      FARMYARD_LAYOUT.bounds.x,
      FARMYARD_LAYOUT.bounds.y,
      FARMYARD_LAYOUT.bounds.width,
      FARMYARD_LAYOUT.bounds.height,
    );

    this.createHUD(width);
    this.createPlayers();
    this.createChicks();
    this.createHidingSpots();
    this.createPeekAnticipationLayer();
    this.createGreenClaimBurstLayer();
    this.createInput();
    this.createOverlaps();
    this.drawBounds();

    this.createPlaytestMenu();
    this.createPlaytestKeybind();

    this.match.advance(0);
    this.feedbackCommands = this.presentationFeedback.update(
      [],
      this.match.view().elapsedMs,
    );
    this.applyFeedbackCommands();
    this.renderChicks();
    this.renderGreenChick();
  }

  update(_time: number, delta: number): void {
    if (this.transitioned) return;

    if (this.menuActive) {
      this.stopPlayerMovement();
    } else {
      this.handleMovement();
    }
    const events = this.match.advance(delta);
    this.feedbackCommands = this.presentationFeedback.update(
      events,
      this.match.view().elapsedMs,
    );
    this.applyFeedbackCommands();
    this.updatePlayerChickenPersonality(this.match.view().elapsedMs);
    this.renderChicks();
    this.renderPeekAnticipations();
    this.renderGreenChick();
    this.updateHUD();

    if (this.match.view().complete) {
      this.transitioned = true;
      this.time.delayedCall(500, () => {
        const view = this.match.view();
        this.scene.start("PodiumScene", {
          scores: view.scores,
          winner: view.winner,
          playerColors: [this.p1Color, this.p2Color],
          p1Color: this.p1Color,
          p2Color: this.p2Color,
          botSlots: this.botSlots,
        });
      });
    }
  }

  private initAudio(): void {
    this.audio = createSceneAudioAdapter(
      this.sound as unknown as SceneAudioSource | null,
    );
  }

  private playSfx(id: MatchSfxId): void {
    this.audio.play(id, MATCH_SFX_MOMENTS[id]);
  }

  private applyFeedbackCommands(): void {
    for (const command of this.feedbackCommands) {
      switch (command.type) {
        case "claimScoreEcho":
          this.spawnClaimScoreEcho(
            command.spotIndex,
            command.points,
            command.cssColor,
          );
          break;
        case "scoreBump":
          this.bumpScoreText(command.playerIndex);
          break;
        case "sfx":
          this.playSfx(command.id);
          break;
      }
    }
  }

  private createHUD(width: number): void {
    this.add
      .text(width / 2, 30 * WORLD_SCALE, "Farmyard Stadium", {
        fontSize: `${28 * WORLD_SCALE}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.timerText = this.add
      .text(width / 2, 60 * WORLD_SCALE, "", {
        fontSize: `${22 * WORLD_SCALE}px`,
        color: "#ffdd44",
      })
      .setOrigin(0.5);

    this.p1ScoreText = this.add.text(20 * WORLD_SCALE, 10 * WORLD_SCALE, "", {
      fontSize: `${18 * WORLD_SCALE}px`,
      color: getPlayerChickenCssHex(this.p1Color),
    });

    this.p2ScoreText = this.add
      .text(width - 20 * WORLD_SCALE, 10 * WORLD_SCALE, "", {
        fontSize: `${18 * WORLD_SCALE}px`,
        color: getPlayerChickenCssHex(this.p2Color),
      })
      .setOrigin(1, 0);

    this.updateHUD();
  }

  private createPlayers(): void {
    generateTextureOnce({
      key: MATCH_SLICE_ASSET_KEYS.playerChicken(1, this.p1Color),
      width: PLAYER_SIZE * 2,
      height: PLAYER_SIZE * 2,
      exists: (key) => this.textures.exists(key),
      createGraphics: () => this.add.graphics(),
      draw: (gfx) => {
        this.drawPlayerChickenTexture(gfx, 1, this.p1Color);
      },
    });

    generateTextureOnce({
      key: MATCH_SLICE_ASSET_KEYS.playerChicken(2, this.p2Color),
      width: PLAYER_SIZE * 2,
      height: PLAYER_SIZE * 2,
      exists: (key) => this.textures.exists(key),
      createGraphics: () => this.add.graphics(),
      draw: (gfx) => {
        this.drawPlayerChickenTexture(gfx, 2, this.p2Color);
      },
    });

    const [p1Start, p2Start] = FARMYARD_LAYOUT.playerStartPositions;

    this.p1Shadow = this.add.ellipse(
      p1Start.x,
      p1Start.y + PLAYER_SIZE * 0.68,
      PLAYER_SIZE * 1.05,
      PLAYER_SIZE * 0.42,
      0x000000,
      0.18,
    );
    this.p1Shadow.setDepth(1);

    this.p1Chicken = this.physics.add.sprite(
      p1Start.x,
      p1Start.y,
      MATCH_SLICE_ASSET_KEYS.playerChicken(1, this.p1Color),
    );
    this.p1Chicken.setCollideWorldBounds(true);
    this.p1Chicken.setDepth(2);
    this.p1Label = this.add
      .text(p1Start.x, p1Start.y + PLAYER_SIZE + 4 * WORLD_SCALE, "P1", {
        fontSize: `${14 * WORLD_SCALE}px`,
        color: getPlayerChickenCssHex(this.p1Color),
      })
      .setOrigin(0.5);
    this.p1Label.setDepth(3);

    this.p2Shadow = this.add.ellipse(
      p2Start.x,
      p2Start.y + PLAYER_SIZE * 0.68,
      PLAYER_SIZE * 1.05,
      PLAYER_SIZE * 0.42,
      0x000000,
      0.18,
    );
    this.p2Shadow.setDepth(1);

    this.p2Chicken = this.physics.add.sprite(
      p2Start.x,
      p2Start.y,
      MATCH_SLICE_ASSET_KEYS.playerChicken(2, this.p2Color),
    );
    this.p2Chicken.setCollideWorldBounds(true);
    this.p2Chicken.setDepth(2);
    this.p2Label = this.add
      .text(p2Start.x, p2Start.y + PLAYER_SIZE + 4 * WORLD_SCALE, "P2", {
        fontSize: `${14 * WORLD_SCALE}px`,
        color: getPlayerChickenCssHex(this.p2Color),
      })
      .setOrigin(0.5);
    this.p2Label.setDepth(3);
  }

  private drawPlayerChickenTexture(
    gfx: Phaser.GameObjects.Graphics,
    playerIndex: 1 | 2,
    color: PlayerChickenColor,
  ): void {
    const bodyColor = getPlayerChickenHex(color);
    const outlineColor = 0x2d1f16;
    const wingColor = 0xffd166;
    const bellyColor = 0xfff0c4;
    const beakColor = 0xffbf4d;
    const combColor = 0xff5d7a;
    const eyeColor = 0x241a14;
    const feetColor = 0xc87a2e;
    const facing = playerIndex === 1 ? 1 : -1;

    gfx.fillStyle(0x000000, 0);
    gfx.fillRect(0, 0, PLAYER_SIZE * 2, PLAYER_SIZE * 2);

    gfx.fillStyle(bodyColor, 1);
    gfx.fillEllipse(
      PLAYER_SIZE - facing * 3,
      PLAYER_SIZE + 3,
      PLAYER_SIZE * 1.45,
      PLAYER_SIZE * 1.6,
    );

    gfx.fillStyle(bodyColor, 1);
    gfx.fillCircle(
      PLAYER_SIZE + facing * 5,
      PLAYER_SIZE - 8,
      PLAYER_SIZE * 0.56,
    );

    gfx.fillStyle(bellyColor, 0.8);
    gfx.fillEllipse(
      PLAYER_SIZE - facing * 7,
      PLAYER_SIZE + 9,
      PLAYER_SIZE * 0.64,
      PLAYER_SIZE * 0.78,
    );

    gfx.fillStyle(wingColor, 1);
    gfx.fillEllipse(PLAYER_SIZE - facing * 10, PLAYER_SIZE + 7, 17, 22);

    gfx.lineStyle(3, outlineColor, 1);
    gfx.strokeEllipse(
      PLAYER_SIZE - facing * 3,
      PLAYER_SIZE + 3,
      PLAYER_SIZE * 1.45,
      PLAYER_SIZE * 1.6,
    );
    gfx.strokeCircle(
      PLAYER_SIZE + facing * 5,
      PLAYER_SIZE - 8,
      PLAYER_SIZE * 0.56,
    );

    gfx.fillStyle(combColor, 1);
    gfx.fillTriangle(
      PLAYER_SIZE + facing * 1,
      PLAYER_SIZE - 27,
      PLAYER_SIZE + facing * 6,
      PLAYER_SIZE - 36,
      PLAYER_SIZE + facing * 11,
      PLAYER_SIZE - 24,
    );

    gfx.fillStyle(beakColor, 1);
    gfx.fillTriangle(
      PLAYER_SIZE + facing * 16,
      PLAYER_SIZE - 9,
      PLAYER_SIZE + facing * 30,
      PLAYER_SIZE - 4,
      PLAYER_SIZE + facing * 16,
      PLAYER_SIZE + 1,
    );

    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(PLAYER_SIZE + facing * 9, PLAYER_SIZE - 14, 3.6);
    gfx.fillStyle(eyeColor, 1);
    gfx.fillCircle(PLAYER_SIZE + facing * 10, PLAYER_SIZE - 14, 1.5);

    gfx.lineStyle(3, feetColor, 1);
    gfx.beginPath();
    gfx.moveTo(PLAYER_SIZE - 6, PLAYER_SIZE + 16);
    gfx.lineTo(PLAYER_SIZE - 6, PLAYER_SIZE + 24);
    gfx.moveTo(PLAYER_SIZE - 2, PLAYER_SIZE + 16);
    gfx.lineTo(PLAYER_SIZE - 2, PLAYER_SIZE + 24);
    gfx.moveTo(PLAYER_SIZE + 3, PLAYER_SIZE + 16);
    gfx.lineTo(PLAYER_SIZE + 3, PLAYER_SIZE + 24);
    gfx.strokePath();

    gfx.lineStyle(2, feetColor, 1);
    gfx.beginPath();
    gfx.moveTo(PLAYER_SIZE - 8, PLAYER_SIZE + 24);
    gfx.lineTo(PLAYER_SIZE - 11, PLAYER_SIZE + 28);
    gfx.moveTo(PLAYER_SIZE - 6, PLAYER_SIZE + 24);
    gfx.lineTo(PLAYER_SIZE - 2, PLAYER_SIZE + 28);
    gfx.moveTo(PLAYER_SIZE + 1, PLAYER_SIZE + 24);
    gfx.lineTo(PLAYER_SIZE + 5, PLAYER_SIZE + 28);
    gfx.strokePath();
  }

  private createChicks(): void {
    registerMatchSliceGeneratedTextures({
      chickSize: CHICK_SIZE,
      exists: (key) => this.textures.exists(key),
      createGraphics: () => this.add.graphics(),
    });

    for (let i = 0; i < this.normalPeekCount; i++) {
      const body = this.physics.add.sprite(
        0,
        0,
        MATCH_SLICE_ASSET_KEYS.normalChick,
      );
      body.body.enable = false;
      body.setVisible(false);
      body.setImmovable(true);
      this.chickBodies.push(body);
    }

    this.greenChickBody = this.physics.add.sprite(
      0,
      0,
      MATCH_SLICE_ASSET_KEYS.greenChick,
    );
    this.greenChickBody.body!.enable = false;
    this.greenChickBody.setVisible(false);
    this.greenChickBody.setImmovable(true);
  }

  private createOverlaps(): void {
    for (let slotIndex = 0; slotIndex < this.normalPeekCount; slotIndex++) {
      const chickBody = this.chickBodies[slotIndex]!;
      this.physics.add.overlap(this.p1Chicken, chickBody, () =>
        this.handleClaim(0, slotIndex),
      );
      this.physics.add.overlap(this.p2Chicken, chickBody, () =>
        this.handleClaim(1, slotIndex),
      );
    }
    this.physics.add.overlap(this.p1Chicken, this.greenChickBody, () =>
      this.handleGreenChickClaim(0),
    );
    this.physics.add.overlap(this.p2Chicken, this.greenChickBody, () =>
      this.handleGreenChickClaim(1),
    );
  }

  private handleClaim(playerIndex: 0 | 1, slotIndex: number): void {
    const chickBody = this.chickBodies[slotIndex];
    if (!chickBody || !chickBody.visible) return;

    const chick = this.match
      .view()
      .normalChicks.find((visible) => visible.slotIndex === slotIndex);
    if (!chick) return;

    const events = this.match.claim(chick.spotIndex, playerIndex);
    this.feedbackCommands = this.presentationFeedback.update(
      events,
      this.match.view().elapsedMs,
    );
    this.applyFeedbackCommands();
    this.updateHUD();
  }

  private handleGreenChickClaim(playerIndex: 0 | 1): void {
    if (!this.greenChickBody.visible) return;
    const greenChick = this.match.view().greenChick;
    if (!greenChick) return;

    const events = this.match.claim(greenChick.spotIndex, playerIndex);
    this.feedbackCommands = this.presentationFeedback.update(
      events,
      this.match.view().elapsedMs,
    );
    this.applyFeedbackCommands();
    this.updateHUD();
  }

  private spawnClaimScoreEcho(
    spotIndex: number,
    points: number,
    cssColor: string,
  ): void {
    const spot = FARMYARD_LAYOUT.hidingSpots[spotIndex];
    if (!spot) return;

    const echo = this.add
      .text(spot.x, spot.y - 18 * WORLD_SCALE, `+${points}`, {
        fontSize: `${18 * WORLD_SCALE}px`,
        color: cssColor,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);

    echo.setData("expiresAtMs", this.match.view().elapsedMs + 650);

    this.tweens.add({
      targets: echo,
      y: echo.y - 16 * WORLD_SCALE,
      alpha: 0,
      duration: 650,
      ease: "Quad.Out",
      onComplete: () => {
        echo.destroy();
      },
    });
  }

  private bumpScoreText(playerIndex: number): void {
    const scoreText = playerIndex === 0 ? this.p1ScoreText : this.p2ScoreText;
    this.tweens.killTweensOf(scoreText);
    scoreText.setScale(1.12);
    this.tweens.add({
      targets: scoreText,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: "Quad.Out",
    });
  }

  private createHidingSpots(): void {
    const spotGfx = this.add.graphics();

    // Decoration shapes are drawn in unscaled local space around (0,0) and
    // sized to the original CHICK_SIZE, then a per-spot canvas transform
    // (translate to the already-scaled anchor, then scale by WORLD_SCALE)
    // enlarges geometry and line widths uniformly without touching colors.
    // This keeps the hand-tuned peek offsets (commit fe64f28) intact.
    const localChickSize = CHICK_SIZE / WORLD_SCALE;

    for (const spot of FARMYARD_LAYOUT.hidingSpots) {
      spotGfx.save();
      spotGfx.translateCanvas(spot.x, spot.y);
      spotGfx.scaleCanvas(WORLD_SCALE, WORLD_SCALE);

      switch (spot.type) {
        case "bush":
          // Canopy sits a touch above and tighter than the chick so the
          // chick peeks out the bottom instead of being fully swallowed.
          spotGfx.fillStyle(0x3a8a3a, 1);
          spotGfx.fillCircle(0, -6, localChickSize - 1);
          spotGfx.fillStyle(0x66cc66, 1);
          spotGfx.fillCircle(-4, -10, 6);
          spotGfx.fillCircle(6, -4, 5);
          break;
        case "hay-bale":
          spotGfx.fillStyle(0xd9b066, 1);
          spotGfx.fillRoundedRect(-22, -12, 44, 24, 4);
          spotGfx.lineStyle(2, 0xa37a3a, 1);
          spotGfx.beginPath();
          spotGfx.moveTo(-18, -6);
          spotGfx.lineTo(18, -6);
          spotGfx.moveTo(-18, 6);
          spotGfx.lineTo(18, 6);
          spotGfx.strokePath();
          break;
        case "barrel":
          // Barrel sits a little higher and shorter than the chick so the
          // chick peeks out the bottom instead of being fully covered.
          spotGfx.fillStyle(0x8a4a2a, 1);
          spotGfx.fillRoundedRect(-14, -18, 28, 28, 4);
          spotGfx.fillStyle(0x5a3015, 1);
          spotGfx.fillRect(-14, -10, 28, 4);
          spotGfx.fillRect(-14, 0, 28, 4);
          break;
        case "flower-pot":
          spotGfx.fillStyle(0xc04a2a, 1);
          spotGfx.beginPath();
          spotGfx.moveTo(-14, 0);
          spotGfx.lineTo(14, 0);
          spotGfx.lineTo(10, 16);
          spotGfx.lineTo(-10, 16);
          spotGfx.closePath();
          spotGfx.fillPath();
          spotGfx.fillStyle(0xffdd44, 1);
          spotGfx.fillCircle(-6, -4, 4);
          spotGfx.fillStyle(0xff66aa, 1);
          spotGfx.fillCircle(6, -4, 4);
          spotGfx.fillStyle(0xffffff, 1);
          spotGfx.fillCircle(0, -8, 4);
          break;
        case "fence":
          spotGfx.fillStyle(0xb58864, 1);
          spotGfx.fillRect(-20, -2, 40, 5);
          spotGfx.fillRect(-20, 8, 40, 5);
          spotGfx.fillStyle(0x8a5a3a, 1);
          spotGfx.fillRect(-18, -16, 5, 26);
          spotGfx.fillRect(-2, -16, 5, 26);
          spotGfx.fillRect(14, -16, 5, 26);
          break;
        case "nest-box":
          // Box sits lower and narrower than the chick so the chick's head
          // peeks above the roofline rather than being buried under it.
          spotGfx.fillStyle(0x7a4a2a, 1);
          spotGfx.fillRect(-13, 4, 26, 18);
          spotGfx.fillStyle(0x4a2a1a, 1);
          spotGfx.beginPath();
          spotGfx.moveTo(-16, 4);
          spotGfx.lineTo(0, -8);
          spotGfx.lineTo(16, 4);
          spotGfx.closePath();
          spotGfx.fillPath();
          spotGfx.fillStyle(0x2a1a0a, 1);
          spotGfx.fillCircle(0, 12, 5);
          break;
      }

      spotGfx.restore();
    }
  }

  private createPeekAnticipationLayer(): void {
    this.peekAnticipationLayer = this.add.graphics();
    this.peekAnticipationLayer.setDepth(8);
  }

  private createGreenClaimBurstLayer(): void {
    this.greenClaimBurstLayer = this.add.graphics();
    this.greenClaimBurstLayer.setDepth(9);
  }

  private createInput(): void {
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };
    this.arrows = this.input.keyboard!.createCursorKeys();
  }

  private createPlaytestKeybind(): void {
    this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "`" || event.key === "~") {
        if (this.menuActive) {
          this.menuState = closeMenu(this.menuState);
        } else {
          this.menuState = toggleMenu(this.menuState);
          this.stopPlayerMovement();
        }
        this.menuActive = this.menuState.visible;
        this.menuContainer.setVisible(this.menuActive);
        this.renderPlaytestMenu();
        return;
      }
      if (!this.menuActive) return;

      if (event.key === "Escape") {
        this.menuState = closeMenu(this.menuState);
        this.menuActive = false;
        this.menuContainer.setVisible(false);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        const nextIndex = this.menuState.activeFieldIndex + 1;
        this.menuState = activateField(
          this.menuState,
          nextIndex >= FIELDS.length ? 0 : nextIndex,
        );
        this.renderPlaytestMenu();
        return;
      }

      const current = this.menuState.fieldValues[this.menuState.activeFieldIndex] ?? "";
      let next: string | null = null;
      if (event.key === "Backspace") {
        next = current.slice(0, -1);
      } else if (event.key.length === 1) {
        next = current + event.key;
      }
      if (next !== null) {
        this.menuState = updateFieldValue(this.menuState, next);
        this.renderPlaytestMenu();
      }
    });
  }

  private createPlaytestMenu(): void {
    const { width, height } = this.scale;
    const panelW = 520;
    const rowH = 30;
    const rowGap = 2;
    const sectionHeaderH = 16;
    const titleAreaH = 36;
    const legendH = 18;
    const buttonAreaH = 60;

    // Build section-aware Y positions
    const fieldYs: number[] = [];
    const sectionYs: number[] = [];
    let cursorY = 0;
    let currentSection = "";
    for (let i = 0; i < FIELDS.length; i++) {
      const section = FIELDS[i]!.section;
      if (section !== currentSection) {
        currentSection = section;
        sectionYs.push(cursorY);
        cursorY += sectionHeaderH;
      }
      fieldYs.push(cursorY);
      cursorY += rowH + rowGap;
    }
    this.menuFieldYs = fieldYs;

    const contentH = cursorY;
    const panelH = titleAreaH + legendH + contentH + buttonAreaH;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;

    this.menuFieldTexts = [];
    this.menuFieldBgs = [];
    this.menuErrorTexts = [];
    this.menuSectionHeaders = [];

    this.menuContainer = this.add.container(0, 0);
    this.menuContainer.setDepth(100);
    this.menuContainer.setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x111122, 0.92);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, 0x4488ff, 0.8);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.menuContainer.add(bg);

    const title = this.add
      .text(width / 2, py + 16, "Playtest Tuning", {
        fontSize: "20px",
        color: "#ffdd44",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.menuContainer.add(title);

    const legendText = this.add
      .text(px + 14, py + titleAreaH + 2, "* = restart required", {
        fontSize: "11px",
        color: "#ff8844",
      });
    this.menuContainer.add(legendText);

    const inputW = 260;
    const labelX = px + 14;
    const inputX = px + panelW - 14 - inputW;

    // Render section headers
    let sectionIdx = 0;
    currentSection = "";
    for (let i = 0; i < FIELDS.length; i++) {
      const field = FIELDS[i]!;
      if (field.section !== currentSection) {
        currentSection = field.section;
        const secY = py + titleAreaH + legendH + sectionYs[sectionIdx]!;
        const secText = this.add
          .text(labelX, secY, currentSection, {
            fontSize: "12px",
            color: "#aaccff",
            fontStyle: "bold",
          });
        this.menuContainer.add(secText);
        this.menuSectionHeaders.push(secText);
        sectionIdx++;
      }
    }

    // Render fields
    for (let i = 0; i < FIELDS.length; i++) {
      const field = FIELDS[i]!;
      const rowY = py + titleAreaH + legendH + fieldYs[i]!;

      const label = this.add
        .text(labelX, rowY, field.label, {
          fontSize: "12px",
          color: "#ccccdd",
        });
      this.menuContainer.add(label);

      const unitHint = this.add
        .text(inputX + inputW, rowY + 14, field.unitHint, {
          fontSize: "10px",
          color: "#888899",
        });
      this.menuContainer.add(unitHint);

      const fieldBg = this.add.graphics();
      const borderColor = i === this.menuState.activeFieldIndex ? 0x88bbff : 0x4488ff;
      fieldBg.fillStyle(0x222244, 1);
      fieldBg.fillRoundedRect(inputX, rowY - 1, inputW, 22, 3);
      fieldBg.lineStyle(1, borderColor, i === this.menuState.activeFieldIndex ? 0.9 : 0.5);
      fieldBg.strokeRoundedRect(inputX, rowY - 1, inputW, 22, 3);
      this.menuContainer.add(fieldBg);
      this.menuFieldBgs[i] = fieldBg;

      const fieldText = this.add
        .text(inputX + 4, rowY + 1, "", {
          fontSize: "13px",
          color: "#ffffff",
        });
      this.menuContainer.add(fieldText);
      this.menuFieldTexts[i] = fieldText;

      const errorText = this.add
        .text(inputX, rowY + 22, "", {
          fontSize: "10px",
          color: "#ff4444",
        });
      this.menuContainer.add(errorText);
      this.menuErrorTexts[i] = errorText;

      if (field.restartRequired) {
        const restartReq = this.add
          .text(px + panelW - 14, rowY, "*", {
            fontSize: "12px",
            color: "#ff8844",
          })
          .setOrigin(1, 0);
        this.menuContainer.add(restartReq);
      }
    }

    // Buttons
    const btnStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: "14px",
      color: "#ffffff",
      backgroundColor: "#334488",
      padding: { x: 8, y: 5 },
    };
    const btnY = py + panelH - 50;
    const btnGap = 6;

    this.menuApplyBtn = this.add
      .text(px + 14, btnY, "Apply", btnStyle)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onApply());
    this.menuContainer.add(this.menuApplyBtn);

    this.menuRestartBtn = this.add
      .text(this.menuApplyBtn.x + this.menuApplyBtn.width + btnGap, btnY, "Restart Match With Tuning", btnStyle)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onRestartMatch());
    this.menuContainer.add(this.menuRestartBtn);

    const resetBtn = this.add
      .text(px + 14, btnY + 28, "Reset Draft", btnStyle)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onResetDraft());
    this.menuContainer.add(resetBtn);

    const defaultsBtn = this.add
      .text(resetBtn.x + resetBtn.width + btnGap, btnY + 28, "Defaults / Clear Saved", btnStyle)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onStageDefaults());
    this.menuContainer.add(defaultsBtn);

    const closeBtn = this.add
      .text(px + panelW - 14, py + 10, "✕", {
        fontSize: "16px",
        color: "#888899",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onCloseMenu());
    this.menuContainer.add(closeBtn);
  }

  private renderPlaytestMenu(): void {
    const activeIndex = this.menuState.activeFieldIndex;
    const hasErrors = this.menuState.errors.length > 0;

    for (let i = 0; i < FIELDS.length; i++) {
      const raw = this.menuState.fieldValues[i] ?? "";
      const displayText = i === activeIndex ? raw + "█" : raw;
      this.menuFieldTexts[i]?.setText(displayText);

      const fieldErrors = this.menuState.errors.filter((e) => e.field === FIELDS[i]!.key);
      const errMsg = fieldErrors.length > 0 ? fieldErrors.map((e) => e.message).join("; ") : "";
      this.menuErrorTexts[i]?.setText(errMsg);

      const bg = this.menuFieldBgs[i];
      if (bg) {
        bg.clear();
        const { width, height } = this.scale;
        const panelW = 520;
        const rowH = 30;
        const rowGap = 2;
        const titleAreaH = 36;
        const legendH = 18;
        const buttonAreaH = 60;
        const inputW = 260;
        const px = (width - panelW) / 2;
        const inputX = px + panelW - 14 - inputW;
        const contentH = this.menuFieldYs.length > 0
          ? this.menuFieldYs[this.menuFieldYs.length - 1]! + rowH + rowGap
          : 0;
        const panelH = titleAreaH + legendH + contentH + buttonAreaH;
        const py = (height - panelH) / 2;
        const ry = py + titleAreaH + legendH + this.menuFieldYs[i]!;
        const borderColor = i === activeIndex ? 0x88bbff : 0x4488ff;
        bg.fillStyle(0x222244, 1);
        bg.fillRoundedRect(inputX, ry - 1, inputW, 22, 3);
        bg.lineStyle(1, borderColor, i === activeIndex ? 0.9 : 0.5);
        bg.strokeRoundedRect(inputX, ry - 1, inputW, 22, 3);
      }
    }

    // Visually disable Apply and Restart Match when errors exist
    const btnAlpha = hasErrors ? 0.35 : 1;
    this.menuApplyBtn.setAlpha(btnAlpha);
    this.menuRestartBtn.setAlpha(btnAlpha);
  }

  private get claimFeedbackConfig() {
    const a = this.menuState.draft.applied;
    return {
      claimFeedbackDurationMs: a.claimFeedbackDurationMs,
      claimPopPeakScale: a.claimPopPeakScale,
      greenClaimBeatDurationMs: a.greenClaimBeatDurationMs,
      greenClaimBeatPeakScale: a.greenClaimBeatPeakScale,
    };
  }

  private onApply(): void {
    if (this.menuState.errors.length > 0) return;
    this.menuState = applyTuning(this.menuState);
    this.presentationFeedback.applyConfig(this.claimFeedbackConfig);
    this.renderPlaytestMenu();
  }

  private onRestartMatch(): void {
    if (this.menuState.errors.length > 0) return;
    this.menuState = applyTuning(this.menuState);
    this.scene.restart(this.sceneData);
  }

  private onResetDraft(): void {
    this.menuState = resetDraftAction(this.menuState);
    this.renderPlaytestMenu();
  }

  private onStageDefaults(): void {
    this.menuState = stageDefaultsAction(this.menuState);
    this.renderPlaytestMenu();
  }

  private onCloseMenu(): void {
    this.menuState = closeMenu(this.menuState);
    this.menuActive = false;
    this.menuContainer.setVisible(false);
  }

  private get playerSpeed(): number {
    return this.menuState.draft.applied.playerSpeed;
  }

  private get botSpeed(): number {
    return this.menuState.draft.applied.botSpeed;
  }

  private get botIndecisionConfig(): BotChickenConfig {
    const a = this.menuState.draft.applied;
    return {
      reactionDelayMinMs: a.reactionDelayMinMs,
      reactionDelayMaxMs: a.reactionDelayMaxMs,
      indecisionChance: a.indecisionChance,
      indecisionDurationMs: a.indecisionDurationMs,
      farTargetChance: a.farTargetChance,
    };
  }

  private stopPlayerMovement(): void {
    this.p1Chicken.setVelocity(0, 0);
    this.p2Chicken.setVelocity(0, 0);
  }

  private handleMovement(): void {
    const p1IsBot = this.botSlots.includes(0);
    if (!p1IsBot) {
      const p1Velocity = computeMoveVelocity(
        {
          left: this.wasd.A.isDown,
          right: this.wasd.D.isDown,
          up: this.wasd.W.isDown,
          down: this.wasd.S.isDown,
        },
        this.playerSpeed,
      );
      this.p1Chicken.setVelocity(p1Velocity.vx, p1Velocity.vy);
    } else {
      this.handleBotMovement(0, this.p1Chicken);
    }

    const p2IsBot = this.botSlots.includes(1);
    if (!p2IsBot) {
      const p2Velocity = computeMoveVelocity(
        {
          left: this.arrows.left.isDown,
          right: this.arrows.right.isDown,
          up: this.arrows.up.isDown,
          down: this.arrows.down.isDown,
        },
        this.playerSpeed,
      );
      this.p2Chicken.setVelocity(p2Velocity.vx, p2Velocity.vy);
    } else {
      this.handleBotMovement(1, this.p2Chicken);
    }
  }

  private handleBotMovement(
    playerIndex: number,
    chicken: Phaser.Physics.Arcade.Sprite,
  ): void {
    const controller = this.botControllers.get(playerIndex);
    if (!controller) {
      chicken.setVelocity(0, 0);
      return;
    }

    const result = tickBotChickenController(controller, {
      botPosition: { x: chicken.x, y: chicken.y },
      elapsedMs: this.match.view().elapsedMs,
      speed: this.botSpeed,
      visibleTargets: this.getVisibleBotTargets(),
      config: this.botIndecisionConfig,
    });
    this.botControllers.set(playerIndex, result.controller);
    chicken.setVelocity(result.velocity.vx, result.velocity.vy);
  }

  private getVisibleBotTargets(): BotChickenTarget[] {
    const view = this.match.view();
    const targets = view.normalChicks.flatMap((chick) => {
      const spot = FARMYARD_LAYOUT.hidingSpots[chick.spotIndex];
      return spot ? [{ spotIndex: chick.spotIndex, x: spot.x, y: spot.y }] : [];
    });

    if (view.greenChick) {
      const spot = FARMYARD_LAYOUT.hidingSpots[view.greenChick.spotIndex];
      if (spot) {
        targets.push({
          spotIndex: view.greenChick.spotIndex,
          x: spot.x,
          y: spot.y,
        });
      }
    }

    return targets;
  }

  private updatePlayerChickenPersonality(elapsedMs: number): void {
    const p1Body = this.p1Chicken.body as Phaser.Physics.Arcade.Body | null;
    const p1Personality = computeChickenCursorPersonality(
      {
        vx: p1Body?.velocity.x ?? 0,
        vy: p1Body?.velocity.y ?? 0,
      },
      elapsedMs,
      0,
    );
    this.p1Chicken.setAngle(p1Personality.angle);
    this.p1Shadow.setPosition(
      this.p1Chicken.x,
      this.p1Chicken.y + PLAYER_SIZE * 0.68 + p1Personality.shadowYOffset,
    );
    this.p1Shadow.setScale(
      p1Personality.shadowScaleX,
      p1Personality.shadowScaleY,
    );
    this.p1Shadow.setAlpha(p1Personality.shadowAlpha);
    this.p1Label.setPosition(
      this.p1Chicken.x,
      this.p1Chicken.y +
        PLAYER_SIZE +
        4 * WORLD_SCALE +
        p1Personality.shadowYOffset * 0.15,
    );

    const p2Body = this.p2Chicken.body as Phaser.Physics.Arcade.Body | null;
    const p2Personality = computeChickenCursorPersonality(
      {
        vx: p2Body?.velocity.x ?? 0,
        vy: p2Body?.velocity.y ?? 0,
      },
      elapsedMs,
      1,
    );
    this.p2Chicken.setAngle(p2Personality.angle);
    this.p2Shadow.setPosition(
      this.p2Chicken.x,
      this.p2Chicken.y + PLAYER_SIZE * 0.68 + p2Personality.shadowYOffset,
    );
    this.p2Shadow.setScale(
      p2Personality.shadowScaleX,
      p2Personality.shadowScaleY,
    );
    this.p2Shadow.setAlpha(p2Personality.shadowAlpha);
    this.p2Label.setPosition(
      this.p2Chicken.x,
      this.p2Chicken.y +
        PLAYER_SIZE +
        4 * WORLD_SCALE +
        p2Personality.shadowYOffset * 0.15,
    );
  }

  private renderChicks(): void {
    const view = this.match.view();
    for (let slotIndex = 0; slotIndex < this.normalPeekCount; slotIndex++) {
      const body = this.chickBodies[slotIndex]!;
      const visibleChick = view.normalChicks.find(
        (chick) => chick.slotIndex === slotIndex,
      );
      const beat = this.feedbackCommands.find(
        (c): c is Extract<FeedbackCommand, { type: "normalClaimBeat" }> =>
          c.type === "normalClaimBeat" && c.slotIndex === slotIndex,
      );

      if (beat) {
        const spot = FARMYARD_LAYOUT.hidingSpots[beat.spotIndex]!;
        body.setPosition(spot.x, spot.y);
        body.setTint(beat.hexColor).setTintMode(Phaser.TintModes.FILL);
        body.setScale(beat.scale);
        body.body!.enable = false;
        body.setVisible(true);
      } else if (visibleChick) {
        const spot = FARMYARD_LAYOUT.hidingSpots[visibleChick.spotIndex]!;
        body.setPosition(spot.x, spot.y);
        body.clearTint();
        body.setScale(1);
        body.body!.enable = true;
        body.setVisible(true);
      } else if (body.visible) {
        body.clearTint();
        body.setScale(1);
        body.body!.enable = false;
        body.setVisible(false);
      }
    }
  }

  private renderPeekAnticipations(): void {
    const view = this.match.view();
    this.peekAnticipationLayer.clear();

    for (const anticipation of view.peekAnticipations) {
      const spot = FARMYARD_LAYOUT.hidingSpots[anticipation.spotIndex];
      if (!spot) continue;

      const wobble =
        Math.sin((view.elapsedMs - anticipation.startedAtMs) / 60) * 2;
      const progress = Math.min(
        1,
        (view.elapsedMs - anticipation.startedAtMs) /
          this.menuState.draft.applied.peekAnticipationDurationMs,
      );
      const radius = 18 * WORLD_SCALE + progress * 18 * WORLD_SCALE + wobble;
      const alpha = 0.75 * (1 - progress * 0.35);

      this.peekAnticipationLayer.lineStyle(4, 0xfff2a0, alpha);
      this.peekAnticipationLayer.strokeCircle(spot.x, spot.y, radius);
      this.peekAnticipationLayer.fillStyle(0xfff2a0, 0.18);
      this.peekAnticipationLayer.fillCircle(spot.x, spot.y, radius - 4);
      this.peekAnticipationLayer.lineStyle(2, 0xffffff, alpha * 0.55);
      this.peekAnticipationLayer.beginPath();
      this.peekAnticipationLayer.moveTo(spot.x - radius, spot.y);
      this.peekAnticipationLayer.lineTo(spot.x + radius, spot.y);
      this.peekAnticipationLayer.moveTo(spot.x, spot.y - radius);
      this.peekAnticipationLayer.lineTo(spot.x, spot.y + radius);
      this.peekAnticipationLayer.strokePath();
    }
  }

  private renderGreenChick(): void {
    const view = this.match.view();
    const greenBeat = this.feedbackCommands.find(
      (c): c is Extract<FeedbackCommand, { type: "greenClaimBeat" }> =>
        c.type === "greenClaimBeat",
    );

    if (greenBeat) {
      const spot = FARMYARD_LAYOUT.hidingSpots[greenBeat.spotIndex] ?? null;
      if (!spot) return;

      this.greenChickBody.setPosition(spot.x, spot.y);
      this.greenChickBody
        .setTint(greenBeat.hexColor)
        .setTintMode(Phaser.TintModes.FILL);
      this.greenChickBody.setScale(greenBeat.scale);
      this.greenChickBody.body!.enable = false;
      this.greenChickBody.setVisible(true);
      this.renderGreenClaimBurst(spot.x, spot.y, greenBeat);
      return;
    }

    this.greenClaimBurstLayer.clear();

    const activeSpot = view.greenChick?.spotIndex ?? null;

    if (activeSpot === null) {
      if (this.greenChickBody.visible) {
        this.greenChickBody.clearTint();
        this.greenChickBody.setScale(1);
        this.greenChickBody.body!.enable = false;
        this.greenChickBody.setVisible(false);
      }
      return;
    }

    const spot = FARMYARD_LAYOUT.hidingSpots[activeSpot]!;
    this.greenChickBody.setPosition(spot.x, spot.y);
    this.greenChickBody.clearTint();
    this.greenChickBody.setScale(GREEN_CHICK_VISIBLE_SCALE);
    this.greenChickBody.body!.enable = true;
    this.greenChickBody.setVisible(true);
  }

  private renderGreenClaimBurst(
    x: number,
    y: number,
    beat: Extract<FeedbackCommand, { type: "greenClaimBeat" }>,
  ): void {
    const { progress, scale, hexColor } = beat;
    const burstRadius = 26 * WORLD_SCALE + progress * 54 * WORLD_SCALE;
    const burstAlpha = 0.72 * (1 - progress);

    this.greenClaimBurstLayer.clear();
    this.greenClaimBurstLayer.lineStyle(7, hexColor, burstAlpha);
    this.greenClaimBurstLayer.strokeCircle(x, y, burstRadius * scale);
    this.greenClaimBurstLayer.lineStyle(4, 0xffffff, burstAlpha * 0.9);
    this.greenClaimBurstLayer.strokeCircle(x, y, burstRadius * 0.66 * scale);
    this.greenClaimBurstLayer.fillStyle(hexColor, burstAlpha * 0.28);
    this.greenClaimBurstLayer.fillCircle(x, y, burstRadius * 0.42 * scale);

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + progress * 0.7;
      const inner = burstRadius * 0.35 * scale;
      const outer = burstRadius * 0.95 * scale;
      this.greenClaimBurstLayer.lineStyle(
        3,
        i % 2 === 0 ? 0xffffff : hexColor,
        burstAlpha,
      );
      this.greenClaimBurstLayer.beginPath();
      this.greenClaimBurstLayer.moveTo(
        x + Math.cos(angle) * inner,
        y + Math.sin(angle) * inner,
      );
      this.greenClaimBurstLayer.lineTo(
        x + Math.cos(angle) * outer,
        y + Math.sin(angle) * outer,
      );
      this.greenClaimBurstLayer.strokePath();
    }
  }

  private drawBounds(): void {
    const { x, y, width, height } = FARMYARD_LAYOUT.bounds;
    const border = this.add.graphics();
    border.lineStyle(2, 0x44aa44, 0.6);
    border.strokeRect(x, y, width, height);
  }

  private updateHUD(): void {
    const view = this.match.view();
    const remaining = view.remainingMs;
    const seconds = (remaining / 1000).toFixed(1);
    this.timerText.setText(`Time: ${seconds}s`);

    const p1Label = getPlayerChickenColorLabel(this.p1Color);
    const p2DisplayLabel = this.botSlots.includes(1)
      ? "Bot Chicken"
      : getPlayerChickenColorLabel(this.p2Color);
    this.p1ScoreText.setText(`P1 (${p1Label}): ${view.scores[0]}`);
    this.p2ScoreText.setText(`P2 (${p2DisplayLabel}): ${view.scores[1]}`);
  }
}
