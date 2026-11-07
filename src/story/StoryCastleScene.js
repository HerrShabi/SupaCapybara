import Phaser from 'phaser';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { BOSS_REWARD, getDifficulty } from '../difficulty.js';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../scenes/SideScrollerScene.js';
import { heroKey } from '../art/heroes.js';
import { createCastleTextures } from '../art/crocKing.js';
import { createVolcanoTextures, LAVA, LAVA_BRIGHT } from '../art/volcano.js';
import { drawTemple } from '../art/jungle.js';
import { StoryLevelScene } from './StoryLevelScene.js';
import { PLACES } from './story.js';

// THE BAD GUY KING, the castle (Ethan's round 9 design). The whole team comes: Q switches between every hero.
// 1. The castle level: lava moats, swinging axes, and croc knights with shields (attacks from the front bounce
//    off: jump over them and hit them from behind, or stomp them).
// 2. The rematch hallway: the 3 dark robot copies again, one after another, with stolen tricks:
//    Dark Supa Cat turns invisible, Dark Supa Chameleon has a fire aura, Dark Ultra Capybara super-jumps and slams.
// 3. Then on to the throne room (StoryKingScene).
// KING RUSH (data.rush): starts right at the rematch on EXTREME, and losing all hearts is game over.

const PLACE = PLACES.find((p) => p.id === 'castle');
const ARENA_START = 4000;
const LEVEL_WIDTH = ARENA_START + VIEW_WIDTH;
const FLOOR = 440;
const LAVA_TOP = 495;

// Castle floor: [x, width, top]. The gaps are lava moats.
const GROUND = [
  [0, 560, 440],
  [700, 500, 440],
  [1340, 460, 420],
  [1960, 520, 440],
  [2620, 560, 430],
  [3320, 560, 440],
  [ARENA_START, VIEW_WIDTH, FLOOR],
];
const LEDGES = [
  [880, 320, 120],
  [1500, 300, 120],
  [2150, 320, 120],
  [2800, 300, 120],
  [3500, 320, 120],
];
// Swinging axes: [x, phase]
const AXES = [
  [1000, 0],
  [1640, 1.2],
  [2300, 2.4],
  [2950, 0.6],
  [3650, 1.8],
];
const AXE_PIVOT_Y = 120;
const AXE_SCALE = 1.85;
const AXE_SWING = 0.9; // radians each way
const AXE_SECONDS = 2.2; // one full swing back and forth
const AXE_HIT = 52;
// Croc knights patrol between [fromX, toX]
const KNIGHTS = [
  [760, 1150],
  [1400, 1760],
  [2000, 2440],
  [2660, 3150],
  [3360, 3850],
];
const KNIGHT_SPEED = 70;
const KNIGHT_TURN_MS = 900; // they turn around slowly: that's your chance to hit them from behind
const BOLTS = [
  [250, 400, 3],
  [900, 280, 3],
  [1520, 260, 3],
  [2170, 280, 3],
  [2820, 260, 3],
  [3520, 280, 3],
];

// The rematch: who comes, and in what order
const COPIES = [
  { hero: 'supa-cat', name: 'story.darkCat' },
  { hero: 'supa-chameleon', name: 'story.darkChameleon' },
  { hero: 'ultra-capybara', name: 'story.darkUltra' },
];
const COPY_HOME = { x: LEVEL_WIDTH - 260, y: FLOOR - 40 };
const REMATCH_HP = 0.8; // the copies are tougher this time
const FIRE = 0xb388ff;

export class StoryCastleScene extends StoryLevelScene {
  constructor() {
    super(
      'StoryCastle',
      {
        world: 'Castle',
        titleKey: 'story.place.castle',
        rushTitleKey: 'menu.kingRush',
        keyId: 'story-castle',
        bossName: COPIES[0].name,
        width: LEVEL_WIDTH,
        arenaStart: ARENA_START,
        start: { x: 100, y: 360 },
        arenaCheckpoint: { x: ARENA_START + 120, y: 360 },
        bolts: BOLTS,
        sunglasses: [],
        apples: [],
        robots: [],
        fallY: LAVA_TOP - 20,
        tips: [
          ['axe', 820, 1000, 380],
          ['shield', 640, 900, 400],
        ],
      },
      { place: PLACE, trophy: null },
    );
  }

