import Phaser from 'phaser';
import { t } from './i18n.js';
import { audio } from './audio.js';
import { writeSave } from './save.js';

// THE SUPA SNIPER 🎯 (Ethan's drawing: concept-art/power-up-blaster.jpeg, 2026-11-09): a big blaster with a target.
// Press T (🎯 on touch, A + Y on a controller). The game freezes and you look through SupaCapybara's EYES:
// the bad guys ahead of you (the way you're facing) stand in front of you, far ones small, near ones big,
// with the blaster at the bottom of the screen. Move the target ⊕ with the arrows (or tap where to shoot),
// then ATTACK fires ONE super strong shot: a bad guy goes POP, a boss loses a big chunk (BOSS_SHARE).
// You keep the SUPA SNIPER forever (1500 ⚡) and wait WAIT_MS between shots, but every shot needs ammo
// (save.sniperAmmo, bought in the supermarket, 100 ⚡ for 5). T again (or ✕) puts it away without shooting.
//
// SideScrollerScene makes one (this.sniper) when you own it, calls open(), update() while `aiming`,
// and shows `status` in the power line. World 2 has its own (world2/spaceSniper.js), with the same rules.

export const SNIPER_WAIT_MS = 30000;
export const SNIPER_BOSS_SHARE = 0.3; // of the boss's health, per shot
const RANGE = 1400; // how far ahead you can see
const FOCAL = 420; // the eyes view's zoom
const HORIZON = 250;
const EYE_HEIGHT = 30; // the eyes are a bit above the middle of the hero
const AIM_SPEED = 420; // pixels per second
const DEPTH = 40;
const SKIES = {
  World3: [0x4a0e0e, 0xff7043, 0x3e2723], // the volcano
  GrapeMoon: [0x05051a, 0x311b92, 0x9e9e9e], // the moon
  StoryUnderwater: [0x01579b, 0x4fc3f7, 0xc2b280],
};
const DEFAULT_SKY = [0x1e88e5, 0xbbdefb, 0x7cb342]; // [top of the sky, horizon, ground]

export function sniperAmmo(save) {
  return save.sniperAmmo ?? 0;
}

// Uses up one shot (returns false if there's none left)
export function takeSniperShot(save) {
  if (sniperAmmo(save) <= 0) return false;
  save.sniperAmmo -= 1;
  writeSave(save);
  return true;
}

export class SupaSniper {
  constructor(scene) {
    this.scene = scene;
    this.readyAt = 0;
    this.aiming = null;
  }

  get status() {
    const left = this.readyAt - this.scene.time.now;
    const name = `T = 🎯 ${t('sniper.name')}`;
    if (left > 0) return `${name}: ${t('game.wait', { seconds: Math.ceil(left / 1000) })}`;
    return `${name} x${sniperAmmo(this.scene.save)}`;
  }

