import Phaser from 'phaser';
import { loadSave, activePowerUps } from '../save.js';
import { SpaceWorld } from './SpaceWorld.js';
import { getCharacter } from '../characters.js';
import { t, setLanguage } from '../i18n.js';
import { showTouchControls, touchButtonsFor } from '../touch.js';
import { createHeroTextures, heroKey } from '../art/heroes.js';
import { heroPicture } from '../disco.js';
import { megaBeamCount, megaBeamOn } from '../megaBeam.js';

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
    // Pictures for the secret capybara disco (an HTML party, see disco.js)
    const palette = save.keys.includes('world3') ? save.palette ?? 0 : 0;
    createHeroTextures(this, palette);
    const discoPictures = {
      hero: heroPicture(this.textures, `${heroKey(save.selected, palette)}-idle`),
      capybara: heroPicture(this.textures, `${heroKey('supa-capybara', 0)}-idle`),
    };
    this.world = new SpaceWorld({
      container: this.game.canvas.parentElement,
      save,
      discoPictures,
      onExit: (next) => {
        this.world = null;
        // After Grape Boss, the rocket crash-lands in World 3
        if (next) this.scene.start(next, { crash: true });
        else this.scene.start('Menu');
      },
    });
    if (import.meta.env.DEV) window.world2 = this.world;
    const touch = save.touch
      ? showTouchControls(this.game.canvas.parentElement, { ...touchButtonsFor(getCharacter(save.selected), activePowerUps(save), true), mega: megaBeamCount(save) > 0 && megaBeamOn(save) }, { jump: t('touch.jump') })
      : null;

    this.events.once('shutdown', () => {
      touch?.destroy();
      this.world?.destroy();
      this.world = null;
      this.game.canvas.style.visibility = '';
    });
  }
}
