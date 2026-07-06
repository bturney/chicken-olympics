import Phaser from "phaser";
import {
  PLAYER_CHICKEN_COLORS,
  availableColors,
  canStartMatch,
  getPlayerChickenColorLabel,
  getPlayerChickenCssHex,
  type PlayerChickenColor,
  type SetupSelection,
} from "../setup/colors";
import { SETUP_SCENE_LAYOUT, WORLD_SCALE } from "../match/layout";
import { type PlayerSlotCount } from "../match/rules";

const SWATCH_X_POSITIONS = SETUP_SCENE_LAYOUT.SWATCH_X_POSITIONS.map(
  (x) => x * WORLD_SCALE,
);
const P1_SWATCH_Y = SETUP_SCENE_LAYOUT.P1_SWATCH_Y * WORLD_SCALE;
const P2_SWATCH_Y = SETUP_SCENE_LAYOUT.P2_SWATCH_Y * WORLD_SCALE;
const START_BUTTON_Y = SETUP_SCENE_LAYOUT.START_BUTTON_Y * WORLD_SCALE;
const P2_TOGGLE_Y = SETUP_SCENE_LAYOUT.P2_TOGGLE_Y * WORLD_SCALE;
const HELP_BUTTON_Y = SETUP_SCENE_LAYOUT.HELP_BUTTON_Y * WORLD_SCALE;
const CONTROL_STRIP_Y = SETUP_SCENE_LAYOUT.CONTROL_STRIP_Y * WORLD_SCALE;

interface SwatchButton {
  player: 0 | 1;
  color: PlayerChickenColor;
  text: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Text;
}

interface MatchSceneData {
  p1Color?: PlayerChickenColor;
  p2Color?: PlayerChickenColor;
  playerSlotCount?: PlayerSlotCount;
  botSlots?: number[];
}

export class SetupScene extends Phaser.Scene {
  private selection: SetupSelection = { p1: null, p2: null };
  private swatches: SwatchButton[] = [];
  private startButton!: Phaser.GameObjects.Text;
  private p2Toggle!: Phaser.GameObjects.Text;
  private p2IsBot = false;
  private p2BotColor = "green";
  private helpOverlayElements: { setVisible(v: boolean): void }[] = [];

  constructor() {
    super("SetupScene");
  }

