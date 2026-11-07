import Phaser from 'phaser';
import { audio } from '../audio.js';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../scenes/SideScrollerScene.js';
import { StoryLevelScene } from './StoryLevelScene.js';
import { PLACES } from './story.js';

// THE BAD GUY KING, place 1: ☁️ the cloud kingdom. Jump across fluffy clouds high in the sky (fall and you
// lose a heart). At the end, Dark Supa Cat (an evil robot copy made by the King's machine) guards the real
// Supa Cat, who's a gold trophy. Beat the copy, the trophy breaks, and Supa Cat joins your team.
// Switching heroes, the trophy, the copy and winning are in StoryLevelScene.

const PLACE = PLACES.find((p) => p.id === 'cloud');
const ARENA_START = 3840;
const LEVEL_WIDTH = ARENA_START + VIEW_WIDTH;
const FLOOR = 440;

// Solid clouds: [x, width, top]. The gaps are a long way down!
const GROUND = [
  [0, 600, 440],
  [720, 380, 400],
  [1220, 420, 430],
  [1760, 320, 380],
  [2200, 460, 420],
  [2780, 360, 390],
  [3260, 460, 440],
  [ARENA_START, VIEW_WIDTH, FLOOR],
];
// Little clouds you can jump up through: [x, top, width]
const PUFFS = [
  [380, 320, 130],
  [1000, 290, 110],
  [1450, 310, 120],
  [1980, 270, 120],
  [2450, 300, 130],
  [3000, 280, 120],
  [3500, 320, 120],
  [ARENA_START + 200, 320, 130],
  [ARENA_START + 560, 320, 130],
];
const BOLTS = [
  [250, 400, 3],
  [410, 280, 3],
  [880, 360, 2],
  [1470, 270, 2],
  [2000, 230, 3],
  [2470, 260, 3],
  [3020, 240, 2],
  [3400, 400, 2],
];
const SUNGLASSES = [
  [560, 400],
  [2100, 330],
  [3100, 320],
];
const APPLES = [1500, 2600, 3600];
const ROBOTS = [
  [760, 1060],
  [3300, 3550],
];

const TROPHY = { x: LEVEL_WIDTH - 130, y: FLOOR };
const COPY_HOME = { x: LEVEL_WIDTH - 300, y: FLOOR - 40 };

export class StoryCloudScene extends StoryLevelScene {
  constructor() {
    super(
      'StoryCloud',
      {
        world: 'Cloud',
        titleKey: 'story.place.cloud',
        keyId: 'story-cloud',
        bossName: 'story.darkCat',
        width: LEVEL_WIDTH,
        arenaStart: ARENA_START,
        start: { x: 100, y: 360 },
        arenaCheckpoint: { x: ARENA_START + 100, y: 360 },
        bolts: BOLTS,
        sunglasses: SUNGLASSES,
        apples: APPLES,
        robots: ROBOTS,
      },
      { place: PLACE, trophy: TROPHY },
    );
  }

  groundAt(x) {
    const found = GROUND.find(([gx, width]) => x >= gx && x <= gx + width);
    return found && { x: found[0], width: found[1], top: found[2] };
  }

  // ---------- The sky and the clouds ----------

  createScenery() {
    this.cameras.main.setBackgroundColor(0x81d4fa);
    const sky = this.add.graphics().setScrollFactor(0);
    for (let i = 0; i < 10; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(0x4fc3f7),
        Phaser.Display.Color.IntegerToColor(0xf8bbd0),
        9,
        i,
      );
      sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      sky.fillRect(0, i * 54, VIEW_WIDTH, 54);
    }
    this.add.circle(800, 90, 46, 0xfff59d).setScrollFactor(0);
    // Far away clouds drifting slowly
    const far = this.add.graphics().setScrollFactor(0.2);
    far.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 14; i++) {
      const x = i * 260 + (i % 3) * 40;
      const y = 120 + (i % 4) * 50;
      far.fillCircle(x, y, 30);
      far.fillCircle(x + 35, y - 12, 38);
      far.fillCircle(x + 75, y, 28);
    }

    const clouds = this.add.graphics();
    this.solids = this.physics.add.staticGroup();
    for (const [x, width, top] of GROUND) {
      this.drawCloud(clouds, x, top, width, VIEW_HEIGHT - top + 40);
      this.solids.add(this.add.zone(x, top, width, VIEW_HEIGHT - top).setOrigin(0, 0));
    }
    this.platforms = this.physics.add.staticGroup();
    for (const [x, top, width] of PUFFS) {
      this.drawCloud(clouds, x, top, width, 22);
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }
    this.createTrophy();
  }

  // A fluffy cloud: a white block with bumps along the top and a soft blue shadow at the bottom.
  drawCloud(g, x, top, width, height) {
    g.fillStyle(0xb3e5fc);
    g.fillRoundedRect(x, top + 8, width, height, 14);
    g.fillStyle(0xffffff);
    g.fillRoundedRect(x, top, width, Math.max(12, height - 14), 14);
    for (let bx = x + 16; bx < x + width - 10; bx += 34) g.fillCircle(bx, top + 4, 16 + ((bx / 34) % 2) * 5);
  }

  updateScenery() {}

  // ---------- Dark Supa Cat (the mini boss) ----------

  createBoss() {
    this.createCopy(COPY_HOME.x);
  }

  bossEntrance() {
    this.beamDownCopy(COPY_HOME.x, FLOOR);
  }

  // Pounces at you, dashes at you, or shoots dark lasers.
  bossAction() {
    const target = this.nearestPlayer(this.boss.x);
    const dir = target.x < this.boss.x ? -1 : 1;
    const action = Phaser.Math.RND.pick(['pounce', 'dash', 'shoot', 'pounce']);
    if (action === 'pounce' && this.boss.body.blocked.down) {
      const distance = Math.min(Math.abs(target.x - this.boss.x), 400);
      this.boss.setVelocity(dir * Math.max(180, distance * 1.1), -620);
      audio.play('jump');
    } else if (action === 'dash') {
      this.boss.setVelocityX(dir * 420);
      audio.play('scratch');
    } else {
      for (const vy of [-90, 0, 90]) this.enemyShoot(this.boss.x + dir * 50, this.boss.y, dir * this.settings.enemyShotSpeed, vy);
    }
  }

  updateBoss() {
    const boss = this.boss;
    boss.setFlipX(this.nearestPlayer(boss.x).x < boss.x);
    if (boss.body.blocked.down) boss.setVelocityX(boss.body.velocity.x * 0.95);
    this.animateCopy();
  }
}
