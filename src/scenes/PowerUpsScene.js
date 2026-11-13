import Phaser from 'phaser';
import { POWER_UPS } from '../characters.js';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { loadSave, writeSave, isPowerUpOn, setPowerUpOn } from '../save.js';
import { POWER_UP_ICONS } from '../shopItems.js';
import { megaBeamCount } from '../megaBeam.js';
import { sniperAmmo } from '../supaSniper.js';
import { addBackButton } from '../backButton.js';

// POWER-UP SWITCHES (Ethan, 2026-11-13): the POWER-UPS button in the STORY menu opens this screen.
// Every power-up you own gets a big ON/OFF switch (as many ON as you want). OFF ones do nothing in the
// levels and their touch buttons hide, but you keep them. The switches live in save.powerUpsOff (save.js).
// Keys: arrows pick, SPACE / ENTER / X flips the switch, ESC goes back (a controller presses the same keys).

const FONT = 'Arial Black, Arial';
const COLUMNS = 2;
const CARD_WIDTH = 420;
const CARD_HEIGHT = 80;
const GAP_X = 20;
const GAP_Y = 14;
const TOP = 112;

export class PowerUpsScene extends Phaser.Scene {
  constructor() {
    super('PowerUps');
  }

  create() {
    this.save = loadSave();
    setLanguage(this.save.language);
    audio.setMuted(this.save.muted);
    audio.playMusic('menu');
    // Your power-ups (MEGA BEAM counts while you have some left; the sniper's ammo goes with the SUPA SNIPER)
    this.items = POWER_UPS.filter((p) => (p.id === 'mega-beam' ? megaBeamCount(this.save) > 0 : !p.usedUp && this.save.powerUps.includes(p.id)));
    this.selected = 0;
    this.panel = null;

    this.add.rectangle(0, 0, 960, 540, 0x1b1b2f).setOrigin(0, 0);
    this.add.text(480, 44, `⚡ ${t('powerUps.title')}`, { fontFamily: FONT, fontSize: '32px', color: '#ffd23f' }).setStroke('#000000', 7).setOrigin(0.5);
    addBackButton(this, 76, 30, () => this.leave());
    this.add.text(480, 508, this.items.length ? t('powerUps.hint') : '', { fontFamily: FONT, fontSize: '14px', color: '#cccccc' }).setOrigin(0.5);

    if (this.items.length === 0) {
      this.add.text(480, 250, '🛒', { fontSize: '64px' }).setOrigin(0.5);
      const none = this.add.text(480, 330, t('powerUps.none'), { fontFamily: FONT, fontSize: '22px', color: '#ffffff', align: 'center' }).setStroke('#000000', 5).setOrigin(0.5);
      none.setScale(Math.min(1, 860 / none.width));
    }
    this.draw();

    const move = (dx, dy) => {
      if (!this.items.length) return;
      const next = this.selected + dx + dy * COLUMNS;
      if (next < 0 || next >= this.items.length) return;
      if (dx && Math.floor(next / COLUMNS) !== Math.floor(this.selected / COLUMNS)) return;
      this.selected = next;
      audio.play('click');
      this.draw();
    };
    this.input.keyboard.on('keydown-LEFT', () => move(-1, 0));
    this.input.keyboard.on('keydown-RIGHT', () => move(1, 0));
    this.input.keyboard.on('keydown-UP', () => move(0, -1));
    this.input.keyboard.on('keydown-DOWN', () => move(0, 1));
    for (const key of ['SPACE', 'ENTER', 'X']) this.input.keyboard.on(`keydown-${key}`, () => this.flip(this.selected));
    this.input.keyboard.on('keydown-ESC', () => this.leave());
  }

  leave() {
    this.scene.start('Menu');
  }

  flip(index) {
    const item = this.items[index];
    if (!item) return;
    this.selected = index;
    const on = !isPowerUpOn(this.save, item.id) || this.blocked(item);
    setPowerUpOn(this.save, item.id, on);
    // (Switching the Bubble Shield ON switches its Shield ON too)
    if (on && item.id === 'multi-direction') setPowerUpOn(this.save, 'shield', true);
    writeSave(this.save);
    audio.play(on ? 'buy' : 'click');
    this.draw();
  }

  // Multi Direction (the bubble shield) only works while the Shield is ON
  blocked(item) {
    return item.id === 'multi-direction' && !isPowerUpOn(this.save, 'shield');
  }

  draw() {
    this.panel?.destroy();
    const panel = this.add.container(0, 0);
    this.panel = panel;
    const add = (object) => panel.add(object) && object;
    const rows = Math.ceil(this.items.length / COLUMNS);
    const left = 480 - (COLUMNS * CARD_WIDTH + (COLUMNS - 1) * GAP_X) / 2;
    const top = rows > 3 ? TOP - 20 : TOP;

    this.items.forEach((item, i) => {
      const x = left + (i % COLUMNS) * (CARD_WIDTH + GAP_X);
      const y = top + Math.floor(i / COLUMNS) * (CARD_HEIGHT + GAP_Y);
      const blocked = this.blocked(item);
      const on = isPowerUpOn(this.save, item.id) && !blocked;
      const picked = i === this.selected;
      add(this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, on ? 0x2c2c54 : 0x232336).setOrigin(0, 0).setStrokeStyle(picked ? 5 : 3, picked ? 0xffd23f : on ? 0x7c7cc4 : 0x44445a))
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.flip(i));
      add(this.add.text(x + 42, y + CARD_HEIGHT / 2, POWER_UP_ICONS[item.id] ?? '⚡', { fontSize: '36px' }).setOrigin(0.5)).setAlpha(on ? 1 : 0.45);
      const name = add(this.add.text(x + 80, y + 28, t(`powerUp.${item.id}`), { fontFamily: FONT, fontSize: '20px', color: on ? '#ffffff' : '#9a9ab0' }).setStroke('#000000', 4).setOrigin(0, 0.5));
      name.setScale(Math.min(1, 180 / name.width));
      const note = blocked ? t('powerUps.needsShield') : item.id === 'mega-beam' ? `x${megaBeamCount(this.save)}` : item.id === 'supa-sniper' ? `🔫 x${sniperAmmo(this.save)}` : '';
      if (note) add(this.add.text(x + 80, y + 56, note, { fontFamily: FONT, fontSize: '13px', color: blocked ? '#ff8a80' : '#ffd23f' }).setOrigin(0, 0.5));
      this.drawSwitch(add, x + CARD_WIDTH - 82, y + CARD_HEIGHT / 2, on, () => this.flip(i));
    });
  }

  // The big ON/OFF switch: green with the knob on the right when ON, gray with the knob on the left when OFF
  drawSwitch(add, x, y, on, onTap) {
    const width = 128;
    const height = 50;
    const g = add(this.add.graphics());
    g.fillStyle(on ? 0x2e7d32 : 0x55555f);
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);
    g.lineStyle(3, on ? 0xb9f6ca : 0x9a9ab0);
    g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);
    const knobX = on ? x + width / 2 - height / 2 : x - width / 2 + height / 2;
    g.fillStyle(0xffffff);
    g.fillCircle(knobX, y, height / 2 - 6);
    add(this.add.text(on ? x - 16 : x + 16, y, t(on ? 'powerUps.on' : 'powerUps.off'), { fontFamily: FONT, fontSize: '18px', color: '#ffffff' }).setStroke('#000000', 4).setOrigin(0.5));
    add(this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true }).on('pointerdown', onTap));
  }
}
