import Phaser from 'phaser';
import { CHARACTERS } from '../characters.js';
import { loadSave, writeSave } from '../save.js';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { createHeroTextures } from '../art/heroes.js';

// After beating the Lava Dragon: fireworks, all the heroes dancing, the credits ("a game by ETHAN"),
// and the secrets you just unlocked. Then back to the menu.

const FONT = 'Arial Black, Arial';
const CREDITS_MS = 16000;

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  // replay: watching again from the 🎬 CREDITS button on the title screen.
  create(data = {}) {
    this.replay = Boolean(data.replay);
    const save = loadSave();
    setLanguage(save.language);
    if (!save.owned.includes('golden-capybara')) save.owned.push('golden-capybara');
    writeSave(save);
    createHeroTextures(this);
    audio.playMusic('menu');

    this.cameras.main.setBackgroundColor(0x0b0b2b);
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.firework() });
    this.dancingHeroes();

    const title = this.add
      .text(480, 150, t('ending.youWin'), { fontFamily: FONT, fontSize: '64px', color: '#ffd23f' })
      .setStroke('#000000', 10)
      .setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.1, duration: 500, yoyo: true, repeat: 5 });
    this.time.delayedCall(5000, () => {
      title.destroy();
      this.rollCredits();
    });

    this.input.keyboard.on('keydown-ENTER', () => this.finish());
    this.input.keyboard.on('keydown-ESC', () => this.finish());
  }

  firework() {
    const x = Phaser.Math.Between(100, 860);
    const y = Phaser.Math.Between(60, 300);
    const color = Phaser.Math.RND.pick([0xff1744, 0xffd23f, 0x00e5ff, 0x76ff03, 0xd500f9, 0xff9100]);
    audio.play('firework');
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const spark = this.add.circle(x, y, 4, color);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 90,
        y: y + Math.sin(angle) * 90 + 20,
        alpha: 0,
        duration: 900,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  // Every hero in a row, running in place and hopping.
  dancingHeroes() {
    const heroes = CHARACTERS.map((c) => c.id);
    heroes.forEach((id, i) => {
      const x = 480 + (i - (heroes.length - 1) / 2) * 130;
      const hero = this.add.sprite(x, 460, `${id}-idle`).setScale(2).play(`${id}-run`);
      this.tweens.add({ targets: hero, y: 420, duration: 300, yoyo: true, repeat: -1, delay: i * 120, ease: 'Sine.easeOut' });
      this.time.addEvent({ delay: 1200, loop: true, callback: () => hero.setFlipX(!hero.flipX) });
    });
  }

  rollCredits() {
    const lines = [
      ['SUPERCAPYBARA', 48, '#ffd23f'],
      ['', 20],
      [t('ending.gameBy'), 40, '#ffffff'],
      ['', 20],
      [t('ending.ideas'), 24, '#b9f6ca'],
      [t('ending.help'), 24, '#b9f6ca'],
      [t('ending.code'), 24, '#b9f6ca'],
      ['', 20],
      [t('ending.heroes'), 22, '#ffd23f'],
      ...CHARACTERS.map((c) => [t(`name.${c.id}`), 22, '#ffffff']),
      ['', 20],
      [t('ending.bosses'), 22, '#ffd23f'],
      [t('boss.world1'), 22, '#ffffff'],
      [t('boss.world2'), 22, '#ffffff'],
      [t('boss.world3'), 22, '#ffffff'],
      ['', 30],
      [t('ending.thanks'), 32, '#ffd23f'],
    ];
    const credits = this.add.container(480, 560);
    let y = 0;
    for (const [text, size, color = '#ffffff'] of lines) {
      if (text) {
        credits.add(this.add.text(0, y, text, { fontFamily: FONT, fontSize: `${size}px`, color }).setStroke('#000000', 6).setOrigin(0.5, 0));
      }
      y += size + 14;
    }
    this.tweens.add({ targets: credits, y: -y, duration: CREDITS_MS, onComplete: () => this.showSecrets() });
  }

  showSecrets() {
    const lines = [t('ending.secrets'), '', `🌟 ${t('name.golden-capybara')}`, `🥊 ${t('menu.bossRush')}`, `🎨 ${t('ending.colors')}`];
    this.add
      .text(480, 220, lines.join('\n'), { fontFamily: FONT, fontSize: '34px', color: '#ffd23f', align: 'center' })
      .setStroke('#000000', 8)
      .setOrigin(0.5);
    audio.play('win');
    this.time.delayedCall(6000, () => this.finish());
  }

  finish() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(this.replay ? 'Title' : 'Menu');
  }
}
