import Phaser from 'phaser';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { loadSave, writeSave } from '../save.js';
import { createHeroTextures, heroKey } from '../art/heroes.js';
import { drawSkyline, drawBuilding } from '../art/city.js';
import { createCrocKingTexture } from '../art/crocKing.js';
import { drawComicBubble } from '../comicBubble.js';
import { storyProgress } from './story.js';

// THE BAD GUY KING's opening movie (plays the first time you start the story; SPACE / ENTER / ESC skips).
// A sunny day with all the heroes. The crocodile Bad Guy King flies in on his throne and zaps everyone
// into gold trophies, except SuperCapybara, who jumps out of the way. He flies off with the trophies,
// and SuperCapybara promises to save them all. Then the story map starts.

const GROUND = 440;
// Who stands in a row (x), and who gets turned into a trophy
const CAST = [
  { id: 'supa-capybara', x: 170 },
  { id: 'supa-cat', x: 290, trophy: true },
  { id: 'supa-chameleon', x: 400, trophy: true },
  { id: 'ultra-capybara', x: 510, trophy: true },
  { id: 'baby', x: 600, trophy: true }, // Baby Capybara
];
const KING_SPOT = { x: 780, y: 190 };
const GOLD = 0xffd54f;

export class StoryIntroScene extends Phaser.Scene {
  constructor() {
    super('StoryIntro');
  }