  create(data = {}) {
    createCastleTextures(this);
    createVolcanoTextures(this);
    this.rush = Boolean(data.rush);
    this.copyIndex = 0;
    super.create({ ...data, bossRush: this.rush, difficulty: this.rush ? 'extreme' : data.difficulty });
    if (this.rush) this.exitScene = 'Title';
    this.settings = { ...this.settings, bossHp: Math.ceil(getDifficulty(this.difficultyId).bossHp * REMATCH_HP) };
    this.createKnights();
  }

  groundAt(x) {
    const found = GROUND.find(([gx, width]) => x >= gx && x <= gx + width);
    return found && { x: found[0], width: found[1], top: found[2] };
  }

  // ---------- The castle ----------

  createScenery() {
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    const walls = this.add.graphics();
    drawTemple(walls, 0, LEVEL_WIDTH, VIEW_HEIGHT); // dark stone blocks all the way
    // Torches with flickering flames
    for (let x = 200; x < LEVEL_WIDTH; x += 420) {
      walls.fillStyle(0x5d4037).fillRect(x - 4, 200, 8, 40);
      const flame = this.add.ellipse(x, 192, 16, 26, 0xff9100);
      this.tweens.add({ targets: flame, scaleY: 1.3, scaleX: 0.8, duration: 150 + (x % 90), yoyo: true, repeat: -1 });
    }
    // Lava in the moats
    this.add.rectangle(0, LAVA_TOP, LEVEL_WIDTH, VIEW_HEIGHT - LAVA_TOP, LAVA).setOrigin(0, 0);
    const shimmer = this.add.rectangle(0, LAVA_TOP, LEVEL_WIDTH, 6, LAVA_BRIGHT).setOrigin(0, 0);
    this.tweens.add({ targets: shimmer, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    const floor = this.add.graphics();
    this.solids = this.physics.add.staticGroup();
    for (const [x, width, top] of GROUND) {
      floor.fillStyle(0x455a64).fillRect(x, top, width, VIEW_HEIGHT - top);
      floor.fillStyle(0x78909c).fillRect(x, top, width, 10);
      for (let bx = x; bx < x + width; bx += 60) floor.fillStyle(0x37474f).fillRect(bx, top + 10, 3, VIEW_HEIGHT - top);
      this.solids.add(this.add.zone(x, top, width, VIEW_HEIGHT - top).setOrigin(0, 0));
    }
    this.platforms = this.physics.add.staticGroup();
    for (const [x, top, width] of LEDGES) {
      floor.fillStyle(0x78909c).fillRect(x, top, width, 16);
      floor.fillStyle(0x546e7a).fillRect(x, top + 12, width, 4);
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }
    // Swinging axes hang from the ceiling
    this.axes = AXES.map(([x, phase]) => ({ x, phase, image: this.add.image(x, AXE_PIVOT_Y, 'castle-axe').setOrigin(0.5, 0).setScale(AXE_SCALE).setDepth(3) }));
    for (const axe of this.axes) floor.fillStyle(0x263238).fillRect(axe.x - 20, 0, 40, AXE_PIVOT_Y + 6);
  }

  updateScenery() {
    const now = this.time.now / 1000;
    for (const axe of this.axes) {
      const angle = AXE_SWING * Math.sin((now / AXE_SECONDS) * Math.PI * 2 + axe.phase);
      axe.image.setRotation(-angle);
      axe.blade = { x: axe.x + Math.sin(angle) * 140 * AXE_SCALE, y: AXE_PIVOT_Y + Math.cos(angle) * 140 * AXE_SCALE };
    }
  }

  // ---------- Croc knights ----------

  createKnights() {
    const standingY = (x) => this.groundAt(x).top - 38 * 1.2;
    for (const [fromX, toX] of KNIGHTS) {
      const knight = this.badGuys.create(fromX, standingY(fromX), 'croc-knight').setScale(1.2);
      // (`shoot` does nothing: knights only walk and block)
      knight.setData({ kind: 'crocKnight', fromX, toX, dir: 1, turnAt: 0, nextShotAt: 0, shotEveryMs: 99999, shoot: () => {} });
      knight.setFlipX(true);
    }
  }

  updateKnights(delta) {
    const now = this.time.now;
    for (const knight of this.badGuys.getChildren()) {
      if (knight.getData('kind') !== 'crocKnight' || !knight.body.enable) continue;
      const target = this.nearestPlayer(knight.x);
      let dir = knight.getData('dir');
      const near = Math.abs(target.x - knight.x) < 280 && Math.abs(target.y - knight.y) < 120;
      const wanted = near ? Math.sign(target.x - knight.x) || dir : knight.x >= knight.getData('toX') ? -1 : knight.x <= knight.getData('fromX') ? 1 : dir;
      if (wanted !== dir && now >= knight.getData('turnAt')) {
        dir = wanted;
        knight.setData('turnAt', now + KNIGHT_TURN_MS);
      }
      knight.setData('dir', dir);
      knight.setFlipX(dir > 0); // the picture faces left
      const nextX = knight.x + dir * KNIGHT_SPEED * (delta / 1000);
      if (nextX > knight.getData('fromX') - 10 && nextX < knight.getData('toX') + 10) knight.x = nextX;
    }
  }

  // Attacks from the front clank off the shield (stomps always work)
  defeat(badGuy) {
    if (badGuy.getData?.('kind') === 'crocKnight' && !this.stomping) {
      const attacker = this.nearestPlayer(badGuy.x);
      const facing = badGuy.flipX ? 1 : -1;
      if (Math.sign(attacker.x - badGuy.x) === facing) {
        audio.play('shield');
        badGuy.setTintFill(0xffffff);
        this.time.delayedCall(80, () => badGuy.clearTint());
        return;
      }
    }
    super.defeat(badGuy);
  }

  stomp(target, player = this.player) {
    // Dark Supa Chameleon's stolen fire aura burns feet
    if (target === this.boss && COPIES[this.copyIndex].hero === 'supa-chameleon') {
      this.hurt(this.boss.x, player);
      return;
    }
    this.stomping = true;
    super.stomp(target, player);
    this.stomping = false;
  }

  // ---------- Every frame ----------

  update(time, delta) {
    super.update(time, delta);
    if (this.won || this.tip || this.cutscene || this.dancing) return;
    this.updateKnights(delta);
    for (const axe of this.axes) {
      if (!axe.blade) continue;
      for (const player of this.players) {
        if (Phaser.Math.Distance.Between(player.x, player.y, axe.blade.x, axe.blade.y) < AXE_HIT) this.hurt(axe.blade.x, player);
      }
    }
  }

  // ---------- The rematch: 3 dark copies, one after another ----------

  createBoss() {
    this.createCopy(COPY_HOME.x, COPIES[0].hero);
    this.copyAura = this.add.image(0, -300, 'aura').setTint(FIRE).setScale(1.4).setDepth(1.5).setVisible(false);
    this.tweens.add({ targets: this.copyAura, alpha: 0.6, scale: 1.55, duration: 300, yoyo: true, repeat: -1 });
    this.copyHiddenUntil = 0;
  }

  bossEntrance() {
    const copy = COPIES[this.copyIndex];
    this.copyLook = heroKey(copy.hero, this.palette);
    this.boss.setTexture(`${this.copyLook}-idle`).setAlpha(1).setScale(2).setAngle(0);
    this.bossNameText?.setText(t(copy.name));
    this.copyAura.setVisible(copy.hero === 'supa-chameleon');
    this.slamming = false;
    this.beamDownCopy(COPY_HOME.x, FLOOR);
    const trick = this.add
      .text(480, 200, t(`story.trick.${copy.hero}`), { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffd23f', align: 'center' })
      .setStroke('#000000', 6)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.time.delayedCall(2600, () => trick.destroy());
  }

  bossAction() {
    const boss = this.boss;
    const target = this.nearestPlayer(boss.x);
    const dir = target.x < boss.x ? -1 : 1;
    const hero = COPIES[this.copyIndex].hero;
    const shoot = () => {
      for (const vy of [-90, 0, 90]) this.enemyShoot(boss.x + dir * 50, boss.y, dir * this.settings.enemyShotSpeed, vy);
    };
    if (hero === 'supa-cat') {
      // Pounce, dash, shoot... or turn invisible (a stolen Supa Chameleon trick)
      const action = Phaser.Math.RND.pick(['pounce', 'dash', 'shoot', 'vanish']);
      if (action === 'vanish') {
        this.copyHiddenUntil = this.time.now + 2500;
        audio.play('invisible');
      } else if (action === 'pounce' && boss.body.blocked.down) {
        boss.setVelocity(dir * Math.max(180, Math.min(Math.abs(target.x - boss.x), 400) * 1.1), -620);
      } else if (action === 'dash') {
        boss.setVelocityX(dir * 440);
      } else shoot();
    } else if (hero === 'supa-chameleon') {
      // Sneak, lunge, spit, all with a stolen fire aura
      const action = Phaser.Math.RND.pick(['sneak', 'lunge', 'spit']);
      if (action === 'sneak') boss.setVelocityX(dir * 180);
      else if (action === 'lunge') boss.setVelocity(dir * 480, boss.body.blocked.down ? -300 : 0);
      else shoot();
    } else {
      // Fireballs, a charge, or a SUPER jump that slams down and sends shockwaves both ways
      const action = Phaser.Math.RND.pick(['fire', 'charge', 'slam', 'slam']);
      if (action === 'slam' && boss.body.blocked.down) {
        boss.setVelocity(dir * Math.min(Math.abs(target.x - boss.x), 300), -1000);
        this.slamming = true;
        audio.play('jump');
      } else if (action === 'charge') {
        boss.setVelocityX(dir * 400);
      } else {
        audio.play('fireBreath');
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 200, () => this.bossHittable() && this.enemyShoot(boss.x + dir * 50, FLOOR - 20, dir * this.settings.enemyShotSpeed, 0, 'fireball').setTint(FIRE).setScale(0.7));
      }
    }
  }

  updateBoss() {
    const boss = this.boss;
    boss.setFlipX(this.nearestPlayer(boss.x).x < boss.x);
    if (boss.body.blocked.down) boss.setVelocityX(boss.body.velocity.x * 0.95);
    this.animateCopy();
    boss.setAlpha(this.time.now < this.copyHiddenUntil ? 0.1 : 1);
    this.copyAura.setPosition(boss.x, boss.y + 8);
    // The slam: when the super jump lands, shockwaves roll out both ways (jump over them!)
    if (this.slamming && boss.body.blocked.down && boss.body.velocity.y >= 0) {
      this.slamming = false;
      audio.play('pound');
      this.cameras.main.shake(300, 0.012);
      for (const dir of [-1, 1]) this.enemyShoot(boss.x + dir * 40, FLOOR - 16, dir * this.settings.enemyShotSpeed * 1.1, 0, 'fireball').setTint(0xff6d00).setScale(0.8);
    }
  }

  hitBoss(amount) {
    super.hitBoss(amount);
    if (this.time.now < this.copyHiddenUntil) this.copyHiddenUntil = this.time.now + 200; // hitting it shows it
  }

  // The first two copies just blow up and the next one beams in. The last one ends the hallway.
  defeatBoss() {
    if (this.copyIndex >= COPIES.length - 1) {
      this.copyAura.setVisible(false);
      super.defeatBoss();
      return;
    }
    this.bossTimer?.remove();
    this.enemyShots.clear(true, true);
    this.boss.disableBody(true, false);
    this.cameras.main.shake(400, 0.015);
    audio.play('explosion');
    this.addBolts(BOSS_REWARD);
    this.copyAura.setVisible(false);
    this.tweens.add({
      targets: this.boss,
      angle: 720,
      scale: 0,
      duration: 900,
      onComplete: () => {
        this.copyIndex += 1;
        this.boss.setData('hp', this.settings.bossHp);
        this.bossBar.width = 400;
        this.time.delayedCall(800, () => this.bossEntrance());
      },
    });
  }

  // After the last copy (and the win dance): on to the throne room!
  dropKey() {
    const message = this.bigMessage(t('story.toThrone'), '#ffd23f').setScale(0.75);
    audio.play('key');
    this.time.delayedCall(2500, () => {
      message.destroy();
      this.scene.start('StoryKing', { heroes: this.heroes, rush: this.rush, hearts: this.rush ? this.hearts : undefined });
    });
  }
}
