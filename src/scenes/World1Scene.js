import Phaser from 'phaser';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { SideScrollerScene, VIEW_WIDTH, VIEW_HEIGHT } from './SideScrollerScene.js';
import { createPizzaBossTexture } from '../art/pizzaBoss.js';
import { drawBuilding, drawBillboard, drawWaterTower, drawSkyline, createHelicopterTextures, createRocketTextures } from '../art/city.js';

// World 1: the city. Jump across rooftops; the sky goes from day to sunset to night as you go.
// The last screen is a helipad where Pizza Boss jumps out of a helicopter.
// What every side-scrolling world shares (hero, bad guys, hearts, boss bar, key) is in SideScrollerScene.

const ARENA_START = 4040; // the boss room (helipad) starts here and fills one screen
const LEVEL_WIDTH = ARENA_START + VIEW_WIDTH;
const ARENA_ROOF = 440;

// Sky colors as you go through the level.
const DAY_SKY = 0x8fd3ff;
const SUNSET_SKY = 0xff8a65;
const NIGHT_SKY = 0x0d1b3e;

// Buildings: [x, width, roofY]. The gaps between them are a long way down!
const BUILDINGS = [
  [0, 700, 440],
  [820, 380, 380],
  [1300, 500, 430],
  [1900, 300, 340],
  [2330, 450, 420],
  [2900, 350, 360],
  [3370, 560, 440],
  [ARENA_START, VIEW_WIDTH, ARENA_ROOF], // helipad
];

// Things to jump onto. You can jump up through them from below.
// Billboards: [x, top, width, words]. Words are i18n.js keys, except names that are the same in every language.
const BILLBOARDS = [
  [430, 320, 170, 'SUPERCAPYBARA'],
  [2440, 300, 170, 'sign.pizzaTime'],
  [ARENA_START + 230, 320, 140, 'sign.goSupa'],
  [ARENA_START + 590, 320, 140, 'sign.wow'],
];
const BILLBOARD_HEIGHT = 44;
// Water towers: [x, top]
const WATER_TOWERS = [
  [1420, 320],
  [3560, 330],
];
const WATER_TOWER_WIDTH = 90;
const WATER_TOWER_HEIGHT = 70;
// Window-washer platforms that go up and down in the gaps: [x, width, highestY, lowestY]
const WASHERS = [
  [1805, 90, 330, 470],
  [2795, 100, 300, 460],
];
const WASHER_SPEED = 60;

// Lightning bolts to collect: [x, y, howMany]. Each row is spaced 40px apart.
const BOLTS = [
  [250, 400, 3],
  [470, 280, 3],
  [960, 340, 2],
  [1440, 280, 2],
  [1980, 300, 3],
  [2470, 260, 3],
  [3000, 320, 2],
  [3450, 400, 2],
];

// Bad guys (every one has 1 life). Sunglasses float up and down at laser height: [x, y]
const SUNGLASSES = [
  [620, 400],
  [2080, 300],
  [3100, 320],
];
// Apples stand still and shoot both ways: [x]
const APPLES = [1600, 2650, 3800];
// Robots walk back and forth and shoot at you: [fromX, toX]
const ROBOTS = [
  [880, 1140],
  [3400, 3700],
];

function buildingAt(x) {
  const found = BUILDINGS.find(([bx, width]) => x >= bx && x <= bx + width);
  return found && { x: found[0], width: found[1], roofY: found[2] };
}

function roofAt(x) {
  return buildingAt(x)?.roofY ?? VIEW_HEIGHT;
}

function mixColor(from, to, t) {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.IntegerToColor(from),
    Phaser.Display.Color.IntegerToColor(to),
    100,
    Phaser.Math.Clamp(t, 0, 1) * 100,
  );
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

export class World1Scene extends SideScrollerScene {
  constructor() {
    super('World1', {
      world: 1,
      keyId: 'world1',
      music: 'city',
      bossName: 'game.pizzaBoss',
      width: LEVEL_WIDTH,
      arenaStart: ARENA_START,
      start: { x: 100, y: 360 },
      arenaCheckpoint: { x: ARENA_START + 120, y: 360 },
      bolts: BOLTS,
      sunglasses: SUNGLASSES,
      apples: APPLES,
      robots: ROBOTS,
      bossRushNext: 'World3',
    });
  }

