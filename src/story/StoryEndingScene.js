import Phaser from 'phaser';
import { goldify } from '../art/gold.js';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { loadSave } from '../save.js';
import { createHeroTextures, heroKey } from '../art/heroes.js';
import { drawSkyline, drawBuilding } from '../art/city.js';
import { drawVolcano } from '../art/volcano.js';
import { createCrocKingTexture, createCastleTextures } from '../art/crocKing.js';
import { createHatTextures, hatAnchor } from '../art/hats.js';

// THE BAD GUY KING's happy ending (Ethan's round 9 design): the castle on the volcano crumbles, then a big
// party in the city with fireworks, every hero and Baby Capybara, and the King trophy on display.
// Then the prizes: the champion crown (wardrobe) and KING RUSH (title screen). SPACE / ENTER / ESC skips to the end.

const HEROES = ['supa-capybara', 'supa-cat', 'supa-chameleon', 'ultra-capybara'];

export class StoryEndingScene extends Phaser.Scene {
  constructor() {
    super('StoryEnding');
  }

  create() {
    this.save = loadSave();
    setLanguage(this.save.language);
    audio.setMuted(this.save.muted);
    createHeroTextures(this, 0);
    createCrocKingTexture(this);
    createCastleTextures(this);
    createHatTextures(this);
    this.done = false;
    for (const key of ['SPACE', 'ENTER', 'ESC']) this.input.keyboard.on(`keydown-${key}`, () => this.finish());
    this.crumble();
  }

