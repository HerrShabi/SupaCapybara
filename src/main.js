import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { TrainingScene } from './scenes/TrainingScene.js';
import { TwoPlayerScene } from './scenes/TwoPlayerScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { AdventureScene } from './adventure/AdventureScene.js';
import { QuestScene } from './quest/QuestScene.js';
import { World1Scene } from './scenes/World1Scene.js';
import { World2Scene } from './world2/World2Scene.js';
import { World3Scene } from './scenes/World3Scene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { audio } from './audio.js';
import { startGamepadKeys } from './gamepadKeys.js';

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
  scene: [TitleScene, MenuScene, World1Scene, World2Scene, World3Scene, EndingScene, TrainingScene, TwoPlayerScene, BattleScene, AdventureScene, QuestScene],
});

// The controller presses keys in the menus and 3D worlds. These 2D scenes read it themselves (controls.js).
const READS_GAMEPAD = ['World1', 'World3', 'Training', 'Battle'];
startGamepadKeys(() => READS_GAMEPAD.some((key) => game.scene.isActive(key)));

// Lets automated tests reach into the game while developing.
if (import.meta.env.DEV) {
  window.game = game;
  window.audio = audio;
  // window.adventure / window.world2 / window.quest are set by those scenes
}
