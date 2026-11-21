import Phaser from 'phaser';
import { addBackButton } from '../backButton.js';
import { loadSave, writeSave } from '../save.js';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { createHeroTextures, heroKey } from '../art/heroes.js';
import { NEWS, markNewsRead } from '../news.js';
import { TROPHIES, hasTrophy, newTrophies } from '../trophies.js';

// WHAT'S NEW: two tabs, like Minecraft's advancements screen (Ethan, 2026-11-21).
// 📰 NEWS: the newest things in the game, each with a picture (news.js).
// 🏆 TROPHIES: all the trophies (trophies.js): gold when you have them; locked ones are dim, and locked secret
// ones say "???" with a hint. ◀ ▶ (or TAB) switch tabs, ▲ ▼ / the mouse wheel / dragging scroll, ESC or BACK leaves.

const FONT = 'Arial Black, Arial';
const TOP = 112;
const BOTTOM = 492;
const TABS = ['news', 'trophies'];

export class NewsScene extends Phaser.Scene {
  constructor() {
    super('News');
  }

  create() {
    this.save = loadSave();
    setLanguage(this.save.language);
    createHeroTextures(this);
    // New trophies since last time? Open on that tab.
    this.tab = newTrophies(this.save) ? 'trophies' : 'news';
    markNewsRead(this.save);
    this.save.trophiesSeen = this.save.trophies?.length ?? 0;
    writeSave(this.save);
    this.cameras.main.setBackgroundColor(0x1b1b2f);

    this.list = this.add.container(0, 0);
    const area = this.make.graphics().fillRect(0, TOP - 6, 960, BOTTOM - TOP + 6);
    this.list.setMask(area.createGeometryMask());

    this.add.text(480, 30, `📰 ${t('news.title')}`, { fontFamily: FONT, fontSize: '34px', color: '#ffd23f' }).setStroke('#000000', 8).setOrigin(0.5);
    this.tabButtons = TABS.map((tab, i) => {
      const x = 360 + i * 240;
      const box = this.add.rectangle(x, 80, 220, 38, 0x2c2c54).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.showTab(tab));
      const label = this.add.text(x, 80, '', { fontFamily: FONT, fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      return { tab, box, label };
    });
    this.add.text(480, 518, t('news.help'), { fontFamily: 'Arial', fontSize: '14px', color: '#aaaacc' }).setOrigin(0.5);
    addBackButton(this, 80, 518, () => this.back());

    const keyboard = this.input.keyboard;
    keyboard.on('keydown-UP', () => this.scrollBy(-60));
    keyboard.on('keydown-DOWN', () => this.scrollBy(60));
    keyboard.on('keydown-LEFT', () => this.showTab('news'));
    keyboard.on('keydown-RIGHT', () => this.showTab('trophies'));
    keyboard.on('keydown-TAB', (event) => {
      event.preventDefault?.();
      this.showTab(this.tab === 'news' ? 'trophies' : 'news');
    });
    keyboard.on('keydown-ESC', () => this.back());
    keyboard.on('keydown-ENTER', () => this.back());
    this.input.on('wheel', (_pointer, _objects, _dx, dy) => this.scrollBy(dy));
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown) this.scrollBy(-(pointer.y - pointer.prevPosition.y));
    });
    this.showTab(this.tab, true);
  }

  showTab(tab, quiet = false) {
    if (!quiet) audio.play('click');
    this.tab = tab;
    const have = TROPHIES.filter((trophy) => hasTrophy(this.save, trophy.id)).length;
    for (const button of this.tabButtons) {
      const on = button.tab === tab;
      button.box.setFillStyle(on ? 0x3949ab : 0x2c2c54).setStrokeStyle(3, on ? 0xffd23f : 0x555588);
      button.label.setText(button.tab === 'news' ? t('news.tabNews') : t('news.tabTrophies', { have, total: TROPHIES.length }));
    }
    this.list.removeAll(true);
    let height = 0;
    if (tab === 'news') NEWS.forEach((item, i) => (height = this.addNews(item, i)));
    else TROPHIES.forEach((trophy, i) => (height = this.addTrophy(trophy, i)));
    this.scroll = 0;
    this.list.y = 0;
    this.maxScroll = Math.max(0, height - BOTTOM + 10);
  }

  // One news item (92 px). Returns where it ends.
  addNews(item, index) {
    const row = 92;
    const y = TOP + index * row + row / 2;
    const add = (object) => this.list.add(object) && object;
    add(this.add.rectangle(480, y, 860, row - 12, index === 0 ? 0x3949ab : 0x2c2c54).setStrokeStyle(3, index === 0 ? 0xffd23f : 0x555588));
    if (item.heroes) {
      item.heroes.forEach((id, i) => {
        const x = 110 + (i - (item.heroes.length - 1) / 2) * 52;
        const sprite = add(this.add.image(x, y + 2, `${heroKey(id, 0)}-idle`));
        sprite.setScale(Math.min(1.4, 64 / sprite.height));
      });
    } else {
      add(this.add.text(110, y, item.emoji, { fontSize: '48px' }).setOrigin(0.5));
    }
    if (index === 0) add(this.add.text(70, y - 30, t('news.new'), { fontFamily: FONT, fontSize: '13px', color: '#ffffff', backgroundColor: '#e53935', padding: { x: 5, y: 2 } }).setOrigin(0.5));
    add(this.add.text(185, y - 16, t(`news.${item.id}.title`), { fontFamily: FONT, fontSize: '22px', color: '#ffd23f' }).setStroke('#000000', 5).setOrigin(0, 0.5));
    add(this.add.text(185, y + 16, t(`news.${item.id}.text`), { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', wordWrap: { width: 700 } }).setOrigin(0, 0.5));
    return y + row / 2;
  }

  // One trophy (60 px): gold when you have it, dim when not; locked secrets show "???" and a hint.
  addTrophy(trophy, index) {
    const row = 60;
    const y = TOP + index * row + row / 2;
    const add = (object) => this.list.add(object) && object;
    const got = hasTrophy(this.save, trophy.id);
    const hidden = trophy.secret && !got;
    add(this.add.rectangle(480, y, 860, row - 8, got ? 0x5d4a12 : 0x23233f).setStrokeStyle(3, got ? 0xffd23f : 0x44446a));
    add(this.add.text(85, y, got ? '🏆' : '🔒', { fontSize: '30px' }).setOrigin(0.5).setAlpha(got ? 1 : 0.5));
    add(this.add.text(130, y, trophy.icon, { fontSize: '26px' }).setOrigin(0.5).setAlpha(got ? 1 : 0.35));
    const name = hidden ? t('trophy.locked') : t(`trophy.${trophy.id}.name`);
    const text = hidden ? t(`trophy.${trophy.id}.hint`) : t(`trophy.${trophy.id}.how`);
    add(this.add.text(165, y - 11, name, { fontFamily: FONT, fontSize: '18px', color: got ? '#ffd23f' : '#9e9ec4' }).setStroke('#000000', 4).setOrigin(0, 0.5));
    add(this.add.text(165, y + 12, text, { fontFamily: 'Arial', fontSize: '14px', color: got ? '#ffffff' : '#9e9ec4', fontStyle: hidden ? 'italic' : 'normal' }).setOrigin(0, 0.5));
    const reward = `${trophy.prize ? `🧱 ${t('trophy.prize')} + ` : ''}⚡ ${trophy.bolts}`;
    add(this.add.text(890, y, reward, { fontFamily: FONT, fontSize: '15px', color: got ? '#ffd23f' : '#77779a' }).setOrigin(1, 0.5));
    return y + row / 2;
  }

  scrollBy(amount) {
    this.scroll = Phaser.Math.Clamp(this.scroll + amount, 0, this.maxScroll);
    this.list.y = -this.scroll;
  }

  back() {
    audio.play('click');
    this.scene.start('Title');
  }
}