  // 1. The castle on the volcano shakes and falls apart
  crumble() {
    this.cameras.main.setBackgroundColor(0x311b92);
    const far = this.add.graphics();
    drawVolcano(far, 480, 540);
    const castle = this.add.container(480, 250);
    const g = this.add.graphics();
    g.fillStyle(0x37474f);
    g.fillRect(-90, -40, 180, 90);
    for (const [x, h] of [[-90, 120], [-30, 150], [30, 150], [90, 120]]) g.fillRect(x - 18, 50 - h, 36, h);
    g.fillStyle(0x4a148c);
    for (const [x, h] of [[-90, 120], [-30, 150], [30, 150], [90, 120]]) g.fillTriangle(x - 26, 50 - h, x + 26, 50 - h, x, 50 - h - 40);
    g.fillStyle(0xff1744).fillRect(-26, 0, 14, 14).fillRect(12, 0, 14, 14);
    castle.add(g);
    this.add.text(480, 60, t('story.ending.crumble'), { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd23f' }).setStroke('#000000', 7).setOrigin(0.5);
    audio.play('lavaRise');
    this.cameras.main.shake(2600, 0.01);
    this.tweens.add({ targets: castle, angle: 4, duration: 120, yoyo: true, repeat: 10 });
    this.time.delayedCall(1400, () => {
      audio.play('explosion');
      this.tweens.add({ targets: castle, y: 520, alpha: 0, angle: -12, duration: 1500, ease: 'Quad.easeIn' });
      for (let i = 0; i < 24; i++) {
        const block = this.add.rectangle(480 + Phaser.Math.Between(-110, 110), 230 + Phaser.Math.Between(-80, 40), 18, 18, i % 3 ? 0x37474f : 0x4a148c);
        this.tweens.add({ targets: block, x: block.x + Phaser.Math.Between(-220, 220), y: 560, angle: 360, duration: Phaser.Math.Between(900, 1600), ease: 'Quad.easeIn' });
      }
    });
    this.time.delayedCall(3600, () => !this.done && this.party());
  }

  // 2. The party in the city
  party() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(0x0d1b3e);
    this.cameras.main.flash(500);
    audio.playMusic('menu');
    const far = this.add.graphics();
    const lights = this.add.graphics();
    drawSkyline(far, lights, 960, 470);
    const near = this.add.graphics();
    const nearLights = this.add.graphics();
    [[0, 160, 400], [800, 160, 380]].forEach(([x, width, roofY], i) => drawBuilding(near, nearLights, { x, width, roofY, bottom: 540, colorIndex: i }));
    this.add.rectangle(0, 470, 960, 70, 0x37474f).setOrigin(0, 0);

    // The King trophy on display
    this.add.rectangle(480, 452, 200, 36, 0xffa000);
    this.add.rectangle(480, 430, 160, 12, 0xffc107);
    goldify(this.add.image(480, 330, 'croc-king-walk').setScale(1.1));
    this.add.text(480, 452, t('story.ending.plaque'), { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#4e342e' }).setOrigin(0.5);

    // Every hero (and Baby Capybara) dancing around it
    [...HEROES.slice(0, 2), 'baby', ...HEROES.slice(2)].forEach((id, i) => {
      const x = [120, 240, 360, 600, 720, 840][i] ?? 480;
      const baby = id === 'baby';
      const look = heroKey(baby ? 'supa-capybara' : id, 0);
      const scale = baby ? 1 : 1.8;
      const hero = this.add.sprite(x, 470 - 24 * scale, `${look}-idle`).setScale(scale).setFlipX(x > 480).play(`${look}-run`);
      const hat = !baby && this.save.wearing?.[id];
      let moveHat = () => {};
      if (hat) {
        const anchor = hatAnchor(id, hat, scale);
        const hatImage = this.add.image(0, 0, `hat-${hat}`).setScale(scale).setOrigin(0.5, hat === 'shades' ? 0.5 : 1).setFlipX(x > 480);
        moveHat = () => hatImage.setPosition(hero.x + anchor.x * (x > 480 ? -1 : 1), hero.y + anchor.y);
        moveHat();
      }
      this.tweens.add({ targets: hero, y: hero.y - 50, duration: 320, yoyo: true, repeat: -1, delay: i * 110, ease: 'Sine.easeOut', onUpdate: moveHat });
    });

    this.add.text(480, 60, t('story.ending.party'), { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ffd23f' }).setStroke('#b71c1c', 9).setOrigin(0.5);
    this.time.addEvent({ delay: 420, loop: true, callback: () => this.firework() });
    for (let i = 0; i < 60; i++) this.confetti(i * 60);
    this.time.delayedCall(6000, () => !this.done && this.prizes());
  }

  firework() {
    const x = Phaser.Math.Between(100, 860);
    const y = Phaser.Math.Between(110, 260);
    const color = Phaser.Math.RND.pick([0xff1744, 0xffd23f, 0x00e5ff, 0x76ff03, 0xd500f9, 0xff9100]);
    audio.play('firework');
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const spark = this.add.circle(x, y, 4, color);
      this.tweens.add({ targets: spark, x: x + Math.cos(angle) * 90, y: y + Math.sin(angle) * 90 + 20, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => spark.destroy() });
    }
  }

  confetti(delay) {
    this.time.delayedCall(delay, () => {
      const piece = this.add.rectangle(Phaser.Math.Between(0, 960), -10, 8, 12, Phaser.Math.RND.pick([0xff4081, 0xffd23f, 0x40c4ff, 0x76ff03]));
      this.tweens.add({ targets: piece, y: 560, x: piece.x + Phaser.Math.Between(-80, 80), angle: 720, duration: Phaser.Math.Between(2500, 4000), onComplete: () => piece.destroy() });
    });
  }

  // 3. The prizes
  prizes() {
    this.add.rectangle(480, 220, 640, 200, 0x000000, 0.75).setStrokeStyle(4, 0xffd23f);
    this.add.text(480, 150, t('story.ending.prizes'), { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#ffd23f' }).setOrigin(0.5);
    this.add.image(330, 215, 'hat-champion').setScale(3);
    this.add.text(370, 215, t('story.ending.crown'), { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0, 0.5);
    this.add.text(480, 265, t('story.ending.rush'), { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    this.add.text(480, 300, t('story.ending.end'), { fontFamily: 'Arial', fontSize: '14px', color: '#cccccc' }).setOrigin(0.5);
    this.time.delayedCall(9000, () => this.finish());
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(500);
    this.time.delayedCall(550, () => this.scene.start('Title'));
  }
}
