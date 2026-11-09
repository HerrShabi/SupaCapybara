import Phaser from 'phaser';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { BOSS_REWARD } from '../difficulty.js';
import { SideScrollerScene, VIEW_WIDTH, VIEW_HEIGHT } from './SideScrollerScene.js';
import { createGrapeBossTextures } from '../art/grapeBoss.js';

// Boss Rush's middle fight (Ethan, 2026-11-09): Grape Boss in 2D, on a moon.
// Only Boss Rush comes here (World 2 itself is 3D). The whole level is the arena, so the fight starts right away.
// Jumps are floaty (low gravity), like World 2. His moves: a big jump onto you (a red mark shows where he'll land)
// that sends a ground pound wave both ways (jump over it), and shots from his two blasters.
// Beaten, he pops into a big grape juice splash and you go straight on to the Lava Dragon.

const FLOOR = 440;
const MOON_GRAVITY = 800; // (normal is 1400)
const HOME_Y = FLOOR - 80; // where Grape Boss stands (his middle)
const JUMP_HEIGHT = 300;
const JUMP_MS = 1300;
const MARK_MS = 600; // the red mark shows up this long before he jumps
const EDGE = 110; // he never lands closer to the screen's edge than this

// Floating moon rocks: [x, top, width]
const LEDGES = [
  [150, 300, 140],
  [670, 300, 140],
  [410, 210, 140],
];

export class GrapeMoonScene extends SideScrollerScene {
  constructor() {
    super('GrapeMoon', {
      world: 2,
      music: 'space',
      bossName: 'game.grapeBoss',
      width: VIEW_WIDTH,
      arenaStart: 0,
      start: { x: 120, y: 360 },
      arenaCheckpoint: { x: 120, y: 360 },
      bolts: [],
      sunglasses: [],
      apples: [],
      robots: [],
      bossRushNext: 'World3',
    });
  }

  create(data = {}) {
    createGrapeBossTextures(this);
    this.physics.world.gravity.y = MOON_GRAVITY;
    this.busy = false;
    this.mark = null;
    super.create({ ...data, bossRush: true });
  }

  groundAt(x) {
    return x >= 0 && x <= VIEW_WIDTH ? { x: 0, width: VIEW_WIDTH, top: FLOOR } : null;
  }

  // ---------- The moon ----------

