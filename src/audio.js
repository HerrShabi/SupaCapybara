// All sounds and music, made with the Web Audio API (there are no sound files).
// - audio.play('laser') plays an effect.
// - audio.playMusic('menu' | 'city' | 'space' | 'volcano' | 'boss') loops a theme song; audio.stopMusic() stops it.
// - audio.startCity() / audio.stopCity() turn the city background noise on and off.
// Browsers only allow sound after the player clicks or presses a key, so everything waits for that.

const NOTE_STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToFrequency(note) {
  const [, letter, accidental, octave] = /^([A-G])([#b]?)(\d)$/.exec(note);
  const midi = (Number(octave) + 1) * 12 + NOTE_STEPS[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

// ---------- Songs ----------
// Each step is an eighth note. In a track: a note like "C5", "." for silence, "-" to hold the note before.
// Drums: k = kick, s = snare, h = hi-hat, and they can be combined like "kh".

const bars = (...list) => list.join(' ');

const SONGS = {
  // Heroic theme for the character select screen. C major.
  menu: {
    bpm: 150,
    lead: bars(
      'G4 C5 E5 G5 E5 . C5 .', 'D5 . B4 D5 G5 - - .', 'A4 C5 E5 A5 G5 . E5 .', 'F5 . E5 D5 C5 - - .',
      'A5 . G5 F5 E5 . C5 .', 'D5 E5 F5 G5 A5 . G5 .', 'E5 . C5 A4 C5 . D5 .', 'B4 C5 D5 B4 C5 - - .',
    ),
    bass: bars(
      'C3 . C4 . C3 C3 G3 .', 'G2 . G3 . G2 G2 D3 .', 'A2 . A3 . A2 A2 E3 .', 'F2 . F3 . F2 F2 C3 .',
      'F2 . F3 . F2 F2 C3 .', 'G2 . G3 . G2 G2 D3 .', 'A2 . A3 . A2 A2 E3 .', 'G2 . G3 . G2 G2 D3 .',
    ),
    drums: Array(8).fill('kh h sh h kh kh sh h').join(' '),
  },
  // Funky city song for World 1. A minor.
  city: {
    bpm: 128,
    lead: bars(
      'A4 . C5 A4 . E5 . D5', 'C5 . A4 . F4 . A4 C5', 'B4 . D5 B4 . G5 . F5', 'E5 - - . D5 . B4 .',
      'A5 . G5 E5 . A5 . G5', 'F5 . E5 C5 . A4 . C5', 'D5 . G5 . D5 . B4 .', 'G#4 . B4 . E5 - - .',
    ),
    bass: bars(
      'A2 A3 . A2 . A3 A2 .', 'F2 F3 . F2 . F3 F2 .', 'G2 G3 . G2 . G3 G2 .', 'E2 E3 . E2 . E3 E2 .',
      'A2 A3 . A2 . A3 A2 .', 'F2 F3 . F2 . F3 F2 .', 'G2 G3 . G2 . G3 G2 .', 'E2 E3 . E2 . E3 B2 .',
    ),
    drums: Array(8).fill('kh h sh . kh h sh h').join(' '),
  },
  // Dreamy and floaty for World 2 in space. D minor, with a softer lead.
  space: {
    bpm: 112,
    leadWave: 'triangle',
    lead: bars(
      'D5 F5 A5 F5 D5 F5 A5 C6', 'Bb4 D5 F5 D5 Bb4 D5 F5 A5', 'C5 E5 G5 E5 C5 E5 G5 Bb5', 'A4 C5 E5 C5 A4 C5 E5 G5',
      'D5 - F5 - A5 - D6 -', 'D6 - C6 - Bb5 - A5 -', 'G5 - Bb5 - D6 - C6 -', 'C#6 - - - A5 - - .',
    ),
    bass: bars(
      'D2 - - - D3 - - -', 'Bb1 - - - Bb2 - - -', 'C2 - - - C3 - - -', 'A1 - - - A2 - - -',
      'D2 - - - D3 - - -', 'Bb1 - - - Bb2 - - -', 'G1 - - - G2 - - -', 'A1 - - - A2 - - -',
    ),
    drums: Array(8).fill('k . h . s . h .').join(' '),
  },
  // Hot and driving for World 3 in the volcano. E with a dark, spicy F.
  volcano: {
    bpm: 140,
    lead: bars(
      'E5 . F5 E5 . B4 . E5', 'G5 . F5 E5 . D5 . C5', 'D5 . E5 F5 . G5 . A5', 'B5 - - . A5 . G5 .',
      'E5 E5 . F5 G5 . F5 E5', 'C5 C5 . D5 E5 . D5 C5', 'D5 D5 . E5 F5 . E5 D5', 'E5 - - - . . . .',
    ),
    bass: bars(
      'E2 E2 E3 E2 E2 E2 F2 E2', 'C2 C2 C3 C2 C2 C2 D2 C2', 'D2 D2 D3 D2 D2 D2 F2 D2', 'E2 E2 E3 E2 B1 B1 B2 B1',
      'E2 E2 E3 E2 E2 E2 F2 E2', 'C2 C2 C3 C2 C2 C2 D2 C2', 'D2 D2 D3 D2 D2 D2 F2 D2', 'E2 E2 E3 E2 B1 B1 B2 B1',
    ),
    drums: Array(8).fill('kh h sh kh kh h sh h').join(' '),
  },
  // Fast and scary for the boss fights. E minor.
  boss: {
    bpm: 160,
    lead: bars(
      'E5 . E5 G5 . E5 D5 .', 'C5 . C5 E5 . C5 B4 .', 'A4 . A4 C5 . A4 G4 .', 'B4 . D#5 . F#5 . B5 .',
      'E5 G5 B5 G5 E5 G5 B5 G5', 'C5 E5 G5 E5 C5 E5 G5 E5', 'A4 C5 E5 C5 A4 C5 E5 C5', 'B4 D#5 F#5 D#5 B5 - - .',
    ),
    bass: bars(
      'E2 E2 E3 E2 E2 E2 E3 E2', 'C2 C2 C3 C2 C2 C2 C3 C2', 'A1 A1 A2 A1 A1 A1 A2 A1', 'B1 B1 B2 B1 B1 B1 B2 B1',
      'E2 E2 E3 E2 E2 E2 E3 E2', 'C2 C2 C3 C2 C2 C2 C3 C2', 'A1 A1 A2 A1 A1 A1 A2 A1', 'B1 B1 B2 B1 B1 B1 B2 B1',
    ),
    drums: Array(8).fill('kh h sh h kh kh sh sh').join(' '),
  },
};

// Turns "C5 - . D5" into notes with a start step and a length in steps.
function toNotes(track) {
  const steps = track.split(/\s+/);
  const notes = [];
  steps.forEach((step, i) => {
    if (step === '.' || step === '-') return;
    let length = 1;
    while (steps[i + length] === '-') length += 1;
    notes.push({ step: i, length, frequency: noteToFrequency(step) });
  });
  return { notes, stepCount: steps.length };
}

class GameAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.wantedSong = null;
    this.song = null;
    this.cityOn = false;
    this.lastPlayed = {};

    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.makeBus(this.context.destination, this.muted ? 0 : 1);
      this.musicBus = this.makeBus(this.master, 0.45);
      this.effectsBus = this.makeBus(this.master, 0.7);
      this.cityBus = this.makeBus(this.master, 0.5);
      this.noiseBuffer = this.makeNoise(false);
      this.rumbleBuffer = this.makeNoise(true);
    }
    if (this.context.state === 'suspended') this.context.resume();
    if (this.wantedSong && !this.song) this.startSong(this.wantedSong);
    if (this.cityOn && !this.rumble) this.startRumble();
  }

  makeBus(destination, volume) {
    const gain = this.context.createGain();
    gain.gain.value = volume;
    gain.connect(destination);
    return gain;
  }

  // White noise, or deep "brown" noise for the traffic rumble.
  makeNoise(brown) {
    const length = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.05);
  }

  // ---------- Building blocks ----------

  tone({ wave = 'square', from, to = from, delay = 0, length, volume, bus = this.effectsBus }) {
    const ctx = this.context;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + length);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    osc.connect(gain).connect(bus);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  noise({ delay = 0, length, volume, filter = 'lowpass', frequency = 1000, bus = this.effectsBus }) {
    const ctx = this.context;
    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const shaper = ctx.createBiquadFilter();
    shaper.type = filter;
    shaper.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    source.connect(shaper).connect(gain).connect(bus);
    source.start(start, Math.random());
    source.stop(start + length + 0.02);
  }

  notes(list, { wave = 'square', gap = 0.08, length = 0.12, volume = 0.12 } = {}) {
    list.forEach((note, i) => this.tone({ wave, from: noteToFrequency(note), delay: i * gap, length, volume }));
  }

  // ---------- Sound effects ----------

  play(name) {
    if (!this.context || this.muted) return;
    // The same sound can't pile up (lots of blaster shots at once would be too loud).
    const now = this.context.currentTime;
    if (now - (this.lastPlayed[name] ?? -1) < 0.05) return;
    this.lastPlayed[name] = now;

    switch (name) {
      case 'jump':
        this.tone({ from: 260, to: 520, length: 0.12, volume: 0.12 });
        break;
      case 'doubleJump':
        this.tone({ from: 420, to: 900, length: 0.12, volume: 0.11 });
        break;
      case 'laser':
        this.tone({ wave: 'sawtooth', from: 1400, to: 250, length: 0.16, volume: 0.1 });
        break;
      case 'superLaser':
        this.tone({ wave: 'sawtooth', from: 900, to: 120, length: 0.3, volume: 0.13 });
        this.tone({ from: 1800, to: 300, length: 0.12, volume: 0.06 });
        break;
      case 'scratch':
        this.noise({ length: 0.08, volume: 0.35, filter: 'bandpass', frequency: 3200 });
        this.noise({ delay: 0.07, length: 0.08, volume: 0.3, filter: 'bandpass', frequency: 2600 });
        break;
      case 'tongue':
        this.tone({ wave: 'sine', from: 300, to: 900, length: 0.1, volume: 0.25 });
        this.tone({ wave: 'sine', from: 900, to: 300, delay: 0.12, length: 0.12, volume: 0.2 });
        break;
      case 'bolt':
        this.notes(['B5', 'E6'], { gap: 0.07, length: 0.16, volume: 0.1 });
        break;
      case 'pop':
        this.noise({ length: 0.18, volume: 0.35, frequency: 1500 });
        this.tone({ from: 600, to: 80, length: 0.18, volume: 0.12 });
        break;
      case 'stomp':
        this.tone({ from: 150, to: 600, length: 0.12, volume: 0.16 });
        break;
      case 'enemyShot':
        this.tone({ from: 700, to: 350, length: 0.08, volume: 0.04 });
        break;
      case 'hurt':
        this.tone({ from: 440, to: 110, length: 0.3, volume: 0.16 });
        break;
      case 'fall':
        this.tone({ wave: 'sine', from: 800, to: 100, length: 0.6, volume: 0.2 });
        break;
      case 'shield':
        this.tone({ wave: 'triangle', from: 400, to: 1200, length: 0.35, volume: 0.2 });
        this.tone({ wave: 'triangle', from: 600, to: 1800, delay: 0.05, length: 0.35, volume: 0.12 });
        break;
      case 'invisible':
        this.tone({ wave: 'sine', from: 1200, to: 300, length: 0.4, volume: 0.15 });
        break;
      case 'bounce':
        this.tone({ wave: 'sine', from: 200, to: 500, length: 0.15, volume: 0.25 });
        break;
      case 'bossHit':
        this.tone({ from: 120, to: 60, length: 0.08, volume: 0.2 });
        this.noise({ length: 0.06, volume: 0.2, frequency: 600 });
        break;
      case 'bossRoar':
        this.tone({ wave: 'sawtooth', from: 110, to: 70, length: 0.7, volume: 0.2 });
        break;
      case 'explosion':
        this.noise({ length: 1.2, volume: 0.6, frequency: 900 });
        this.tone({ wave: 'sine', from: 90, to: 30, length: 1, volume: 0.45 });
        break;
      case 'helicopter':
        this.helicopter();
        break;
      case 'key':
        this.notes(['C6', 'E6', 'G6', 'C7'], { wave: 'triangle', gap: 0.08, length: 0.2, volume: 0.15 });
        break;
      case 'win':
        this.notes(['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], { gap: 0.11, length: 0.18, volume: 0.12 });
        this.notes(['C4', 'G4', 'E5'], { wave: 'triangle', gap: 0, length: 0.9, volume: 0.1 });
        break;
      case 'fly':
        this.tone({ wave: 'triangle', from: 300, to: 900, length: 0.4, volume: 0.18 });
        this.noise({ length: 0.4, volume: 0.12, filter: 'bandpass', frequency: 1500 });
        break;
      case 'countdown':
        this.tone({ from: 880, length: 0.15, volume: 0.12 });
        break;
      case 'blastOff':
        this.notes(['C5', 'G5', 'C6'], { gap: 0.06, length: 0.2, volume: 0.12 });
        this.noise({ length: 2.5, volume: 0.5, frequency: 700 });
        this.tone({ wave: 'sawtooth', from: 60, to: 200, length: 2.4, volume: 0.15 });
        break;
      case 'rocket':
        this.noise({ length: 2, volume: 0.25, frequency: 500 });
        this.tone({ wave: 'sawtooth', from: 180, to: 70, length: 2, volume: 0.08 });
        break;
      case 'crystal':
        this.notes(['E6', 'G#6', 'B6', 'E7'], { wave: 'triangle', gap: 0.06, length: 0.3, volume: 0.13 });
        break;
      case 'forceField':
        this.tone({ wave: 'sine', from: 900, to: 120, length: 1.2, volume: 0.25 });
        this.noise({ length: 1, volume: 0.2, filter: 'bandpass', frequency: 2000 });
        break;
      case 'pound':
        this.noise({ length: 0.8, volume: 0.6, frequency: 400 });
        this.tone({ wave: 'sine', from: 70, to: 25, length: 0.8, volume: 0.6 });
        break;
      case 'rocketShot':
        this.noise({ length: 0.3, volume: 0.3, filter: 'bandpass', frequency: 900 });
        this.tone({ wave: 'sawtooth', from: 300, to: 120, length: 0.25, volume: 0.1 });
        break;
      case 'moon':
        this.tone({ wave: 'sine', from: 200, to: 600, length: 0.25, volume: 0.25 });
        this.tone({ wave: 'triangle', from: 400, to: 1200, delay: 0.05, length: 0.2, volume: 0.1 });
        break;
      case 'shadow':
        this.tone({ wave: 'sawtooth', from: 500, to: 80, length: 0.5, volume: 0.12 });
        break;
      case 'mecha':
        this.notes(['C3', 'G3', 'C4', 'G4'], { wave: 'sawtooth', gap: 0.08, length: 0.15, volume: 0.12 });
        this.noise({ delay: 0.3, length: 0.3, volume: 0.25, frequency: 600 });
        break;
      case 'fireBreath':
        this.noise({ length: 0.9, volume: 0.4, filter: 'bandpass', frequency: 700 });
        break;
      case 'rockWarning':
        this.tone({ wave: 'sine', from: 1200, to: 400, length: 0.5, volume: 0.08 });
        break;
      case 'lavaRise':
        this.noise({ length: 1.5, volume: 0.4, frequency: 250 });
        this.tone({ wave: 'sine', from: 50, to: 90, length: 1.5, volume: 0.4 });
        break;
      case 'tnt':
        this.noise({ length: 0.6, volume: 0.6, frequency: 1200 });
        this.tone({ wave: 'square', from: 200, to: 40, length: 0.5, volume: 0.2 });
        break;
      case 'firework':
        this.noise({ length: 0.4, volume: 0.25, filter: 'highpass', frequency: 2000 });
        this.tone({ wave: 'sine', from: 1200, to: 300, length: 0.3, volume: 0.06 });
        break;
      case 'freeze':
        this.notes(['E7', 'B6', 'G6', 'E6', 'B5'], { wave: 'triangle', gap: 0.05, length: 0.25, volume: 0.1 });
        this.noise({ length: 0.5, volume: 0.2, filter: 'highpass', frequency: 6000 });
        break;
      case 'shatter':
        this.noise({ length: 0.25, volume: 0.35, filter: 'highpass', frequency: 4000 });
        this.notes(['E7', 'G7'], { wave: 'triangle', gap: 0.04, length: 0.15, volume: 0.08 });
        break;
      case 'click':
        this.tone({ from: 880, length: 0.05, volume: 0.08 });
        break;
      case 'buy':
        this.notes(['E6', 'G6', 'C7'], { gap: 0.06, length: 0.15, volume: 0.12 });
        this.noise({ length: 0.15, volume: 0.15, filter: 'highpass', frequency: 5000 });
        break;
      case 'error':
        this.tone({ from: 160, length: 0.15, volume: 0.13 });
        this.tone({ from: 140, delay: 0.17, length: 0.2, volume: 0.13 });
        break;
      default:
        break;
    }
  }

  // Whop-whop-whop: noise that pulses like rotor blades, for about 3.5 seconds.
  helicopter() {
    const ctx = this.context;
    const start = ctx.currentTime;
    const length = 3.5;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const shaper = ctx.createBiquadFilter();
    shaper.type = 'lowpass';
    shaper.frequency.value = 500;
    const pulse = ctx.createGain();
    const rotor = ctx.createOscillator();
    rotor.type = 'square';
    rotor.frequency.value = 11;
    const rotorDepth = ctx.createGain();
    rotorDepth.gain.value = 0.5;
    rotor.connect(rotorDepth).connect(pulse.gain);
    pulse.gain.value = 0.5;
    const fade = ctx.createGain();
    fade.gain.setValueAtTime(0, start);
    fade.gain.linearRampToValueAtTime(0.7, start + 1);
    fade.gain.linearRampToValueAtTime(0.7, start + 2);
    fade.gain.linearRampToValueAtTime(0, start + length);
    source.connect(shaper).connect(pulse).connect(fade).connect(this.effectsBus);
    source.start(start);
    rotor.start(start);
    source.stop(start + length);
    rotor.stop(start + length);
  }

  // ---------- Music ----------

  playMusic(name) {
    this.wantedSong = name;
    if (this.song?.name === name) return;
    this.stopSong();
    if (this.context) this.startSong(name);
  }

  stopMusic() {
    this.wantedSong = null;
    this.stopSong();
  }

  startSong(name) {
    const song = SONGS[name];
    const tracks = [
      { ...toNotes(song.lead), wave: song.leadWave ?? 'square', volume: song.leadWave ? 0.1 : 0.07 },
      { ...toNotes(song.bass), wave: 'triangle', volume: 0.16 },
    ];
    const drums = song.drums.split(/\s+/);
    const stepLength = 60 / song.bpm / 2;
    const stepCount = drums.length;

    this.song = { name, step: 0, nextTime: this.context.currentTime + 0.1 };
    // Look a little ahead and schedule notes on the audio clock, so the beat stays steady.
    this.song.timer = setInterval(() => {
      while (this.song && this.song.nextTime < this.context.currentTime + 0.15) {
        const { step, nextTime } = this.song;
        for (const track of tracks) {
          for (const note of track.notes) {
            if (note.step !== step) continue;
            this.musicNote(track.wave, note.frequency, nextTime, note.length * stepLength * 0.9, track.volume);
          }
        }
        this.drum(drums[step], nextTime);
        this.song.nextTime += stepLength;
        this.song.step = (step + 1) % stepCount;
      }
    }, 25);
  }

  stopSong() {
    if (!this.song) return;
    clearInterval(this.song.timer);
    this.song = null;
  }

  musicNote(wave, frequency, start, length, volume) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.setValueAtTime(volume, start + length * 0.7);
    gain.gain.linearRampToValueAtTime(0, start + length);
    osc.connect(gain).connect(this.musicBus);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  drum(hits, start) {
    if (hits.includes('k')) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.frequency.setValueAtTime(150, start);
      osc.frequency.exponentialRampToValueAtTime(40, start + 0.12);
      gain.gain.setValueAtTime(0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(gain).connect(this.musicBus);
      osc.start(start);
      osc.stop(start + 0.16);
    }
    if (hits.includes('s')) this.musicNoise(start, 0.12, 0.22, 'highpass', 1200);
    if (hits.includes('h')) this.musicNoise(start, 0.03, 0.06, 'highpass', 7000);
  }

  musicNoise(start, length, volume, filter, frequency) {
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const shaper = this.context.createBiquadFilter();
    shaper.type = filter;
    shaper.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    source.connect(shaper).connect(gain).connect(this.musicBus);
    source.start(start, Math.random());
    source.stop(start + length + 0.02);
  }

  // ---------- City background: traffic rumble and car horns ----------

  startCity() {
    this.cityOn = true;
    this.night = 0;
    if (this.context && !this.rumble) this.startRumble();
  }

  stopCity() {
    this.cityOn = false;
    if (this.rumble) {
      this.rumble.stop();
      this.rumble = null;
    }
    clearTimeout(this.hornTimer);
  }

  // 0 = day, 1 = night. The city gets quieter at night, and the cars stop honking.
  setNight(night) {
    this.night = night;
    if (this.rumbleGain) this.rumbleGain.gain.setTargetAtTime(0.25 - night * 0.15, this.context.currentTime, 0.5);
  }

  startRumble() {
    const ctx = this.context;
    this.rumble = ctx.createBufferSource();
    this.rumble.buffer = this.rumbleBuffer;
    this.rumble.loop = true;
    const shaper = ctx.createBiquadFilter();
    shaper.type = 'lowpass';
    shaper.frequency.value = 350;
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0.25 - this.night * 0.15;
    this.rumble.connect(shaper).connect(this.rumbleGain).connect(this.cityBus);
    this.rumble.start();
    this.scheduleHorn();
  }

  scheduleHorn() {
    clearTimeout(this.hornTimer);
    this.hornTimer = setTimeout(() => {
      if (!this.cityOn) return;
      if (!this.muted && this.night < 0.5) {
        // Beep beep! Two short horn notes, far away.
        for (const delay of [0, 0.3]) {
          this.tone({ from: 392, length: 0.22, volume: 0.05, delay, bus: this.cityBus });
          this.tone({ from: 494, length: 0.22, volume: 0.04, delay, bus: this.cityBus });
        }
      }
      this.scheduleHorn();
    }, 6000 + Math.random() * 8000);
  }
}

export const audio = new GameAudio();
