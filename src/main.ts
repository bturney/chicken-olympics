import Phaser from "phaser";
import { SetupScene } from "./scenes/SetupScene";
import { MatchScene } from "./scenes/MatchScene";
import { PodiumScene } from "./scenes/PodiumScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1600,
  height: 1200,
  parent: "game-container",
  backgroundColor: "#16213e",
  render: {
    antialias: true,
    roundPixels: true,
  },
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
    // Never display the canvas larger than its 1600x1200 backing store. FIT
    // otherwise stretches it to fill the window, stacking a fractional upscale
    // on top of the device pixel ratio, which reads as blur. Capping the
    // displayed size keeps on-screen scaling to a clean multiple of native.
    max: { width: 1600, height: 1200 },
  },
};

const game = new Phaser.Game(config);

declare global {
  interface Window {
    __CHICKEN_OLYMPICS__?: Phaser.Game;
  }
}

window.__CHICKEN_OLYMPICS__ = game;