  create(data) {
    createHelicopterTextures(this);
    createRocketTextures(this);
    super.create(data);
    audio.startCity();
    this.events.once('shutdown', () => audio.stopCity());
    this.updateSky();
  }

  createScenery() {
    this.createSky();
    this.createCity();
  }

  updateScenery() {
    this.updateWashers();
    if (!this.won) this.updateSky();
  }

  groundAt(x) {
    const building = buildingAt(x);
    return building && { x: building.x, width: building.width, top: building.roofY };
  }

  // ---------- Sky: day, sunset, night ----------

  createSky() {
    // Things far away scroll slower, so the city feels deep.
    this.stars = this.add.graphics().setScrollFactor(0);
    this.stars.fillStyle(0xffffff);
    for (let i = 0; i < 70; i++) {
      this.stars.fillCircle((i * 137) % VIEW_WIDTH, (i * 89) % 300, i % 3 === 0 ? 2 : 1);
    }
    this.sun = this.add.circle(760, 90, 40, 0xffeb3b).setScrollFactor(0);

    this.clouds = this.add.graphics().setScrollFactor(0.15);
    this.clouds.fillStyle(0xffffff, 0.9);
    for (let x = 80; x < LEVEL_WIDTH; x += 450) {
      const y = 60 + ((x * 7) % 110);
      this.clouds.fillEllipse(x, y, 120, 40);
      this.clouds.fillEllipse(x + 40, y - 15, 90, 40);
    }

    const skyline = this.add.graphics().setScrollFactor(0.3);
    const skylineLights = this.make.graphics({ add: false });
    drawSkyline(skyline, skylineLights, LEVEL_WIDTH * 0.3 + VIEW_WIDTH, 470);

    // Darkens everything far away as night comes. Close things (the buildings you jump on) are drawn after it.
    this.nightShade = this.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, NIGHT_SKY).setOrigin(0, 0).setScrollFactor(0);
    this.moon = this.add.circle(180, 100, 34, 0xfff9c4).setScrollFactor(0);