  create() {
    this.save = loadSave();
    setLanguage(this.save.language);
    audio.setMuted(this.save.muted);
    createHeroTextures(this, 0);
    createCrocKingTexture(this);
    this.done = false;
    this.bubble = [];

    this.createCity();
    this.heroes = CAST.map((who) => {
      const baby = who.id === 'baby';
      const look = heroKey(baby ? 'supa-capybara' : who.id, 0);
      const scale = baby ? 0.8 : 1.5;
      const sprite = this.add.sprite(who.x, GROUND - 24 * scale, `${look}-idle`).setScale(scale).setDepth(2);
      return { ...who, look, sprite };
    });
    this.hero = this.heroes[0].sprite;
    this.king = this.add.image(1150, KING_SPOT.y, 'croc-king').setDepth(3);

    this.add
      .text(944, 524, t('story.skip'), { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' })
      .setStroke('#000000', 3)
      .setOrigin(1, 1)
      .setDepth(20);
    for (const key of ['SPACE', 'ENTER', 'ESC']) this.input.keyboard.on(`keydown-${key}`, () => this.finish());
    this.input.on('pointerdown', () => this.finish());

    audio.playMusic('menu');
    this.play();
  }

  createCity() {
    this.cameras.main.setBackgroundColor(0x8fd3ff);
    this.add.circle(120, 90, 44, 0xfff176);
    const far = this.add.graphics();
    const farLights = this.add.graphics();
    drawSkyline(far, farLights, 960, 430);
    const near = this.add.graphics();
    const nearLights = this.add.graphics();
    [[700, 140, 330], [860, 120, 360]].forEach(([x, width, roofY], i) => drawBuilding(near, nearLights, { x, width, roofY, bottom: GROUND, colorIndex: i }));
    this.add.rectangle(0, GROUND, 960, 540 - GROUND, 0x5aa83c).setOrigin(0, 0);
    this.add.rectangle(0, GROUND, 960, 8, 0x43a047).setOrigin(0, 0);
    this.dark = this.add.rectangle(0, 0, 960, 540, 0x1a0b2e, 0).setOrigin(0, 0).setDepth(1);
  }

  // The movie: each step waits for the one before. [ms to wait before it, what happens]
  play() {
    const steps = [
      [300, () => this.say(this.hero, t('story.intro.sunny'), 1)],
      [2400, () => this.kingArrives()],
      [2000, () => this.say(this.king, t('story.intro.king'), -1)],
      [2800, () => this.say(this.king, t('story.intro.machine'), -1)],
      [2800, () => this.zapEveryone()],
      [3000, () => this.say(this.hero, t('story.intro.giveBack'), 1)],
      [2300, () => this.kingLeaves()],
      [3200, () => this.say(this.hero, t('story.intro.promise'), 1)],
      [3000, () => this.showTitle()],
      [2600, () => this.finish()],
    ];
    let at = 0;
    for (const [wait, step] of steps) {
      at += wait;
      this.time.delayedCall(at, () => !this.done && step());
    }
  }

  // A comic bubble over someone (replaces the last one)
  // The King talks from his snout (to the left of him), so the bubble doesn't cover his face.
  say(sprite, text, side) {
    for (const part of this.bubble) part.destroy();
    const spot = sprite === this.king ? { x: sprite.x - 70, y: sprite.y + 10 } : { x: sprite.x, y: sprite.y - 20 };
    this.bubble = drawComicBubble(this, text, spot, this.cameras.main.worldView, side);
    for (const part of this.bubble) part.setDepth(part.depth + 10);
    audio.play('click');
  }

  kingArrives() {
    for (const part of this.bubble) part.destroy();
    audio.stopMusic();
    audio.play('bossRoar');
    this.cameras.main.shake(800, 0.008);
    this.tweens.add({ targets: this.dark, fillAlpha: 0.4, duration: 1200 });
    this.tweens.add({
      targets: this.king,
      x: KING_SPOT.x,
      duration: 1800,
      ease: 'Sine.easeOut',
      onComplete: () => {
        audio.playMusic('boss');
        this.tweens.add({ targets: this.king, y: KING_SPOT.y + 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });
    for (const hero of this.heroes) hero.sprite.setFlipX(false);
  }

  // ZAP ZAP ZAP: a beam from the zapper to each friend, who turns into a gold trophy on a pedestal.
  zapEveryone() {
    for (const part of this.bubble) part.destroy();
    const friends = this.heroes.filter((h) => h.trophy).reverse(); // the closest one first
    friends.forEach((friend, i) => {
      this.time.delayedCall(i * 550, () => {
        this.beam(friend.sprite.x, friend.sprite.y);
        friend.sprite.setTint(GOLD);
        audio.play('freeze');
        const base = this.add.graphics().setDepth(1.5);
        base.fillStyle(0xffa000);
        base.fillRect(friend.sprite.x - 34, GROUND - 14, 68, 14);
        base.fillStyle(0xffc107);
        base.fillRect(friend.sprite.x - 26, GROUND - 22, 52, 8);
        friend.base = base;
        friend.sprite.y -= 18;
        const sparkle = this.add.circle(friend.sprite.x, friend.sprite.y, 40, 0xffffff, 0.8).setDepth(4);
        this.tweens.add({ targets: sparkle, scale: 1.8, alpha: 0, duration: 400, onComplete: () => sparkle.destroy() });
      });
    });
    // The last beam is for SuperCapybara... but he jumps out of the way!
    this.time.delayedCall(friends.length * 550 + 200, () => {
      this.tweens.add({ targets: this.hero, y: this.hero.y - 130, duration: 380, yoyo: true, ease: 'Quad.easeOut' });
      this.hero.setTexture(`${this.heroes[0].look}-jump`);
      audio.play('jump');
      this.time.delayedCall(120, () => this.beam(this.hero.x, GROUND - 20));
      this.time.delayedCall(800, () => this.hero.setTexture(`${this.heroes[0].look}-idle`));
    });
  }

  beam(x, y) {
    const from = { x: this.king.x - 80, y: this.king.y - 21 };
    const g = this.add.graphics().setDepth(4);
    g.lineStyle(10, 0xffeb3b, 0.9).lineBetween(from.x, from.y, x, y);
    g.lineStyle(4, 0xffffff, 1).lineBetween(from.x, from.y, x, y);
    audio.play('laser');
    this.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
  }

  // He scoops up the trophies and flies away laughing.
  kingLeaves() {
    for (const part of this.bubble) part.destroy();
    this.say(this.king, t('story.intro.catchMe'), -1);
    for (const friend of this.heroes.filter((h) => h.trophy)) {
      this.tweens.add({ targets: [friend.sprite], x: this.king.x, y: this.king.y + 40, scale: 0.3, alpha: 0, duration: 900, delay: 400, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: friend.base, alpha: 0, duration: 600, delay: 400 });
    }
    this.time.delayedCall(2000, () => {
      for (const part of this.bubble) part.destroy();
      this.tweens.killTweensOf(this.king);
      audio.play('fly');
      this.tweens.add({ targets: this.king, x: -250, y: -120, duration: 1400, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: this.dark, fillAlpha: 0, duration: 1400 });
      audio.stopMusic();
    });
  }

  showTitle() {
    for (const part of this.bubble) part.destroy();
    audio.playMusic('menu');
    const title = this.add
      .text(480, 200, t('story.title'), { fontFamily: 'Arial Black, Arial', fontSize: '64px', color: '#ffd23f' })
      .setStroke('#b71c1c', 12)
      .setOrigin(0.5)
      .setDepth(20)
      .setScale(0.2);
    this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Back.easeOut' });
  }

  // The end (or skipped): never show it again, and off to the map.
  finish() {
    if (this.done) return;
    this.done = true;
    storyProgress(this.save).introSeen = true;
    writeSave(this.save);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(450, () => this.scene.start('Story'));
  }
}
