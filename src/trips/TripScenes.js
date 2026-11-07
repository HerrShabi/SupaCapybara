import Phaser from 'phaser';
import { audio } from '../audio.js';
import { TripScene, RunnerTrip, VIEW_WIDTH, VIEW_HEIGHT } from './TripScene.js';

// The 5 trips between worlds (Ethan's round 10 design, see worlds.js and GAME_DESIGN.md).

// Floors one after another: widths, gaps and how high each one is
function floorsFrom(list, startX = 0) {
  let x = startX;
  return list.map(([width, top, gapAfter = 0]) => {
    const floor = { x, width, top };
    x += width + gapAfter;
    return floor;
  });
}

// Three bolts in an arc over a gap or an obstacle at x
function arcOver(x, top) {
  return [[x - 45, top - 85], [x, top - 120], [x + 45, top - 85]];
}

// ---------- World 3 → 4: 🎈 the balloon ride ----------
// Steer the balloon (◀ ▶) up through the sky. Storm clouds come down: shoot them (X) for bolts,
// or get zapped (a few bolts). At the top, the Cloud Kingdom!

const BALLOON_SECONDS = 24;
const BALLOON_SPEED = 260;
const CLOUD_SPEED = 150;

export class TripBalloonScene extends TripScene {
  static helpKey = 'balloon';

  constructor() {
    super('TripBalloon', { titleKey: 'trip.balloon', touch: { left: true, right: true } });
  }

  buildTrip() {
    this.cameras.main.setBackgroundColor(0x4fc3f7);
    const sky = this.add.graphics();
    for (let i = 0; i < 10; i++) sky.fillStyle(Phaser.Display.Color.GetColor(79 + i * 8, 195 - i * 4, 247)).fillRect(0, i * 54, VIEW_WIDTH, 54);
    // Puffy clouds drifting down, so it feels like going up
    this.puffs = Array.from({ length: 8 }, (_, i) => this.add.ellipse((i * 137) % VIEW_WIDTH, (i * 89) % VIEW_HEIGHT, 140, 50, 0xffffff, 0.6));
    // The volcano far below at the start
    this.volcano = this.add.triangle(480, 640, 0, 200, 220, 0, 440, 200, 0x5d4037);

    this.balloon = this.add.container(480, 330).setDepth(5);
    const g = this.add.graphics();
    g.fillStyle(0xe53935).fillCircle(0, -110, 70);
    g.fillStyle(0xffeb3b).fillRect(-14, -178, 28, 136).fillRect(-58, -120, 116, 18);
    g.lineStyle(3, 0x5d4037).lineBetween(-40, -55, -30, 0).lineBetween(40, -55, 30, 0);
    g.fillStyle(0x8d6e63).fillRoundedRect(-36, 0, 72, 40, 8);
    const hero = this.add.sprite(0, -6, `${this.look}-idle`).setScale(1.1);
    this.balloon.add([g, hero]);
    this.heroInBasket = hero;
    this.physics.add.existing(this.balloon);
    this.balloon.body.setAllowGravity(false).setSize(150, 230).setOffset(-75, -185);

    this.storms = this.physics.add.group({ allowGravity: false });
    this.shots = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.shots, this.storms, (shot, storm) => this.popStorm(storm, shot));
    this.physics.add.overlap(this.balloon, this.storms, (balloon, storm) => this.zap(storm));
    this.time.addEvent({ delay: 1150, loop: true, callback: () => !this.done && !this.landing && this.spawnStorm() });
    this.startedAt = this.time.now;
    this.nextShotAt = 0;
    audio.play('fly');
  }

  spawnStorm() {
    const storm = this.add.container(Phaser.Math.Between(80, VIEW_WIDTH - 80), -40).setDepth(4);
    const g = this.add.graphics();
    g.fillStyle(0x455a64).fillCircle(-22, 0, 24).fillCircle(4, -10, 30).fillCircle(30, 2, 22).fillRect(-40, 0, 90, 22);
    g.fillStyle(0xffeb3b).fillTriangle(-4, 22, 10, 22, 0, 46).fillTriangle(0, 40, 14, 40, 6, 60);
    storm.add(g);
    this.storms.add(storm);
    storm.body.setSize(90, 60).setOffset(-42, -30);
    storm.body.setVelocity(Phaser.Math.Between(-40, 40), CLOUD_SPEED + Phaser.Math.Between(0, 60));
  }

  popStorm(storm, shot) {
    if (!storm.active) return;
    shot.destroy();
    audio.play('pop');
    this.addTripBolts(5, storm.x, storm.y);
    for (let i = 0; i < 6; i++) {
      const puff = this.add.circle(storm.x, storm.y, 14, 0x90a4ae).setDepth(4);
      this.tweens.add({ targets: puff, x: puff.x + Phaser.Math.Between(-60, 60), y: puff.y + Phaser.Math.Between(-60, 60), alpha: 0, duration: 400, onComplete: () => puff.destroy() });
    }
    storm.destroy();
  }

  zap(storm) {
    if (!storm.active) return;
    storm.destroy();
    this.cameras.main.flash(150, 255, 255, 140);
    this.oops(this.balloon.x, this.balloon.y - 120);
  }

  updateTrip(time, delta) {
    const dt = delta / 1000;
    const k = (time - this.startedAt) / 1000 / BALLOON_SECONDS;
    this.setProgress(k);
    for (const puff of this.puffs) {
      puff.y += 90 * dt;
      if (puff.y > VIEW_HEIGHT + 40) puff.setPosition(Phaser.Math.Between(0, VIEW_WIDTH), -40);
    }
    this.volcano.y += 60 * dt;
    if (this.landing) return;
    const c = this.controls;
    const steer = (c.isDown('right') ? 1 : 0) - (c.isDown('left') ? 1 : 0);
    this.balloon.body.setVelocityX(steer * BALLOON_SPEED);
    this.balloon.x = Phaser.Math.Clamp(this.balloon.x, 80, VIEW_WIDTH - 80);
    if (steer) this.heroInBasket.setFlipX(steer < 0);
    if ((c.justPressed('attack') || c.isDown('attack')) && time > this.nextShotAt) {
      this.nextShotAt = time + 250;
      const shot = this.shots.create(this.balloon.x, this.balloon.y - 30, 'laser').setAngle(90).setScale(0.7);
      shot.body.setVelocityY(-600);
      audio.play('laser');
      this.time.delayedCall(1200, () => shot.destroy());
    }
    for (const storm of this.storms.getChildren()) if (storm.y > VIEW_HEIGHT + 60) storm.destroy();
    if (k >= 1) this.land();
  }

  // The Cloud Kingdom comes down to meet you
  land() {
    this.landing = true;
    this.balloon.body.setVelocity(0, 0);
    this.storms.clear(true, true);
    const ground = this.add.container(0, -260).setDepth(3);
    const g = this.add.graphics();
    g.fillStyle(0xffffff);
    for (let x = 0; x < VIEW_WIDTH + 60; x += 60) g.fillCircle(x, 0, 50);
    g.fillRect(0, 0, VIEW_WIDTH, 200);
    ground.add(g);
    this.tweens.add({ targets: ground, y: 380, duration: 1800, ease: 'Sine.easeOut', onComplete: () => this.arrive() });
    this.tweens.add({ targets: this.balloon, y: 340, duration: 1800 });
  }
}

