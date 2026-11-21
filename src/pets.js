import Phaser from 'phaser';

// PETS (Ethan, 2026-11-21): a little buddy that follows your hero in the side-scrolling worlds and grabs bolts
// for you. Bought in the supermarket's PETS aisle (shopItems.js); buying one makes it your pet (save.pet,
// owned ones in save.pets). Bad guys never hurt it (it has no body: it just flies/runs to things).
// Later: pets in the 3D worlds, hats for pets.

export const PETS = [
  { id: 'puppy', icon: '🐶', price: 400 },
  { id: 'kitten', icon: '🐱', price: 400 },
  { id: 'penguin', icon: '🐧', price: 500 },
  { id: 'babyDragon', icon: '🐉', price: 800, flies: true },
];

const REACH = 260; // it goes for bolts this close to the hero
const SPEED = 520; // pixels per second when it runs for a bolt

// Little drawings (facing right), 30 x 26
function makeTextures(scene) {
  if (scene.textures.exists('pet-puppy')) return;
  const draw = (id, paint) => {
    const g = scene.make.graphics({ add: false });
    paint(g);
    g.generateTexture(`pet-${id}`, 30, 26);
    g.destroy();
  };
  draw('puppy', (g) => {
    g.fillStyle(0xc68642).fillRoundedRect(4, 10, 18, 10, 4).fillCircle(22, 9, 6); // body, head
    g.fillStyle(0x8d5524).fillRect(17, 3, 4, 8).fillRect(5, 6, 3, 6); // ear, tail
    g.fillRect(6, 19, 3, 6).fillRect(17, 19, 3, 6); // legs
    g.fillStyle(0x000000).fillCircle(24, 8, 1.5).fillCircle(28, 10, 1.5); // eye, nose
  });
  draw('kitten', (g) => {
    g.fillStyle(0xffa726).fillRoundedRect(4, 11, 17, 9, 4).fillCircle(22, 10, 6);
    g.fillTriangle(17, 6, 20, 0, 22, 5).fillTriangle(23, 5, 26, 0, 27, 6); // ears
    g.fillRect(1, 6, 3, 9); // tail up
    g.fillStyle(0xe65100).fillRect(8, 11, 2, 9).fillRect(13, 11, 2, 9); // stripes
    g.fillStyle(0xffa726).fillRect(6, 19, 3, 6).fillRect(16, 19, 3, 6);
    g.fillStyle(0x000000).fillCircle(24, 9, 1.5);
    g.fillStyle(0xff80ab).fillCircle(27, 12, 1.2);
  });
  draw('penguin', (g) => {
    g.fillStyle(0x263238).fillEllipse(14, 14, 16, 22);
    g.fillStyle(0xffffff).fillEllipse(16, 16, 9, 15);
    g.fillStyle(0x000000).fillCircle(18, 7, 1.5);
    g.fillStyle(0xff9800).fillTriangle(21, 8, 21, 11, 26, 9).fillRect(10, 24, 4, 2).fillRect(16, 24, 4, 2);
  });
  draw('babyDragon', (g) => {
    g.fillStyle(0x7cb342).fillRoundedRect(6, 11, 16, 10, 4).fillCircle(23, 10, 6);
    g.fillTriangle(2, 18, 7, 13, 7, 19); // tail
    g.fillStyle(0xaed581).fillTriangle(9, 11, 17, 11, 12, 1); // wing
    g.fillStyle(0xffffff).fillCircle(25, 8, 2);
    g.fillStyle(0x000000).fillCircle(25.5, 8, 1);
    g.fillStyle(0xff7043).fillTriangle(20, 4, 22, 0, 24, 4); // little horn
  });
}

export class Pet {
  constructor(scene, player, id) {
    this.scene = scene;
    this.player = player;
    this.data = PETS.find((p) => p.id === id) ?? PETS[0];
    makeTextures(scene);
    this.image = scene.add.image(player.x - 40, player.y + 10, `pet-${this.data.id}`).setScale(1.3).setDepth(1.9);
    this.target = null; // the bolt it's running to
  }

  update(delta) {
    const scene = this.scene;
    const player = this.player;
    const dt = delta / 1000;
    const now = scene.time.now;
    const image = this.image;

    // Look for a bolt near the hero (only ones still there)
    if (!this.target || !this.target.active) {
      this.target = null;
      let best = REACH;
      for (const bolt of scene.bolts?.getChildren() ?? []) {
        if (!bolt.active) continue;
        const distance = Phaser.Math.Distance.Between(player.x, player.y, bolt.x, bolt.y);
        if (distance < best) {
          best = distance;
          this.target = bolt;
        }
      }
    }

    if (this.target) {
      // Zoom to the bolt and grab it
      const bolt = this.target;
      const angle = Phaser.Math.Angle.Between(image.x, image.y, bolt.x, bolt.y);
      const step = SPEED * dt;
      if (Phaser.Math.Distance.Between(image.x, image.y, bolt.x, bolt.y) <= step + 6) {
        image.setPosition(bolt.x, bolt.y);
        scene.collectBolt(bolt);
        this.target = null;
        const pop = scene.add.circle(bolt.x, bolt.y, 10, 0xfff59d, 0.9).setDepth(3);
        scene.tweens.add({ targets: pop, scale: 2.2, alpha: 0, duration: 300, onComplete: () => pop.destroy() });
      } else {
        image.x += Math.cos(angle) * step;
        image.y += Math.sin(angle) * step;
      }
      image.setFlipX(bolt.x < image.x);
      return;
    }

    // Follow the hero: a little behind, at their feet (the baby dragon floats by their shoulder)
    const facing = player.facing ?? 1;
    const homeX = player.x - facing * 46;
    const homeY = this.data.flies ? player.y - 26 + Math.sin(now / 250) * 5 : player.sprite.body.bottom - 16;
    const k = Math.min(1, dt * 8);
    const moving = Math.abs(homeX - image.x) > 4;
    image.x += (homeX - image.x) * k;
    image.y += (homeY - image.y) * k;
    if (!this.data.flies && moving) image.y -= Math.abs(Math.sin(now / 70)) * 3; // little hops
    image.setFlipX(facing < 0);
  }

  destroy() {
    this.image.destroy();
  }
}
