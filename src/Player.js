import Phaser from 'phaser';
import { Magic, MAGIC_SPEED, takeStrawberry, bagText, rainbowColor } from './strawberry.js';
import { t } from './i18n.js';
import { audio } from './audio.js';
import { Controls } from './controls.js';
import { createHatTextures, hatAnchor } from './art/hats.js';
import { MegaBeam } from './megaBeam.js';

// The hero you control: running, jumping, and each hero's own powers.
// The scene decides what got hit: scene.hitArea(area, damage, attacker), scene.nearestTarget(x, y, attacker), and overlaps on player.lasers.

const RUN_SPEED = 260;
const JUMP_SPEED = 620;
const BOUNCE_MS = 250; // after getting hit you fly back a bit and can't steer

const ATTACK_COOLDOWN_MS = {
  laser: 250,
  superLaser: 220,
  scratch: 300,
  tongue: 450,
  moon: 400,
  rocket: 300,
  goldLaser: 220,
  cuffs: 400,
};
const LASER_SPEED = 900;
const LASER_RANGE_MS = 700;
const SCRATCH_DAMAGE = 2; // up close is risky, so it hits harder
const TONGUE_LENGTH = 230;
const TONGUE_MS = 260;

const INVISIBLE_MS = 10000;
const INVISIBLE_WAIT_MS = 30000;

const SHIELD_MS = 10000;
const SHIELD_WAIT_MS = 30000;

const FLY_MS = 10000;
const FLY_WAIT_MS = 30000;
const FLY_SPEED = 260;
const STOMP_BOUNCE_SPEED = 450;

const SHADOW_MS = 5000;
const SHADOW_WAIT_MS = 30000;
const SHADOW_SPEED = 1.6; // shadow form runs this many times faster

const MECHA_MS = 15000;
const MECHA_SCALE = 2.4;
const ROCKET_SPEED = 750;
const ROCKET_DAMAGE = 3;

const MOON_SPEED = 520;
const MOON_RANGE_MS = 1600;
const CUFFS_SPEED = 650;
const CUFFS_RANGE_MS = 700;
const CUFFS_DAMAGE = 2;
const MOON_DAMAGE = 2;

const FREEZE_MS = 5000;
const FREEZE_WAIT_MS = 30000;

