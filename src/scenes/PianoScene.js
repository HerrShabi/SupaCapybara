import Phaser from 'phaser';
import { addBackButton } from '../backButton.js';
import { loadSave, writeSave } from '../save.js';
import { t, setLanguage } from '../i18n.js';
import { audio, SONGS } from '../audio.js';

// THE PIANO (Ethan, 2026-11-21): the 🎹 button on the title screen. Two octaves (C4 to C6) with note names.
// Tap / click the keys, or use the keyboard: Z X C V B N M = C4 to B4, A S D F G H J K = C5 to C6,
// and the black keys W E (C#5 D#5) T Y U (F#5 G#5 A#5). A key lights up when it plays.
// 🎵 LEARN PART 1 / PART 2 (Ethan's idea): the next note of the theme song's first or second half glows; play it to go on.
// ▶ LISTEN plays the theme song with the keys lighting up. Saving your own songs comes later (GAME_DESIGN.md Q30).

const FONT = 'Arial Black, Arial';
const WHITE = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'];
const BLACK_AFTER = { C: 'C#', D: 'D#', F: 'F#', G: 'G#', A: 'A#' }; // black key to the right of these white keys
const KEYBOARD = {
  Z: 'C4', X: 'D4', C: 'E4', V: 'F4', B: 'G4', N: 'A4', M: 'B4',
  A: 'C5', S: 'D5', D: 'E5', F: 'F5', G: 'G5', H: 'A5', J: 'B5', K: 'C6',
  W: 'C#5', E: 'D#5', T: 'F#5', Y: 'G#5', U: 'A#5',
};
const KEY_WIDTH = 58;
const LEFT = 480 - (WHITE.length * KEY_WIDTH) / 2;
const TOP = 250;
const HEIGHT = 230;
const LIT = 0xffd23f; // a key that's playing
const NEXT = 0x4fc3f7; // the lesson's next note

// The theme song's melody as notes, and how many eighth notes each one lasts ('-' holds, '.' is a rest).
// part: 0 = the first half (lines 1-4), 1 = the second half (lines 5-8) (Ethan: learn part 1 or part 2)
function themeSong() {
  const steps = SONGS.menu.lead.split(/\s+/);
  const half = steps.length / 2;
  const notes = [];
  steps.forEach((step, i) => {
    const part = i < half ? 0 : 1;
    if (step === '-') notes.at(-1) && (notes.at(-1).length += 1);
    else if (step === '.') notes.push({ rest: true, length: 1, part });
    else notes.push({ note: step, length: 1, part });
  });
  return { notes, stepMs: 60000 / SONGS.menu.bpm / 2 };
}

export class PianoScene extends Phaser.Scene {
  constructor() {
    super('Piano');
  }

