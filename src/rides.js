import Phaser from 'phaser';
import { audio } from './audio.js';
import { t } from './i18n.js';

// BRICK RIDES (Ethan, 2026-11-21): part of the building bricks prize (bricks.js). Bricks fly together into a ride:
//   1 = 🏎️ RACE CAR: super fast on the ground
//   2 = ✈️ FIGHTER JET: flies (arrows go anywhere), X fires a long jet blast
//   3 = 🐉 BRICK DRAGON: flies, X breathes fire in front of it
// While you ride, nothing hurts you and touching bad guys smashes them. A ride lasts RIDE_MS; then the bricks
// fall apart and every ride waits RIDE_WAIT_MS (Ethan: the bricks have no cooldown, the rides do).
// Player reads player.ride (riding, carSpeed); the scene calls rides.update() every frame.

export const RIDES = ['car', 'jet', 'dragon'];
const ICONS = { car: '🏎️', jet: '✈️', dragon: '🐉' };
const RIDE_MS = 15000;
const RIDE_WAIT_MS = 20000;
export const CAR_SPEED = 2.2; // times running speed
const JET_REACH = 420;
const FIRE_REACH = 170;

// Blocky brick drawings (facing right), with studs on top like the bricks
function makeTextures(scene) {
  if (scene.textures.exists('ride-car')) return;
  const studs = (g, color, x, y, count, gap = 12) => {
    g.fillStyle(color);
    for (let i = 0; i < count; i++) g.fillRect(x + i * gap, y, 7, 4);
  };
  let g = scene.make.graphics({ add: false });
  // race car: red, a windshield, black wheels
  studs(g, 0xe53935, 10, 8, 7);
  g.fillStyle(0xe53935).fillRect(4, 12, 92, 18);
  g.fillStyle(0xb71c1c).fillRect(4, 26, 92, 4);
  g.fillStyle(0x90caf9).fillRect(58, 4, 16, 9);
  g.fillStyle(0xfdd835).fillRect(90, 15, 6, 5);
  g.fillStyle(0x212121).fillCircle(22, 32, 9).fillCircle(78, 32, 9);
  g.fillStyle(0x9e9e9e).fillCircle(22, 32, 4).fillCircle(78, 32, 4);
  g.generateTexture('ride-car', 100, 42);
  g.destroy();

  g = scene.make.graphics({ add: false });
  // fighter jet: gray, pointy nose, wings, a tail fin, a flame
  studs(g, 0x90a4ae, 24, 14, 6);
  g.fillStyle(0x90a4ae).fillRect(14, 18, 82, 14);
  g.fillTriangle(96, 18, 96, 32, 118, 25);
  g.fillStyle(0x607d8b).fillRect(40, 30, 34, 8).fillRect(12, 6, 12, 14);
  g.fillStyle(0x4fc3f7).fillRect(74, 19, 14, 6);
  g.fillStyle(0xff7043).fillTriangle(14, 20, 14, 30, 0, 25);
  g.generateTexture('ride-jet', 120, 40);
  g.destroy();

  g = scene.make.graphics({ add: false });
  // brick dragon: green blocks, a head with an eye, wings up, a tail
  studs(g, 0x43a047, 26, 22, 6);
  g.fillStyle(0x43a047).fillRect(22, 26, 72, 20);
  g.fillRect(94, 14, 22, 18);
  g.fillRect(2, 32, 22, 8);
  g.fillStyle(0x2e7d32).fillRect(22, 42, 72, 4).fillRect(30, 46, 10, 10).fillRect(76, 46, 10, 10);
  g.fillStyle(0x66bb6a).fillTriangle(40, 26, 70, 26, 52, 2);
  g.fillStyle(0xffffff).fillRect(106, 17, 6, 6);
  g.fillStyle(0x000000).fillRect(109, 18, 3, 3);
  g.fillStyle(0xfdd835).fillRect(112, 26, 6, 4);
  g.generateTexture('ride-dragon', 120, 58);
  g.destroy();
}

export class Rides {
  constructor(scene) {
    this.scene = scene;
    this.readyAt = 0;
    makeTextures(scene);
  }

  status(player) {
    const now = this.scene.time.now;
    const ride = player.ride;
    if (ride && now < ride.until) return `${ICONS[ride.kind]} ${t(`ride.${ride.kind}`)}! ${Math.ceil((ride.until - now) / 1000)}`;
    if (now < this.readyAt) return `1 2 3 = ${t('ride.name')}: ${t('game.wait', { seconds: Math.ceil((this.readyAt - now) / 1000) })}`;
    return `1 ${ICONS.car}  2 ${ICONS.jet}  3 ${ICONS.dragon}`;
  }