// ---------- World 4 → 5: 🌈 the rainbow slide ----------
// Slide down a giant rainbow: jump the gaps, grab the bolts, and SPLASH into the sea.

export class TripRainbowScene extends RunnerTrip {
  constructor() {
    super('TripRainbow', { titleKey: 'trip.rainbow', sky: [0x81d4fa, 0x0288d1], ground: 0xffffff, groundTop: 0xffffff });
    const floors = floorsFrom(Array.from({ length: 10 }, (_, i) => [440, 220 + i * 24, i < 9 ? 140 : 0]));
    const bolts = floors.slice(0, -1).flatMap((floor) => arcOver(floor.x + floor.width + 70, floor.top));
    this.course = { floors, bolts, length: floors.at(-1).x + floors.at(-1).width - 120 };
  }

  // Rainbow stripes instead of ground
  drawFloor(g, floor) {
    const colors = [0xe53935, 0xff9800, 0xffeb3b, 0x43a047, 0x1e88e5, 0x5e35b1, 0x8e24aa];
    colors.forEach((color, i) => g.fillStyle(color).fillRect(floor.x, floor.top + i * 9, floor.width, 9));
  }

  drawBackground() {
    super.drawBackground();
    // The sea far below, coming closer
    this.add.rectangle(0, 470, this.course.length + 1000, 200, 0x0277bd).setOrigin(0, 0).setScrollFactor(0.4, 1);
  }

  theEnd() {
    // A big jump off the end of the rainbow: SPLASH!
    this.hero.body.setVelocity(250, -400);
    this.time.delayedCall(700, () => {
      audio.play('splat');
      for (let i = 0; i < 12; i++) {
        const drop = this.add.circle(this.hero.x, 470, 8, 0xb3e5fc).setDepth(6);
        this.tweens.add({ targets: drop, x: drop.x + Phaser.Math.Between(-90, 90), y: drop.y - Phaser.Math.Between(40, 140), alpha: 0, duration: 600, onComplete: () => drop.destroy() });
      }
      this.hero.setVisible(false);
      this.arrive('trip.splash');
    });
  }
}

