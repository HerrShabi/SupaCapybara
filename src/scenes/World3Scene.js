import Phaser from 'phaser';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { SideScrollerScene, VIEW_WIDTH, VIEW_HEIGHT } from './SideScrollerScene.js';
import { drawRock, drawLedge, drawVolcano, createVolcanoTextures, LAVA, LAVA_BRIGHT } from '../art/volcano.js';

// World 3: the volcano. Jump across rocks over lava while rocks fall from the sky.
// The last screen is the Lava Dragon's lair: it breathes fire, drops lava rocks, and makes the lava rise.

const ARENA_START = 4040;
const LEVEL_WIDTH = ARENA_START + VIEW_WIDTH;
const FLOOR = 440; // the lair's floor
const LAVA_TOP = 490; // the lava at the bottom of every pit

// Rock ground: [x, width, top]. The gaps are lava!
const GROUND = [
  [0, 620, 440],
  [740, 400, 400],
  [1260, 420, 440],
  [1800, 340, 380],
  [2260, 480, 430],
  [2860, 380, 370],
  [3360, 580, 440],
  [ARENA_START, VIEW_WIDTH, FLOOR], // the Lava Dragon's lair
];

// Floating rock ledges you can jump up through: [x, top, width]
const LEDGES = [
  [380, 320, 140],
  [1380, 320, 120],
  [1880, 270, 120],
  [2420, 310, 140],
  [2950, 260, 120],
  [3600, 330, 140],
  // In the lair: climb up here when the lava rises!
  [ARENA_START + 170, 320, 130],
  [ARENA_START + 415, 250, 130],
  [ARENA_START + 660, 320, 130],
];

const BOLTS = [
  [250, 400, 3],
  [410, 280, 3],
  [900, 360, 2],
  [1400, 280, 2],
  [1900, 230, 3],
  [2450, 270, 3],
  [2970, 220, 2],
  [3450, 400, 2],
];

const SUNGLASSES = [
  [560, 400],
  [2050, 340],
  [3150, 330],
];
const APPLES = [1500, 2600, 3800];
const ROBOTS = [
  [780, 1080],
  [3400, 3700],
];
// Horned knights guard bolts, flying back and forth: [fromX, toX, y]
const KNIGHTS = [
  [380, 560, 220],
  [1860, 2010, 170],
  [2920, 3060, 160],
];

const ROCK_EVERY_MS = 2600; // falling rocks in the level (slower on easier difficulties)
const ROCK_WARNING_MS = 700;
const DRAGON_HOME = { x: LEVEL_WIDTH - 210, y: FLOOR - 82 };
const LAVA_RISE_TOP = FLOOR - 70; // how high the lava rises in the lair
const LAVA_STAYS_MS = 2800;

export class World3Scene extends SideScrollerScene {
  constructor() {
    super('World3', {
      world: 3,
      keyId: 'world3',
      music: 'volcano',
      bossName: 'game.lavaDragon',
      width: LEVEL_WIDTH,
      arenaStart: ARENA_START,
      start: { x: 100, y: 360 },
      arenaCheckpoint: { x: ARENA_START + 100, y: 360 },
      bolts: BOLTS,
      sunglasses: SUNGLASSES,
      apples: APPLES,
      robots: ROBOTS,
      knights: KNIGHTS,
      fire: true,
      fallY: LAVA_TOP - 20,
    });
  }

  create(data) {
    createVolcanoTextures(this);
    super.create(data);
    this.createFallingRocks();
  }

  groundAt(x) {
    const found = GROUND.find(([gx, width]) => x >= gx && x <= gx + width);
    return found && { x: found[0], width: found[1], top: found[2] };
  }

  // ---------- The volcano ----------

  createScenery() {
    this.cameras.main.setBackgroundColor(0x2b0b0b);

    // Sky: dark at the top, glowing orange near the ground
    const sky = this.add.graphics().setScrollFactor(0);
    for (let i = 0; i < 10; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(0x1a0505),
        Phaser.Display.Color.IntegerToColor(0x8d2a0b),
        9,
        i,
      );
      sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      sky.fillRect(0, i * 54, VIEW_WIDTH, 54);
    }

    const far = this.add.graphics().setScrollFactor(0.2);
    drawVolcano(far, 700, 520);
    drawVolcano(far, 1500, 540);

