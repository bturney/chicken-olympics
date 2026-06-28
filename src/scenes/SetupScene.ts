import Phaser from "phaser";

export class SetupScene extends Phaser.Scene {
  constructor() {
    super("SetupScene");
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 3, "Chicken Olympics", {
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 30, "Player 1: Blue Chicken", {
        fontSize: "20px",
        color: "#4488ff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 10, "Player 2: Red Chicken", {
        fontSize: "20px",
        color: "#ff4444",
      })
      .setOrigin(0.5);

    const startButton = this.add
      .text(width / 2, height / 2 + 80, "[ Start Match ]", {
        fontSize: "24px",
        color: "#44ff44",
        backgroundColor: "#333355",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerover", () => startButton.setColor("#88ff88"));
    startButton.on("pointerout", () => startButton.setColor("#44ff44"));
    startButton.on("pointerdown", () => {
      this.scene.start("MatchScene");
    });
  }
}