  open() {
    const scene = this.scene;
    if (this.aiming || this.firing) return;
    if (scene.time.now < this.readyAt) {
      audio.play('error');
      return;
    }
    if (sniperAmmo(scene.save) <= 0) {
      audio.play('error');
      scene.flashMessage(t('sniper.none'), '#ff8a80');
      return;
    }
    scene.freezeWorld();
    audio.play('click');
    const player = scene.player;
    const parts = [];
    const ui = (object) => parts.push(object.setScrollFactor(0).setDepth(DEPTH)) && object;

    // The world ahead, seen through the hero's eyes: sky, ground with lines running away to the horizon
    const [skyTop, skyLow, ground] = SKIES[scene.sys.settings.key] ?? DEFAULT_SKY;
    const view = ui(scene.add.graphics());
    view.fillGradientStyle(skyTop, skyTop, skyLow, skyLow, 1);
    view.fillRect(0, 0, 960, HORIZON);
    view.fillStyle(ground);
    view.fillRect(0, HORIZON, 960, 540 - HORIZON);
    view.lineStyle(3, 0x000000, 0.15);
    for (let i = -6; i <= 6; i++) view.lineBetween(480 + i * 18, HORIZON, 480 + i * 260, 540);
    for (let d = 80; d < RANGE; d *= 1.6) {
      const y = HORIZON + (EYE_HEIGHT + 40) * (FOCAL / d);
      if (y < 540) view.lineBetween(0, y, 960, y);
    }

    // Everything you can shoot that's ahead of you, far ones first (so near ones are drawn on top)
    const targets = [];
    const add = (thing, kind, lane) => {
      const ahead = (thing.x - player.x) * player.facing;
      if (ahead < 40 || ahead > RANGE) return;
      const zoom = FOCAL / ahead;
      const x = Phaser.Math.Clamp(480 + lane * zoom, 80, 880);
      const y = HORIZON + (thing.y - (player.y - EYE_HEIGHT)) * zoom;
      const scale = Math.min(4, thing.scaleX * zoom * 2.2);
      targets.push({ thing, kind, ahead, x, y, scale });
    };
    scene.badGuys.getChildren().forEach((badGuy, i) => {
      if (badGuy.body?.enable && badGuy.visible) add(badGuy, 'badGuy', (((i * 0.618) % 1) - 0.5) * 260);
    });
    if (scene.boss && scene.bossHittable?.()) add(scene.boss, 'boss', 0);
    targets.sort((a, b) => b.ahead - a.ahead);
    for (const target of targets) {
      const { thing } = target;
      if (thing.texture?.key) {
        target.image = ui(scene.add.image(target.x, target.y, thing.texture.key, thing.frame.name).setScale(target.scale));
        target.image.setFlipX(!thing.flipX); // (it's facing you now)
      } else {
        target.image = ui(scene.add.circle(target.x, target.y, 40 * target.scale, 0x9c27b0)); // (a boss made of several pieces)
      }
    }

    // Dark round edges, like looking through a scope
    const edge = ui(scene.add.graphics());
    edge.fillStyle(0x000000, 0.35);
    edge.fillRect(0, 0, 960, 24);
    edge.fillRect(0, 516, 960, 24);

    // SupaCapybara's blaster at the bottom (from Ethan's drawing), with a brown paw holding it
    const blaster = ui(scene.add.graphics());
    blaster.fillStyle(0x6d4c41);
    blaster.fillEllipse(640, 520, 120, 70); // paw
    blaster.fillStyle(0x546e7a);
    blaster.fillTriangle(560, 540, 610, 400, 720, 540); // body
    blaster.fillStyle(0x78909c);
    blaster.fillRect(588, 380, 46, 90); // barrel
    blaster.fillStyle(0x263238);
    blaster.fillCircle(611, 380, 16); // muzzle
    blaster.fillStyle(0xffd23f);
    blaster.fillTriangle(640, 470, 662, 440, 650, 470); // ⚡
    blaster.fillTriangle(650, 462, 672, 462, 640, 500);
    blaster.fillStyle(0xd32f2f);
    blaster.fillCircle(611, 420, 7); // scope light

    const crosshair = ui(scene.add.graphics());
    crosshair.lineStyle(4, 0xff1744);
    crosshair.strokeCircle(0, 0, 26);
    crosshair.lineBetween(-40, 0, -10, 0);
    crosshair.lineBetween(10, 0, 40, 0);
    crosshair.lineBetween(0, -40, 0, -10);
    crosshair.lineBetween(0, 10, 0, 40);
    crosshair.fillStyle(0xff1744);
    crosshair.fillCircle(0, 0, 3);
    const start = targets.length ? targets[targets.length - 1] : { x: 480, y: HORIZON };
    crosshair.setPosition(start.x, start.y);

    ui(scene.add.text(480, 40, `🎯 ${t('sniper.name')}  x${sniperAmmo(scene.save)}`, { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff' }).setStroke('#000000', 6).setOrigin(0.5));
    ui(scene.add.text(480, 74, t(scene.save.touch ? 'sniper.helpTouch' : 'sniper.help'), { fontFamily: 'Arial', fontSize: '15px', color: '#ffffff' }).setStroke('#000000', 4).setOrigin(0.5));
    const close = ui(scene.add.text(920, 40, '✕', { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff' }).setStroke('#000000', 5).setOrigin(0.5));
    close.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());

    // Tap (or click) anywhere: aim there and fire
    this.onTap = (pointer, over) => {
      if (!this.aiming || over?.includes(close)) return;
      crosshair.setPosition(pointer.x, pointer.y);
      this.fire();
    };
    scene.input.on('pointerdown', this.onTap);
    this.aiming = { parts, targets, crosshair, last: performance.now(), openedAt: performance.now() };
  }

  update() {
    const aiming = this.aiming;
    if (!aiming) return;
    const controls = this.scene.player.controls;
    const now = performance.now();
    const dt = Math.min(0.05, (now - aiming.last) / 1000);
    aiming.last = now;
    if (now - aiming.openedAt < 150) return; // (so the T that opened it doesn't close it)
    if (controls.justPressed('sniper')) return this.close();
    const dx = (controls.isDown('right') ? 1 : 0) - (controls.isDown('left') ? 1 : 0);
    const dy = (controls.isDown('down') ? 1 : 0) - (controls.isDown('up') || controls.isDown('jump') ? 1 : 0);
    const { crosshair } = aiming;
    crosshair.setPosition(Phaser.Math.Clamp(crosshair.x + dx * AIM_SPEED * dt, 0, 960), Phaser.Math.Clamp(crosshair.y + dy * AIM_SPEED * dt, 0, 540));
    if (controls.justPressed('attack')) this.fire();
  }

  // BANG: one super strong shot to wherever the target is
  fire() {
    const scene = this.scene;
    const aiming = this.aiming;
    if (!aiming || !takeSniperShot(scene.save)) return this.close();
    this.aiming = null;
    this.firing = true;
    scene.input.off('pointerdown', this.onTap);
    const { crosshair, targets, parts } = aiming;
    // The nearest thing under the target gets hit
    const hit = [...targets].reverse().find(({ image }) => image.getBounds().contains(crosshair.x, crosshair.y) || Phaser.Math.Distance.Between(image.x, image.y, crosshair.x, crosshair.y) < 24);
    audio.play('superLaser');
    scene.cameras.main.shake(150, 0.01);
    const laser = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    laser.lineStyle(10, 0xff1744, 0.6);
    laser.lineBetween(611, 380, crosshair.x, crosshair.y);
    laser.lineStyle(4, 0xffffff);
    laser.lineBetween(611, 380, crosshair.x, crosshair.y);
    laser.fillStyle(0xffffff);
    laser.fillCircle(611, 380, 26);
    parts.push(laser);
    if (hit) {
      const boom = scene.add.circle(crosshair.x, crosshair.y, 20, 0xffd23f).setScrollFactor(0).setDepth(DEPTH + 1);
      parts.push(boom);
      scene.tweens.add({ targets: boom, scale: 4, alpha: 0, duration: 300 });
      scene.tweens.add({ targets: hit.image, scale: hit.image.scale * 1.6, alpha: 0, duration: 300 });
    }
    // A moment to see it, then back to the game
    setTimeout(() => {
      this.firing = false;
      for (const part of parts) part.destroy();
      if (!scene.sys.isActive()) return;
      scene.unfreezeWorld();
      this.readyAt = scene.time.now + SNIPER_WAIT_MS;
      if (!hit) {
        scene.flashMessage(t('sniper.missed'), '#ffffff');
        return;
      }
      if (hit.kind === 'boss') scene.hitBoss(Math.ceil(scene.settings.bossHp * SNIPER_BOSS_SHARE));
      else scene.defeat(hit.thing);
      scene.player.landedHit?.();
    }, 450);
  }

  // Put it away without shooting (no ammo used, no waiting)
  close() {
    const aiming = this.aiming;
    if (!aiming) return;
    this.aiming = null;
    this.scene.input.off('pointerdown', this.onTap);
    for (const part of aiming.parts) part.destroy();
    this.scene.unfreezeWorld();
    audio.play('click');
  }

  destroy() {
    this.scene.input.off('pointerdown', this.onTap);
  }
}
