import Phaser from 'phaser';
import { loadSave } from '../save.js';
import { getCharacter } from '../characters.js';
import { t, setLanguage } from '../i18n.js';
import { showTouchControls, touchButtonsFor } from '../touch.js';
import { StoryMapWorld } from './StoryMapWorld.js';
import { STORY_START_HERO, storyProgress } from './story.js';

// THE BAD GUY KING's map runs in 3D (like ADVENTURE): this thin Phaser scene hides Phaser's canvas and runs
// StoryMapWorld on top. The first time, the King's opening movie (StoryIntroScene) plays first.
export class StoryMapScene extends Phaser.Scene {
  constructor() {
    super('Story');
  }

  create() {
    const save = loadSave();
    if (!storyProgress(save).introSeen) {
      this.scene.start('StoryIntro'); // the King's opening movie, the first time
      return;
    }
    setLanguage(save.language);
    this.game.canvas.style.visibility = 'hidden';
    this.world = new StoryMapWorld({
      container: this.game.canvas.parentElement,
      save,
      onExit: (next, data) => {
        this.world = null;
        this.scene.start(next ?? 'Title', data);
      },
    });
    if (import.meta.env.DEV) window.story = this.world;
    const touch = save.touch
      ? showTouchControls(this.game.canvas.parentElement, touchButtonsFor(getCharacter(STORY_START_HERO), save.powerUps, true), { jump: t('touch.jump') })
      : null;

    this.events.once('shutdown', () => {
      touch?.destroy();
      this.world?.destroy();
      this.world = null;
      this.game.canvas.style.visibility = '';
    });
  }
}