// ---------- World 5 → 6: 🏄 surfing a huge wave onto the jungle island ----------

const SURF_LENGTH = 5200;

export class TripSurfScene extends RunnerTrip {
  constructor() {
    super('TripSurf', { titleKey: 'trip.surf', sky: [0x4fc3f7, 0x81d4fa], ground: 0x0288d1, groundTop: 0xb3e5fc, ride: 'board' });
    const floors = [{ x: 0, width: SURF_LENGTH + 600, top: 430 }];
    const things = [];
    const bolts = [];
    for (let x = 700, i = 0; x < SURF_LENGTH - 200; x += 420 + (i % 3) * 60, i++) {
      const log = i % 2 === 1;
      things.push(log ? { x, y: 418, kind: 'log' } : { x, y: 410, kind: 'rock' });
      if (i % 2 === 0) bolts.push(...arcOver(x, 430));
    }
    this.course = { floors, things, bolts, length: SURF_LENGTH };
  }

  drawBackground() {
    super.drawBackground();
    this.add.circle(800, 90, 40, 0xfff59d).setScrollFactor(0);
    // The jungle island at the end
    const island = this.add.graphics();
    island.fillStyle(0xfff176).fillEllipse(SURF_LENGTH + 300, 440, 700, 80);
    for (const x of [SURF_LENGTH + 120, SURF_LENGTH + 300, SURF_LENGTH + 470]) {
      island.fillStyle(0x795548).fillRect(x - 6, 300, 12, 130);
      island.fillStyle(0x2e7d32).fillEllipse(x - 30, 300, 70, 20).fillEllipse(x + 30, 300, 70, 20).fillEllipse(x, 290, 40, 30);
    }
  }

  startTrip() {
    // The giant wave right behind you
    this.wave = this.add.graphics().setScrollFactor(0).setDepth(4.5);
  }

  updateRunner(time) {
    const g = this.wave.clear();
    g.fillStyle(0x0277bd, 0.9);
    g.beginPath();
    g.moveTo(0, VIEW_HEIGHT);
    for (let y = VIEW_HEIGHT; y > 220; y -= 20) g.lineTo(90 + 25 * Math.sin(time / 200 + y / 40) - (VIEW_HEIGHT - y) * 0.15, y);
    g.lineTo(0, 220);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.8);
    for (let y = 230; y < 300; y += 14) g.fillCircle(80 + 10 * Math.sin(time / 150 + y), y, 9);
  }

  drawFloor(g, floor) {
    g.fillStyle(0x0288d1).fillRect(floor.x, floor.top, floor.width, 300);
    g.fillStyle(0xb3e5fc);
    for (let x = floor.x; x < floor.x + floor.width; x += 40) g.fillTriangle(x, floor.top, x + 20, floor.top - 8, x + 40, floor.top);
  }

  theEnd() {
    this.arrive('trip.beach');
  }
}

// ---------- World 6 → 7: 🚂 the runaway mine cart under the volcano ----------

export class TripMineScene extends RunnerTrip {
  static helpKey = 'mine';

  constructor() {
    super('TripMine', { titleKey: 'trip.mine', sky: [0x1a1a1a, 0x3e2723], ground: 0x4e342e, groundTop: 0x9e9e9e, ride: 'cart', duck: true });
    const list = [];
    for (let i = 0; i < 9; i++) list.push([560, 430, i < 8 ? 120 + (i % 3) * 15 : 0]);
    const floors = floorsFrom(list);
    const things = [];
    const bolts = [];
    floors.forEach((floor, i) => {
      if (i === 0) return;
      // A low beam to duck under, or a rock to jump over, in the middle of each floor
      if (i % 2 === 0) things.push({ low: true, x: floor.x + floor.width / 2, y: floor.top - 52 });
      else things.push({ x: floor.x + floor.width / 2, y: floor.top - 20, kind: 'rock' });
      bolts.push(...arcOver(floor.x - 70, floor.top));
    });
    this.course = { floors, things, bolts, length: floors.at(-1).x + floors.at(-1).width - 100 };
  }

  drawBackground() {
    super.drawBackground();
    const walls = this.add.graphics().setScrollFactor(0.5, 1);
    for (let x = 0; x < this.course.length; x += 260) {
      walls.fillStyle(0x5d4037).fillRect(x, 150, 24, 300); // wooden supports
      walls.fillStyle(0xffa000).fillCircle(x + 12, 140, 8); // lanterns
    }
    // The castle wall at the end of the tunnel
    this.castleWall = this.add.graphics().setDepth(6);
    const end = this.course.length + 60;
    for (let y = 120; y < 440; y += 32) for (let k = 0; k < 2; k++) this.castleWall.fillStyle(k ? 0x546e7a : 0x455a64).fillRect(end + k * 60 + ((y / 32) % 2) * 30, y, 58, 30);
  }

