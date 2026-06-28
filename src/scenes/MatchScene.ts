import Phaser from "phaser";
import {
  createMatchState,
  tick,
  isMatchComplete,
  getRemainingMs,
  getWinner,
  createPeekState,
  tickPeekState,
  isPeekActive,
  getActiveNormalSpotIndices,
  attemptClaim,
  createClaimAnimationState,
  startClaimAnimation,
  getActiveClaimAnimation,
  tickClaimAnimations,
  computeClaimPopScale,
  createGreenChickState,
  tickGreenChickState,
  getActiveGreenChickSpotIndex,
  attemptGreenChickClaim,
  type MatchState,
  type PeekState,
  type ClaimAnimationState,
  type GreenChickState,
  NORMAL_PEEK_COUNT,
} from "../match/rules";
import { FARMYARD_LAYOUT } from "../match/layout";
import { computeMoveVelocity } from "../match/movement";
import {
  getPlayerChickenColorLabel,
  getPlayerChickenHex,
  type PlayerChickenColor,
} from "../setup/colors";
import {
  playSfxMoment,
  SFX_NORMAL_CHICK_CLAIM,
  SFX_GREEN_CHICK_APPEAR,
  SFX_GREEN_CHICK_CLAIM,
  type SfxScheduler,
  type SfxMoment,
} from "../audio/sfx";
import { createWebAudioScheduler } from "../audio/web-audio";

export type MatchSfxId = "normalClaim" | "greenChickAppear" | "greenChickClaim";

const MATCH_SFX_MOMENTS: Record<MatchSfxId, SfxMoment> = {
  normalClaim: SFX_NORMAL_CHICK_CLAIM,
  greenChickAppear: SFX_GREEN_CHICK_APPEAR,
  greenChickClaim: SFX_GREEN_CHICK_CLAIM,
};

const PLAYER_SIZE = 28;
const CHICK_SIZE = 16;
const CHICK_COLOR = 0xffdd44;
const GREEN_CHICK_COLOR = 0x44cc44;
const MOVE_SPEED = FARMYARD_LAYOUT.playerSpeed;

interface MatchSceneData {
  p1Color?: PlayerChickenColor;
  p2Color?: PlayerChickenColor;
}

function playerTextureKey(player: 1 | 2, color: PlayerChickenColor): string {
  return `p${player}_chicken_${color}`;
}

function hexToCssHex(value: number): string {
  return "#" + value.toString(16).padStart(6, "0");
}

export class MatchScene extends Phaser.Scene {
  private matchState!: MatchState;
  private peekState!: PeekState;
  private greenChickState!: GreenChickState;
  private claimAnimationState!: ClaimAnimationState;
  private timerText!: Phaser.GameObjects.Text;
  private p1ScoreText!: Phaser.GameObjects.Text;
  private p2ScoreText!: Phaser.GameObjects.Text;
  private p1Label!: Phaser.GameObjects.Text;
  private p2Label!: Phaser.GameObjects.Text;
  private transitioned = false;
  private p1Color: PlayerChickenColor = "blue";
  private p2Color: PlayerChickenColor = "red";

