import Phaser from 'phaser';
import { Player } from '../Player.js';
import { getCharacter } from '../characters.js';
import { loadSave } from '../save.js';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { showTwoPlayerTouch } from '../touch.js';
import { createHeroTextures } from '../art/heroes.js';
import { createEffectTextures, createShieldTexture, createBubbleTexture, createPowerTextures } from '../art/effects.js';
import { createItemTextures } from '../art/items.js';
import { drawSkyline, drawBuilding, drawBillboard } from '../art/city.js';
import { drawRock, drawLedge, drawVolcano, LAVA, LAVA_BRIGHT } from '../art/volcano.js';

// 2 PLAYERS BATTLE: two heroes fight each other. Make the other player lose all their hearts to win a round;
// best of 3 rounds wins. Arenas: the helipad rooftop (World 1) or the Lava Dragon's lair, where lava rises sometimes.

const FONT = 'Arial Black, Arial';
const FLOOR = 440;
const HEARTS = 3;
const SAFE_MS = 1000; // after a hit, you can't be hit again for this long
const ROUNDS_TO_WIN = 2;
const LAVA_EVERY_MS = 14000;
const LAVA_STAYS_MS = 3500;
const STARTS = [{ x: 200, y: 360 }, { x: 760, y: 360 }];
const LEDGES = {
  helipad: [
    [230, 320, 140],
    [590, 320, 140],
  ],
  lava: [
    [170, 320, 130],
    [415, 250, 130],
    [660, 320, 130],
  ],
};

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  create({ heroes, arena = 'helipad' }) {
    this.save = loadSave();
    setLanguage(this.save.language);
    createHeroTextures(this);
    createEffectTextures(this);
    createPowerTextures(this);
    createItemTextures(this);
    createShieldTexture(this);
    createBubbleTexture(this);
    this.arena = arena;
    this.wins = [0, 0];
    this.roundOver = false;

    this.createArena();
    this.fighters = heroes.map((id, i) => {
      const player = new Player(this, getCharacter(id), STARTS[i].x, STARTS[i].y, { scheme: `p${i + 1}`, padIndex: i, hat: this.save.wearing?.[id] ?? null });
      player.sprite.setCollideWorldBounds(true).setFlipX(i === 1);
      this.physics.add.collider(player.sprite, this.solids);
      this.physics.add.collider(player.sprite, this.platforms);
      this.physics.add.collider(player.lasers, this.solids, (laser) => laser.destroy());
      return { player, hearts: HEARTS, safeUntil: 0, number: i + 1 };
    });

    // Lasers and moons hit the other player. Jumping on their head hurts them too.
    for (const [me, other] of [this.fighters, [...this.fighters].reverse()]) {
      this.physics.add.overlap(other.player.sprite, me.player.lasers, (sprite, laser) => {
        laser.destroy();
        this.hit(other, me);
      });
      this.physics.add.overlap(me.player.sprite, other.player.sprite, () => {
        const body = me.player.sprite.body;
        if (body.velocity.y > 0 && body.bottom <= other.player.sprite.body.top + 18) {
          me.player.stompBounce();
          audio.play('stomp');
          this.hit(other, me);
        } else if (me.player.character.fireAura) {
          this.hit(other, me);
        }
      });
    }

    this.physics.world.setBounds(0, 0, 960, 540);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));
    audio.setMuted(this.save.muted);
    audio.playMusic('boss');
    if (this.save.touch) {
      const touch = showTwoPlayerTouch(this.game.canvas.parentElement);
      this.events.once('shutdown', () => touch.destroy());
    }

    this.createHud();
    this.announce(t('battle.round', { number: 1 }));
  }

  // ---------- The arena ----------

  createArena() {
    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    const background = this.add.graphics(); // drawn first, so it's behind everything
    const g = this.add.graphics();

    if (this.arena === 'lava') {
      this.cameras.main.setBackgroundColor(0x3b0d0d);
      drawVolcano(background, 480, 520);
      drawRock(g, { x: 0, width: 960, top: FLOOR, bottom: 540 });
      for (const [x, top, width] of LEDGES.lava) drawLedge(g, { x, top, width });
      this.lava = this.add.rectangle(0, 540, 960, 220, LAVA, 0.92).setOrigin(0, 0).setDepth(3);
      this.lavaTop = this.add.rectangle(0, 540, 960, 6, LAVA_BRIGHT).setOrigin(0, 0).setDepth(3);
      this.time.addEvent({ delay: LAVA_EVERY_MS, loop: true, callback: () => this.raiseLava() });
    } else {
      this.cameras.main.setBackgroundColor(0x0d1b3e);
      this.add.circle(180, 100, 34, 0xfff9c4);
      const far = this.add.graphics();
      drawSkyline(far, this.add.graphics(), 960, 470);
      drawBuilding(g, this.add.graphics(), { x: 0, width: 960, roofY: FLOOR, bottom: 540, colorIndex: 1 });
      for (const [x, top, width] of LEDGES.helipad) drawBillboard(g, { x, top, width, height: 44, roofY: FLOOR });
    }

    this.solids.add(this.add.zone(0, FLOOR, 960, 100).setOrigin(0, 0));
    for (const [x, top, width] of LEDGES[this.arena]) {
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }
  }

  raiseLava() {
    if (this.roundOver) return;
    audio.play('lavaRise');
    this.announce(t('game.lavaRising'), '#ff9100');
    this.tweens.add({ targets: this.lava, y: FLOOR - 70, duration: 1500, ease: 'Sine.easeInOut', hold: LAVA_STAYS_MS, yoyo: true });
  }

  // ---------- Screen display ----------

  createHud() {
    this.heartIcons = this.fighters.map((fighter, i) => {
      const x = i === 0 ? 32 : 928;
      this.add.text(i === 0 ? 16 : 944, 14, `P${i + 1}`, { fontFamily: FONT, fontSize: '24px', color: i ? '#4fc3f7' : '#ffd23f' }).setStroke('#000000', 5).setOrigin(i, 0);
      return Array.from({ length: HEARTS }, (_, h) => this.add.image(x + (i === 0 ? h : -h) * 36, 64, 'heart').setDepth(10));
    });
    this.score = this.add.text(480, 28, '', { fontFamily: FONT, fontSize: '28px', color: '#ffffff' }).setStroke('#000000', 6).setOrigin(0.5).setDepth(10);
    this.tags = this.fighters.map((fighter, i) =>
      this.add.text(0, 0, `P${i + 1}`, { fontFamily: FONT, fontSize: '16px', color: i ? '#4fc3f7' : '#ffd23f' }).setStroke('#000000', 4).setOrigin(0.5).setDepth(6),
    );
    this.updateHud();
  }

  updateHud() {
    this.fighters.forEach((fighter, i) => this.heartIcons[i].forEach((icon, h) => icon.setAlpha(h < fighter.hearts ? 1 : 0.2)));
    this.score.setText(`${this.wins[0]}  :  ${this.wins[1]}`);
  }

  announce(text, color = '#ffd23f') {
    const message = this.add.text(480, 200, text, { fontFamily: FONT, fontSize: '52px', color }).setStroke('#000000', 10).setOrigin(0.5).setDepth(10);
    this.time.delayedCall(1600, () => message.destroy());
    return message;
  }

  // ---------- Hitting each other ----------

  // Called by Player for scratch and tongue attacks.
  hitArea(area, damage, attacker) {
    const target = this.fighters.find((f) => f.player !== attacker);
    const me = this.fighters.find((f) => f.player === attacker);
    if (!Phaser.Geom.Intersects.RectangleToRectangle(area, target.player.sprite.getBounds())) return false;
    this.hit(target, me);
    return true;
  }

  // Bloodmoon Cat's moon flies at the other player.
  nearestTarget(x, y, attacker) {
    return this.fighters.find((f) => f.player !== attacker).player.sprite;
  }

  hit(target, attacker) {
    const now = this.time.now;
    if (this.roundOver || now < target.safeUntil || target.player.invisible || target.player.unhurtable) return;
    target.hearts -= 1;
    target.safeUntil = now + SAFE_MS;
    audio.play('hurt');
    this.cameras.main.shake(150, 0.01);
    const away = target.player.x < attacker.player.x ? -1 : 1;
    target.player.sprite.setVelocity(away * 220, -320);
    target.player.wasHurt();
    attacker.player.landedHit();
    this.tweens.add({
      targets: target.player.sprite,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: SAFE_MS / 200 - 1,
      onComplete: () => target.player.restoreLook(),
    });
    this.updateHud();
    if (target.hearts <= 0) this.endRound(attacker);
  }

  endRound(winner) {
    this.roundOver = true;
    this.wins[winner.number - 1] += 1;
    this.updateHud();
    audio.play('win');
    if (this.wins[winner.number - 1] >= ROUNDS_TO_WIN) {
      this.announce(t('battle.wins', { number: winner.number }), winner.number === 1 ? '#ffd23f' : '#4fc3f7').setScale(1.1);
      this.time.delayedCall(4000, () => this.scene.start('TwoPlayer'));
      return;
    }
    this.announce(t('battle.roundWin', { number: winner.number }));
    this.time.delayedCall(2500, () => this.nextRound());
  }

  nextRound() {
    this.fighters.forEach((fighter, i) => {
      fighter.hearts = HEARTS;
      fighter.player.respawnAt(STARTS[i]);
      fighter.player.sprite.setFlipX(i === 1);
    });
    this.roundOver = false;
    this.updateHud();
    this.announce(t('battle.round', { number: this.wins[0] + this.wins[1] + 1 }));
  }

  // ---------- Every frame ----------

  update() {
    if (this.lava) this.lavaTop.y = this.lava.y;
    this.fighters.forEach((fighter, i) => {
      if (!this.roundOver) fighter.player.update();
      this.tags[i].setPosition(fighter.player.x, fighter.player.y - 55);
      // The lava hurts whoever stands in it
      if (this.lava && fighter.player.sprite.body.bottom > this.lava.y + 8) {
        this.hit(fighter, this.fighters[1 - i]);
      }
    });
  }
}
