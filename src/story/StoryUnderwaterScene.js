import Phaser from 'phaser';
import { audio } from '../audio.js';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../scenes/SideScrollerScene.js';
import { createUnderwaterTextures, drawDome, drawCoralHouse, drawPillar, drawSeaweed } from '../art/underwater.js';
import { StoryLevelScene } from './StoryLevelScene.js';
import { PLACES } from './story.js';

// THE BAD GUY KING, place 2: 🌊 Underwater City (Ethan's round 7 design). You walk on the sea floor, but the
// deep trenches are water you SWIM through (press jump again and again; you sink slowly). In deep water your
// AIR bar goes down: grab air bubbles, or rest in a glass dome (air inside!). No air = a heart every few seconds.
// Bad guys: bouncy jellyfish (jump on top = launch, touch from the side = zap), octopuses that shoot ink
// (splotches cover the screen until you shake them off by moving), and robot sharks that fire torpedoes.
// At the end, the invisible Dark Supa Chameleon guards the Supa Chameleon trophy: follow its bubbles!

const PLACE = PLACES.find((p) => p.id === 'underwater');
const ARENA_START = 4000;
const LEVEL_WIDTH = ARENA_START + VIEW_WIDTH;
const FLOOR = 440;
const TRENCH = 510; // the bottom of the deep water

// Sea floor: [x, width, top]. The low parts are deep water.
const GROUND = [
  [0, 560, 440],
  [560, 700, TRENCH],
  [1260, 460, 430],
  [1720, 760, TRENCH],
  [2480, 420, 420],
  [2900, 700, TRENCH],
  [3600, 400, 440],
  [ARENA_START, VIEW_WIDTH, FLOOR], // the sunken ruins, where the copy waits
];
const DEEP = [
  [560, 1260],
  [1720, 2480],
  [2900, 3600],
];
const DOMES = [
  [40, 420],
  [1300, 1660],
  [3620, 3980],
];
const AIR_BUBBLES = [
  [760, 420],
  [1050, 470],
  [1950, 430],
  [2250, 470],
  [3100, 440],
  [3400, 470],
];
const JELLYFISH = [
  [880, 440],
  [2080, 420],
  [3250, 430],
];
const SHARKS = [
  [1150, 370],
  [2350, 350],
  [3480, 370],
];
const OCTOPUSES = [
  [1960, 330],
  [2720, 330],
  [3820, 350],
];
const BOLTS = [
  [200, 400, 3],
  [700, 380, 3],
  [1100, 450, 2],
  [1400, 390, 3],
  [1900, 400, 3],
  [2600, 380, 2],
  [3000, 420, 3],
  [3700, 400, 2],
];

const AIR_MAX = 100;
const AIR_SECONDS = 9; // a full air bar lasts this long in deep water
const DOME_REFILL = 60; // air per second inside a dome
const BUBBLE_AIR = 50;
const GASP_EVERY_MS = 2500; // out of air: lose a heart this often
const SWIM_STROKE = 330;
const SINK_SPEED = 160;
const WATER_GRAVITY = -1100; // added to the world's gravity in deep water (so you sink slowly)
const JELLY_BOUNCE = 560;

const TROPHY = { x: LEVEL_WIDTH - 130, y: FLOOR };
const COPY_HOME = { x: LEVEL_WIDTH - 320, y: FLOOR - 40 };
const COPY_HIDDEN_ALPHA = 0.06; // invisible... almost

export class StoryUnderwaterScene extends StoryLevelScene {
  constructor() {
    super(
      'StoryUnderwater',
      {
        world: 'Underwater',
        titleKey: 'story.place.underwater',
        keyId: 'story-underwater',
        bossName: 'story.darkChameleon',
        disco: { x: 2180, y: 482, prop: 'clam', ground: 510 }, // the secret disco: a giant clam at the bottom of a deep trench
        width: LEVEL_WIDTH,
        arenaStart: ARENA_START,
        start: { x: 120, y: 360 },
        arenaCheckpoint: { x: ARENA_START + 100, y: 360 },
        bolts: BOLTS,
        sunglasses: [],
        apples: [],
        robots: [],
        tips: [
          ['air', 430, 760, 420],
          ['jelly', 700, 880, 440],
        ],
      },
      { place: PLACE, trophy: TROPHY },
    );
  }

