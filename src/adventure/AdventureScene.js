import Phaser from 'phaser';
import { loadSave } from '../save.js';
import { getCharacter } from '../characters.js';
import { t, setLanguage } from '../i18n.js';
import { showTouchControls, touchButtonsFor } from '../touch.js';
import { AdventureWorld } from './AdventureWorld.js';

// ADVENTURE runs in 3D with Three.js (like World 2): this thin Phaser scene hides Phaser's canvas,
// runs AdventureWorld on top, and goes back to the title screen when you leave.
export class AdventureScene extends Phaser.Scene {
  constructor() {
    super('Adventure');
  }

  create() {
    const save = loadSave();
    setLanguage(save.language);
    this.game.canvas.style.visibility = 'hidden';
    this.world = new AdventureWorld({
      container: this.game.canvas.parentElement,
      save,
      onExit: () => {
        this.world = null;
        this.scene.start('Title');
      },
    });
    if (import.meta.env.DEV) window.adventure = this.world;
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
