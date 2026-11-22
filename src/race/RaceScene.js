import Phaser from 'phaser';
import { loadSave } from '../save.js';
import { t, setLanguage } from '../i18n.js';
import { showTouchControls } from '../touch.js';
import { RaceWorld } from './RaceWorld.js';

// CAPY CIRCUIT (the 🏁 button on the title screen) runs in 3D with Three.js, like ADVENTURE: this thin Phaser
// scene hides Phaser's canvas and runs RaceWorld on top. RACE AGAIN restarts the scene; BACK goes to the title.
export class RaceScene extends Phaser.Scene {
  constructor() {
    super('Race');
  }

  // data.again: RACE AGAIN (straight to the laps, no garage)
  create(data = {}) {
    const save = loadSave();
    setLanguage(save.language);
    this.game.canvas.style.visibility = 'hidden';
    const container = this.game.canvas.parentElement;
    let touch = null;
    this.world = new RaceWorld({
      container,
      save,
      autoGas: Boolean(save.touch),
      skipGarage: Boolean(data.again),
      // Touch buttons come after the garage (its boxes are tapped): steer with the joystick (down = brake),
      // the car goes by itself; 📯 honks, 🚀 = the rocket spoiler
      onCarReady: (car) => {
        if (save.touch) touch = showTouchControls(container, { left: true, right: true, down: true, attack: '📯', rocket: car.spoiler === 'rocket' }, { jump: t('race.gas') });
      },
      onExit: (again) => {
        this.world = null;
        if (again) this.scene.restart({ again: true });
        else this.scene.start('Title');
      },
    });
    if (import.meta.env.DEV) window.race = this.world;

    this.events.once('shutdown', () => {
      touch?.destroy();
      this.world?.destroy();
      this.world = null;
      this.game.canvas.style.visibility = '';
    });
  }
}
