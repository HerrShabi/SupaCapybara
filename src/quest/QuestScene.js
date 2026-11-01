import Phaser from 'phaser';
import { loadSave } from '../save.js';
import { getCharacter } from '../characters.js';
import { t, setLanguage } from '../i18n.js';
import { showTouchControls, touchButtonsFor } from '../touch.js';
import { QuestWorld } from './QuestWorld.js';

// CUBE ISLANDS (the secret world from World 1's portal) runs in 3D with Three.js: this thin Phaser scene hides Phaser's canvas,
// runs QuestWorld on top, and goes back to the menu when you leave.
export class QuestScene extends Phaser.Scene {
  constructor() {
    super('Quest');
  }

  // team: { heroes: [hero1, hero2] } for 2 players (from World 1 in 2 PLAYERS TEAM mode): split screen.
  create(data = {}) {
    const save = loadSave();
    setLanguage(save.language);
    const team = data.team ?? null;
    this.readsGamepad = Boolean(team); // each player's controller is read by QuestWorld, not turned into keys
    this.game.canvas.style.visibility = 'hidden';
    this.world = new QuestWorld({
      container: this.game.canvas.parentElement,
      save,
      team,
      onExit: () => {
        this.world = null;
        this.scene.start(team ? 'Title' : 'Menu');
      },
    });
    if (import.meta.env.DEV) window.quest = this.world;
    const touch = save.touch && !team
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
