import Phaser from "phaser";
import {
  createClaimAnimationState,
  startClaimAnimation,
  getActiveClaimAnimation,
  tickClaimAnimations,
  computeClaimPopScale,
  type ClaimAnimationState,
  NORMAL_PEEK_COUNT,
} from "../match/rules";
import { Match, type MatchEvent } from "../match/match";
import { FARMYARD_LAYOUT, WORLD_SCALE } from "../match/layout";
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

const PLAYER_SIZE = 28 * WORLD_SCALE;
const CHICK_SIZE = 16 * WORLD_SCALE;
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
  private match!: Match;
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

    this.match = new Match({
      spotCount: FARMYARD_LAYOUT.hidingSpots.length,
      random: () => Math.random(),
    });
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

    this.handleMatchEvents(this.match.advance(0));
    this.renderChicks();
    this.renderGreenChick();
  }

  update(_time: number, delta: number): void {
    if (this.transitioned) return;

    this.handleMovement();
    this.handleMatchEvents(this.match.advance(delta));
    this.claimAnimationState = tickClaimAnimations(
      this.claimAnimationState,
      this.match.view().elapsedMs,
    );
    this.renderChicks();
    this.renderGreenChick();
    this.updateHUD();

    if (this.match.view().complete) {
      this.transitioned = true;
      this.time.delayedCall(500, () => {
        const view = this.match.view();
        this.scene.start("PodiumScene", {
          scores: view.scores,
          winner: view.winner,
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

  private handleMatchEvents(events: MatchEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case "normalChickClaimed":
          this.claimAnimationState = startClaimAnimation(
            this.claimAnimationState,
            event.slotIndex,
            event.spotIndex,
            event.playerIndex,
            this.match.view().elapsedMs,
          );
          this.playSfx("normalClaim");
          break;
        case "greenChickAppeared":
          this.playSfx("greenChickAppear");
          break;
        case "greenChickClaimed":
          this.playSfx("greenChickClaim");
          break;
        case "greenChickMissed":
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
      color: hexToCssHex(getPlayerChickenHex(this.p1Color)),
    });

    this.p2ScoreText = this.add
      .text(width - 20 * WORLD_SCALE, 10 * WORLD_SCALE, "", {
        fontSize: `${18 * WORLD_SCALE}px`,
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
      .text(p1Start.x, p1Start.y + PLAYER_SIZE + 4 * WORLD_SCALE, "P1", {
        fontSize: `${14 * WORLD_SCALE}px`,
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
      .text(p2Start.x, p2Start.y + PLAYER_SIZE + 4 * WORLD_SCALE, "P2", {
        fontSize: `${14 * WORLD_SCALE}px`,
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

    const chick = this.match
      .view()
      .normalChicks.find((visible) => visible.slotIndex === slotIndex);
    if (!chick) return;

    this.handleMatchEvents(this.match.claim(chick.spotIndex, playerIndex));
    this.updateHUD();
  }

  private handleGreenChickClaim(playerIndex: 0 | 1): void {
    if (!this.greenChickBody.visible) return;
    const greenChick = this.match.view().greenChick;
    if (!greenChick) return;

    this.handleMatchEvents(this.match.claim(greenChick.spotIndex, playerIndex));
    this.updateHUD();
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
    const view = this.match.view();
    for (let slotIndex = 0; slotIndex < NORMAL_PEEK_COUNT; slotIndex++) {
      const body = this.chickBodies[slotIndex]!;
      const visibleChick = view.normalChicks.find(
        (chick) => chick.slotIndex === slotIndex,
      );
      const claimAnimation = getActiveClaimAnimation(
        this.claimAnimationState,
        slotIndex,
        view.elapsedMs,
      );

      if (claimAnimation !== null) {
        const spot = FARMYARD_LAYOUT.hidingSpots[claimAnimation.spotIndex]!;
        const color = this.getPlayerColor(claimAnimation.playerIndex);
        const scale = computeClaimPopScale(
          claimAnimation.startedAtMs,
          view.elapsedMs,
        );
        body.setPosition(spot.x, spot.y);
        body.setTint(color);
        body.setScale(scale);
        body.body!.enable = false;
        body.setVisible(true);
      } else if (visibleChick) {
        const spot = FARMYARD_LAYOUT.hidingSpots[visibleChick.spotIndex]!;
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
    const activeSpot = this.match.view().greenChick?.spotIndex ?? null;

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
    const view = this.match.view();
    const remaining = view.remainingMs;
    const seconds = (remaining / 1000).toFixed(1);
    this.timerText.setText(`Time: ${seconds}s`);

    const p1Label = getPlayerChickenColorLabel(this.p1Color);
    const p2Label = getPlayerChickenColorLabel(this.p2Color);
    this.p1ScoreText.setText(`P1 (${p1Label}): ${view.scores[0]}`);
    this.p2ScoreText.setText(`P2 (${p2Label}): ${view.scores[1]}`);
  }
}
