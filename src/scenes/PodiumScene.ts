import Phaser from "phaser";

interface PodiumData {
  scores: [number, number];
  winner: 0 | 1 | null;
}

export class PodiumScene extends Phaser.Scene {
  constructor() {
    super("PodiumScene");
  }

  create(data: PodiumData): void {
    const { width, height } = this.scale;
    const [p1Score, p2Score] = data?.scores ?? [0, 0];
    const winner = data?.winner ?? null;

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

    let result: string;
    if (winner === 0) {
      result = "Player 1 Wins!";
    } else if (winner === 1) {
      result = "Player 2 Wins!";
    } else {
      result = "It's a Tie!";
    }

    this.add
      .text(width / 2, height / 2 + 60, result, {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }
}
