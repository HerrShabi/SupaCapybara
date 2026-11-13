import Phaser from 'phaser';
import { writeSave, isPowerUpOn } from './save.js';
import { audio } from './audio.js';
import { t } from './i18n.js';
import { rainbowColor } from './strawberry.js';

// THE MEGA BEAM (Ethan's power-up, 2026-11-09): for 10 seconds your hero fires an EVERYTHING-LASER:
// a giant rainbow beam across the whole screen (with fire, lightning and moons swirling in it),
// plus lasers in every color shooting in every direction. It's used up after that: buy another one
// in the shop (1000 ⚡ each). They wait in save.megaBeams (a count) until you press G (🌈 on touch,
// the left stick on a controller). For now it works in the side-scrollers.
//
// The player calls update() every frame. Hits go through the scene like every other attack:
// scene.hitArea(rect, damage) for the beam, and player.lasers for the lasers flying everywhere.

export const MEGA_BEAM_PRICE = 1000;
export const MAX_MEGA_BEAMS = 9;
const BEAM_MS = 10000;
const BEAM_HIT_EVERY_MS = 500; // the beam hurts what's in it this often
const LASER_EVERY_MS = 140;
const LASER_SPEED = 700;
const LASER_RANGE_MS = 650;
const BEAM_THICKNESS = 40;
const SWIRLS = ['🔥', '⚡', '🌙', '🔥', '⚡', '🌙'];

export function megaBeamCount(save) {
  return save.megaBeams ?? 0;
}

// Can this player fire MEGA BEAMs here? (Switched ON on the POWER-UPS screen.)
export function megaBeamOn(save) {
  return isPowerUpOn(save, 'mega-beam');
}

export class MegaBeam {
  constructor(player) {
    this.player = player;
    this.scene = player.scene;
    this.until = 0;
    this.parts = null;
    // A white laser, so it can be tinted any color
    if (!this.scene.textures.exists('mega-laser')) {
      const g = this.scene.make.graphics({ add: false });
      g.fillStyle(0xffffff, 0.5);
      g.fillRoundedRect(0, 0, 44, 12, 6);
      g.fillStyle(0xffffff);
      g.fillRoundedRect(4, 3, 36, 6, 3);
      g.generateTexture('mega-laser', 44, 12);
      g.destroy();
    }
  }

  active() {
    return this.scene.time.now < this.until;
  }

  start() {
    const save = this.scene.save;
    if (this.active()) return;
    if (megaBeamCount(save) <= 0) {
      audio.play('error');
      this.scene.flashMessage?.(t('mega.none'));
      return;
    }
    save.megaBeams -= 1;
    writeSave(save);
    const now = this.scene.time.now;
    this.until = now + BEAM_MS;
    this.nextHitAt = now;
    this.nextLaserAt = now;
    this.laserAngle = 0;
    audio.play('superLaser');
    audio.play('key');
    this.scene.cameras.main.flash(300, 255, 255, 255);
    this.scene.flashMessage?.(t('mega.go'), '#ea80fc');
    const beam = this.scene.add.graphics().setDepth(4);
    const swirls = SWIRLS.map((emoji) => this.scene.add.text(0, 0, emoji, { fontSize: '26px' }).setOrigin(0.5).setDepth(4.1));
    this.parts = { beam, swirls };
  }

  stop() {
    this.until = 0;
    if (!this.parts) return;
    this.parts.beam.destroy();
    for (const swirl of this.parts.swirls) swirl.destroy();
    this.parts = null;
  }

  update() {
    if (!this.parts) return;
    const now = this.scene.time.now;
    if (now >= this.until) return this.stop();
    const player = this.player;
    const dir = player.facing;
    const view = this.scene.cameras.main.worldView;
    const eyeX = player.x + dir * 30;
    const eyeY = player.y - 13;
    const endX = dir > 0 ? view.right + 20 : view.x - 20;
    const left = Math.min(eyeX, endX);
    const length = Math.abs(endX - eyeX);

    // The giant rainbow beam: colored stripes that wobble and shimmer, with a white-hot middle
    const { beam, swirls } = this.parts;
    beam.clear();
    const wobble = 1 + 0.12 * Math.sin(now / 40);
    const thick = BEAM_THICKNESS * wobble;
    const stripes = 6;
    for (let i = 0; i < stripes; i++) {
      beam.fillStyle(rainbowColor(now * 2 + i * 160), 0.9);
      beam.fillRect(left, eyeY - thick / 2 + (i * thick) / stripes, length, thick / stripes + 1);
    }
    beam.fillStyle(0xffffff, 0.7);
    beam.fillRect(left, eyeY - thick * 0.12, length, thick * 0.24);
    beam.fillStyle(0xffffff, 0.8);
    beam.fillCircle(eyeX, eyeY, thick * 0.35);

    // Fire, lightning and moons swirling along the beam
    swirls.forEach((swirl, i) => {
      const k = ((now / 900 + i / swirls.length) % 1 + 1) % 1;
      swirl.setPosition(eyeX + dir * k * length, eyeY + Math.sin(now / 120 + i * 2) * thick * 0.9);
      swirl.setAngle(now / 3 + i * 60);
    });

    // The beam hits everything inside it
    if (now >= this.nextHitAt) {
      this.nextHitAt = now + BEAM_HIT_EVERY_MS;
      if (this.scene.hitArea(new Phaser.Geom.Rectangle(left, eyeY - thick / 2, length, thick), 1)) player.landedHit?.();
    }

    // ...and lasers in every color shooting in every direction
    while (now >= this.nextLaserAt) {
      this.nextLaserAt += LASER_EVERY_MS;
      this.laserAngle += 2.4; // (a golden-ish turn each time, so they spray all around)
      this.fireLaser(this.laserAngle, rainbowColor(now + this.laserAngle * 300));
    }
  }

  fireLaser(angle, color) {
    const player = this.player;
    const laser = player.lasers.create(player.x + Math.cos(angle) * 30, player.y - 10 + Math.sin(angle) * 30, 'mega-laser');
    laser.setTint(color).setRotation(angle).setDepth(3);
    laser.setData('damage', 1);
    laser.setVelocity(Math.cos(angle) * LASER_SPEED, Math.sin(angle) * LASER_SPEED);
    this.scene.time.delayedCall(LASER_RANGE_MS, () => laser.destroy());
  }

  // For the power line at the top: "G = MEGA BEAM x2", or "🌈 MEGA BEAM! 7" while it's on
  status() {
    const now = this.scene.time.now;
    if (this.active()) return `🌈 ${t('mega.name')}! ${Math.ceil((this.until - now) / 1000)}`;
    const count = megaBeamCount(this.scene.save);
    return count > 0 ? `G = ${t('mega.name')} x${count}` : '';
  }
}
