import Phaser from "phaser";
import {
  PLAYER_CHICKEN_COLORS,
  availableColors,
  canStartMatch,
  getPlayerChickenColorLabel,
  getPlayerChickenHex,
  type PlayerChickenColor,
  type SetupSelection,
} from "../setup/colors";

const SWATCH_X_POSITIONS = [160, 320, 480, 640] as const;
const P1_SWATCH_Y = 180;
const P2_SWATCH_Y = 290;
const START_BUTTON_Y = 380;

interface SwatchButton {
  player: 0 | 1;
  color: PlayerChickenColor;
  text: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Text;
}

export class SetupScene extends Phaser.Scene {
  private selection: SetupSelection = { p1: null, p2: null };
  private swatches: SwatchButton[] = [];
  private startButton!: Phaser.GameObjects.Text;

  constructor() {
    super("SetupScene");
  }

  create(): void {
    const { width } = this.scale;

    this.add
      .text(width / 2, 60, "Chicken Olympics", {
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 130, "Player 1", {
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 240, "Player 2", {
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.createSwatchRow(0, P1_SWATCH_Y);
    this.createSwatchRow(1, P2_SWATCH_Y);

    this.startButton = this.add
      .text(width / 2, START_BUTTON_Y, "[ Start Match ]", {
        fontSize: "24px",
        color: "#888888",
        backgroundColor: "#222233",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5);

    this.refreshSwatchState();
    this.refreshStartButton();
  }

  private createSwatchRow(player: 0 | 1, y: number): void {
    for (let i = 0; i < PLAYER_CHICKEN_COLORS.length; i++) {
      const color = PLAYER_CHICKEN_COLORS[i]!;
      const x = SWATCH_X_POSITIONS[i]!;
      const hex = getPlayerChickenHex(color);
      const label = getPlayerChickenColorLabel(color);

      const text = this.add
        .text(x, y, label, {
          fontSize: "18px",
          color: "#ffffff",
          backgroundColor: "#" + hex.toString(16).padStart(6, "0"),
          padding: { x: 16, y: 8 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const marker = this.add
        .text(x, y + 32, "", {
          fontSize: "16px",
          color: "#ffdd44",
        })
        .setOrigin(0.5);

      text.on("pointerdown", () => this.handleSwatchClick(player, color));

      this.swatches.push({ player, color, text, marker });
    }
  }

  private handleSwatchClick(player: 0 | 1, color: PlayerChickenColor): void {
    this.selection = {
      ...this.selection,
      [player === 0 ? "p1" : "p2"]: color,
    };
    this.refreshSwatchState();
    this.refreshStartButton();
  }

  private refreshSwatchState(): void {
    for (const swatch of this.swatches) {
      const playerPick =
        swatch.player === 0 ? this.selection.p1 : this.selection.p2;
      const otherPick =
        swatch.player === 0 ? this.selection.p2 : this.selection.p1;
      const allowed = availableColors(this.selection, swatch.player);
      const isAllowed = allowed.includes(swatch.color);
      const isPicked = playerPick === swatch.color;

      if (isPicked) {
        swatch.marker.setText("✓");
      } else {
        swatch.marker.setText("");
      }

      if (!isAllowed) {
        swatch.text.setAlpha(0.35);
        swatch.text.setColor("#aaaaaa");
        swatch.text.disableInteractive();
      } else {
        swatch.text.setAlpha(1);
        swatch.text.setColor("#ffffff");
        if (isPicked) {
          swatch.text.setStyle({ fontStyle: "bold" });
        } else {
          swatch.text.setStyle({ fontStyle: "normal" });
        }
        swatch.text.setInteractive({ useHandCursor: true });
      }

      void otherPick;
    }
  }

  private refreshStartButton(): void {
    if (canStartMatch(this.selection)) {
      this.startButton.setColor("#44ff44");
      this.startButton.setBackgroundColor("#333355");
      this.startButton.setInteractive({ useHandCursor: true });
      this.startButton.removeAllListeners();
      this.startButton.on("pointerover", () =>
        this.startButton.setColor("#88ff88"),
      );
      this.startButton.on("pointerout", () =>
        this.startButton.setColor("#44ff44"),
      );
      this.startButton.on("pointerdown", () => {
        this.scene.start("MatchScene", {
          p1Color: this.selection.p1,
          p2Color: this.selection.p2,
        });
      });
    } else {
      this.startButton.setColor("#888888");
      this.startButton.setBackgroundColor("#222233");
      this.startButton.disableInteractive();
      this.startButton.removeAllListeners();
    }
  }
}
