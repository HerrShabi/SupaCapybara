import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { TrainingScene } from './scenes/TrainingScene.js';
import { TwoPlayerScene } from './scenes/TwoPlayerScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { AdventureScene } from './adventure/AdventureScene.js';
import { QuestScene } from './quest/QuestScene.js';
import { StoryMapScene } from './story/StoryMapScene.js';
import { StoryCloudScene } from './story/StoryCloudScene.js';
import { StoryIntroScene } from './story/StoryIntroScene.js';
import { StoryUnderwaterScene } from './story/StoryUnderwaterScene.js';
import { StoryJungleScene } from './story/StoryJungleScene.js';
import { StoryCastleScene } from './story/StoryCastleScene.js';
import { StoryKingScene } from './story/StoryKingScene.js';
import { StoryEndingScene } from './story/StoryEndingScene.js';
import { TripBalloonScene, TripRainbowScene, TripSurfScene, TripMineScene, TripStairsScene } from './trips/TripScenes.js';
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
  scene: [TitleScene, MenuScene, World1Scene, World2Scene, World3Scene, EndingScene, TrainingScene, TwoPlayerScene, BattleScene, AdventureScene, QuestScene, StoryMapScene, StoryIntroScene, StoryCloudScene, StoryUnderwaterScene, StoryJungleScene, StoryCastleScene, StoryKingScene, StoryEndingScene, TripBalloonScene, TripRainbowScene, TripSurfScene, TripMineScene, TripStairsScene],
});

// The controller presses keys in the menus and 3D worlds. These 2D scenes read it themselves (controls.js),
// and so does any scene that sets `readsGamepad` (2-player Cube Islands).
const READS_GAMEPAD = ['World1', 'World3', 'Training', 'Battle', 'StoryCloud', 'StoryUnderwater', 'StoryJungle', 'StoryCastle', 'StoryKing', 'TripBalloon', 'TripRainbow', 'TripSurf', 'TripMine', 'TripStairs'];
startGamepadKeys(() => game.scene.getScenes(true).some((scene) => READS_GAMEPAD.includes(scene.scene.key) || scene.readsGamepad));

// Offline play: the built game registers the service worker that vite.config.js writes (not while developing).
// When a new version has been published, the new service worker takes over and the game reloads once, so
// phones and tablets show the update right away (instead of only the next time the app is opened).
// The app also checks for a new version whenever it comes back to the front.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadOldVersion = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadOldVersion || reloading) return; // the very first install: nothing to refresh
    reloading = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    });
  });
}

// Lets automated tests reach into the game while developing.
if (import.meta.env.DEV) {
  window.game = game;
  window.audio = audio;
  // window.adventure / window.world2 / window.quest are set by those scenes
}