  drawFloor(g, floor) {
    g.fillStyle(0x3e2723).fillRect(floor.x, floor.top, floor.width, 300);
    g.fillStyle(0x9e9e9e).fillRect(floor.x, floor.top, floor.width, 5);
    g.fillStyle(0x6d4c41);
    for (let x = floor.x + 10; x < floor.x + floor.width; x += 30) g.fillRect(x, floor.top + 5, 16, 6);
  }

  theEnd() {
    // CRASH through the castle wall
    audio.play('crash');
    this.cameras.main.shake(500, 0.02);
    this.castleWall.setVisible(false);
    for (let i = 0; i < 16; i++) {
      const brick = this.add.rectangle(this.course.length + 80, Phaser.Math.Between(150, 420), 40, 22, 0x546e7a).setDepth(6);
      this.tweens.add({ targets: brick, x: brick.x + Phaser.Math.Between(80, 300), y: brick.y + Phaser.Math.Between(-120, 120), angle: 360, alpha: 0, duration: 900, onComplete: () => brick.destroy() });
    }
    this.arrive('trip.crash');
  }
}

// ---------- World 7 → 8: 🪜 the crumbling tower stairs ----------
// Run up the steps (jump each one) before the stairs crumble behind you!

const STEP_WIDTH = 150;
const STEP_RISE = 28;
const STEPS = 26;
const CRUMBLE_SPEED = 265;

export class TripStairsScene extends RunnerTrip {
  static helpKey = 'stairs';

  constructor() {
    super('TripStairs', { titleKey: 'trip.stairs', sky: [0x1a1a2e, 0x37474f], ground: 0x546e7a, groundTop: 0x90a4ae });
    const floors = floorsFrom(Array.from({ length: STEPS }, (_, i) => [STEP_WIDTH, 440 - i * STEP_RISE]));
    const bolts = floors.filter((_, i) => i % 3 === 2).map((floor) => [floor.x + STEP_WIDTH / 2, floor.top - 60]);
    this.course = { floors, bolts, length: floors.at(-1).x + 40, top: 440 - STEPS * STEP_RISE - 300 };
  }

  drawBackground() {
    this.cameras.main.setBackgroundColor(0x263238);
    const wall = this.add.graphics();
    for (let y = this.course.top; y < VIEW_HEIGHT; y += 40) for (let x = 0; x < this.course.length + 400; x += 80) wall.fillStyle(0x37474f).fillRect(x + ((y / 40) % 2) * 40 + 2, y + 2, 76, 36);
    // The throne room door at the top
    const last = this.course.floors.at(-1);
    wall.fillStyle(0x6a1b9a).fillRoundedRect(last.x + 60, last.top - 130, 80, 130, { tl: 40, tr: 40, bl: 0, br: 0 });
    wall.fillStyle(0xffc107).fillCircle(last.x + 125, last.top - 60, 6);
  }

  startTrip() {
    this.crumbleX = -120;
    this.dust = this.add.graphics().setDepth(6);
  }

  // The stairs fall apart behind you. If the crumbling catches you: OOPS, and you're carried up a few steps.
  updateRunner(time, delta) {
    this.crumbleX += CRUMBLE_SPEED * (delta / 1000);
    const g = this.dust.clear();
    g.fillStyle(0x000000, 0.85).fillRect(this.crumbleX - 2000, this.course.top, 2000, VIEW_HEIGHT - this.course.top + 200);
    g.fillStyle(0x795548);
    for (let i = 0; i < 8; i++) g.fillCircle(this.crumbleX + Math.sin(time / 90 + i) * 10, VIEW_HEIGHT - ((time / 3 + i * 70) % (VIEW_HEIGHT - this.course.top)), 6);
    if (Math.random() < 0.05) audio.play('stomp');
    if (this.hero.x < this.crumbleX + 20) {
      this.oops(this.hero.x, this.hero.y - 40);
      const ahead = this.course.floors.find((floor) => floor.x > this.hero.x + 2 * STEP_WIDTH) ?? this.course.floors.at(-1);
      this.hero.body.reset(ahead.x + 40, ahead.top - 60);
      this.crumbleX = this.hero.x - 260;
    }
  }

  theEnd() {
    audio.play('doorOpen');
    this.arrive('trip.door');
  }
}
