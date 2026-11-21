import Phaser from 'phaser';
import { audio } from './audio.js';
import { t } from './i18n.js';

// BUILDING BRICKS (Ethan, 2026-11-21): the special prize for the UNTOUCHABLE trophy (beat the Bad Guy King
// without getting hurt, trophies.js). In the side-scrollers, K (or SELECT on a controller) snaps a toy brick
// in front of your feet. No cooldown! Pressing again in the same spot stacks them: stairs, towers, a bridge over
// lava (walk onto a brick, place the next one), or a wall that stops bad guys' shots (bricks are this.solids).
// The rides (fighter jet, race car, brick dragon, with a cooldown) come later.

const SIZE = 32;
const MOST = 80; // after this many, the oldest brick pops (so a level never fills up)
const COLORS = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xfb8c00, 0xffffff];

function makeTextures(scene) {
  COLORS.forEach((color, i) => {
    const key = `brick-${i}`;
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ add: false });
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(25).color;
    // the studs on top
    g.fillStyle(color).fillRect(5, 0, 8, 5).fillRect(19, 0, 8, 5);
    g.fillStyle(dark).fillRect(5, 4, 8, 1).fillRect(19, 4, 8, 1);
    // the brick
    g.fillStyle(color).fillRect(0, 4, SIZE, SIZE);
    g.fillStyle(dark).fillRect(0, SIZE, SIZE, 4).fillRect(SIZE - 3, 4, 3, SIZE);
    g.lineStyle(2, 0x000000, 0.6).strokeRect(1, 5, SIZE - 2, SIZE - 2);
    g.generateTexture(key, SIZE, SIZE + 4);
    g.destroy();
  });
}

export class Bricks {
  constructor(scene) {
    this.scene = scene;
    this.list = []; // { x, y (top), image, zone }
    makeTextures(scene);
  }

  get status() {
    return `K = 🧱 ${t('bricks.name')}`;
  }

  // A brick in the column in front of the player, at their feet, or on top of the bricks already there.
  place(player) {
    const scene = this.scene;
    const facing = player.facing ?? 1;
    const body = player.sprite.body;
    const x = Math.floor((player.x + facing * (body.width / 2 + SIZE / 2 + 2)) / SIZE) * SIZE;
    let y = Math.round(body.bottom) - SIZE;
    const column = this.list.filter((b) => b.x === x);
    for (let tries = 0; tries < 50; tries++) {
      const hit = column.find((b) => Math.abs(b.y - y) < SIZE);
      if (!hit) break;
      y = hit.y - SIZE;
    }
    const image = scene.add.image(x, y - 4, `brick-${Math.floor(Math.random() * COLORS.length)}`).setOrigin(0, 0).setDepth(1.5);
    const zone = scene.add.zone(x, y, SIZE, SIZE).setOrigin(0, 0);
    scene.solids.add(zone);
    const brick = { x, y, image, zone };
    this.list.push(brick);
    audio.play('click');
    // snap! (a tiny drop into place)
    image.y -= 10;
    scene.tweens.add({ targets: image, y: y - 4, duration: 90, ease: 'Quad.easeIn' });
    if (this.list.length > MOST) this.remove(this.list[0]);
  }

  remove(brick) {
    this.list = this.list.filter((b) => b !== brick);
    brick.zone.destroy();
    this.scene.tweens.add({ targets: brick.image, alpha: 0, scale: 0.5, duration: 200, onComplete: () => brick.image.destroy() });
  }
}