    this.add.existing(skylineLights);
    this.skylineLights = skylineLights.setScrollFactor(0.3);
  }

  updateSky() {
    const progress = Phaser.Math.Clamp(this.leadX() / ARENA_START, 0, 1);
    const sunset = Math.min(progress / 0.5, 1);
    const night = Phaser.Math.Clamp((progress - 0.5) / 0.5, 0, 1);
    const lightsOn = Phaser.Math.Clamp((progress - 0.35) / 0.5, 0, 1);

    const sky = progress < 0.5 ? mixColor(DAY_SKY, SUNSET_SKY, sunset) : mixColor(SUNSET_SKY, NIGHT_SKY, night);
    this.cameras.main.setBackgroundColor(sky);

    this.sun.setY(90 + sunset * 380).setFillStyle(mixColor(0xffeb3b, 0xff7043, sunset));
    this.moon.setAlpha(night);
    this.stars.setAlpha(night);
    this.clouds.setAlpha(1 - night * 0.7);
    this.nightShade.setAlpha(night * 0.5);
    this.skylineLights.setAlpha(lightsOn);
    this.windowLights.setAlpha(lightsOn);
    audio.setNight(night);
  }

  // ---------- The city ----------

  createCity() {
    const fronts = this.add.graphics();
    this.windowLights = this.add.graphics();
    const props = this.add.graphics();

    this.solids = this.physics.add.staticGroup();
    BUILDINGS.forEach(([x, width, roofY], i) => {
      drawBuilding(fronts, this.windowLights, { x, width, roofY, bottom: VIEW_HEIGHT, colorIndex: i });
      this.solids.add(this.add.zone(x, roofY, width, VIEW_HEIGHT - roofY).setOrigin(0, 0));
    });
    this.createHelipad();

    // One-way platforms: you can jump up through them and land on top.
    this.platforms = this.physics.add.staticGroup();
    const addPlatform = (x, top, width, height) => {
      const zone = this.add.zone(x, top, width, height).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    };

    for (const [x, top, width, words] of BILLBOARDS) {
      drawBillboard(props, { x, top, width, height: BILLBOARD_HEIGHT, roofY: roofAt(x + width / 2) });
      const sign = this.add
        .text(x + width / 2, top + BILLBOARD_HEIGHT / 2, t(words), { fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#d32f2f' })
        .setOrigin(0.5);
      sign.setScale(Math.min(1, (width - 16) / sign.width)); // shrink long words to fit the board
      addPlatform(x, top, width, 16);
    }

    for (const [x, top] of WATER_TOWERS) {
      drawWaterTower(props, { x, top, width: WATER_TOWER_WIDTH, height: WATER_TOWER_HEIGHT, roofY: roofAt(x + WATER_TOWER_WIDTH / 2) });
      addPlatform(x, top, WATER_TOWER_WIDTH, 16);
    }

    // Window-washer platforms hang on cables and go up and down.
    this.cables = this.add.graphics();
    this.washers = this.physics.add.group({ allowGravity: false, immovable: true });
    this.movers = this.washers;
    for (const [x, width, highestY, lowestY] of WASHERS) {
      const washer = this.add.rectangle(x, highestY, width, 16, 0xffb300).setOrigin(0, 0).setStrokeStyle(3, 0x5d4037);
      this.washers.add(washer);
      washer.body.checkCollision.down = false;
      washer.body.pushable = false;
      washer.setData({ highestY, lowestY });
      washer.body.setVelocityY(WASHER_SPEED);
    }
  }

  createHelipad() {
    const centerX = ARENA_START + VIEW_WIDTH / 2;
    // A big H painted on the building, and hazard stripes along the roof edge.
    this.add.circle(centerX, ARENA_ROOF + 60, 44).setStrokeStyle(8, 0xffd23f);
    this.add.text(centerX, ARENA_ROOF + 60, 'H', { fontFamily: 'Arial Black, Arial', fontSize: '52px', color: '#ffd23f' }).setOrigin(0.5);
    const stripes = this.add.graphics();
    for (let x = ARENA_START; x < LEVEL_WIDTH; x += 40) {
      stripes.fillStyle(0xffd23f);
      stripes.fillRect(x, ARENA_ROOF, 20, 10);
      stripes.fillStyle(0x212121);
      stripes.fillRect(x + 20, ARENA_ROOF, 20, 10);
    }
    // Blinking red lights on the corners
    for (const x of [ARENA_START + 10, LEVEL_WIDTH - 10]) {
      const light = this.add.circle(x, ARENA_ROOF - 6, 6, 0xff1744);
      this.tweens.add({ targets: light, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    }
  }

  updateWashers() {
    this.cables.clear();
    this.cables.lineStyle(2, 0x37474f);
    for (const washer of this.washers.getChildren()) {
      if (washer.y <= washer.getData('highestY')) washer.body.setVelocityY(WASHER_SPEED);
      if (washer.y >= washer.getData('lowestY')) washer.body.setVelocityY(-WASHER_SPEED);
      this.cables.lineBetween(washer.x + 6, 0, washer.x + 6, washer.y);
      this.cables.lineBetween(washer.x + washer.width - 6, 0, washer.x + washer.width - 6, washer.y);
    }
  }

  // ---------- Pizza Boss ----------

  createBoss() {
    createPizzaBossTexture(this);
    // He waits in the helicopter until the fight starts.
    this.boss = this.physics.add.sprite(LEVEL_WIDTH - 200, 200, 'pizza-boss');
    this.boss.body.setSize(90, 140).setOffset(25, 15);
    this.boss.setCollideWorldBounds(true);
    this.boss.disableBody(true, true);
    this.physics.add.collider(this.boss, this.solids);
  }

  // The helicopter flies in, Pizza Boss jumps out, and the helicopter flies away.
  // The helicopter flies in, Pizza Boss jumps out, and the helicopter flies away.
  bossEntrance() {
    const dropX = LEVEL_WIDTH - 230;
    const heli = this.add.image(0, 0, 'helicopter');
    const rotor = this.add.image(-2, -48, 'rotor');
    this.tweens.add({ targets: rotor, scaleX: 0.15, duration: 70, yoyo: true, repeat: -1 });
    const helicopter = this.add.container(LEVEL_WIDTH + 160, 110, [heli, rotor]).setDepth(4);
    audio.play('helicopter');

    this.tweens.add({
      targets: helicopter,
      x: dropX,
      duration: 1500,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.boss.enableBody(true, dropX, helicopter.y + 90, true, true);
        this.boss.setVelocity(0, 0);
        this.tweens.add({
          targets: helicopter,
          x: LEVEL_WIDTH + 300,
          y: -120,
          delay: 400,
          duration: 1600,
          ease: 'Sine.easeIn',
          onComplete: () => helicopter.destroy(),
        });
        this.time.delayedCall(1200, () => this.startBossActions());
      },
    });
  }

  bossAction() {
    const dir = this.nearestPlayer(this.boss.x).x < this.boss.x ? -1 : 1;
    const action = Phaser.Math.RND.pick(['shoot', 'shoot', 'jump', 'charge']);

    if (action === 'shoot') {
      // A spread of 3 shots toward you.
      for (const vy of [-120, 0, 120]) {
        this.enemyShoot(this.boss.x + dir * 70, this.boss.y + 10, dir * this.settings.enemyShotSpeed, vy);
      }
    } else if (action === 'jump' && this.boss.body.blocked.down) {
      this.boss.setVelocity(dir * 220, -650);
    } else {
      this.boss.setVelocityX(dir * 340);
    }
  }

  updateBoss() {
    this.boss.setFlipX(this.nearestPlayer(this.boss.x).x < this.boss.x);
    if (this.boss.body.blocked.down) {
      this.boss.setVelocityX(this.boss.body.velocity.x * 0.97); // slow down after a charge
    }
  }

  // ---------- Winning: a rocket to World 2 ----------

  winLines(firstTime) {
    return firstTime ? [t('game.ultraInShop')] : [];
  }

  afterWin() {
    this.launchRocket();
  }

  // A rocket lands on the helipad, SuperCapybara jumps in, and it blasts off to World 2.
  launchRocket() {
    const x = ARENA_START + VIEW_WIDTH / 2;
    const landedY = ARENA_ROOF - 78;
    const rocket = this.add.image(x, -200, 'rocket').setDepth(5);
    const flame = this.add.image(x, -200, 'flame').setOrigin(0.5, 0).setDepth(4);
    this.tweens.add({ targets: flame, scaleY: 0.6, scaleX: 0.85, duration: 60, yoyo: true, repeat: -1 });
    const followRocket = () => flame.setPosition(rocket.x, rocket.y + 74);
    audio.play('rocket');

    this.tweens.add({
      targets: rocket,
      y: landedY,
      duration: 2000,
      ease: 'Sine.easeOut',
      onUpdate: followRocket,
      onComplete: () => {
        flame.setVisible(false);
        // Jump into the rocket
        this.player.sprite.body.enable = false;
        this.player.sprite.setFlipX(this.player.x > x);
        this.tweens.add({
          targets: this.player.sprite,
          x,
          y: landedY,
          scale: 0.6,
          alpha: 0,
          duration: 700,
          ease: 'Quad.easeIn',
          onComplete: () => this.countdown(rocket, flame, followRocket),
        });
      },
    });
  }

  countdown(rocket, flame, followRocket) {
    ['3', '2', '1'].forEach((number, i) => {
      this.time.delayedCall(i * 800, () => {
        audio.play('countdown');
        const message = this.bigMessage(number).setScale(1.6);
        this.time.delayedCall(700, () => message.destroy());
      });
    });
    this.time.delayedCall(2400, () => {
      audio.play('blastOff');
      this.bigMessage(t('game.blastOff'), '#ff7043');
      flame.setVisible(true).setScale(1.6);
      this.cameras.main.shake(2200, 0.012);
      this.tweens.add({ targets: rocket, y: -400, duration: 2200, ease: 'Quad.easeIn', onUpdate: followRocket });
      this.time.delayedCall(1200, () => this.cameras.main.fadeOut(1000, 0, 0, 0));
      this.time.delayedCall(2400, () => this.scene.start('World2'));
    });
  }
}
