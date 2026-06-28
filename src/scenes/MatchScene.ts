import Phaser from "phaser";

export class MatchScene extends Phaser.Scene {
  constructor() {
    super("MatchScene");
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 30, "Farmyard Stadium", {
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, "Match in progress...", {
        fontSize: "20px",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    const endButton = this.add
      .text(width / 2, height - 60, "[ End Match (placeholder) ]", {
        fontSize: "18px",
        color: "#ffaa44",
        backgroundColor: "#333355",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    endButton.on("pointerdown", () => {
      this.scene.start("PodiumScene", { scores: [0, 0] });
    });
  }
}