    // Smoke puffs rising from the volcanoes, and embers floating up
    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        for (const x of [700, 1500]) {
          const puff = this.add.circle(x + Phaser.Math.Between(-20, 20), x === 700 ? 200 : 220, 22, 0x5d5d5d, 0.5).setScrollFactor(0.2);
          this.tweens.add({ targets: puff, y: puff.y - 160, scale: 3, alpha: 0, duration: 4000, onComplete: () => puff.destroy() });
        }
      },
    });
    this.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        const camera = this.cameras.main;
        const ember = this.add.image(camera.scrollX + Phaser.Math.Between(0, VIEW_WIDTH), VIEW_HEIGHT, 'ember').setDepth(1);
        this.tweens.add({
          targets: ember,
          y: Phaser.Math.Between(100, 350),
          x: ember.x + Phaser.Math.Between(-60, 60),
          alpha: 0,
          duration: Phaser.Math.Between(2000, 3500),
          onComplete: () => ember.destroy(),
        });
      },
    });

    // Lava at the bottom of every pit, with a shimmering top
    this.add.rectangle(0, LAVA_TOP, LEVEL_WIDTH, VIEW_HEIGHT - LAVA_TOP, LAVA).setOrigin(0, 0);
    const shimmer = this.add.rectangle(0, LAVA_TOP, LEVEL_WIDTH, 6, LAVA_BRIGHT).setOrigin(0, 0);
    this.tweens.add({ targets: shimmer, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    const rocks = this.add.graphics();
    this.solids = this.physics.add.staticGroup();
    for (const [x, width, top] of GROUND) {
      drawRock(rocks, { x, width, top, bottom: VIEW_HEIGHT });
      this.solids.add(this.add.zone(x, top, width, VIEW_HEIGHT - top).setOrigin(0, 0));
    }

    this.platforms = this.physics.add.staticGroup();
    for (const [x, top, width] of LEDGES) {
      drawLedge(rocks, { x, top, width });
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }

    // Lava in the lair, hidden below the floor until the dragon makes it rise
    this.lairLava = this.add.rectangle(ARENA_START, VIEW_HEIGHT, VIEW_WIDTH, 220, LAVA, 0.92).setOrigin(0, 0).setDepth(3);
    this.lairLavaTop = this.add.rectangle(ARENA_START, VIEW_HEIGHT, VIEW_WIDTH, 6, LAVA_BRIGHT).setOrigin(0, 0).setDepth(3);
  }

  updateScenery() {
    this.lairLavaTop.y = this.lairLava.y;
  }

  // ---------- Rocks falling from the sky ----------

  createFallingRocks() {
    this.hazards = this.physics.add.group();
    const breakRock = (rock) => {
      if (!rock.active) return;
      const dust = this.add.circle(rock.x, rock.y, 18, 0x8d6e63, 0.8).setDepth(2);
      this.tweens.add({ targets: dust, scale: 2.5, alpha: 0, duration: 300, onComplete: () => dust.destroy() });
      rock.destroy();
    };
    this.physics.add.collider(this.hazards, this.solids, breakRock);
    this.physics.add.collider(this.hazards, this.platforms, breakRock);
    for (const player of this.players) {
      this.physics.add.overlap(player.shield, this.hazards, (shield, rock) => breakRock(rock));
      this.physics.add.overlap(player.sprite, this.hazards, (sprite, rock) => {
        this.hurt(rock.x, player);
        breakRock(rock);
      });
    }

    this.time.addEvent({
      delay: ROCK_EVERY_MS * this.settings.enemyShotSlowdown,
      loop: true,
      callback: () => {
        if (this.bossStarted || this.won) return;
        const x = Phaser.Math.Clamp(this.leadX() + Phaser.Math.Between(-150, 450), 40, ARENA_START - 40);
        this.dropRock(x, ROCK_WARNING_MS);
      },
    });
  }

  // A red arrow warns you, then a lava rock falls at x.
  dropRock(x, warningMs) {
    const warning = this.add.image(x, 30, 'warning').setDepth(6);
    this.tweens.add({ targets: warning, alpha: 0.2, duration: 120, yoyo: true, repeat: -1 });
    audio.play('rockWarning');
    this.time.delayedCall(warningMs, () => {
      warning.destroy();
      if (this.won) return;
      const rock = this.hazards.create(x, -30, 'lava-rock');
      rock.setVelocityY(120);
      rock.setAngularVelocity(200);
      this.time.delayedCall(4000, () => rock.destroy());
    });
  }

  // ---------- The Lava Dragon ----------

  createBoss() {
    this.boss = this.physics.add.sprite(DRAGON_HOME.x, VIEW_HEIGHT + 120, 'lava-dragon');
    this.boss.body.setAllowGravity(false);
    this.boss.body.setSize(150, 120).setOffset(40, 40);
    this.boss.disableBody(true, true);
    this.lavaWasLast = false;
  }

  // Rises up out of the lava.
  bossEntrance() {
    this.boss.enableBody(true, DRAGON_HOME.x, VIEW_HEIGHT + 120, true, true);
    audio.play('lavaRise');
    this.cameras.main.shake(1500, 0.01);
    this.busy = true;
    this.tweens.add({
      targets: this.boss,
      y: DRAGON_HOME.y,
      duration: 1600,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.busy = false;
        this.startBossActions(1.3);
      },
    });
  }

  bossAction() {
    if (this.busy) return;
    const choices = this.lavaWasLast ? ['breath', 'rocks'] : ['breath', 'breath', 'rocks', 'lava'];
    const action = Phaser.Math.RND.pick(choices);
    this.lavaWasLast = action === 'lava';
    if (action === 'breath') this.breatheFire();
    if (action === 'rocks') this.flyAndDropRocks();
    if (action === 'lava') this.raiseLava();
  }

  // A stream of fire along the floor. Jump over it!
  breatheFire() {
    this.busy = true;
    const dir = this.nearestPlayer(this.boss.x).x < this.boss.x ? -1 : 1;
    const mouthX = this.boss.x + dir * 105;
    audio.play('fireBreath');
    for (let i = 0; i < 7; i++) {
      this.time.delayedCall(i * 110, () => {
        if (!this.bossHittable()) return;
        this.enemyShoot(mouthX, FLOOR - 18, dir * this.settings.enemyShotSpeed * 1.1, 0, 'fireball');
      });
    }
    this.time.delayedCall(1200, () => (this.busy = false));
  }

  // Flies up over you and drops lava rocks, then lands back home.
  flyAndDropRocks() {
    this.busy = true;
    const target = Phaser.Math.RND.pick(this.players);
    const overX = Phaser.Math.Clamp(target.x, ARENA_START + 150, LEVEL_WIDTH - 150);
    this.tweens.add({
      targets: this.boss,
      x: overX,
      y: 120,
      duration: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        for (let i = 0; i < 5; i++) {
          const x = Phaser.Math.Clamp(target.x + (i - 2) * 110, ARENA_START + 30, LEVEL_WIDTH - 30);
          this.time.delayedCall(i * 250, () => this.bossHittable() && this.dropRock(x, 450));
        }
        this.time.delayedCall(5 * 250 + 700, () => {
          if (!this.bossHittable()) return;
          this.tweens.add({
            targets: this.boss,
            x: DRAGON_HOME.x,
            y: DRAGON_HOME.y,
            duration: 900,
            ease: 'Sine.easeInOut',
            onComplete: () => (this.busy = false),
          });
        });
      },
    });
  }

  // The lava rises over the floor. Climb up onto the floating rocks!
  raiseLava() {
    this.busy = true;
    audio.play('lavaRise');
    const warning = this.bigMessage(t('game.lavaRising'), '#ff9100').setScale(0.7);
    this.time.delayedCall(1500, () => warning.destroy());
    this.tweens.add({
      targets: this.lairLava,
      y: LAVA_RISE_TOP,
      duration: 1500,
      ease: 'Sine.easeInOut',
      hold: LAVA_STAYS_MS,
      yoyo: true,
      onComplete: () => (this.busy = false),
    });
  }

  updateBoss() {
    this.boss.setFlipX(this.nearestPlayer(this.boss.x).x > this.boss.x); // the dragon is drawn facing left
    // Standing in the lava burns
    for (const player of this.players) {
      if (player.sprite.body.bottom > this.lairLava.y + 8) this.hurt(player.x, player);
    }
  }

  // The Shield bubble pushes the dragon back a little.
  pushBoss(dir) {
    if (this.busy) return;
    const x = Phaser.Math.Clamp(this.boss.x + dir * 120, ARENA_START + 120, LEVEL_WIDTH - 120);
    this.tweens.add({ targets: this.boss, x, duration: 250, ease: 'Back.easeOut' });
  }

  onBossDefeated() {
    this.tweens.killTweensOf(this.lairLava);
    this.tweens.add({ targets: this.lairLava, y: VIEW_HEIGHT, duration: 800 });
    this.hazards.clear(true, true);
  }

  winLines(firstTime) {
    return firstTime ? [t('game.allWorldsDone')] : [];
  }

  // The first time: the ending (fireworks, credits, secrets). After that, back to the menu.
  afterWin() {
    this.time.delayedCall(1500, () => this.scene.start(this.firstTime ? 'Ending' : 'Menu'));
  }
}
