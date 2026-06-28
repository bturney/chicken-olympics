import Phaser from "phaser";

export class PodiumScene extends Phaser.Scene {
  constructor() {
    super("PodiumScene");
  }

  create(data: { scores: [number, number] }): void {
    const { width, height } = this.scale;
    const [p1Score, p2Score] = data?.scores ?? [0, 0];

    this.add
      .text(width / 2, height / 3, "Podium Ceremony", {
        fontSize: "32px",
        color: "#ffd700",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 30, `Player 1 (Blue): ${p1Score}`, {
        fontSize: "20px",
        color: "#4488ff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 10, `Player 2 (Red): ${p2Score}`, {
        fontSize: "20px",
        color: "#ff4444",
      })
      .setOrigin(0.5);

    const result =
      p1Score > p2Score
        ? "Player 1 Wins!"
        : p2Score > p1Score
          ? "Player 2 Wins!"
          : "It's a Tie!";

    this.add
      .text(width / 2, height / 2 + 60, result, {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }
}