  start(player, kind) {
    const scene = this.scene;
    const now = scene.time.now;
    if (player.ride || now < this.readyAt || player.mecha) {
      audio.play('error');
      return;
    }
    const image = scene.add.image(player.x, player.y, `ride-${kind}`).setDepth(player.sprite.depth - 0.05);
    player.ride = { kind, until: now + RIDE_MS, image, nextAttackAt: 0 };
    if (kind !== 'car') {
      // the jet and the dragon fly (the arrows go anywhere, no gravity), like the Fly power-up
      player.flyUntil = now + RIDE_MS;
      player.sprite.body.setAllowGravity(false);
    }
    audio.play(kind === 'car' ? 'rocket' : 'fly');
    // the bricks fly together: little bricks zoom in from all around
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const bit = scene.add.image(player.x + Math.cos(angle) * 120, player.y + Math.sin(angle) * 120, `brick-${i % 6}`).setScale(0.5).setDepth(5);
      scene.tweens.add({ targets: bit, x: player.x, y: player.y + 10, scale: 0.2, duration: 260, onComplete: () => bit.destroy() });
    }
  }

  stop(player) {
    const ride = player.ride;
    if (!ride) return;
    const scene = this.scene;
    player.ride = null;
    if (ride.kind !== 'car') {
      player.flyUntil = 0;
      player.sprite.body.setAllowGravity(true);
    }
    // the bricks fall apart
    const { x, y } = ride.image;
    ride.image.destroy();
    for (let i = 0; i < 6; i++) {
      const bit = scene.add.image(x, y, `brick-${i}`).setScale(0.6).setDepth(5);
      scene.tweens.add({ targets: bit, x: x + Phaser.Math.Between(-80, 80), y: y + Phaser.Math.Between(40, 120), angle: 200, alpha: 0, duration: 600, onComplete: () => bit.destroy() });
    }
    audio.play('pop');
    this.readyAt = scene.time.now + RIDE_WAIT_MS;
  }

  // Every frame: follow the hero, the ride's attack (X), and the end of the ride.
  update(player) {
    const ride = player.ride;
    if (!ride) return;
    const scene = this.scene;
    const now = scene.time.now;
    if (now >= ride.until || scene.won) {
      this.stop(player);
      return;
    }
    const facing = player.facing ?? 1;
    const offsetY = { car: 14, jet: 18, dragon: 22 }[ride.kind];
    ride.image.setPosition(player.x - facing * 4, player.y + offsetY).setFlipX(facing < 0);
    if (ride.kind === 'car' && Math.abs(player.sprite.body.velocity.x) > 10) ride.image.setAngle(Math.sin(now / 40) * 1.5); // vroom
    else ride.image.setAngle(0);
    // blinking when it's almost over
    ride.image.setAlpha(ride.until - now < 2500 && Math.floor(now / 150) % 2 ? 0.5 : 1);

    if (ride.kind === 'car' || now < ride.nextAttackAt || !player.controls.justPressed('attack')) return;
    ride.nextAttackAt = now + (ride.kind === 'jet' ? 250 : 400);
    if (ride.kind === 'jet') {
      // a long white-hot jet blast straight ahead
      audio.play('superLaser');
      const x = facing > 0 ? player.x + 50 : player.x - 50 - JET_REACH;
      const streak = scene.add.rectangle(x, player.y + 16, JET_REACH, 6, 0xfff59d).setOrigin(0, 0.5).setDepth(4);
      scene.tweens.add({ targets: streak, alpha: 0, scaleY: 0.2, duration: 200, onComplete: () => streak.destroy() });
      if (scene.hitArea(new Phaser.Geom.Rectangle(x, player.y, JET_REACH, 32), 2, player)) player.landedHit?.();
    } else {
      // dragon fire: orange and yellow puffs in front of the dragon's mouth
      audio.play('fireBreath');
      const mouthX = player.x + facing * 60;
      for (let i = 0; i < 7; i++) {
        const puff = scene.add.circle(mouthX, player.y + 8, 10, i % 2 ? 0xff9800 : 0xfdd835).setDepth(4);
        scene.tweens.add({ targets: puff, x: mouthX + facing * (40 + i * 18), y: puff.y + Phaser.Math.Between(-20, 20), scale: 2, alpha: 0, duration: 380, onComplete: () => puff.destroy() });
      }
      const x = facing > 0 ? mouthX : mouthX - FIRE_REACH;
      if (scene.hitArea(new Phaser.Geom.Rectangle(x, player.y - 30, FIRE_REACH, 70), 2, player)) player.landedHit?.();
    }
  }
}
