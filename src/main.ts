import Phaser from "phaser";
import { SetupScene } from "./scenes/SetupScene";
import { MatchScene } from "./scenes/MatchScene";
import { PodiumScene } from "./scenes/PodiumScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#16213e",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [SetupScene, MatchScene, PodiumScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

declare global {
  interface Window {
    __CHICKEN_OLYMPICS__?: Phaser.Game;
  }
}

window.__CHICKEN_OLYMPICS__ = game;