  create(data = {}) {
    createUnderwaterTextures(this);
    super.create(data);
    this.air = AIR_MAX;
    this.nextGaspAt = 0;
    this.inkSplats = [];
    this.createSeaCreatures();
    this.createAirBubbles();
    this.createInk();
    this.createAirBar();
  }

  groundAt(x) {
    const found = GROUND.find(([gx, width]) => x >= gx && x <= gx + width);
    return found && { x: found[0], width: found[1], top: found[2] };
  }

  inDeepWater(player = this.player) {
    return DEEP.some(([from, to]) => player.x > from && player.x < to);
  }

  inDome(player = this.player) {
    return DOMES.some(([from, to]) => player.x > from && player.x < to);
  }

  // A heart lost the normal way (or out of air) brings back full air
  respawn() {
    super.respawn();
    this.air = AIR_MAX;
  }

  // ---------- The sea ----------

  createScenery() {
    this.cameras.main.setBackgroundColor(0x01579b);
    const sea = this.add.graphics().setScrollFactor(0);
    for (let i = 0; i < 10; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(0x0288d1),
        Phaser.Display.Color.IntegerToColor(0x002f4f),
        9,
        i,
      );
      sea.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      sea.fillRect(0, i * 54, VIEW_WIDTH, 54);
    }
    // Sunbeams from the surface
    const rays = this.add.graphics().setScrollFactor(0.3);
    rays.fillStyle(0xffffff, 0.07);
    for (let i = 0; i < 12; i++) rays.fillTriangle(i * 420, 0, i * 420 + 90, 0, i * 420 - 120, 540);
    // Bubbles floating up
    this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        const view = this.cameras.main.worldView;
        const bubble = this.add.circle(view.x + Phaser.Math.Between(0, VIEW_WIDTH), VIEW_HEIGHT, Phaser.Math.Between(2, 6), 0xe1f5fe, 0.6).setDepth(1);
        this.tweens.add({ targets: bubble, y: Phaser.Math.Between(40, 300), x: bubble.x + Phaser.Math.Between(-30, 30), alpha: 0, duration: Phaser.Math.Between(2500, 4500), onComplete: () => bubble.destroy() });
      },
    });

    const back = this.add.graphics();
    for (const [from, to] of DOMES) drawDome(back, from, to, this.groundAt(from + 10).top);
    // Coral houses in the second dome, and some outside
    [[1320, 70, 90, 0xff7043], [1420, 80, 120, 0xec407a], [1540, 70, 100, 0xab47bc], [3660, 70, 90, 0xff8a65]].forEach(([x, w, h, color]) => drawCoralHouse(back, x, this.groundAt(x).top, w, h, color));
    // Old ruins
    [[2520, 140], [2640, 90], [2800, 160], [ARENA_START + 60, 180], [ARENA_START + 420, 120], [ARENA_START + 720, 200]].forEach(([x, h]) => drawPillar(back, x, this.groundAt(x).top, h));
    for (let x = 600; x < 3600; x += 170) drawSeaweed(back, x, this.groundAt(x)?.top ?? TRENCH, 40 + (x % 3) * 20);

    const sand = this.add.graphics();
    this.solids = this.physics.add.staticGroup();
    for (const [x, width, top] of GROUND) {
      sand.fillStyle(0xd7c08a);
      sand.fillRect(x, top, width, VIEW_HEIGHT - top);
      sand.fillStyle(0xc2a66b);
      sand.fillRect(x, top, width, 8);
      sand.fillStyle(0xa1887f);
      for (let rx = x + 30; rx < x + width - 20; rx += 90) sand.fillEllipse(rx, top + 16, 26, 10);
      this.solids.add(this.add.zone(x, top, width, VIEW_HEIGHT - top).setOrigin(0, 0));
    }
    this.platforms = this.physics.add.staticGroup();
    this.createTrophy();
  }

  updateScenery() {}

  // ---------- Jellyfish, robot sharks and octopuses ----------

  createSeaCreatures() {
    // Jellyfish bob up and down. They can't be beaten: bounce on them!
    this.jellies = this.physics.add.group({ allowGravity: false, immovable: true });
    JELLYFISH.forEach(([x, y], i) => {
      const jelly = this.jellies.create(x, y, 'jellyfish').setScale(1.2);
      jelly.body.setSize(50, 40).setOffset(3, 2);
      this.tweens.add({ targets: jelly, y: y - 70, duration: 1800 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    for (const player of this.players) this.physics.add.overlap(player.sprite, this.jellies, (sprite, jelly) => this.touchJelly(jelly, player));

    // Sharks and octopuses are normal bad guys (laser them or stomp them) that shoot their own way.
    SHARKS.forEach(([x, y], i) => {
      const shark = this.badGuys.create(x, y, 'robot-shark').setScale(1.2);
      shark.setData({ kind: 'shark', bob: true, faces: true, baseY: y, phase: i, nextShotAt: 0, shotEveryMs: 2800, shoot: (s, dir) => this.fireTorpedo(s, dir) });
    });
    OCTOPUSES.forEach(([x, y], i) => {
      const octopus = this.badGuys.create(x, y, 'octopus').setScale(1.1);
      octopus.setData({ kind: 'octopus', bob: true, baseY: y, phase: i + 2, nextShotAt: 0, shotEveryMs: 2400, shoot: (o) => this.shootInk(o) });
    });
  }

  touchJelly(jelly, player) {
    const body = player.sprite.body;
    // On top = your middle is above the jelly's middle (it moves up and down, so be generous)
    if (player.y < jelly.y - 12) {
      if (body.velocity.y < -60) return; // already bouncing off it
      // BOING!
      // (The hero's "let go of jump = small hop" rule would cut this short, so the scene keeps it going)
      this.launch = { player, vy: -JELLY_BOUNCE };
      player.sprite.setVelocityY(-JELLY_BOUNCE);
      audio.play('bounce');
      this.tweens.add({ targets: jelly, scaleY: 0.8, duration: 100, yoyo: true });
    } else {
      this.hurt(jelly.x, player); // ZAP!
    }
  }

  fireTorpedo(shark, dir) {
    this.enemyShoot(shark.x + dir * 60, shark.y + 12, dir * this.settings.enemyShotSpeed * 0.8, 0, 'torpedo');
  }

  // ---------- Octopus ink: splotches on your screen ----------

  createInk() {
    this.inkShots = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.inkShots, this.solids, (shot) => shot.destroy());
    for (const player of this.players) {
      this.physics.add.overlap(player.shield, this.inkShots, (shield, shot) => shot.destroy());
      this.physics.add.overlap(player.sprite, this.inkShots, (sprite, shot) => {
        shot.destroy();
        if (player.invisible) return;
        this.splatInk();
      });
    }
  }

  shootInk(octopus) {
    const target = this.nearestPlayer(octopus.x);
    const angle = Phaser.Math.Angle.Between(octopus.x, octopus.y, target.x, target.y);
    const speed = this.settings.enemyShotSpeed * 0.7;
    const shot = this.inkShots.create(octopus.x, octopus.y + 10, 'ink-shot');
    shot.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    audio.play('enemyShot');
    this.time.delayedCall(3000, () => shot.destroy());
  }

  // 3 ink splotches land on the screen. Moving fast shakes them off.
  splatInk() {
    audio.play('splat');
    for (let i = 0; i < 3; i++) {
      const x = Phaser.Math.Between(160, 800);
      const y = Phaser.Math.Between(130, 420);
      const g = this.add.graphics().setScrollFactor(0).setDepth(9);
      g.fillStyle(0x1a1a2e, 0.92);
      g.fillCircle(x, y, Phaser.Math.Between(50, 75));
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * Math.PI * 2 + i;
        g.fillCircle(x + Math.cos(angle) * 70, y + Math.sin(angle) * 60, Phaser.Math.Between(12, 24));
      }
      this.inkSplats.push({ g, life: 1 });
    }
    this.time.delayedCall(10, () => this.showTip('ink', this.player.x, this.player.y));
  }

  updateInk(delta) {
    const body = this.player.sprite.body;
    const speed = Math.abs(body.velocity.x) + Math.abs(body.velocity.y) * 0.5;
    for (const splat of this.inkSplats) {
      splat.life -= (delta / 1000) * (0.07 + speed / 1500);
      splat.g.setAlpha(Math.max(0, splat.life));
      if (splat.life <= 0) splat.g.destroy();
    }
    this.inkSplats = this.inkSplats.filter((splat) => splat.life > 0);
  }

  // ---------- Air ----------

  createAirBubbles() {
    this.airBubbles = this.physics.add.staticGroup();
    for (const [x, y] of AIR_BUBBLES) {
      const bubble = this.airBubbles.create(x, y, 'air-bubble');
      this.tweens.add({ targets: bubble, scale: 1.12, duration: 600, yoyo: true, repeat: -1 });
    }
    for (const player of this.players) {
      this.physics.add.overlap(player.sprite, this.airBubbles, (sprite, bubble) => {
        bubble.disableBody(true, true);
        this.air = Math.min(AIR_MAX, this.air + BUBBLE_AIR);
        audio.play('crystal');
        this.time.delayedCall(5000, () => bubble.enableBody(false, 0, 0, true, true));
      });
    }
  }

  createAirBar() {
    const y = this.heroes.length > 1 ? 142 : 124;
    this.airLabel = this.add.text(16, y, '💨', { fontSize: '18px' }).setScrollFactor(0).setDepth(10).setOrigin(0, 0.5);
    this.airBack = this.add.rectangle(46, y, 164, 16, 0x000000, 0.6).setOrigin(0, 0.5).setStrokeStyle(2, 0xffffff).setScrollFactor(0).setDepth(10);
    this.airFill = this.add.rectangle(48, y, 160, 12, 0x4fc3f7).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10);
  }

  updateAir(delta) {
    const deep = this.players.some((player) => this.inDeepWater(player));
    if (deep) this.air = Math.max(0, this.air - (AIR_MAX / AIR_SECONDS) * (delta / 1000));
    if (this.players.some((player) => this.inDome(player))) this.air = Math.min(AIR_MAX, this.air + DOME_REFILL * (delta / 1000));
    this.airFill.width = (160 * this.air) / AIR_MAX;
    this.airFill.setFillStyle(this.air < 30 ? 0xff5252 : 0x4fc3f7);
    const show = deep || this.air < AIR_MAX;
    for (const part of [this.airLabel, this.airBack, this.airFill]) part.setVisible(show);

    // Out of air: a heart every few seconds, until you find air
    if (this.air <= 0 && deep && this.time.now >= this.nextGaspAt) {
      this.nextGaspAt = this.time.now + GASP_EVERY_MS;
      audio.play('hurt');
      this.cameras.main.flash(150, 255, 80, 80);
      this.loseHeart();
    } else if (this.air > 0) {
      this.nextGaspAt = this.time.now + 600;
    }
  }

  // ---------- Swimming ----------

  update(time, delta) {
    const playing = !this.won && !this.tip && !this.cutscene && !this.dancing;
    if (playing) {
      for (const player of this.players) {
        const deep = this.inDeepWater(player);
        const body = player.sprite.body;
        body.setGravityY(deep ? WATER_GRAVITY : 0);
        if (deep && player.controls.justPressed('jump')) {
          // Swim stroke (it uses up this jump press, so the hero doesn't also jump)
          player.sprite.setVelocityY(-SWIM_STROKE);
          const puff = this.add.circle(player.x, player.y + 20, 8, 0xe1f5fe, 0.7).setDepth(3);
          this.tweens.add({ targets: puff, y: puff.y - 30, alpha: 0, duration: 400, onComplete: () => puff.destroy() });
        }
      }
    }
    super.update(time, delta);
    if (!playing) return;
    for (const player of this.players) {
      if (!this.inDeepWater(player)) continue;
      const body = player.sprite.body;
      // Sink slowly, and no rocket jumps from the trench floor (except bouncing off a jellyfish)
      if (body.velocity.y > SINK_SPEED) player.sprite.setVelocityY(SINK_SPEED);
      if (body.velocity.y < -SWIM_STROKE - 30 && this.launch?.player !== player) player.sprite.setVelocityY(-SWIM_STROKE);
    }
    // A jellyfish launch slows down like a normal jump in the water
    if (this.launch) {
      this.launch.vy += (this.physics.world.gravity.y + WATER_GRAVITY) * (delta / 1000);
      if (this.launch.vy >= -SWIM_STROKE) this.launch = null;
      else this.launch.player.sprite.setVelocityY(this.launch.vy);
    }
    this.updateAir(delta);
    this.updateInk(delta);
  }

  // ---------- Dark Supa Chameleon: invisible! Follow the bubbles ----------

  createBoss() {
    this.createCopy(COPY_HOME.x);
    this.copyVisibleUntil = 0;
    this.nextTrailAt = 0;
  }

  bossEntrance() {
    this.beamDownCopy(COPY_HOME.x, FLOOR);
    this.copyVisibleUntil = this.time.now + 2500; // you see it arrive, then it disappears
  }

  // Sneaks up on you (invisible), lunges at you, or spits shots. It shows itself only to attack.
  bossAction() {
    const target = this.nearestPlayer(this.boss.x);
    const dir = target.x < this.boss.x ? -1 : 1;
    const action = Phaser.Math.RND.pick(['sneak', 'sneak', 'lunge', 'spit']);
    if (action === 'sneak') {
      this.boss.setVelocityX(dir * 170);
    } else if (action === 'lunge') {
      this.copyVisibleUntil = this.time.now + 900;
      this.boss.setVelocity(dir * 460, this.boss.body.blocked.down ? -300 : 0);
      audio.play('tongue');
    } else {
      this.copyVisibleUntil = this.time.now + 900;
      for (const vy of [-90, 0, 90]) this.enemyShoot(this.boss.x + dir * 50, this.boss.y, dir * this.settings.enemyShotSpeed, vy);
    }
  }

  updateBoss() {
    const boss = this.boss;
    boss.setFlipX(this.nearestPlayer(boss.x).x < boss.x);
    if (boss.body.blocked.down) boss.setVelocityX(boss.body.velocity.x * 0.97);
    this.animateCopy();
    const visible = this.time.now < this.copyVisibleUntil;
    boss.setAlpha(visible ? 1 : COPY_HIDDEN_ALPHA);
    // A trail of little bubbles when it moves
    const moving = Math.abs(boss.body.velocity.x) > 30 || !boss.body.blocked.down;
    if (moving && this.time.now > this.nextTrailAt) {
      this.nextTrailAt = this.time.now + 90;
      const bubble = this.add.circle(boss.x + Phaser.Math.Between(-20, 20), boss.y + Phaser.Math.Between(-10, 20), Phaser.Math.Between(4, 8), 0xe1f5fe, 0.85).setDepth(3);
      bubble.setStrokeStyle(2, 0xffffff);
      this.tweens.add({ targets: bubble, y: bubble.y - 70, alpha: 0, duration: 1100, onComplete: () => bubble.destroy() });
    }
  }

  // Hit it, and you see it for a moment
  hitBoss(amount) {
    super.hitBoss(amount);
    this.copyVisibleUntil = Math.max(this.copyVisibleUntil, this.time.now + 300);
  }

  defeatBoss() {
    this.boss.setAlpha(1);
    this.copyVisibleUntil = Infinity;
    super.defeatBoss();
  }

  // The air bar hides while the trophy breaks
  dropKey() {
    for (const part of [this.airLabel, this.airBack, this.airFill]) part.setVisible(false);
    super.dropKey();
  }
}