  create(): void {
    this.selection = { p1: null, p2: null };
    this.swatches = [];
    this.p2IsBot = false;
    this.p2BotColor = "green";

    const { width } = this.scale;

    this.add
      .text(width / 2, 60 * WORLD_SCALE, "Chicken Olympics", {
        fontSize: `${36 * WORLD_SCALE}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, SETUP_SCENE_LAYOUT.P1_LABEL_Y * WORLD_SCALE, "Player 1", {
        fontSize: `${20 * WORLD_SCALE}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, SETUP_SCENE_LAYOUT.P2_LABEL_Y * WORLD_SCALE, "Player 2", {
        fontSize: `${20 * WORLD_SCALE}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.createSwatchRow(0, P1_SWATCH_Y);
    this.createSwatchRow(1, P2_SWATCH_Y);

    this.p2Toggle = this.add
      .text(width / 2, P2_TOGGLE_Y, "[ Player 2: Human ]", {
        fontSize: `${16 * WORLD_SCALE}px`,
        color: "#ffdd44",
        backgroundColor: "#333355",
        padding: { x: 12 * WORLD_SCALE, y: 6 * WORLD_SCALE },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.p2Toggle.on("pointerdown", () => this.toggleP2Mode());
    this.p2Toggle.on("pointerover", () => this.p2Toggle.setColor("#ffffff"));
    this.p2Toggle.on("pointerout", () => this.p2Toggle.setColor("#ffdd44"));

    this.startButton = this.add
      .text(width / 2, START_BUTTON_Y, "[ Start Match ]", {
        fontSize: `${24 * WORLD_SCALE}px`,
        color: "#888888",
        backgroundColor: "#222233",
        padding: { x: 20 * WORLD_SCALE, y: 10 * WORLD_SCALE },
      })
      .setOrigin(0.5);

    const { height } = this.scale;

    const controlStripText = "P1: WASD  |  P2: Arrows  |  Claim chicks to score!";
    const controlFontSize = 13 * WORLD_SCALE;
    const controlPaddingX = 16 * WORLD_SCALE;
    const controlPaddingY = 8 * WORLD_SCALE;

    this.add
      .text(width / 2, CONTROL_STRIP_Y, controlStripText, {
        fontSize: `${controlFontSize}px`,
        color: "#ccccdd",
        backgroundColor: "#0a0a1e",
        padding: { x: controlPaddingX, y: controlPaddingY },
      })
      .setOrigin(0.5);

    const helpButton = this.add
      .text(width - 12 * WORLD_SCALE, HELP_BUTTON_Y, "[ ? How to Play ]", {
        fontSize: `${16 * WORLD_SCALE}px`,
        color: "#ffdd44",
        backgroundColor: "#333355",
        padding: { x: 10 * WORLD_SCALE, y: 6 * WORLD_SCALE },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    helpButton.on("pointerover", () => helpButton.setColor("#ffffff"));
    helpButton.on("pointerout", () => helpButton.setColor("#ffdd44"));
    helpButton.on("pointerdown", () => this.showHelpOverlay());

    void height;

    this.createHelpOverlay();

    this.refreshSwatchState();
    this.refreshStartButton();
  }

  private toggleP2Mode(): void {
    this.p2IsBot = !this.p2IsBot;
    if (this.p2IsBot) {
      this.p2Toggle.setText("[ Player 2: Bot Chicken ]");
      this.selection = { ...this.selection, p2: null };
    } else {
      this.p2Toggle.setText("[ Player 2: Human ]");
    }
    this.refreshSwatchState();
    this.refreshStartButton();
  }

  private createSwatchRow(player: 0 | 1, y: number): void {
    for (let i = 0; i < PLAYER_CHICKEN_COLORS.length; i++) {
      const color = PLAYER_CHICKEN_COLORS[i]!;
      const x = SWATCH_X_POSITIONS[i]!;
      const label = getPlayerChickenColorLabel(color);

      const text = this.add
        .text(x, y, label, {
          fontSize: `${18 * WORLD_SCALE}px`,
          color: "#ffffff",
          backgroundColor: getPlayerChickenCssHex(color),
          padding: { x: 16 * WORLD_SCALE, y: 8 * WORLD_SCALE },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const marker = this.add
        .text(x, y + 32 * WORLD_SCALE, "", {
          fontSize: `${16 * WORLD_SCALE}px`,
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

      if (swatch.player === 1 && this.p2IsBot) {
        swatch.text.setAlpha(0.35);
        swatch.text.setColor("#aaaaaa");
        swatch.text.disableInteractive();
        swatch.marker.setText("🤖");
        continue;
      }

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
        const botSlots = this.p2IsBot ? [1] : [];
        const sceneData: MatchSceneData = {
          p1Color: this.selection.p1 ?? undefined,
          p2Color: this.p2IsBot ? undefined : (this.selection.p2 ?? undefined),
          playerSlotCount: 2,
          botSlots,
        };
        this.scene.start("MatchScene", sceneData);
      });
    } else {
      this.startButton.setColor("#888888");
      this.startButton.setBackgroundColor("#222233");
      this.startButton.disableInteractive();
      this.startButton.removeAllListeners();
    }
  }

  private createHelpOverlay(): void {
    const { width, height } = this.scale;
    const depth = 50;
    const elements = this.helpOverlayElements;

    const bg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.88)
      .setDepth(depth)
      .setVisible(false)
      .setInteractive({ useHandCursor: false });
    bg.on("pointerdown", () => this.hideHelpOverlay());
    elements.push(bg);

    const title = this.add
      .text(width / 2, 70 * WORLD_SCALE, "HOW TO PLAY", {
        fontSize: `${28 * WORLD_SCALE}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setVisible(false);
    elements.push(title);

    const lines = [
      { text: "Controls", y: 140, fontSize: 20 },
      { text: "Player 1: WASD keys", y: 170, fontSize: 15 },
      { text: "Player 2: Arrow keys", y: 195, fontSize: 15 },
      { text: "Goal", y: 245, fontSize: 20 },
      {
        text: "Claim the most chicks before time runs out.",
        y: 275,
        fontSize: 15,
      },
      { text: "Claiming", y: 325, fontSize: 20 },
      {
        text: "Move your chicken over a peeking yellow chick",
        y: 355,
        fontSize: 15,
      },
      {
        text: "to claim it. Each claim is worth 1 point.",
        y: 380,
        fontSize: 15,
      },
      { text: "Green Chick", y: 430, fontSize: 20 },
      {
        text: "A rare green chick appears once per match.",
        y: 460,
        fontSize: 15,
      },
      { text: "Claim it for 5 points.", y: 485, fontSize: 15 },
      { text: "Match Timer", y: 510, fontSize: 20 },
      {
        text: "90 seconds. Highest score when time runs out wins.",
        y: 535,
        fontSize: 15,
      },
    ];

    for (const line of lines) {
      const t = this.add
        .text(width / 2, line.y * WORLD_SCALE, line.text, {
          fontSize: `${line.fontSize * WORLD_SCALE}px`,
          color: line.fontSize >= 20 ? "#dddddd" : "#9999aa",
        })
        .setOrigin(0.5)
        .setDepth(depth + 1)
        .setVisible(false);
      elements.push(t);
    }

    const gotIt = this.add
      .text(width / 2, 575 * WORLD_SCALE, "[ Got it ]", {
        fontSize: `${20 * WORLD_SCALE}px`,
        color: "#44ff44",
        backgroundColor: "#333355",
        padding: { x: 16 * WORLD_SCALE, y: 8 * WORLD_SCALE },
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    gotIt.on("pointerover", () => gotIt.setColor("#88ff88"));
    gotIt.on("pointerout", () => gotIt.setColor("#44ff44"));
    gotIt.on("pointerdown", () => this.hideHelpOverlay());

    elements.push(gotIt);
  }

  private showHelpOverlay(): void {
    for (const el of this.helpOverlayElements) {
      el.setVisible(true);
    }
  }

  private hideHelpOverlay(): void {
    for (const el of this.helpOverlayElements) {
      el.setVisible(false);
    }
  }
}
