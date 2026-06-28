import Phaser from "phaser";
import {
  createMatchState,
  tick,
  isMatchComplete,
  getRemainingMs,
  getWinner,
  createPeekState,
  startPeek,
  isPeekActive,
  expirePeek,
  selectNextPeekSpot,
  attemptClaim,
  type MatchState,
  type PeekState,
} from "../match/rules";
import { FARMYARD_LAYOUT } from "../match/layout";
import type { PlayerChickenColor } from "../setup/colors";

const PLAYER_SIZE = 28;
const CHICK_SIZE = 16;
const CHICK_COLOR = 0xffdd44;
const MOVE_SPEED = FARMYARD_LAYOUT.playerSpeed;

const P1_DEFAULT_HEX = 0x4488ff;
const P2_DEFAULT_HEX = 0xff4444;

interface MatchSceneData {
  p1Color?: PlayerChickenColor;
  p2Color?: PlayerChickenColor;
}

export class MatchScene extends Phaser.Scene {
  private matchState!: MatchState;
  private peekState!: PeekState;
  private timerText!: Phaser.GameObjects.Text;
  private p1ScoreText!: Phaser.GameObjects.Text;
  private p2ScoreText!: Phaser.GameObjects.Text;
  private transitioned = false;
  private p1Color: PlayerChickenColor = "blue";
  private p2Color: PlayerChickenColor = "red";

  private p1Chicken!: Phaser.Physics.Arcade.Sprite;
  private p2Chicken!: Phaser.Physics.Arcade.Sprite;
  private chickBody!: Phaser.Physics.Arcade.Sprite;
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
    this.peekState = createPeekState();
    this.transitioned = false;

    this.physics.world.setBounds(
      FARMYARD_LAYOUT.bounds.x,
      FARMYARD_LAYOUT.bounds.y,
      FARMYARD_LAYOUT.bounds.width,
      FARMYARD_LAYOUT.bounds.height,
    );

    this.createHUD(width);
    this.createPlayers();
    this.createChick();
    this.createHidingSpots();
    this.createInput();
    this.createOverlaps();
    this.drawBounds();

