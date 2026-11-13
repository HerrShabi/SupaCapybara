import Phaser from 'phaser';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { SideScrollerScene, VIEW_WIDTH, VIEW_HEIGHT } from './SideScrollerScene.js';
import { createPizzaBossTexture } from '../art/pizzaBoss.js';
import { openKeypad, drawKeypadPost } from '../keypad.js';
import { writeSave } from '../save.js';
import { KEYS } from '../characters.js';
import { heroKey } from '../art/heroes.js';
import { drawComicBubble } from '../comicBubble.js';
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
// The secret portal to the Cube Islands floats above the second water tower. It's closed until you type the code
// on the keypad next to it (Ethan's drawing, see keypad.js); then it swirls open and glows when you get close.
const PORTAL = { x: 3605, y: 270 };
const KEYPAD = { x: 3490, ground: 440 }; // on the roof, left of the water tower
const PORTAL_GLOW_DISTANCE = 220;
// The police station on the first roof (just scenery, you walk in front of it). CAPTAIN WADDLE sits in its jail cell:
// Copybara locked him up by mistake (black and white, like the bad guys!). Walk up to the lock and press X: you try
// your boss keys one by one until one fits (you need at least one). Then he's yours (save.owned).
const STATION = { x: 140, width: 270, top: 250, ground: 440 };
const CELL = { x: 285, width: 115, top: 330 }; // the cell, in the right part of the station
const LOCK = { x: 292, y: 392 }; // the padlock on the cell's bars
const STATION_DOOR = 190;

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
      disco: { x: 1486, y: 355 }, // the secret disco: a crack in the first water tower's tank
      // Baby Capybara's tips: [tip, when you pass x, point at x, y]
      tips: [
        ['move', 0],
        ['bolt', 110, 250, 400],
        ['badGuy', 400, 620, 400],
        ['gap', 560, 760, 470],
      ],
      width: LEVEL_WIDTH,
      arenaStart: ARENA_START,
      start: { x: 100, y: 360 },
      arenaCheckpoint: { x: ARENA_START + 120, y: 360 },
      bolts: BOLTS,
      sunglasses: SUNGLASSES,
      apples: APPLES,
      robots: ROBOTS,
      bossRushNext: 'GrapeMoon', // (Grape Boss in 2D, on a moon)
    });
  }

  // data.fromPortal: back from Cube Islands, so you pop out right next to the secret portal.
  create(data = {}) {
    createHelicopterTextures(this);
    createRocketTextures(this);
    super.create(data.fromPortal ? { ...data, start: { x: PORTAL.x - 110, y: 360 } } : data);
    this.portalOpen = Boolean(data.fromPortal); // (coming back from Cube Islands, it's still open)
    this.createPortal();
    this.portalReadyAt = data.fromPortal ? this.time.now + 2500 : 0;
    this.keypad = null;
    this.keypadReadyAt = 0;
    if (!this.bossRush) drawKeypadPost(this, KEYPAD.x, KEYPAD.ground);
    if (data.fromPortal) {
      this.safeUntil = this.time.now + 3000; // a moment to look around before the bad guys can hurt you
      this.cameras.main.flash(500, 206, 147, 216);
      audio.play('forceField');
    }
    audio.startCity();
    this.events.once('shutdown', () => audio.stopCity());
    this.updateSky();
  }

  createScenery() {
    this.createSky();
    this.createCity();
    this.createPoliceStation();
  }

  updateScenery() {
    this.updateWashers();
    if (!this.won) {
      this.updateSky();
      this.updatePortal();
      this.updateJail();
    }
  }

  // ---------- The police station and CAPTAIN WADDLE's jail cell ----------

  createPoliceStation() {
    const { x, width, top, ground } = STATION;
    const g = this.add.graphics();
    // Walls, a roof edge and the big POLICE sign
    g.fillStyle(0x1a237e).fillRect(x, top, width, ground - top);
    g.fillStyle(0x283593).fillRect(x + 8, top + 34, width - 16, ground - top - 34);
    g.fillStyle(0x0d1442).fillRect(x - 8, top - 8, width + 16, 12);
    g.fillStyle(0xffffff).fillRect(x + 50, top + 8, width - 100, 24);
    this.add.text(x + width / 2, top + 20, t('jail.sign'), { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#1a237e' }).setOrigin(0.5);
    // Windows
    g.fillStyle(0x90caf9);
    for (const wx of [x + 22, x + 82]) g.fillRect(wx, top + 50, 34, 26);
    g.fillRect(x + 150, top + 50, 34, 26);
    g.fillRect(x + 210, top + 50, 34, 26);
    // The front door (Copybara comes out of it)
    g.fillStyle(0x5d4037).fillRect(STATION_DOOR - 22, ground - 72, 44, 72);
    g.fillStyle(0xffd23f).fillCircle(STATION_DOOR + 12, ground - 36, 3);
    // The jail cell: dark inside, a little bench
    g.fillStyle(0x263238).fillRect(CELL.x, CELL.top, CELL.width, ground - CELL.top);
    g.fillStyle(0x455a64).fillRect(CELL.x, ground - 8, CELL.width, 8);
    g.fillStyle(0x6d4c41).fillRect(CELL.x + 60, ground - 34, 48, 8);
    g.fillStyle(0x90a4ae).fillRect(CELL.x, CELL.top, CELL.width, 6); // the bars' top rail
    // Blinking police lights on the roof
    const red = this.add.circle(x + width / 2 - 14, top - 14, 8, 0xff1744);
    const blue = this.add.circle(x + width / 2 + 14, top - 14, 8, 0x2979ff).setAlpha(0.2);
    this.tweens.add({ targets: red, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: blue, alpha: 1, duration: 400, yoyo: true, repeat: -1 });

    const freed = this.save.owned.includes('captain-waddle');
    // Captain Waddle, sitting sadly behind the bars (only while he's still locked up)
    if (!freed) {
      this.waddle = this.add.sprite(CELL.x + 62, ground - 36, `${this.lookOf('captain-waddle')}-idle`).setScale(1.5).setFlipX(true);
      this.tweens.add({ targets: this.waddle, scaleY: 1.42, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // The bars (they slide up when the cell opens) and the padlock
    this.bars = this.add.graphics();
    this.bars.fillStyle(0x90a4ae);
    for (let bx = CELL.x + 4; bx < CELL.x + CELL.width; bx += 14) this.bars.fillRect(bx, CELL.top, 5, ground - CELL.top);
    this.bars.fillRect(CELL.x, ground - 40, CELL.width, 5);
    if (freed) {
      this.bars.setVisible(false);
      this.add.text(CELL.x + CELL.width / 2, CELL.top + 40, t('jail.empty'), { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#90a4ae' }).setOrigin(0.5);
      return;
    }
    this.padlock = this.add.container(LOCK.x, LOCK.y, [
      this.add.circle(0, -10, 9).setStrokeStyle(4, 0xb0bec5),
      this.add.rectangle(0, 2, 24, 20, 0xffc107).setStrokeStyle(2, 0xb8860b),
      this.add.circle(0, 1, 3, 0x5d4037),
    ]);
    this.jailPrompt = this.add
      .text(LOCK.x, CELL.top - 18, t('jail.try'), { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffd23f' })
      .setStroke('#000000', 5)
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false);
    this.tweens.add({ targets: this.jailPrompt, y: this.jailPrompt.y - 6, duration: 400, yoyo: true, repeat: -1 });
    this.jailReadyAt = 0;
  }

  // A hero's look (texture prefix) in this level: secret colors, or the drawn heroes in drawing mode.
  lookOf(id) {
    return this.heroLook?.(id) ?? heroKey(id, this.palette);
  }

  // Walk up to the lock and press X (or ↑) to try your keys.
  updateJail() {
    if (!this.padlock || this.jail || this.bossRush) return;
    const near = this.players.find((p) => Math.abs(p.x - (LOCK.x - 10)) < 75 && Math.abs(p.sprite.body.bottom - STATION.ground) < 12);
    this.jailPrompt.setVisible(Boolean(near));
    if (!near || this.time.now < this.jailReadyAt) return;
    if (near.controls.justPressed('attack') || near.controls.justPressed('up')) this.tryKeys(near).catch((error) => console.error(error.stack));
  }

  // The level waits while the keys are tried (like the keypad). update() hands the frame to the jail instead.
  wait(ms) {
    return new Promise((resolve) => this.tweens.addCounter({ from: 0, to: 1, duration: ms, onComplete: resolve }));
  }

  // A comic bubble over someone's head; it goes away when you press JUMP or X.
  say(text, who) {
    const view = this.cameras.main.worldView;
    const parts = drawComicBubble(this, text, { x: who.x, y: who.y - 6 }, view, who.x - view.x > 480 ? -1 : 1, t('tip.gotIt'));
    audio.play('click');
    return new Promise((resolve) => {
      this.jail.waiting = { since: performance.now(), done: () => { parts.forEach((part) => part.destroy()); resolve(); } };
    });
  }

  updateJailScene() {
    const waiting = this.jail.waiting;
    if (!waiting || performance.now() - waiting.since < 500) return;
    if (this.players.some((p) => p.controls.justPressed('jump') || p.controls.justPressed('attack'))) {
      this.jail.waiting = null;
      waiting.done();
    }
  }

  async tryKeys(player) {
    this.jail = { waiting: null };
    this.jailPrompt.setVisible(false);
    player.sprite.setVelocity(0, 0);
    player.sprite.anims.stop();
    player.sprite.setTexture(`${player.look}-idle`);
    player.lasers.clear(true, true);
    player.nextAttackAt = this.time.now + 400; // (the X that tries the keys doesn't shoot too)
    this.freezeWorld();
    const owned = KEYS.filter((key) => this.save.keys.includes(key.id));

    if (!owned.length) {
      // No boss key yet: the lock just rattles
      audio.play('error');
      this.tweens.add({ targets: this.padlock, angle: { from: -15, to: 15 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => this.padlock.setAngle(0) });
      await this.say(t('jail.noKeys'), { x: LOCK.x, y: LOCK.y - 20 });
      this.closeJail();
      return;
    }

    // Try them one by one: the last one fits!
    for (const [i, key] of owned.entries()) {
      const last = i === owned.length - 1;
      const icon = this.add.container(player.x, player.y - 50, [
        this.add.image(0, 0, 'key').setScale(0.7),
        this.add.text(-10, 0, key.id.replace('world', ''), { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#5d4037' }).setOrigin(0.5),
      ]).setDepth(7);
      await new Promise((resolve) => this.tweens.add({ targets: icon, x: LOCK.x - 26, y: LOCK.y + 2, duration: 350, ease: 'Quad.easeOut', onComplete: resolve }));
      audio.play('keyTry');
      await new Promise((resolve) => this.tweens.add({ targets: icon, angle: { from: -20, to: 20 }, duration: 90, yoyo: true, repeat: 1, onComplete: resolve }));
      if (!last) {
        audio.play('error');
        this.popWord(t('jail.nope'), '#ff5252');
        await new Promise((resolve) => this.tweens.add({ targets: icon, y: icon.y + 70, alpha: 0, angle: 120, duration: 350, onComplete: resolve }));
        icon.destroy();
        continue;
      }
      // Click! It turns, the lock drops off and the bars slide up
      await new Promise((resolve) => this.tweens.add({ targets: icon, angle: 90, duration: 250, onComplete: resolve }));
      audio.play('key');
      this.popWord(t('jail.fits'), '#69f0ae');
      await this.wait(300);
      this.tweens.add({ targets: [this.padlock, icon], y: `+=60`, alpha: 0, angle: 60, duration: 400 });
      audio.play('forceField');
      await new Promise((resolve) => this.tweens.add({ targets: this.bars, y: -40, alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: resolve }));
      this.padlock.destroy();
      this.padlock = null;
      icon.destroy();
    }

    // He waddles out...
    const waddle = this.waddle;
    this.tweens.killTweensOf(waddle);
    waddle.setScale(1.5).setDepth(2.5).setTexture(`${this.lookOf('captain-waddle')}-jump`);
    audio.play('doubleJump');
    await new Promise((resolve) => this.tweens.add({ targets: waddle, y: waddle.y - 40, duration: 220, yoyo: true, onComplete: resolve }));
    waddle.setFlipX(false).play(`${this.lookOf('captain-waddle')}-run`);
    await new Promise((resolve) => this.tweens.add({ targets: waddle, x: CELL.x + CELL.width + 30, duration: 900, onComplete: resolve }));
    waddle.anims.stop();
    waddle.setTexture(`${this.lookOf('captain-waddle')}-idle`).setFlipX(true);
    await this.say(t('jail.waddle'), waddle);

    // ...and Copybara comes out of the station to say sorry
    const copybara = this.add.sprite(STATION_DOOR, STATION.ground - 36, `${this.lookOf('copybara')}-idle`).setScale(1.5).setAlpha(0).setDepth(2.5);
    await new Promise((resolve) => this.tweens.add({ targets: copybara, alpha: 1, duration: 300, onComplete: resolve }));
    copybara.play(`${this.lookOf('copybara')}-run`);
    await new Promise((resolve) => this.tweens.add({ targets: copybara, x: CELL.x + 45, duration: 700, onComplete: resolve }));
    copybara.anims.stop();
    copybara.setTexture(`${this.lookOf('copybara')}-idle`);
    await this.say(t('name.copybara').toUpperCase() + ': ' + t('jail.sorry'), copybara);

    // He's on your team now
    if (!this.save.owned.includes('captain-waddle')) this.save.owned.push('captain-waddle');
    writeSave(this.save);
    audio.play('win');
    this.flashMessage(t('jail.joined'), '#ffb74d');
    this.add.text(CELL.x + CELL.width / 2, CELL.top + 40, t('jail.empty'), { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#90a4ae' }).setOrigin(0.5);
    // They both go into the station
    for (const [hero, id] of [[waddle, 'captain-waddle'], [copybara, 'copybara']]) {
      hero.setFlipX(true).play(`${this.lookOf(id)}-run`);
      this.tweens.add({ targets: hero, x: STATION_DOOR, duration: Math.abs(hero.x - STATION_DOOR) * 4 + 100, onComplete: () => this.tweens.add({ targets: hero, alpha: 0, duration: 250, onComplete: () => hero.destroy() }) });
    }
    this.waddle = null;
    this.closeJail();
  }

  popWord(text, color) {
    const word = this.add.text(LOCK.x, LOCK.y - 50, text, { fontFamily: 'Arial Black, Arial', fontSize: '22px', color }).setStroke('#000000', 5).setOrigin(0.5).setDepth(8);
    this.tweens.add({ targets: word, y: word.y - 30, alpha: 0, delay: 300, duration: 500, onComplete: () => word.destroy() });
  }

  closeJail() {
    this.jail = null;
    this.unfreezeWorld();
    this.jailReadyAt = this.time.now + 2000; // step away before trying again
  }

  // ---------- The secret portal (to the Cube Islands) ----------

  createPortal() {
    const g = this.make.graphics({ add: false });
    const colors = [0x4a148c, 0x7b1fa2, 0xab47bc, 0xe1bee7];
    colors.forEach((color, i) => {
      g.fillStyle(color);
      g.fillEllipse(40, 55, 80 - i * 18, 110 - i * 24);
    });
    g.generateTexture('portal', 80, 110);
    g.destroy();
    this.portal = this.add.image(PORTAL.x, PORTAL.y, 'portal').setAlpha(this.portalOpen ? 0.15 : 0);
    this.tweens.add({ targets: this.portal, scaleX: 0.85, duration: 500, yoyo: true, repeat: -1 });
  }

  // While the keypad is open, the level waits
  update(time, delta) {
    if (this.keypad) {
      this.keypad.update();
      return;
    }
    if (this.jail) {
      this.updateJailScene();
      return;
    }
    super.update(time, delta);
  }

  // Walk up to the keypad: it opens (type the code from the note, then ✓)
  checkKeypad() {
    if (this.portalOpen || this.keypad || this.time.now < this.keypadReadyAt) return;
    const player = this.players.find((p) => Math.abs(p.x - KEYPAD.x) < 30 && Math.abs(p.sprite.body.bottom - KEYPAD.ground) < 12);
    if (!player) return;
    this.freezeWorld();
    this.keypad = openKeypad(this, player, {
      onClose: () => {
        this.keypad = null;
        this.unfreezeWorld();
        this.keypadReadyAt = this.time.now + 2500; // step away before it opens again
      },
      onRight: () => this.openPortal(),
    });
  }

  // The right code: the portal swirls open
  openPortal() {
    this.portalOpen = true;
    audio.play('forceField');
    this.cameras.main.flash(400, 206, 147, 216);
    const message = this.bigMessage(t('keypad.open'), '#e1bee7').setScale(0.6);
    this.time.delayedCall(1800, () => message.destroy());
    this.portal.setAlpha(1).setScale(0);
    this.tweens.add({ targets: this.portal, scaleY: 1, angle: 720, duration: 900, ease: 'Back.easeOut', onComplete: () => this.portal.setAngle(0) });
  }

  updatePortal() {
    if (this.bossRush) return;
    if (!this.portalOpen) return this.checkKeypad();
    if (this.time.now < (this.portalReadyAt ?? 0)) return; // just came back out of it
    const near = Math.min(...this.players.map((player) => Phaser.Math.Distance.Between(player.x, player.y, PORTAL.x, PORTAL.y)));
    this.portal.setAlpha(near < PORTAL_GLOW_DISTANCE ? 1 : 0.15);
    const player = this.players.find((p) => Math.abs(p.x - PORTAL.x) < 34 && Math.abs(p.y - PORTAL.y) < 50);
    if (player) this.enterPortal(player);
  }

  // The hero spins into the portal (hat, aura and all) and goes to the Cube Islands.
  enterPortal(player) {
    this.won = true; // stops the level
    audio.play('forceField');
    this.bigMessage(t('quest.portal'), '#e1bee7');
    player.sprite.body.enable = false;
    if (player.aura) {
      this.tweens.killTweensOf(player.aura);
      this.tweens.add({ targets: player.aura, scale: 0, alpha: 0, duration: 900 });
    }
    this.tweens.add({
      targets: player.sprite,
      x: PORTAL.x,
      y: PORTAL.y,
      scale: 0,
      angle: 720,
      duration: 900,
      onUpdate: () => {
        player.updateHat();
        player.hatSprite?.setScale(1.5 * player.sprite.scaleY);
        player.aura?.setPosition(player.x, player.y + 6);
      },
    });
    this.time.delayedCall(1200, () => this.cameras.main.fadeOut(600, 0, 0, 0));
    this.time.delayedCall(1900, () => this.scene.start('Quest', this.team ? { team: this.team } : {})); // 2 players: split screen
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
        // Jump into the rocket (the hat and the aura come along)
        const player = this.player;
        player.sprite.body.enable = false;
        player.sprite.setFlipX(player.x > x);
        if (player.aura) {
          this.tweens.killTweensOf(player.aura);
          this.tweens.add({ targets: player.aura, scale: 0.6, alpha: 0, duration: 700 });
        }
        this.tweens.add({
          targets: player.sprite,
          x,
          y: landedY,
          scale: 0.6,
          alpha: 0,
          duration: 700,
          ease: 'Quad.easeIn',
          onUpdate: () => {
            player.updateHat();
            player.aura?.setPosition(player.x, player.y + 6);
          },
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
