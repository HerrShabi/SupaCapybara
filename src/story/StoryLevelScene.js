import Phaser from 'phaser';
import { goldify, ungoldify } from '../art/gold.js';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { getCharacter } from '../characters.js';
import { SideScrollerScene } from '../scenes/SideScrollerScene.js';
import { heroKey } from '../art/heroes.js';
import { touchButtonsFor } from '../touch.js';
import { drawComicBubble } from '../comicBubble.js';
import { loadSave } from '../save.js';
import { STORY_START_HERO, freeFriend } from './story.js';

// What every THE BAD GUY KING place shares (each place extends this, like StoryCloudScene):
// - You play the 2 heroes you picked on the map (data.heroes) and switch between them with Q.
// - The friend from story.js PLACES waits at the end as a gold trophy (createTrophy, called from createScenery).
// - The mini boss is an evil robot copy of that friend (createCopy, called from createBoss): dark, glowing red.
// - Beat it, and after the win dance the trophy breaks (instead of a key), the friend joins your team,
//   and you go back to the story map.
// A place passes its layout to super() like any side-scroller, plus `place` (from PLACES) and `trophy` {x, y}.

const COPY_TINT = 0x4a4a6a;
const MINI_BOSS_HP = 0.6; // a mini boss has less health than a world boss

export class StoryLevelScene extends SideScrollerScene {
  constructor(key, level, { place, trophy }) {
    super(key, { exitTo: 'Story', music: 'menu', ...level });
    this.place = place;
    this.trophySpot = trophy;
  }