export class Player {
  // powerUps: ids of the power-ups you bought in the shop. look: texture prefix from heroKey() (for secret colors).
  // scheme / padIndex: which keys and game controller (see controls.js); two players use 'p1' and 'p2'.
  // hat: the hat this hero wears (from save.wearing), or nothing. hatStyle: a world's own hat pictures and head
  // positions ({ prefix: texture key prefix, anchor(heroId, hat, scale) }), like the Drawings World's drawn hats.
  // strawberry: true if this hero can eat magic strawberries from the bag (scene.save; not in 2 PLAYERS).
  // megaBeam: true if this hero can fire MEGA BEAMs bought in the shop (scene.save, see megaBeam.js).
  constructor(scene, character, x, y, { powerUps = [], look = character.id, scheme = 'solo', padIndex = 0, hat = null, hatStyle = null, strawberry = false, megaBeam = false } = {}) {
    this.canEatStrawberry = strawberry;
    this.magic = new Magic();
    this.hatStyle = hatStyle;
    this.scene = scene;
    this.character = character;
    this.id = character.id;
    this.look = look;

    this.sprite = scene.physics.add.sprite(x, y, `${this.look}-idle`).setScale(1.5).setDepth(2);
    this.sprite.body.setSize(44, 34).setOffset(10, 13);

    this.controls = new Controls(scene, scheme, padIndex);
    this.attackIndex = 0; // Golden Capybara can switch between attacks
    this.nextAttackAt = 0;
    this.airJumpsLeft = 0;
    this.hurtAt = -Infinity;
    this.invisibleUntil = 0;
    this.invisibleReadyAt = 0;
    this.tongue = null;
    this.hasShield = powerUps.includes('shield');
    this.shieldUntil = 0;
    this.shieldReadyAt = 0;
    this.hasFly = powerUps.includes('fly');
    this.flyUntil = 0;
    this.flyReadyAt = 0;
    this.shadowUntil = 0;
    this.shadowReadyAt = 0;
    this.hasMecha = powerUps.includes('mecha-capybara');
    this.mechaUntil = 0;
    this.mechaUsed = false; // once per level
    this.hasFreeze = powerUps.includes('freeze');
    this.freezeUntil = 0;
    this.freezeReadyAt = 0;

    this.lasers = scene.physics.add.group({ allowGravity: false });
    this.megaBeam = megaBeam ? new MegaBeam(this) : null;
    this.tongueGraphics = scene.add.graphics().setDepth(3);

    // Shield: a wall in front of you, or a bubble all around you with the Multi Direction Upgrade.
    this.shieldIsBubble = powerUps.includes('multi-direction');
    this.shield = scene.physics.add.image(x, y, this.shieldIsBubble ? 'shield-bubble' : 'shield-wall').setDepth(3);
    this.shield.body.setAllowGravity(false);
    if (this.shieldIsBubble) this.shield.body.setCircle(60, 15, 5);
    this.shield.disableBody(true, true);

    if (hat) {
      createHatTextures(scene);
      this.hat = hat;
      this.hatSprite = scene.add.image(x, y, `${this.hatStyle?.prefix ?? 'hat-'}${hat}`).setScale(1.5).setDepth(3).setOrigin(0.5, hat === 'shades' ? 0.5 : 1);
    }

    if (character.fireAura) {
      this.aura = scene.add.image(x, y, character.auraTexture ?? 'aura').setDepth(1);
      scene.tweens.add({ targets: this.aura, scale: 1.12, alpha: 0.7, duration: 300, yoyo: true, repeat: -1 });
    }
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  get facing() {
    return this.sprite.flipX ? -1 : 1;
  }

  get invisible() {
    return this.scene.time.now < this.invisibleUntil;
  }

  get flying() {
    return this.scene.time.now < this.flyUntil;
  }

  get shielded() {
    return this.scene.time.now < this.shieldUntil;
  }

  get shadow() {
    return this.scene.time.now < this.shadowUntil;
  }

  get mecha() {
    return this.scene.time.now < this.mechaUntil;
  }

  // Nothing can hurt you in shadow form, in the Mecha suit, or with a magic strawberry's rainbow magic.
  get unhurtable() {
    return this.shadow || this.mecha || this.rainbow;
  }

  get rainbow() {
    return this.magic.active(this.scene.time.now);
  }

  // B: eat the oldest magic strawberry in the bag (strawberry.js)
  eatStrawberry() {
    const berry = takeStrawberry(this.scene.save);
    if (!berry) {
      audio.play('error');
      this.scene.flashMessage?.(t('strawberry.empty'));
      return;
    }
    this.magic.start(berry, this.scene.time.now);
    this.scene.flashMessage?.(t(berry === 'gold' ? 'strawberry.goldEaten' : 'strawberry.eaten'));
  }

  updateRainbow() {
    const now = this.scene.time.now;
    if (this.magic.update(now) === 'ended') this.restoreLook();
    if (!this.rainbow) return;
    this.sprite.setTint(rainbowColor(now), rainbowColor(now + 100), rainbowColor(now + 200), rainbowColor(now + 300)); // a rainbow across the hero
    // Rainbow sparkles behind you
    if (Math.random() < 0.4) {
      const spark = this.scene.add.circle(this.x - this.facing * 20, this.y + Phaser.Math.Between(-15, 15), 4, rainbowColor(now + 600)).setDepth(1.9);
      this.scene.tweens.add({ targets: spark, alpha: 0, scale: 0.2, duration: 400, onComplete: () => spark.destroy() });
    }
  }

  // Back to the right look after blinking (see-through when invisible, dark purple in shadow form).
  restoreLook() {
    this.sprite.setAlpha(this.invisible ? 0.25 : this.shadow ? 0.65 : 1);
    if (this.shadow) this.sprite.setTint(0x6a1b9a);
    else this.sprite.clearTint();
  }

  // Text for the screen display, e.g. "C = INVISIBLE: READY   V = SHIELD: WAIT 12".
  get powerStatus() {
    const now = this.scene.time.now;
    const seconds = (ms) => Math.ceil(ms / 1000);
    const status = (key, name, activeUntil, readyAt) => {
      if (now < activeUntil) return `${name}! ${seconds(activeUntil - now)}`;
      if (now < readyAt) return `${key} = ${name}: ${t('game.wait', { seconds: seconds(readyAt - now) })}`;
      return `${key} = ${name}: ${t('game.ready')}`;
    };
    const parts = [];
    if (this.character.attacks) parts.push(`Q = ${t('game.switch')}`);
    if (this.character.invisibility) parts.push(status('C', t('game.invisible'), this.invisibleUntil, this.invisibleReadyAt));
    if (this.character.shadow) parts.push(status('C', t('game.shadow'), this.shadowUntil, this.shadowReadyAt));
    if (this.hasShield) parts.push(status('V', t('game.shield'), this.shieldUntil, this.shieldReadyAt));
    if (this.hasFly) parts.push(status('F', t('game.fly'), this.flyUntil, this.flyReadyAt));
    if (this.hasFreeze) parts.push(status('Z', t('game.freeze'), this.freezeUntil, this.freezeReadyAt));
    if (this.hasMecha) {
      parts.push(this.mechaUsed && !this.mecha ? `R = ${t('game.mecha')}: ${t('game.used')}` : status('R', t('game.mecha'), this.mechaUntil, 0));
    }
    if (this.megaBeam) parts.push(this.megaBeam.status());
    if (this.rainbow) parts.push(`🌈 ${t('strawberry.magic')}! ${this.magic.secondsLeft(now)}`);
    else if (this.canEatStrawberry) parts.push(bagText(this.scene.save));
    return parts.filter(Boolean).join('     ');
  }

  // Jumped on a bad guy's head: bounce up off it.
  stompBounce() {
    this.sprite.setVelocityY(-STOMP_BOUNCE_SPEED);
  }

  wasHurt() {
    this.hurtAt = this.scene.time.now;
  }

  respawnAt({ x, y }) {
    this.sprite.setPosition(x, y).setVelocity(0, 0);
  }

  update() {
    // Held by the level (like swinging on a jungle vine): the scene moves the hero, so just keep the hat on.
    if (this.held) {
      if (this.aura) this.aura.setPosition(this.x, this.y + 6);
      this.updateHat();
      return;
    }
    const now = this.scene.time.now;
    const c = this.controls;
    const speed = RUN_SPEED * (this.shadow ? SHADOW_SPEED : 1) * (this.rainbow ? MAGIC_SPEED : 1);
    const body = this.sprite.body;
    const onGround = body.blocked.down;
    const bouncing = now < this.hurtAt + BOUNCE_MS;

    if (onGround) this.airJumpsLeft = this.character.doubleJump ? 1 : 0;

    if (!bouncing) {
      if (c.isDown('left')) {
        this.sprite.setVelocityX(-speed).setFlipX(true);
      } else if (c.isDown('right')) {
        this.sprite.setVelocityX(speed).setFlipX(false);
      } else {
        this.sprite.setVelocityX(0);
      }
    }

    if (c.justPressed('fly') && this.hasFly) this.startFlying();
    if (this.flyUntil && !this.flying) this.stopFlying();
    if (this.flying) {
      // Flying: the arrows move you in any direction, and there's no gravity.
      if (!bouncing) {
        if (c.isDown('up') || c.isDown('jump')) this.sprite.setVelocityY(-FLY_SPEED);
        else if (c.isDown('down')) this.sprite.setVelocityY(FLY_SPEED);
        else this.sprite.setVelocityY(0);
      }
      this.sprite.anims.stop();
      this.sprite.setTexture(this.mecha ? 'mecha' : `${this.look}-jump`);
      this.updatePowers();
      return;
    }

    const jumpPressed = c.justPressed('jump');
    const jumpHeld = c.isDown('jump');
    if (jumpPressed && onGround) {
      this.sprite.setVelocityY(-JUMP_SPEED);
      audio.play('jump');
    } else if (jumpPressed && this.airJumpsLeft > 0) {
      this.airJumpsLeft -= 1;
      this.sprite.setVelocityY(-JUMP_SPEED);
      this.puff();
      audio.play('doubleJump');
    }
    // Let go of jump early for a small hop.
    if (!jumpHeld && !bouncing && body.velocity.y < -200) {
      this.sprite.setVelocityY(-200);
    }

    if (this.mecha) {
      this.sprite.anims.stop();
      this.sprite.setTexture('mecha');
    } else if (!onGround) {
      this.sprite.anims.stop();
      this.sprite.setTexture(`${this.look}-jump`);
    } else if (body.velocity.x !== 0) {
      this.sprite.anims.play(`${this.look}-run`, true);
    } else {
      this.sprite.anims.stop();
      this.sprite.setTexture(`${this.look}-idle`);
    }

    this.updatePowers();
  }

  // Attacks and power buttons, the same whether you're walking or flying.
  updatePowers() {
    const c = this.controls;
    if (c.isDown('attack')) this.attack();
    const special = c.justPressed('special');
    if (this.character.invisibility && special) this.goInvisible();
    if (this.invisibleUntil && !this.invisible) this.becomeVisible();
    if (this.character.shadow && special) this.startShadow();
    if (this.shadowUntil && !this.shadow) this.endShadow();
    if (c.justPressed('shield') && this.hasShield) this.raiseShield();
    if (this.shieldUntil && !this.shielded) this.lowerShield();
    if (this.shielded) this.shield.setPosition(...this.shieldPosition());
    if (c.justPressed('swap') && this.character.attacks) this.switchAttack();
    if (c.justPressed('mecha') && this.hasMecha) this.startMecha();
    if (c.justPressed('freeze') && this.hasFreeze) this.useFreezeRay();
    if (this.freezeUntil && this.scene.time.now >= this.freezeUntil) {
      this.freezeUntil = 0;
      this.freezeReadyAt = this.scene.time.now + FREEZE_WAIT_MS;
    }
    if (this.mechaUntil && !this.mecha) this.endMecha();
    if (this.canEatStrawberry && c.justPressed('strawberry')) this.eatStrawberry();
    if (this.megaBeam && c.justPressed('mega')) this.megaBeam.start();
    this.megaBeam?.update();
    this.updateRainbow();
    this.steerMoons();
    this.updateTongue();
    if (this.aura) this.aura.setPosition(this.x, this.y + 6);
    this.updateHat();
  }

  // The hat sits on the hero's head (no hat in the Mecha suit).
  updateHat() {
    if (!this.hatSprite) return;
    const anchor = (this.hatStyle?.anchor ?? hatAnchor)(this.id, this.hat, this.sprite.scaleX);
    // Turn the hat with the hero (only the win dances tip the hero over)
    const turn = this.sprite.rotation;
    const ax = anchor.x * this.facing;
    this.hatSprite
      .setPosition(this.x + ax * Math.cos(turn) - anchor.y * Math.sin(turn), this.y + ax * Math.sin(turn) + anchor.y * Math.cos(turn))
      .setRotation(turn)
      .setFlipX(this.sprite.flipX)
      .setVisible(!this.mecha && this.sprite.visible)
      .setAlpha(this.sprite.alpha);
  }

  // ---------- Attacks (X) ----------

  attack() {
    const now = this.scene.time.now;
    if (now < this.nextAttackAt) return;
    const kind = this.mecha ? 'rocket' : this.currentAttack;
    this.nextAttackAt = now + ATTACK_COOLDOWN_MS[kind];

    if (kind === 'rocket') this.fireRocket();
    if (kind === 'moon') this.fireMoon();
    if (kind === 'cuffs') this.throwCuffs();
    if (kind === 'laser') this.fireLaser('laser', 1);
    if (kind === 'superLaser') this.fireLaser('super-laser', 2);
    if (kind === 'goldLaser') this.fireLaser('gold-laser', 2);
    if (kind === 'scratch') this.scratch();
    if (kind === 'tongue') {
      this.tongue = { startedAt: now, dir: this.facing, hit: false };
      audio.play('tongue');
    }
  }

  fireLaser(texture, damage) {
    audio.play(texture === 'laser' ? 'laser' : 'superLaser');
    // Start the beam at the eye (up and to the front of the head).
    const dir = this.facing;
    const eyeX = this.x + dir * 28;
    const eyeY = this.y - 13;

    const glowColor = { laser: 0xff3030, 'super-laser': 0xff4fd8, 'gold-laser': 0xffd54f }[texture];
    const glow = this.scene.add.circle(eyeX, eyeY, 7, glowColor).setDepth(3);
    this.scene.tweens.add({ targets: glow, alpha: 0, scale: 2, duration: 150, onComplete: () => glow.destroy() });

    const laser = this.lasers.create(eyeX + dir * 35, eyeY, texture).setFlipX(dir < 0);
    laser.setData('damage', damage);
    laser.setVelocityX(dir * LASER_SPEED);
    this.scene.time.delayedCall(LASER_RANGE_MS, () => laser.destroy());
  }

  // Golden Capybara has several attacks and switches between them (Q).
  get currentAttack() {
    return this.character.attacks ? this.character.attacks[this.attackIndex] : this.character.attack;
  }

  switchAttack() {
    this.attackIndex = (this.attackIndex + 1) % this.character.attacks.length;
    audio.play('click');
    const label = this.scene.add
      .text(this.x, this.y - 70, t(`game.attack.${this.currentAttack}`), { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffd54f' })
      .setStroke('#000000', 4)
      .setOrigin(0.5)
      .setDepth(6);
    this.scene.tweens.add({ targets: label, y: label.y - 40, alpha: 0, duration: 1100, onComplete: () => label.destroy() });
  }

  // Mecha Capybara: rockets from the launcher on its back.
  fireRocket() {
    audio.play('rocketShot');
    const dir = this.facing;
    const rocket = this.lasers.create(this.x + dir * 60, this.y + 5, 'rocket-shot').setFlipX(dir < 0).setScale(1.3);
    rocket.setData('damage', ROCKET_DAMAGE);
    rocket.setVelocityX(dir * ROCKET_SPEED);
    this.scene.time.delayedCall(LASER_RANGE_MS * 1.3, () => rocket.destroy());
  }

  // Bloodmoon Cat: a red moon that flies to the nearest bad guy by itself.
  fireMoon() {
    audio.play('moon');
    const moon = this.lasers.create(this.x + this.facing * 40, this.y - 10, 'red-moon');
    moon.setData({ damage: MOON_DAMAGE, homing: true });
    moon.setVelocityX(this.facing * MOON_SPEED);
    this.scene.tweens.add({ targets: moon, angle: 360, duration: 600, repeat: -1 });
    this.scene.time.delayedCall(MOON_RANGE_MS, () => moon.destroy());
  }

  // COPYBARA: spinning handcuffs. The bad guy they hit gets arrested (scene.defeat sees the 'cuffs' data).
  throwCuffs() {
    audio.play('click');
    audio.play('laser');
    const cuffs = this.lasers.create(this.x + this.facing * 40, this.y - 8, 'handcuffs');
    cuffs.setData({ damage: CUFFS_DAMAGE, cuffs: true });
    cuffs.setVelocityX(this.facing * CUFFS_SPEED);
    this.scene.tweens.add({ targets: cuffs, angle: 360 * this.facing, duration: 400, repeat: -1 });
    this.scene.time.delayedCall(CUFFS_RANGE_MS, () => cuffs.destroy());
  }

  steerMoons() {
    for (const moon of this.lasers.getChildren()) {
      if (!moon.getData('homing')) continue;
      const target = this.scene.nearestTarget(moon.x, moon.y, this);
      if (!target) continue;
      const angle = Phaser.Math.Angle.Between(moon.x, moon.y, target.x, target.y);
      const vx = Math.cos(angle) * MOON_SPEED;
      const vy = Math.sin(angle) * MOON_SPEED;
      moon.setVelocity(Phaser.Math.Linear(moon.body.velocity.x, vx, 0.15), Phaser.Math.Linear(moon.body.velocity.y, vy, 0.15));
    }
  }

  scratch() {
    audio.play('scratch');
    const dir = this.facing;
    const area = new Phaser.Geom.Rectangle(dir > 0 ? this.x + 10 : this.x - 90, this.y - 40, 80, 70);

    const slash = this.scene.add
      .image(area.centerX, area.centerY, 'slash')
      .setFlipX(dir < 0)
      .setDepth(3);
    this.scene.tweens.add({ targets: slash, alpha: 0, scale: 1.3, duration: 200, onComplete: () => slash.destroy() });

    if (this.scene.hitArea(area, SCRATCH_DAMAGE, this)) this.landedHit();
  }

  updateTongue() {
    this.tongueGraphics.clear();
    if (!this.tongue) return;

    const t = (this.scene.time.now - this.tongue.startedAt) / TONGUE_MS;
    if (t >= 1) {
      this.tongue = null;
      return;
    }

    // Shoots out and comes back.
    const { dir } = this.tongue;
    const length = TONGUE_LENGTH * Math.sin(Math.PI * t);
    const mouthX = this.x + dir * 40;
    const mouthY = this.y - 4;
    const tipX = mouthX + dir * length;

    this.tongueGraphics.lineStyle(6, 0xff6fa8);
    this.tongueGraphics.lineBetween(mouthX, mouthY, tipX, mouthY);
    this.tongueGraphics.fillStyle(0xff3d8b);
    this.tongueGraphics.fillCircle(tipX, mouthY, 8);

    if (!this.tongue.hit) {
      const area = new Phaser.Geom.Rectangle(Math.min(mouthX, tipX), mouthY - 10, Math.abs(length) + 8, 20);
      if (this.scene.hitArea(area, 1, this)) {
        this.tongue.hit = true;
        this.landedHit();
      }
    }
  }

  // Called whenever any of your attacks hits a bad guy.
  landedHit() {
    // Bad guys can see Supa Chameleon again once he hits them.
    if (this.invisible) this.becomeVisible();
  }

  // ---------- Supa Cat: double jump ----------

  puff() {
    for (const dx of [-14, 0, 14]) {
      const puff = this.scene.add.image(this.x + dx, this.y + 30, 'puff').setDepth(1);
      this.scene.tweens.add({ targets: puff, alpha: 0, scale: 2, y: puff.y + 15, duration: 300, onComplete: () => puff.destroy() });
    }
  }

  // ---------- Supa Chameleon: invisible (C) ----------

  goInvisible() {
    const now = this.scene.time.now;
    if (this.invisible || now < this.invisibleReadyAt) return;
    this.invisibleUntil = now + INVISIBLE_MS;
    audio.play('invisible');
    this.sprite.setAlpha(0.25);
  }

  becomeVisible() {
    this.invisibleUntil = 0;
    this.invisibleReadyAt = this.scene.time.now + INVISIBLE_WAIT_MS;
    this.sprite.setAlpha(1);
  }

  // ---------- Bloodmoon Cat: shadow form (C) ----------

  startShadow() {
    const now = this.scene.time.now;
    if (this.shadow || now < this.shadowReadyAt) return;
    this.shadowUntil = now + SHADOW_MS;
    audio.play('shadow');
    this.restoreLook();
  }

  endShadow() {
    this.shadowUntil = 0;
    this.shadowReadyAt = this.scene.time.now + SHADOW_WAIT_MS;
    this.restoreLook();
  }

  // ---------- Mecha Capybara power-up (R): a giant robot suit, once per level ----------

  startMecha() {
    if (this.mecha || this.mechaUsed) return;
    this.mechaUsed = true;
    this.mechaUntil = this.scene.time.now + MECHA_MS;
    audio.play('mecha');
    this.sprite.anims.stop();
    this.sprite.setTexture('mecha').setScale(MECHA_SCALE);
    this.sprite.body.setSize(48, 40).setOffset(8, 8);
    this.sprite.y -= 30; // grow upward instead of into the ground
  }

  endMecha() {
    this.mechaUntil = 0;
    this.sprite.setTexture(`${this.look}-idle`).setScale(1.5);
    this.sprite.body.setSize(44, 34).setOffset(10, 13);
  }

  // ---------- Freeze Ray power-up (Z): freezes every bad guy on the screen ----------

  useFreezeRay() {
    const now = this.scene.time.now;
    if (now < this.freezeUntil || now < this.freezeReadyAt) return;
    this.freezeUntil = now + FREEZE_MS;
    audio.play('freeze');
    this.scene.freezeBadGuys?.(FREEZE_MS);
  }

  // ---------- Fly power-up (F) ----------

  startFlying() {
    const now = this.scene.time.now;
    if (this.flying || now < this.flyReadyAt) return;
    this.flyUntil = now + FLY_MS;
    this.sprite.body.setAllowGravity(false);
    audio.play('fly');
  }

  stopFlying() {
    this.flyUntil = 0;
    this.flyReadyAt = this.scene.time.now + FLY_WAIT_MS;
    this.sprite.body.setAllowGravity(true);
  }

  // ---------- Story mode: switch to the other hero on your team (Q) ----------

  // Become another hero right where you are: new look, attacks, powers, hat and aura. Power-ups stay.
  setCharacter(character, look, hat = null) {
    if (this.mecha) this.endMecha();
    if (this.invisible) this.becomeVisible();
    if (this.shadow) this.endShadow();
    this.tongue = null;
    this.tongueGraphics.clear();
    this.character = character;
    this.id = character.id;
    this.look = look;
    this.attackIndex = 0;
    this.sprite.anims.stop();
    this.sprite.setTexture(`${look}-idle`);
    if (this.aura) {
      this.scene.tweens.killTweensOf(this.aura);
      this.aura.destroy();
      this.aura = null;
    }
    if (character.fireAura) {
      this.aura = this.scene.add.image(this.x, this.y, character.auraTexture ?? 'aura').setDepth(1);
      this.scene.tweens.add({ targets: this.aura, scale: 1.12, alpha: 0.7, duration: 300, yoyo: true, repeat: -1 });
    }
    this.hatSprite?.destroy();
    this.hatSprite = null;
    this.hat = hat;
    if (hat) {
      createHatTextures(this.scene);
      this.hatSprite = this.scene.add.image(this.x, this.y, `${this.hatStyle?.prefix ?? 'hat-'}${hat}`).setScale(1.5).setDepth(3).setOrigin(0.5, hat === 'shades' ? 0.5 : 1);
    }
    this.restoreLook();
    this.updateHat();
  }

  // ---------- Win dances (after beating a boss, see DANCES in characters.js) ----------

  // Starts the dance and returns how long it takes (ms). While dancing, the scene calls updateDance() instead of update().
  dance(id) {
    if (this.mecha) this.endMecha();
    if (this.flying) this.stopFlying();
    if (this.shielded) this.lowerShield();
    if (this.invisible) this.becomeVisible();
    if (this.shadow) this.endShadow();
    this.danceId = id;
    const scene = this.scene;
    const sprite = this.sprite;
    sprite.anims.stop();
    sprite.setVelocityX(0).setTexture(`${this.look}-idle`);
    audio.play('dance');

    if (id === 'wiggle') {
      // Shake your whole body!
      scene.tweens.add({ targets: sprite, angle: { from: -14, to: 14 }, duration: 90, yoyo: true, repeat: 8, onComplete: () => sprite.setAngle(0) });
      scene.tweens.add({ targets: sprite, scaleX: 1.75, scaleY: 1.3, duration: 180, yoyo: true, repeat: 4, onComplete: () => sprite.setScale(1.5) });
      return 1900;
    }
    if (id === 'bunny') {
      // Hop hop hop, turning around each time
      [0, 520, 1040].forEach((delay) =>
        scene.time.delayedCall(delay, () => {
          sprite.setVelocityY(-340).setFlipX(!sprite.flipX);
          audio.play('jump');
        }),
      );
      return 1700;
    }
    // Flip: a backflip high in the air
    sprite.setVelocityY(-JUMP_SPEED);
    audio.play('doubleJump');
    scene.tweens.add({ targets: sprite, angle: -360 * this.facing, duration: 820, ease: 'Sine.easeInOut', onComplete: () => sprite.setAngle(0) });
    return 1500;
  }

  updateDance() {
    const sprite = this.sprite;
    sprite.setVelocityX(0);
    if (this.danceId !== 'wiggle') sprite.setTexture(`${this.look}-${sprite.body.blocked.down ? 'idle' : 'jump'}`);
    if (this.aura) this.aura.setPosition(this.x, this.y + 6);
    this.updateHat();
  }

  // ---------- Shield power-up (V) ----------

  shieldPosition() {
    return this.shieldIsBubble ? [this.x, this.y - 4] : [this.x + this.facing * 48, this.y - 6];
  }

  raiseShield() {
    const now = this.scene.time.now;
    if (this.shielded || now < this.shieldReadyAt) return;
    this.shieldUntil = now + SHIELD_MS;
    audio.play('shield');
    this.shield.enableBody(true, ...this.shieldPosition(), true, true);
  }

  lowerShield() {
    this.shieldUntil = 0;
    this.shieldReadyAt = this.scene.time.now + SHIELD_WAIT_MS;
    this.shield.disableBody(true, true);
  }
}
