import Phaser from 'phaser';
import { loadSave, writeSave, resetSave } from '../save.js';
import { t, setLanguage, getLanguage, LANGUAGES } from '../i18n.js';
import { audio } from '../audio.js';
import { createHeroTextures, heroKey } from '../art/heroes.js';
import { drawSkyline, drawBuilding } from '../art/city.js';

// The first screen: SuperCapybara flying over the night city, and the game modes.
// STORY goes to character select (MenuScene) for the 3 worlds, ADVENTURE to the big 3D map (AdventureScene),
// TRAINING to TrainingScene, 2 PLAYERS to TwoPlayerScene. ADVENTURE uses the hero picked in character select.

const FONT = 'Arial Black, Arial';
const MODES = [
  { key: 'menu.story', scene: 'Menu', color: 0x2e7d32 },
  { key: 'menu.adventure', scene: 'Adventure', color: 0x6a1b9a },
  { key: 'menu.training', scene: 'Training', color: 0x1565c0 },
  { key: 'menu.twoPlayers', scene: 'TwoPlayer', color: 0xef6c00 },
];

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.save = loadSave();
    setLanguage(this.save.language);
    audio.setMuted(this.save.muted);
    audio.playMusic('menu');
    const palette = this.save.keys.includes('world3') ? this.save.palette ?? 0 : 0;
    createHeroTextures(this, palette);

    this.createNightCity();
    this.createFlyingHero(heroKey('supa-capybara', palette));

    const logo = this.add
      .text(480, 110, 'SUPERCAPYBARA', { fontFamily: FONT, fontSize: '76px', color: '#ffd23f' })
      .setStroke('#b71c1c', 14)
      .setShadow(4, 6, '#000000', 0, true, true)
      .setOrigin(0.5);
    this.tweens.add({ targets: logo, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.selected = 0;
    this.modeButtons = MODES.map((mode, i) => this.createModeButton(mode, i));
    this.select(0);

    this.createLanguageButtons();
    this.createSoundButton();
    this.createTouchButton();
    this.createCreditsButton();
    this.createResetButton();

    this.input.keyboard.on('keydown-UP', () => this.select(this.selected - 1));
    this.input.keyboard.on('keydown-DOWN', () => this.select(this.selected + 1));
    this.input.keyboard.on('keydown-ENTER', () => this.start(MODES[this.selected]));
    this.input.keyboard.on('keydown-SPACE', () => this.start(MODES[this.selected]));
  }

  createNightCity() {
    this.cameras.main.setBackgroundColor(0x0d1b3e);
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff);
    for (let i = 0; i < 80; i++) stars.fillCircle((i * 137) % 960, (i * 89) % 330, i % 3 === 0 ? 2 : 1);
    this.add.circle(820, 90, 40, 0xfff9c4);

    const far = this.add.graphics();
    const farLights = this.add.graphics();
    drawSkyline(far, farLights, 960, 470);
    this.add.rectangle(0, 0, 960, 540, 0x0d1b3e, 0.45).setOrigin(0, 0);
    this.add.existing(farLights);

    const near = this.add.graphics();
    const nearLights = this.add.graphics();
    [[0, 180, 420], [200, 150, 470], [380, 220, 440], [630, 160, 400], [820, 140, 460]].forEach(([x, width, roofY], i) =>
      drawBuilding(near, nearLights, { x, width, roofY, bottom: 540, colorIndex: i }),
    );
  }

  // SuperCapybara flies across the sky again and again, cape flapping.
  createFlyingHero(look) {
    const hero = this.add.sprite(-120, 205, `${look}-jump`).setScale(2.4);
    this.tweens.add({ targets: hero, x: 1080, duration: 5200, repeat: -1, repeatDelay: 900 });
    this.tweens.add({ targets: hero, y: 178, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({
      delay: 70,
      loop: true,
      callback: () => {
        if (hero.x < -60 || hero.x > 1020) return;
        const streak = this.add.rectangle(hero.x - 80, hero.y + Phaser.Math.Between(-20, 20), 40, 3, 0xffffff, 0.7);
        this.tweens.add({ targets: streak, x: streak.x - 60, alpha: 0, duration: 300, onComplete: () => streak.destroy() });
      },
    });
  }

  createModeButton(mode, i) {
    const y = 262 + i * 60;
    const button = this.add
      .rectangle(480, y, 320, 50, mode.color)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.select(i))
      .on('pointerdown', () => this.start(mode));
    this.add.text(480, y, t(mode.key), { fontFamily: FONT, fontSize: '26px', color: '#ffffff' }).setStroke('#000000', 6).setOrigin(0.5);
    return button;
  }

  select(index) {
    const next = Phaser.Math.Wrap(index, 0, MODES.length);
    if (next !== this.selected) audio.play('click');
    this.selected = next;
    this.modeButtons.forEach((button, i) => button.setStrokeStyle(i === next ? 7 : 4, i === next ? 0xffd23f : 0xffffff));
  }

  start(mode) {
    audio.play('click');
    this.scene.start(mode.scene, {});
  }

  createLanguageButtons() {
    LANGUAGES.forEach((language, i) => {
      const x = 70 + i * 116;
      const selected = language.id === getLanguage();
      this.add
        .rectangle(x, 34, 106, 32, selected ? 0x2e7d32 : 0x2c2c54)
        .setStrokeStyle(3, selected ? 0xffd23f : 0x555588)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.save.language = language.id;
          writeSave(this.save);
          this.scene.restart();
        });
      this.add.text(x, 34, language.name, { fontFamily: FONT, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    });
  }

  createSoundButton() {
    this.add
      .rectangle(900, 34, 84, 32, this.save.muted ? 0x2c2c54 : 0x2e7d32)
      .setStrokeStyle(3, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.save.muted = !this.save.muted;
        writeSave(this.save);
        audio.setMuted(this.save.muted);
        this.scene.restart();
      });
    this.add.text(900, 34, t(this.save.muted ? 'menu.soundOff' : 'menu.soundOn'), { fontFamily: FONT, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
  }

  // On-screen touch buttons for iPad/iPhone, for every mode.
  createTouchButton() {
    this.add
      .rectangle(770, 34, 150, 32, this.save.touch ? 0x2e7d32 : 0x2c2c54)
      .setStrokeStyle(3, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.save.touch = !this.save.touch;
        writeSave(this.save);
        audio.play('click');
        this.scene.restart();
      });
    const label = this.add
      .text(770, 34, `📱 ${t(this.save.touch ? 'menu.touchOn' : 'menu.touchOff')}`, { fontFamily: FONT, fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5);
    label.setScale(Math.min(1, 140 / label.width));
  }

  // Watch the ending again (after you've beaten the Lava Dragon).
  createCreditsButton() {
    if (!this.save.keys.includes('world3')) return;
    this.add
      .rectangle(90, 510, 150, 34, 0x6a1b9a)
      .setStrokeStyle(3, 0xffd23f)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Ending', { replay: true }));
    this.add.text(90, 510, `🎬 ${t('menu.credits')}`, { fontFamily: FONT, fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
  }

  // Start the whole game over. The first click asks "are you sure?", the second one resets.
  createResetButton() {
    const button = this.add
      .rectangle(838, 510, 220, 34, 0x2c2c54)
      .setStrokeStyle(3, 0x555588)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(838, 510, `🔄 ${t('menu.reset')}`, { fontFamily: FONT, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    let askedAt = -Infinity;
    button.on('pointerdown', () => {
      if (this.time.now - askedAt > 4000) {
        askedAt = this.time.now;
        audio.play('error');
        button.setFillStyle(0xc62828);
        label.setText(t('menu.resetSure'));
        label.setScale(Math.min(1, 205 / label.width));
        this.time.delayedCall(4000, () => {
          if (!this.scene.isActive()) return;
          button.setFillStyle(0x2c2c54);
          label.setText(`🔄 ${t('menu.reset')}`).setScale(1);
        });
        return;
      }
      resetSave();
      audio.play('explosion');
      this.scene.restart();
    });
  }
}
