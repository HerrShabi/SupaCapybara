import Phaser from 'phaser';
import { loadSave } from '../save.js';
import { SpaceWorld } from './SpaceWorld.js';
import { getCharacter } from '../characters.js';
import { t, setLanguage } from '../i18n.js';
import { showTouchControls, touchButtonsFor } from '../touch.js';

// World 2 is drawn in 3D with Three.js instead of Phaser. This scene hides Phaser's canvas,
// runs the 3D world on top, and goes back to the menu when you leave.
export class World2Scene extends Phaser.Scene {
  constructor() {
    super('World2');
  }

  create() {
    const save = loadSave();
    setLanguage(save.language);
    this.game.canvas.style.visibility = 'hidden';
    this.world = new SpaceWorld({
      container: this.game.canvas.parentElement,
      save,
      onExit: () => {
        this.world = null;
        this.scene.start('Menu');
      },
    });
    if (import.meta.env.DEV) window.world2 = this.world;
    const touch = save.touch
      ? showTouchControls(this.game.canvas.parentElement, touchButtonsFor(getCharacter(save.selected), save.powerUps, true), { jump: t('touch.jump') })
      : null;

    this.events.once('shutdown', () => {
      touch?.destroy();
      this.world?.destroy();
      this.world = null;
      this.game.canvas.style.visibility = '';
    });
  }
}