    this.startNextPeek();
  }

  update(_time: number, delta: number): void {
    if (this.transitioned) return;

    this.handleMovement();
    this.matchState = tick(this.matchState, delta);
    this.updatePeek();
    this.updateHUD();

    if (isMatchComplete(this.matchState)) {
      this.transitioned = true;
      this.time.delayedCall(500, () => {
        const winner = getWinner(this.matchState);
        this.scene.start("PodiumScene", {
          scores: this.matchState.scores,
          winner,
        });
      });
    }
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

    this.p1ScoreText = this.add.text(20, 10, "P1 (Blue): 0", {
      fontSize: "18px",
      color: "#4488ff",
    });

    this.p2ScoreText = this.add
      .text(width - 20, 10, "P2 (Red): 0", {
        fontSize: "18px",
        color: "#ff4444",
      })
      .setOrigin(1, 0);

    this.updateHUD();
  }

  private createPlayers(): void {
    const gfx = this.add.graphics();

    gfx.fillStyle(P1_DEFAULT_HEX);
    gfx.fillCircle(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    gfx.generateTexture("p1_chicken", PLAYER_SIZE * 2, PLAYER_SIZE * 2);

    gfx.clear();
    gfx.fillStyle(P2_DEFAULT_HEX);
    gfx.fillCircle(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    gfx.generateTexture("p2_chicken", PLAYER_SIZE * 2, PLAYER_SIZE * 2);

    gfx.destroy();

    const [p1Start, p2Start] = FARMYARD_LAYOUT.playerStartPositions;

    this.p1Chicken = this.physics.add.sprite(
      p1Start.x,
      p1Start.y,
      "p1_chicken",
    );
    this.p1Chicken.setCollideWorldBounds(true);
    this.add
      .text(p1Start.x, p1Start.y + PLAYER_SIZE + 4, "P1", {
        fontSize: "14px",
        color: "#4488ff",
      })
      .setOrigin(0.5);

    this.p2Chicken = this.physics.add.sprite(
      p2Start.x,
      p2Start.y,
      "p2_chicken",
    );
    this.p2Chicken.setCollideWorldBounds(true);
    this.add
      .text(p2Start.x, p2Start.y + PLAYER_SIZE + 4, "P2", {
        fontSize: "14px",
        color: "#ff4444",
      })
      .setOrigin(0.5);
  }

  private createChick(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(CHICK_COLOR);
    gfx.fillCircle(CHICK_SIZE, CHICK_SIZE, CHICK_SIZE);
    gfx.generateTexture("chick", CHICK_SIZE * 2, CHICK_SIZE * 2);
    gfx.destroy();

    const firstSpot = FARMYARD_LAYOUT.hidingSpots[0]!;
    this.chickBody = this.physics.add.sprite(firstSpot.x, firstSpot.y, "chick");
    this.chickBody.body!.enable = false;
    this.chickBody.setVisible(false);
    this.chickBody.setImmovable(true);
  }

  private createOverlaps(): void {
    this.physics.add.overlap(this.p1Chicken, this.chickBody, () =>
      this.handleClaim(0),
    );

    this.physics.add.overlap(this.p2Chicken, this.chickBody, () =>
      this.handleClaim(1),
    );
  }

  private handleClaim(playerIndex: 0 | 1): void {
    if (!this.chickBody.visible) return;

    const now = this.matchState.elapsedMs;
    const claimResult = attemptClaim(
      this.matchState,
      this.peekState,
      playerIndex,
      now,
    );

    if (claimResult.claimed) {
      this.matchState = claimResult.matchState;
      this.peekState = claimResult.peekState;
      this.chickBody.body!.enable = false;
      this.chickBody.setVisible(false);
      this.updateHUD();

      this.time.delayedCall(500, () => {
        if (!this.transitioned && !this.chickBody.visible) {
          this.startNextPeek();
        }
      });
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
    const p1Vx =
      (this.wasd.D.isDown ? MOVE_SPEED : 0) -
      (this.wasd.A.isDown ? MOVE_SPEED : 0);
    const p1Vy =
      (this.wasd.S.isDown ? MOVE_SPEED : 0) -
      (this.wasd.W.isDown ? MOVE_SPEED : 0);
    this.p1Chicken.setVelocity(p1Vx, p1Vy);

    const p2Vx =
      (this.arrows.right.isDown ? MOVE_SPEED : 0) -
      (this.arrows.left.isDown ? MOVE_SPEED : 0);
    const p2Vy =
      (this.arrows.down.isDown ? MOVE_SPEED : 0) -
      (this.arrows.up.isDown ? MOVE_SPEED : 0);
    this.p2Chicken.setVelocity(p2Vx, p2Vy);
  }

  private startNextPeek(): void {
    const now = this.matchState.elapsedMs;
    const spotCount = FARMYARD_LAYOUT.hidingSpots.length;
    const rng = Math.random();
    const spotIndex = selectNextPeekSpot(spotCount, rng);
    this.peekState = startPeek(this.peekState, now, spotIndex);

    const spot = FARMYARD_LAYOUT.hidingSpots[spotIndex]!;
    this.chickBody.setPosition(spot.x, spot.y);
    this.chickBody.body!.enable = true;
    this.chickBody.setVisible(true);
  }

  private updatePeek(): void {
    const now = this.matchState.elapsedMs;

    if (!isPeekActive(this.peekState, now)) {
      if (this.chickBody.visible) {
        this.peekState = expirePeek(this.peekState);
        this.chickBody.body!.enable = false;
        this.chickBody.setVisible(false);

        this.time.delayedCall(500, () => {
          if (!this.transitioned && !this.chickBody.visible) {
            this.startNextPeek();
          }
        });
      }
    }
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

    this.p1ScoreText.setText(`P1 (Blue): ${this.matchState.scores[0]}`);
    this.p2ScoreText.setText(`P2 (Red): ${this.matchState.scores[1]}`);
  }
}