  create() {
    const save = loadSave();
    this.save = save;
    setLanguage(save.language);
    audio.stopMusic();
    this.cameras.main.setBackgroundColor(0x1b1b2f);
    this.add.text(480, 36, `🎹 ${t('piano.title')}`, { fontFamily: FONT, fontSize: '38px', color: '#ffd23f' }).setStroke('#000000', 8).setOrigin(0.5);
    this.info = this.add.text(480, 150, t('piano.help'), { fontFamily: FONT, fontSize: '18px', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    this.bigNote = this.add.text(480, 205, '', { fontFamily: FONT, fontSize: '40px', color: '#4fc3f7' }).setStroke('#000000', 6).setOrigin(0.5);

    this.keys = {};
    // white keys first, then the black ones on top
    WHITE.forEach((note, i) => {
      const x = LEFT + i * KEY_WIDTH;
      const box = this.add.rectangle(x, TOP, KEY_WIDTH - 3, HEIGHT, 0xffffff).setOrigin(0, 0).setStrokeStyle(2, 0x000000);
      const label = this.add.text(x + KEY_WIDTH / 2 - 1, TOP + HEIGHT - 24, note[0], { fontFamily: FONT, fontSize: '20px', color: '#333333' }).setOrigin(0.5);
      this.keys[note] = { box, label, color: 0xffffff };
    });
    WHITE.forEach((note, i) => {
      const sharp = BLACK_AFTER[note[0]];
      if (!sharp || i === WHITE.length - 1) return;
      const id = `${sharp}${note.slice(1)}`;
      const x = LEFT + (i + 1) * KEY_WIDTH - 18;
      const box = this.add.rectangle(x, TOP, 34, HEIGHT * 0.6, 0x111111).setOrigin(0, 0).setStrokeStyle(2, 0x000000);
      this.keys[id] = { box, color: 0x111111 };
    });
    for (const [note, key] of Object.entries(this.keys)) {
      key.box.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.play(note));
    }

    // Buttons: learn the theme, listen to it
    this.button(200, 100, `🎵 ${t('piano.part', { number: 1 })}`, 0x2e7d32, () => this.startLesson(0));
    this.button(480, 100, `🎵 ${t('piano.part', { number: 2 })}`, 0x00838f, () => this.startLesson(1));
    this.button(760, 100, `▶ ${t('piano.listen')}`, 0x1565c0, () => this.listen());
    // ⏺️ RECORD / ▶ MY SONG (Ethan, 2026-11-21): record what you play, it's saved (save.song: [[note, ms], ...])
    this.recordButton = this.button(620, 515, `⏺️ ${t('piano.record')}`, 0xc62828, () => this.toggleRecord(), 220);
    this.button(860, 515, `▶ ${t('piano.mySong')}`, 0x6a1b9a, () => this.playMySong(), 180);
    addBackButton(this, 80, 515, () => this.scene.start('Title'));

    this.input.keyboard.on('keydown', (event) => {
      if (event.repeat) return;
      if (event.key === 'Escape') return this.scene.start('Title');
      const note = KEYBOARD[event.code?.replace(/^Key/, '')]; // (the key's place on the keyboard, so German keyboards work too)
      if (note) this.play(note);
    });
    this.song = themeSong();
    this.lesson = null;
  }

  button(x, y, text, color, onClick, width = 260) {
    this.add.rectangle(x, y, width, 44, color).setStrokeStyle(3, 0xffd23f).setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    return this.add.text(x, y, text, { fontFamily: FONT, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
  }

  // ---------- ⏺️ Record your own song ----------

  toggleRecord() {
    this.stopListening();
    if (!this.recording) {
      this.recording = { start: this.time.now, notes: [] };
      this.recordButton.setText(`⏹️ ${t('piano.stop')}`);
      this.info.setText(t('piano.recording'));
      this.bigNote.setText('🔴');
      return;
    }
    const { notes } = this.recording;
    this.recording = null;
    this.recordButton.setText(`⏺️ ${t('piano.record')}`);
    this.bigNote.setText('');
    if (!notes.length) {
      this.info.setText(t('piano.help'));
      return;
    }
    this.save.song = notes;
    writeSave(this.save);
    this.info.setText(t('piano.saved', { count: notes.length }));
    audio.play('crystal');
  }

  playMySong() {
    if (this.recording) this.toggleRecord();
    this.stopListening();
    const song = this.save.song ?? [];
    if (!song.length) {
      this.info.setText(t('piano.noSong'));
      audio.play('error');
      return;
    }
    this.info.setText(`▶ ${t('piano.mySong')}`);
    this.listening = song.map(([note, at]) => this.time.delayedCall(at, () => this.play(note, true)));
  }

  // A key plays: the sound, and it lights up for a moment
  play(note, fromSong = false) {
    const key = this.keys[note];
    if (!key) return;
    audio.pianoNote(note);
    key.box.setFillStyle(LIT);
    if (this.recording && !fromSong) this.recording.notes.push([note, Math.round(this.time.now - this.recording.start)]);
    this.time.delayedCall(180, () => this.paintKey(note));
    if (!fromSong) this.checkLesson(note);
  }

  paintKey(note) {
    const key = this.keys[note];
    key.box.setFillStyle(this.lesson && this.lessonNote() === note ? NEXT : key.color);
  }

  // ---------- 🎵 LEARN THE THEME: the next note glows blue; play it and the next one lights up ----------

  startLesson(part) {
    this.stopListening();
    const old = this.lesson && this.lessonNote();
    this.lesson = null;
    if (old) this.paintKey(old);
    this.lesson = { part, index: this.song.notes.findIndex((n) => n.part === part) - 1 };
    this.nextLessonNote();
  }

  lessonNote() {
    const step = this.song.notes[this.lesson.index];
    return step?.part === this.lesson.part ? step.note : undefined;
  }

  nextLessonNote() {
    const before = this.lesson && this.lessonNote();
    do this.lesson.index += 1;
    while (this.song.notes[this.lesson.index]?.rest);
    if (before) this.paintKey(before);
    const note = this.lessonNote();
    if (!note) {
      // the whole part!
      const part = this.lesson.part;
      this.lesson = null;
      this.bigNote.setText(t(part === 0 ? 'piano.part1Done' : 'piano.done'));
      this.info.setText(t('piano.help'));
      audio.play('win');
      return;
    }
    const left = this.song.notes.slice(this.lesson.index).filter((n) => !n.rest && n.part === this.lesson.part).length;
    this.bigNote.setText(`${note.replace(/\d/, '')}`);
    this.info.setText(t('piano.lessonLeft', { count: left }));
    this.keys[note].box.setFillStyle(NEXT);
  }

  checkLesson(note) {
    if (!this.lesson) return;
    if (note === this.lessonNote()) this.time.delayedCall(190, () => this.lesson && this.nextLessonNote());
  }

  // ---------- ▶ LISTEN: the theme song plays itself ----------

  listen() {
    this.stopListening();
    if (this.lesson) {
      const note = this.lessonNote();
      this.lesson = null;
      if (note) this.paintKey(note);
    }
    this.bigNote.setText('');
    let at = 0;
    this.listening = this.song.notes.map((step) => {
      const event = this.time.delayedCall(at, () => {
        if (!step.rest) this.play(step.note, true);
      });
      at += step.length * this.song.stepMs;
      return event;
    });
  }

  stopListening() {
    for (const event of this.listening ?? []) event.remove();
    this.listening = null;
  }
}
