import Phaser from 'phaser';
import { CHARACTERS } from '../characters.js';
import { loadSave, writeSave } from '../save.js';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { createHeroTextures } from '../art/heroes.js';

// 2 PLAYERS setup: pick TEAM or BATTLE, each player picks a hero, then a world (TEAM) or an arena (BATTLE).
// Player 1 picks with A / D, player 2 with ← / →, or tap the arrows. ENTER or START begins.

const FONT = 'Arial Black, Arial';
const MODES = ['team', 'battle'];
const PLAYER_COLORS = ['#ffd23f', '#4fc3f7'];

export class TwoPlayerScene extends Phaser.Scene {
  constructor() {
    super('TwoPlayer');
  }

  create() {
    this.save = loadSave();
    setLanguage(this.save.language);
    createHeroTextures(this);
    audio.playMusic('menu');
    this.cameras.main.setBackgroundColor(0x1b1b2f);

    this.heroes = CHARACTERS.filter((c) => this.save.owned.includes(c.id)).map((c) => c.id);
    const setup = this.save.twoPlayer ?? {};
    this.mode = setup.mode ?? 'team';
    this.picks = (setup.heroes ?? [this.heroes[0], this.heroes[1] ?? this.heroes[0]]).map((id) => (this.heroes.includes(id) ? id : this.heroes[0]));
    this.world = setup.world === 3 && this.worldOpen(3) ? 3 : 1;
    this.arena = setup.arena ?? 'helipad';

    this.add.text(480, 40, t('menu.twoPlayers'), { fontFamily: FONT, fontSize: '40px', color: '#ffd23f' }).setStroke('#000000', 8).setOrigin(0.5);
    this.draw();

    const keyboard = this.input.keyboard;
    keyboard.on('keydown-A', () => this.pick(0, -1));
    keyboard.on('keydown-D', () => this.pick(0, 1));
    keyboard.on('keydown-LEFT', () => this.pick(1, -1));
    keyboard.on('keydown-RIGHT', () => this.pick(1, 1));
    keyboard.on('keydown-ENTER', () => this.start());
    keyboard.on('keydown-ESC', () => this.scene.start('Title'));
  }

  // World 3 needs the key from World 2 (like in Adventure).
  worldOpen(number) {
    return number === 1 || this.save.keys.includes(`world${number - 1}`);
  }

  // Everything below the title is redrawn whenever something changes.
  draw() {
    this.layer?.destroy(true);
    this.layer = this.add.container(0, 0);
    const add = (object) => this.layer.add(object) && object;

    MODES.forEach((mode, i) => {
      const x = 360 + i * 240;
      const selected = mode === this.mode;
      add(this.add.rectangle(x, 105, 220, 46, selected ? 0xef6c00 : 0x2c2c54).setStrokeStyle(4, selected ? 0xffd23f : 0x555588))
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setOption('mode', mode));
      add(this.add.text(x, 105, t(`menu.${mode}`), { fontFamily: FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5));
    });

    [0, 1].forEach((player) => {
      const y = 205 + player * 110;
      const id = this.picks[player];
      add(this.add.text(200, y, `P${player + 1}`, { fontFamily: FONT, fontSize: '40px', color: PLAYER_COLORS[player] }).setStroke('#000000', 7).setOrigin(0.5));
      add(this.add.text(330, y, '◀', { fontFamily: FONT, fontSize: '40px', color: '#ffffff' }).setOrigin(0.5))
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.pick(player, -1));
      add(this.add.sprite(480, y - 8, `${id}-idle`).setScale(2).play(`${id}-run`));
      add(this.add.text(480, y + 42, t(`name.${id}`), { fontFamily: FONT, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5));
      add(this.add.text(630, y, '▶', { fontFamily: FONT, fontSize: '40px', color: '#ffffff' }).setOrigin(0.5))
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.pick(player, 1));
      add(this.add.text(770, y, t(player ? 'menu.p2Keys' : 'menu.p1Keys'), { fontFamily: 'Arial', fontSize: '14px', color: '#cccccc', align: 'center' }).setOrigin(0.5));
    });

    // TEAM: which world. BATTLE: which arena.
    const options =
      this.mode === 'team'
        ? [1, 3].map((number) => ({ label: t('menu.world', { number }), active: this.world === number, open: this.worldOpen(number), set: () => this.setOption('world', number) }))
        : ['helipad', 'lava'].map((arena) => ({ label: t(`menu.arena.${arena}`), active: this.arena === arena, open: true, set: () => this.setOption('arena', arena) }));
    options.forEach((option, i) => {
      const x = 360 + i * 240;
      add(this.add.rectangle(x, 420, 220, 40, option.active ? 0x1565c0 : 0x2c2c54).setStrokeStyle(3, option.active ? 0xffd23f : 0x555588).setAlpha(option.open ? 1 : 0.4))
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => (option.open ? option.set() : audio.play('error')));
      add(this.add.text(x, 420, option.label, { fontFamily: FONT, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setAlpha(option.open ? 1 : 0.4));
    });

    add(this.add.rectangle(480, 490, 300, 56, 0x2e7d32).setStrokeStyle(5, 0xb9f6ca))
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.start());
    add(this.add.text(480, 490, t('menu.start'), { fontFamily: FONT, fontSize: '28px', color: '#ffffff' }).setStroke('#000000', 5).setOrigin(0.5));
    add(this.add.text(910, 520, t('menu.back'), { fontFamily: 'Arial', fontSize: '14px', color: '#cccccc' }).setOrigin(1, 0.5))
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Title'));
  }

  pick(player, step) {
    const index = this.heroes.indexOf(this.picks[player]);
    this.picks[player] = this.heroes[Phaser.Math.Wrap(index + step, 0, this.heroes.length)];
    audio.play('click');
    this.draw();
  }

  setOption(name, value) {
    this[name] = value;
    audio.play('click');
    this.draw();
  }

  start() {
    this.save.twoPlayer = { mode: this.mode, heroes: this.picks, world: this.world, arena: this.arena };
    writeSave(this.save);
    audio.play('click');
    if (this.mode === 'team') {
      this.scene.start(`World${this.world}`, { team: { heroes: this.picks } });
    } else {
      this.scene.start('Battle', { heroes: this.picks, arena: this.arena });
    }
  }
}
