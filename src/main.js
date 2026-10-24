import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { TrainingScene } from './scenes/TrainingScene.js';
import { TwoPlayerScene } from './scenes/TwoPlayerScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { AdventureScene } from './adventure/AdventureScene.js';
import { World1Scene } from './scenes/World1Scene.js';
import { World2Scene } from './world2/World2Scene.js';
import { World3Scene } from './scenes/World3Scene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { audio } from './audio.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#8fd3ff',
  input: { gamepad: true }, // game controllers
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1400 } },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, MenuScene, World1Scene, World2Scene, World3Scene, EndingScene, TrainingScene, TwoPlayerScene, BattleScene, AdventureScene],
});

// Lets automated tests reach into the game while developing.
if (import.meta.env.DEV) {
  window.game = game;
  window.audio = audio;
  // window.adventure / window.world2 are set by those scenes
}