  createScenery() {
    this.cameras.main.setBackgroundColor(0x050816);
    const sky = this.add.graphics();
    for (let i = 0; i < 120; i++) {
      sky.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 1));
      sky.fillCircle(Phaser.Math.Between(0, VIEW_WIDTH), Phaser.Math.Between(0, FLOOR - 20), Phaser.Math.FloatBetween(0.6, 1.8));
    }
    // The Earth far away
    sky.fillStyle(0x1e88e5);
    sky.fillCircle(820, 110, 46);
    sky.fillStyle(0x43a047);
    sky.fillEllipse(806, 98, 34, 22);
    sky.fillEllipse(838, 128, 26, 16);
    sky.fillStyle(0xffffff, 0.7);
    sky.fillEllipse(826, 80, 30, 7);
    // Some stars twinkle
    for (let i = 0; i < 12; i++) {
      const star = this.add.star(Phaser.Math.Between(20, VIEW_WIDTH - 20), Phaser.Math.Between(20, 380), 4, 1.5, 4, 0xfff59d);
      this.tweens.add({ targets: star, alpha: 0.2, duration: Phaser.Math.Between(500, 1200), yoyo: true, repeat: -1 });
    }

    // The moon's ground, grey with craters
    const ground = this.add.graphics();
    ground.fillStyle(0x9e9e9e);
    ground.fillRect(0, FLOOR, VIEW_WIDTH, VIEW_HEIGHT - FLOOR);
    ground.fillStyle(0xbdbdbd);
    ground.fillRect(0, FLOOR, VIEW_WIDTH, 8);
    for (const [x, y, w] of [[80, 480, 70], [300, 500, 46], [520, 470, 90], [760, 495, 60], [900, 470, 40]]) {
      ground.fillStyle(0x757575);
      ground.fillEllipse(x, y, w, w * 0.35);
      ground.fillStyle(0x616161);
      ground.fillEllipse(x, y + 2, w * 0.7, w * 0.22);
    }
    this.solids = this.physics.add.staticGroup();
    this.solids.add(this.add.zone(0, FLOOR, VIEW_WIDTH, VIEW_HEIGHT - FLOOR).setOrigin(0, 0));

    this.platforms = this.physics.add.staticGroup();
    for (const [x, top, width] of LEDGES) {
      ground.fillStyle(0x757575);
      ground.fillRoundedRect(x, top, width, 20, 10);
      ground.fillStyle(0xbdbdbd);
      ground.fillRoundedRect(x + 6, top + 2, width - 12, 6, 3);
      ground.fillStyle(0x616161);
      ground.fillCircle(x + width * 0.3, top + 12, 4);
      ground.fillCircle(x + width * 0.7, top + 13, 3);
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }
  }

  updateScenery() {}

  // ---------- Grape Boss ----------

  createBoss() {
    this.boss = this.physics.add.sprite(VIEW_WIDTH - 200, -200, 'grape-boss');
    this.boss.body.setAllowGravity(false);
    this.boss.body.setSize(110, 140).setOffset(30, 20);
    this.boss.disableBody(true, true);
  }

  // He drops out of the sky with a big ground pound.
  bossEntrance() {
    const x = VIEW_WIDTH - 200;
    this.boss.enableBody(true, x, -200, true, true);
    this.busy = true;
    this.tweens.add({
      targets: this.boss,
      y: HOME_Y,
      duration: 1100,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.pound(false);
        this.busy = false;
        this.startBossActions(1.2);
      },
    });
  }

  bossAction() {
    if (this.busy) return;
    if (Math.random() < 0.55) this.bigJump();
    else this.blast();
  }

  // The red mark shows where he'll land, then he jumps high and comes down right there.
  bigJump() {
    this.busy = true;
    const targetX = Phaser.Math.Clamp(this.nearestPlayer(this.boss.x).x, EDGE, VIEW_WIDTH - EDGE);
    const mark = this.add.ellipse(targetX, FLOOR + 2, 120, 22).setStrokeStyle(5, 0xff1744).setDepth(1.5);
    this.mark = mark;
    this.tweens.add({ targets: mark, alpha: 0.3, duration: 150, yoyo: true, repeat: -1 });
    audio.play('rockWarning');
    this.time.delayedCall(MARK_MS, () => {
      if (!this.bossHittable()) return;
      audio.play('jump');
      const fromX = this.boss.x;
      const jump = { k: 0 };
      this.tweens.add({
        targets: jump,
        k: 1,
        duration: JUMP_MS * (this.bossSlowed ? 1.5 : 1),
        onUpdate: () => {
          if (!this.boss.active) return;
          this.boss.x = Phaser.Math.Linear(fromX, targetX, jump.k);
          this.boss.y = HOME_Y - Math.sin(Math.PI * jump.k) * JUMP_HEIGHT;
        },
        onComplete: () => {
          if (!this.bossHittable()) return;
          this.pound(true);
          this.time.delayedCall(500, () => (this.busy = false));
        },
      });
    });
  }

  // Lands with a BOOM; a wave rolls out both ways along the ground. Jump over it!
  pound(waves) {
    this.mark?.destroy();
    this.mark = null;
    audio.play('pound');
    this.cameras.main.shake(300, 0.015);
    for (let i = 0; i < 8; i++) {
      const dust = this.add.circle(this.boss.x + Phaser.Math.Between(-80, 80), FLOOR - 4, Phaser.Math.Between(8, 16), 0xbdbdbd, 0.9).setDepth(3);
      this.tweens.add({ targets: dust, y: dust.y - Phaser.Math.Between(20, 60), scale: 2.2, alpha: 0, duration: 700, onComplete: () => dust.destroy() });
    }
    if (!waves) return;
    for (const dir of [-1, 1]) {
      const wave = this.enemyShoot(this.boss.x + dir * 60, FLOOR - 21, dir * this.settings.enemyShotSpeed * 1.1, 0, 'grape-wave');
      wave.body.setSize(36, 30).setOffset(6, 8);
      wave.setFlipX(dir < 0);
    }
  }

  // Both blasters: three rounds of glowing grape shots aimed at you.
  blast() {
    this.busy = true;
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 350, () => {
        if (!this.bossHittable()) return;
        const target = this.nearestPlayer(this.boss.x);
        const dir = target.x < this.boss.x ? -1 : 1;
        const x = this.boss.x + dir * 78;
        const y = this.boss.y + 14;
        const angle = Phaser.Math.Angle.Between(x, y, target.x, target.y);
        const speed = this.settings.enemyShotSpeed * 1.2;
        for (const spread of [-0.12, 0.12]) {
          this.enemyShoot(x, y, Math.cos(angle + spread) * speed, Math.sin(angle + spread) * speed, 'grape-shot');
        }
      });
    }
    this.time.delayedCall(1300, () => (this.busy = false));
  }

  updateBoss() {}

  // The Shield bubble pushes him back a little (not in the middle of a jump).
  pushBoss(dir) {
    if (this.busy) return;
    const x = Phaser.Math.Clamp(this.boss.x + dir * 120, EDGE, VIEW_WIDTH - EDGE);
    this.tweens.add({ targets: this.boss, x, duration: 250, ease: 'Back.easeOut' });
  }

  // POP! A big grape juice splash, then straight on to the next boss.
  defeatBoss() {
    const { x, y } = this.boss;
    this.bossTimer?.remove();
    this.tweens.killTweensOf(this.boss);
    this.boss.disableBody(true, true);
    this.mark?.destroy();
    this.enemyShots.clear(true, true);
    audio.stopMusic();
    audio.play('splat');
    audio.play('explosion');
    this.cameras.main.shake(600, 0.02);
    this.cameras.main.flash(250, 206, 147, 216);
    this.addBolts(BOSS_REWARD, x, y - 90);

    // Juice everywhere, and a purple puddle where he stood
    const puddle = this.add.ellipse(x, FLOOR + 4, 20, 8, 0x8e24aa).setDepth(1.5);
    this.tweens.add({ targets: puddle, scaleX: 12, scaleY: 3, duration: 500, ease: 'Quad.easeOut' });
    for (let i = 0; i < 30; i++) {
      const drop = this.add.circle(x, y, Phaser.Math.Between(6, 16), Phaser.Math.RND.pick([0x7b1fa2, 0x9c27b0, 0xce93d8, 0x4a148c])).setDepth(5);
      const angle = Phaser.Math.FloatBetween(-Math.PI, 0);
      const distance = Phaser.Math.Between(80, 260);
      this.tweens.add({
        targets: drop,
        x: x + Math.cos(angle) * distance,
        y: Math.min(FLOOR - 4, y + Math.sin(angle) * distance + 120),
        scale: 0.4,
        duration: Phaser.Math.Between(600, 1000),
        ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: drop, alpha: 0, duration: 600, onComplete: () => drop.destroy() }),
      });
    }
    const splash = this.bigMessage(t('game.grapeSplash'), '#ea80fc');
    this.tweens.add({ targets: splash, scale: 1.2, duration: 200, yoyo: true });
    this.time.delayedCall(1400, () => {
      splash.destroy();
      this.danceThen(() => this.win());
    });
  }
}