  private p1Chicken!: Phaser.Physics.Arcade.Sprite;
  private p2Chicken!: Phaser.Physics.Arcade.Sprite;
  private chickBodies: Phaser.Physics.Arcade.Sprite[] = [];
  private greenChickBody!: Phaser.Physics.Arcade.Sprite;
  private sfxScheduler: SfxScheduler = { schedule: () => {} };
  private sfxNow: () => number = () => 0;
  readonly playedSfx: MatchSfxId[] = [];
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
    if (data.p1Color) this.p1Color = data.p1Color;
    if (data.p2Color) this.p2Color = data.p2Color;
  }

  create(): void {
    const { width } = this.scale;

    this.matchState = createMatchState();
    this.peekState = createPeekState(0);
    this.greenChickState = createGreenChickState(
      this.matchState.durationMs,
      () => Math.random(),
    );
    this.claimAnimationState = createClaimAnimationState();
    this.transitioned = false;
    this.chickBodies = [];
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
    this.createInput();
    this.createOverlaps();
    this.drawBounds();

    this.peekState = tickPeekState(
      this.peekState,
      this.matchState.elapsedMs,
      FARMYARD_LAYOUT.hidingSpots.length,
      () => Math.random(),
    );
    this.greenChickState = tickGreenChickState(
      this.greenChickState,
      this.peekState,
      this.matchState.elapsedMs,
      FARMYARD_LAYOUT.hidingSpots.length,
      () => Math.random(),
    );
    this.renderChicks();
  }

  update(_time: number, delta: number): void {
    if (this.transitioned) return;

    this.handleMovement();
    this.matchState = tick(this.matchState, delta);
    this.peekState = tickPeekState(
      this.peekState,
      this.matchState.elapsedMs,
      FARMYARD_LAYOUT.hidingSpots.length,
      () => Math.random(),
    );
    const previousGreenStatus = this.greenChickState.status;
    this.greenChickState = tickGreenChickState(
      this.greenChickState,
      this.peekState,
      this.matchState.elapsedMs,
      FARMYARD_LAYOUT.hidingSpots.length,
      () => Math.random(),
    );
    if (
      previousGreenStatus !== "active" &&
      this.greenChickState.status === "active"
    ) {
      this.playSfx("greenChickAppear");
    }
    this.claimAnimationState = tickClaimAnimations(
      this.claimAnimationState,
      this.matchState.elapsedMs,
    );
    this.renderChicks();
    this.renderGreenChick();
    this.updateHUD();

    if (isMatchComplete(this.matchState)) {
      this.transitioned = true;
      this.time.delayedCall(500, () => {
        const winner = getWinner(this.matchState);
        this.scene.start("PodiumScene", {
          scores: this.matchState.scores,
          winner,
          p1Color: this.p1Color,
          p2Color: this.p2Color,
        });
      });
    }
  }

  private initAudio(): void {
    const sound = this.sound as Phaser.Sound.WebAudioSoundManager | null;
    if (!sound || !sound.context) {
      return;
    }
    this.sfxScheduler = createWebAudioScheduler(sound.context);
    this.sfxNow = () => sound.context.currentTime;
  }

  private playSfx(id: MatchSfxId): void {
    this.playedSfx.push(id);
    playSfxMoment(this.sfxScheduler, MATCH_SFX_MOMENTS[id], this.sfxNow());
  }

  private createHUD(width: number): void {
    this.add
      .text(width / 2, 30, "Farmyard Stadium", {
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.timerText = this.add
      .text(width / 2, 60, "", {
        fontSize: "22px",
        color: "#ffdd44",
      })
      .setOrigin(0.5);

    this.p1ScoreText = this.add.text(20, 10, "", {
      fontSize: "18px",
      color: hexToCssHex(getPlayerChickenHex(this.p1Color)),
    });

    this.p2ScoreText = this.add
      .text(width - 20, 10, "", {
        fontSize: "18px",
        color: hexToCssHex(getPlayerChickenHex(this.p2Color)),
      })
      .setOrigin(1, 0);

    this.updateHUD();
  }

  private createPlayers(): void {
    const gfx = this.add.graphics();

    gfx.fillStyle(getPlayerChickenHex(this.p1Color));
    gfx.fillCircle(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    gfx.generateTexture(
      playerTextureKey(1, this.p1Color),
      PLAYER_SIZE * 2,
      PLAYER_SIZE * 2,
    );

    gfx.clear();
    gfx.fillStyle(getPlayerChickenHex(this.p2Color));
    gfx.fillCircle(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    gfx.generateTexture(
      playerTextureKey(2, this.p2Color),
      PLAYER_SIZE * 2,
      PLAYER_SIZE * 2,
    );

    gfx.destroy();

    const [p1Start, p2Start] = FARMYARD_LAYOUT.playerStartPositions;

    this.p1Chicken = this.physics.add.sprite(
      p1Start.x,
      p1Start.y,
      playerTextureKey(1, this.p1Color),
    );
    this.p1Chicken.setCollideWorldBounds(true);
    this.p1Label = this.add
      .text(p1Start.x, p1Start.y + PLAYER_SIZE + 4, "P1", {
        fontSize: "14px",
        color: hexToCssHex(getPlayerChickenHex(this.p1Color)),
      })
      .setOrigin(0.5);

    this.p2Chicken = this.physics.add.sprite(
      p2Start.x,
      p2Start.y,
      playerTextureKey(2, this.p2Color),
    );
    this.p2Chicken.setCollideWorldBounds(true);
    this.p2Label = this.add
      .text(p2Start.x, p2Start.y + PLAYER_SIZE + 4, "P2", {
        fontSize: "14px",
        color: hexToCssHex(getPlayerChickenHex(this.p2Color)),
      })
      .setOrigin(0.5);
  }

  private createChicks(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(CHICK_COLOR);
    gfx.fillCircle(CHICK_SIZE, CHICK_SIZE, CHICK_SIZE);
    gfx.generateTexture("chick", CHICK_SIZE * 2, CHICK_SIZE * 2);
    gfx.clear();
    gfx.fillStyle(GREEN_CHICK_COLOR);
    gfx.fillCircle(CHICK_SIZE, CHICK_SIZE, CHICK_SIZE);
    gfx.lineStyle(2, 0x2a7a2a, 1);
    gfx.strokeCircle(CHICK_SIZE, CHICK_SIZE, CHICK_SIZE - 1);
    gfx.generateTexture("green_chick", CHICK_SIZE * 2, CHICK_SIZE * 2);
    gfx.destroy();

    for (let i = 0; i < NORMAL_PEEK_COUNT; i++) {
      const body = this.physics.add.sprite(0, 0, "chick");
      body.body.enable = false;
      body.setVisible(false);
      body.setImmovable(true);
      this.chickBodies.push(body);
    }

    this.greenChickBody = this.physics.add.sprite(0, 0, "green_chick");
    this.greenChickBody.body!.enable = false;
    this.greenChickBody.setVisible(false);
    this.greenChickBody.setImmovable(true);
  }

  private createOverlaps(): void {
    for (let slotIndex = 0; slotIndex < NORMAL_PEEK_COUNT; slotIndex++) {
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

    const slot = this.peekState.peeks[slotIndex];
    if (!slot || slot.activeSpotIndex === null) return;

    const result = attemptClaim(
      this.matchState,
      this.peekState,
      slot.activeSpotIndex,
      playerIndex,
      this.matchState.elapsedMs,
      () => Math.random(),
    );

    if (result.claimed) {
      this.matchState = result.matchState;
      this.peekState = result.peekState;
      this.claimAnimationState = startClaimAnimation(
        this.claimAnimationState,
        slotIndex,
        slot.activeSpotIndex,
        playerIndex,
        this.matchState.elapsedMs,
      );
      this.playSfx("normalClaim");
      this.updateHUD();
    }
  }

  private handleGreenChickClaim(playerIndex: 0 | 1): void {
    if (!this.greenChickBody.visible) return;
    if (this.greenChickState.activeSpotIndex === null) return;

    const result = attemptGreenChickClaim(
      this.matchState,
      this.greenChickState,
      this.greenChickState.activeSpotIndex,
      playerIndex,
      this.matchState.elapsedMs,
    );

    if (result.claimed) {
      this.matchState = result.matchState;
      this.greenChickState = result.greenChickState;
      this.playSfx("greenChickClaim");
      this.updateHUD();
    }
  }

  private createHidingSpots(): void {
    const spotGfx = this.add.graphics();

    for (const spot of FARMYARD_LAYOUT.hidingSpots) {
      switch (spot.type) {
        case "bush":
          spotGfx.fillStyle(0x3a8a3a, 1);
          spotGfx.fillCircle(spot.x, spot.y, CHICK_SIZE + 6);
          spotGfx.fillStyle(0x66cc66, 1);
          spotGfx.fillCircle(spot.x - 4, spot.y - 4, 6);
          spotGfx.fillCircle(spot.x + 6, spot.y + 2, 5);
          break;
        case "hay-bale":
          spotGfx.fillStyle(0xd9b066, 1);
          spotGfx.fillRoundedRect(spot.x - 22, spot.y - 12, 44, 24, 4);
          spotGfx.lineStyle(2, 0xa37a3a, 1);
          spotGfx.beginPath();
          spotGfx.moveTo(spot.x - 18, spot.y - 6);
          spotGfx.lineTo(spot.x + 18, spot.y - 6);
          spotGfx.moveTo(spot.x - 18, spot.y + 6);
          spotGfx.lineTo(spot.x + 18, spot.y + 6);
          spotGfx.strokePath();
          break;
        case "barrel":
          spotGfx.fillStyle(0x8a4a2a, 1);
          spotGfx.fillRoundedRect(spot.x - 14, spot.y - 18, 28, 36, 4);
          spotGfx.fillStyle(0x5a3015, 1);
          spotGfx.fillRect(spot.x - 14, spot.y - 8, 28, 4);
          spotGfx.fillRect(spot.x - 14, spot.y + 4, 28, 4);
          break;
        case "flower-pot":
          spotGfx.fillStyle(0xc04a2a, 1);
          spotGfx.beginPath();
          spotGfx.moveTo(spot.x - 14, spot.y);
          spotGfx.lineTo(spot.x + 14, spot.y);
          spotGfx.lineTo(spot.x + 10, spot.y + 16);
          spotGfx.lineTo(spot.x - 10, spot.y + 16);
          spotGfx.closePath();
          spotGfx.fillPath();
          spotGfx.fillStyle(0xffdd44, 1);
          spotGfx.fillCircle(spot.x - 6, spot.y - 4, 4);
          spotGfx.fillStyle(0xff66aa, 1);
          spotGfx.fillCircle(spot.x + 6, spot.y - 4, 4);
          spotGfx.fillStyle(0xffffff, 1);
          spotGfx.fillCircle(spot.x, spot.y - 8, 4);
          break;
        case "fence":
          spotGfx.fillStyle(0xb58864, 1);
          spotGfx.fillRect(spot.x - 20, spot.y - 2, 40, 5);
          spotGfx.fillRect(spot.x - 20, spot.y + 8, 40, 5);
          spotGfx.fillStyle(0x8a5a3a, 1);
          spotGfx.fillRect(spot.x - 18, spot.y - 16, 5, 26);
          spotGfx.fillRect(spot.x - 2, spot.y - 16, 5, 26);
          spotGfx.fillRect(spot.x + 14, spot.y - 16, 5, 26);
          break;
        case "nest-box":
          spotGfx.fillStyle(0x7a4a2a, 1);
          spotGfx.fillRect(spot.x - 16, spot.y - 4, 32, 22);
          spotGfx.fillStyle(0x4a2a1a, 1);
          spotGfx.beginPath();
          spotGfx.moveTo(spot.x - 20, spot.y - 4);
          spotGfx.lineTo(spot.x, spot.y - 22);
          spotGfx.lineTo(spot.x + 20, spot.y - 4);
          spotGfx.closePath();
          spotGfx.fillPath();
          spotGfx.fillStyle(0x2a1a0a, 1);
          spotGfx.fillCircle(spot.x, spot.y + 8, 5);
          break;
      }
    }
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

  private handleMovement(): void {
    const p1Velocity = computeMoveVelocity(
      {
        left: this.wasd.A.isDown,
        right: this.wasd.D.isDown,
        up: this.wasd.W.isDown,
        down: this.wasd.S.isDown,
      },
      MOVE_SPEED,
    );
    this.p1Chicken.setVelocity(p1Velocity.vx, p1Velocity.vy);

    const p2Velocity = computeMoveVelocity(
      {
        left: this.arrows.left.isDown,
        right: this.arrows.right.isDown,
        up: this.arrows.up.isDown,
        down: this.arrows.down.isDown,
      },
      MOVE_SPEED,
    );
    this.p2Chicken.setVelocity(p2Velocity.vx, p2Velocity.vy);
  }

  private renderChicks(): void {
    const now = this.matchState.elapsedMs;
    const activeSpots = new Set(
      getActiveNormalSpotIndices(this.peekState, now),
    );
    for (let slotIndex = 0; slotIndex < NORMAL_PEEK_COUNT; slotIndex++) {
      const body = this.chickBodies[slotIndex]!;
      const peek = this.peekState.peeks[slotIndex]!;
      const claimAnimation = getActiveClaimAnimation(
        this.claimAnimationState,
        slotIndex,
        now,
      );

      if (claimAnimation !== null) {
        const spot = FARMYARD_LAYOUT.hidingSpots[claimAnimation.spotIndex]!;
        const color = this.getPlayerColor(claimAnimation.playerIndex);
        const scale = computeClaimPopScale(claimAnimation.startedAtMs, now);
        body.setPosition(spot.x, spot.y);
        body.setTint(color);
        body.setScale(scale);
        body.body!.enable = false;
        body.setVisible(true);
      } else if (
        peek.activeSpotIndex !== null &&
        isPeekActive(peek, now) &&
        activeSpots.has(peek.activeSpotIndex)
      ) {
        const spot = FARMYARD_LAYOUT.hidingSpots[peek.activeSpotIndex]!;
        body.setPosition(spot.x, spot.y);
        body.setTint(0xffffff);
        body.setScale(1);
        body.body!.enable = true;
        body.setVisible(true);
      } else if (body.visible) {
        body.setTint(0xffffff);
        body.setScale(1);
        body.body!.enable = false;
        body.setVisible(false);
      }
    }
  }

  private renderGreenChick(): void {
    const now = this.matchState.elapsedMs;
    const activeSpot = getActiveGreenChickSpotIndex(this.greenChickState, now);

    if (activeSpot === null) {
      if (this.greenChickBody.visible) {
        this.greenChickBody.setTint(0xffffff);
        this.greenChickBody.setScale(1);
        this.greenChickBody.body!.enable = false;
        this.greenChickBody.setVisible(false);
      }
      return;
    }

    const spot = FARMYARD_LAYOUT.hidingSpots[activeSpot]!;
    this.greenChickBody.setPosition(spot.x, spot.y);
    this.greenChickBody.setTint(0xffffff);
    this.greenChickBody.setScale(1);
    this.greenChickBody.body!.enable = true;
    this.greenChickBody.setVisible(true);
  }

  private getPlayerColor(playerIndex: 0 | 1): number {
    return getPlayerChickenHex(playerIndex === 0 ? this.p1Color : this.p2Color);
  }

  private drawBounds(): void {
    const { x, y, width, height } = FARMYARD_LAYOUT.bounds;
    const border = this.add.graphics();
    border.lineStyle(2, 0x44aa44, 0.6);
    border.strokeRect(x, y, width, height);
  }

  private updateHUD(): void {
    const remaining = getRemainingMs(this.matchState);
    const seconds = (remaining / 1000).toFixed(1);
    this.timerText.setText(`Time: ${seconds}s`);

    const p1Label = getPlayerChickenColorLabel(this.p1Color);
    const p2Label = getPlayerChickenColorLabel(this.p2Color);
    this.p1ScoreText.setText(`P1 (${p1Label}): ${this.matchState.scores[0]}`);
    this.p2ScoreText.setText(`P2 (${p2Label}): ${this.matchState.scores[1]}`);
  }
}