  create(data = {}) {
    this.heroes = data.heroes?.length ? data.heroes : [STORY_START_HERO];
    this.heroIndex = 0;
    // Touch buttons for both heroes' powers, plus 🔄 to switch
    const powerUps = loadSave().powerUps;
    const both = this.heroes.map((id) => touchButtonsFor(getCharacter(id), powerUps, false));
    this.extraTouchButtons = Object.fromEntries(Object.keys(both[0]).filter((key) => key !== 'attack').map((key) => [key, both.some((b) => b[key])]));
    if (this.heroes.length > 1) this.extraTouchButtons.swap = true;
    super.create({ ...data, hero: this.heroes[0] });
    this.settings = { ...this.settings, bossHp: Math.ceil(this.settings.bossHp * MINI_BOSS_HP) };

    if (this.heroes.length > 1) {
      this.switchText = this.add
        .text(16, 112, '', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff' })
        .setStroke('#000000', 4)
        .setScrollFactor(0)
        .setDepth(10);
      this.showSwitchText();
      this.time.delayedCall(300, () => this.showTip('switch', this.player.x, this.player.y));
    }
  }

  // ---------- Switching heroes (Q) ----------

  update(time, delta) {
    const busy = this.won || this.tip || this.cutscene || this.dancing;
    if (!busy && this.heroes.length > 1 && this.player.controls.justPressed('swap')) this.switchHero();
    super.update(time, delta);
  }

  switchHero() {
    this.heroIndex = (this.heroIndex + 1) % this.heroes.length;
    const id = this.heroes[this.heroIndex];
    this.character = getCharacter(id);
    this.player.setCharacter(this.character, heroKey(id, this.palette), this.save.wearing?.[id] ?? null);
    audio.play('doubleJump');
    const puff = this.add.circle(this.player.x, this.player.y, 30, 0xffffff, 0.9).setDepth(4);
    this.tweens.add({ targets: puff, scale: 2.2, alpha: 0, duration: 350, onComplete: () => puff.destroy() });
    this.showSwitchText();
    const attack = t(`game.attack.${this.character.attack}`);
    this.hintText.setText(this.character.doubleJump ? `${attack}   ${t('game.jumpTwice')}` : attack);
  }

  showSwitchText() {
    const other = this.heroes[(this.heroIndex + 1) % this.heroes.length];
    this.switchText?.setText(`🔄 ${t('story.switchKey', { name: t(`name.${other}`) })}`);
  }

  // ---------- The friend's trophy and the robot copy ----------

  // The friend as a gold trophy on a pedestal, waiting at the end of the level
  createTrophy() {
    const { x, y } = this.trophySpot;
    const g = this.add.graphics();
    g.fillStyle(0xffa000);
    g.fillRect(x - 40, y - 38, 80, 10);
    g.fillStyle(0xffc107);
    g.fillRect(x - 28, y - 28, 56, 18);
    g.fillStyle(0xffa000);
    g.fillRect(x - 44, y - 10, 88, 10);
    this.pedestal = g;
    this.trophy = this.add.image(x, y - 62, `${heroKey(this.place.friend, this.palette)}-idle`).setScale(1.5).setFlipX(true);
    goldify(this.trophy);
    this.tweens.add({ targets: this.trophy, alpha: 0.8, duration: 700, yoyo: true, repeat: -1 });
  }

  // The mini boss: a dark copy of the friend (or of heroId), glowing red like an evil robot (the glow needs WebGL).
  createCopy(x, heroId = this.place.friend) {
    this.copyLook = heroKey(heroId, this.palette);
    this.boss = this.physics.add.sprite(x, -100, `${this.copyLook}-idle`).setScale(2).setTint(COPY_TINT).setFlipX(true);
    this.boss.body.setSize(44, 34).setOffset(10, 13);
    this.boss.setCollideWorldBounds(true);
    this.boss.disableBody(true, true);
    this.physics.add.collider(this.boss, this.solids);
    this.physics.add.collider(this.boss, this.platforms);
    this.boss.preFX?.addGlow(0xff1744, 4, 0, false, 0.1, 12);
  }

  // The King's machine beams the copy down from the sky at x. Then the fight starts.
  beamDownCopy(x, floorY) {
    audio.play('bossRoar');
    const beam = this.add.rectangle(x, 0, 60, floorY, 0xff1744, 0.35).setOrigin(0.5, 0).setDepth(1);
    this.tweens.add({ targets: beam, alpha: 0, duration: 1400, onComplete: () => beam.destroy() });
    this.boss.enableBody(true, x, 80, true, true);
    this.boss.setVelocity(0, 0);
    const words = this.add
      .text(Math.min(x, this.level.width - 200), floorY - 150, t('story.copyArrives'), { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ff5252', align: 'center' })
      .setStroke('#000000', 6)
      .setOrigin(0.5)
      .setDepth(10);
    this.time.delayedCall(2200, () => words.destroy());
    this.time.delayedCall(1300, () => this.startBossActions(0.8));
  }

  // The copy runs, jumps and stands with the friend's own pictures.
  animateCopy() {
    const boss = this.boss;
    const moving = Math.abs(boss.body.velocity.x) > 40;
    if (!boss.body.blocked.down) boss.setTexture(`${this.copyLook}-jump`);
    else if (moving) boss.anims.play(`${this.copyLook}-run`, true);
    else {
      boss.anims.stop();
      boss.setTexture(`${this.copyLook}-idle`);
    }
  }

  pushBoss(dir) {
    this.boss.setVelocityX(dir * 300);
  }

  // ---------- Winning: the trophy breaks and the friend is free ----------

  // (Called after the win dance, where the worlds drop a key.)
  dropKey() {
    const { x, y } = this.trophySpot;
    this.tweens.killTweensOf(this.trophy);
    this.trophy.setAlpha(1);
    audio.play('bossHit');
    this.tweens.add({
      targets: this.trophy,
      x: x + 4,
      duration: 50,
      yoyo: true,
      repeat: 9,
      onComplete: () => {
        audio.play('shatter');
        this.cameras.main.flash(300, 255, 236, 130);
        for (let i = 0; i < 12; i++) {
          const piece = this.add.rectangle(x, y - 62, 10, 10, 0xffc107).setDepth(3);
          this.tweens.add({ targets: piece, x: piece.x + Phaser.Math.Between(-120, 120), y: piece.y + Phaser.Math.Between(-120, 60), angle: 360, alpha: 0, duration: 700, onComplete: () => piece.destroy() });
        }
        ungoldify(this.trophy);
        this.pedestal.destroy();
        this.tweens.add({ targets: this.trophy, y: y - 30, duration: 300, ease: 'Bounce.easeOut' });
        audio.play('key');
        const view = this.cameras.main.worldView;
        this.thanks = drawComicBubble(this, t('story.thanks', { name: t(`name.${this.place.friend}`) }), { x, y: y - 30 }, view, -1);
        this.time.delayedCall(2600, () => this.win());
      },
    });
  }

  win() {
    if (this.won) return;
    this.won = true;
    for (const player of this.players) player.sprite.setVelocity(0, 0);
    for (const part of this.thanks ?? []) part.destroy();
    audio.play('win');
    freeFriend(this.save, this.place);
    const name = t(`name.${this.place.friend}`);
    this.bigMessage(t('story.friendFree', { name })).setScale(0.8);
    this.add
      .text(480, 290, [t('game.collected', { count: this.levelBolts }), t('story.joinsTeam', { name })].join('\n'), {
        fontFamily: 'Arial Black, Arial',
        fontSize: '26px',
        color: '#ffffff',
        align: 'center',
      })
      .setStroke('#000000', 6)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.time.delayedCall(3800, () => this.scene.start('Story'));
  }
}
