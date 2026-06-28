import Phaser from "phaser";
import {
  createMatchState,
  tick,
  getWinner,
  DEFAULT_MATCH_DURATION_MS,
  type MatchState,
} from "../match/rules";

export class MatchScene extends Phaser.Scene {
  private matchState!: MatchState;
  private timerText!: Phaser.GameObjects.Text;
  private p1ScoreText!: Phaser.GameObjects.Text;
  private p2ScoreText!: Phaser.GameObjects.Text;
  private transitioned = false;

  constructor() {
    super("MatchScene");
  }

  create(): void {
    const { width } = this.scale;

    this.matchState = createMatchState();
    this.transitioned = false;

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

  update(_time: number, delta: number): void {
    if (this.transitioned) return;

    this.matchState = tick(this.matchState, delta);
    this.updateHUD();

    if (this.matchState.isComplete) {
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

  private updateHUD(): void {
    const remaining = Math.max(
      0,
      DEFAULT_MATCH_DURATION_MS - this.matchState.elapsedMs,
    );
    const seconds = (remaining / 1000).toFixed(1);
    this.timerText.setText(`Time: ${seconds}s`);

    this.p1ScoreText.setText(`P1 (Blue): ${this.matchState.scores[0]}`);
    this.p2ScoreText.setText(`P2 (Red): ${this.matchState.scores[1]}`);
  }
}
