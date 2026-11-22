import * as THREE from 'three';

// CAPY CIRCUIT's track (Ethan, 2026-11-21/22): a closed loop with a hill bridge, a jump over a river, a loop-the-loop
// and boost pads. It's built like a turtle drawing: each piece (straight, turn, hill, ramp, loop) adds samples
// 1 unit apart. Every sample has a position and its own forward / up / right directions, so the cars can drive
// upside down through the loop. Cars live in "track space": how far along the track (s) and how far from the
// middle (lat, + is right), and the track turns that into a place in the world (at()).

export const TRACK_WIDTH = 16;
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// The layout. turn: degrees, + is left. hill: a bridge that goes up `height` and back down.
// ramp: a kicker up to `height`, then a river `gap` long (fall in = SPLASH). loop: a loop-the-loop, shifted sideways.
// boost: a boost pad `at` this far into the piece, `lat` from the middle.
const PIECES = [
  { straight: 80, boost: { at: 45, lat: 0 } },
  { turn: 90, radius: 45 },
  { straight: 10 },
  { hill: 100, height: 10 },
  { straight: 15 },
  { turn: 120, radius: 34 },
  { straight: 30 },
  { ramp: 9, height: 2.6, gap: 16 },
  { straight: 35 },
  { turn: -60, radius: 40 },
  { turn: 90, radius: 40, boost: { at: 30, lat: 3 } },
  { straight: 58 },
  { loop: 11, shift: 24 },
  { straight: 45, boost: { at: 20, lat: -3 } },
  { turn: 120, radius: 42 },
  { straight: 135 },
];

const smooth = (t) => t * t * (3 - 2 * t);

export function buildTrack() {
  const samples = [];
  const boosts = [];
  const jumps = [];
  let pos = v3();
  let yaw = 0; // 0 = toward +z; bigger = turned left

  const flatForward = () => v3(Math.sin(yaw), 0, Math.cos(yaw));
  const add = (p, forward, up, kappa = 0, extra = {}) => {
    const f = forward.clone().normalize();
    const right = f.clone().cross(up).normalize();
    const u = right.clone().cross(f).normalize();
    samples.push({ pos: p.clone(), forward: f, up: u, right, kappa, ...extra });
  };

  // Walks `length` units, turning by `kappa` per unit, with the height given by heightAt(t from 0 to 1).
  const walk = (length, kappa, heightAt = () => 0, extra = () => ({})) => {
    const steps = Math.max(1, Math.round(length));
    const base = pos.y;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const y = base + heightAt(t);
      const dy = (heightAt((i + 1) / steps) - heightAt(t)) * steps / length;
      add(v3(pos.x, y, pos.z), flatForward().add(v3(0, dy, 0)), UP, kappa, extra(t, i));
      yaw += kappa * (length / steps);
      pos.addScaledVector(flatForward(), length / steps);
    }
    pos.y = base;
  };

  for (const piece of PIECES) {
    const start = samples.length;
    if (piece.straight) walk(piece.straight, 0);
    if (piece.turn) {
      const angle = THREE.MathUtils.degToRad(piece.turn);
      walk(Math.abs(angle) * piece.radius, angle / (Math.abs(angle) * piece.radius));
    }
    if (piece.hill) {
      walk(piece.hill, 0, (t) => piece.height * smooth(Math.min(1, Math.min(t, 1 - t) * 3.2)));
    }
    if (piece.ramp) {
      walk(piece.ramp, 0, (t) => piece.height * t);
      const lip = samples.length; // the first sample after the ramp: the river starts here
      walk(piece.gap, 0, () => 0, () => ({ gap: true }));
      jumps.push({ lip, height: piece.height, slope: piece.height / piece.ramp, gapEnd: samples.length });
    }
    if (piece.loop) {
      const R = piece.loop;
      const f0 = flatForward();
      const r0 = f0.clone().cross(UP).normalize();
      const steps = Math.round(2 * Math.PI * R);
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const side = piece.shift * (a - Math.sin(a)) / (Math.PI * 2);
        const p = pos.clone().addScaledVector(f0, R * Math.sin(a)).addScaledVector(UP, R * (1 - Math.cos(a))).addScaledVector(r0, side);
        const forward = f0.clone().multiplyScalar(R * Math.cos(a)).addScaledVector(UP, R * Math.sin(a)).addScaledVector(r0, (piece.shift * (1 - Math.cos(a))) / (Math.PI * 2));
        const up = UP.clone().multiplyScalar(Math.cos(a)).addScaledVector(f0, -Math.sin(a));
        add(p, forward, up, 0, { loop: true });
      }
      pos.addScaledVector(r0, piece.shift);
    }
    if (piece.boost) boosts.push({ s: start + piece.boost.at, lat: piece.boost.lat });
  }

  // The pieces don't meet the start exactly: spread the small leftover over the whole track.
  const length = samples.length;
  const miss = v3().sub(pos);
  miss.y = 0;
  samples.forEach((sample, i) => sample.pos.addScaledVector(miss, i / length));

  const track = new Track(samples, boosts, jumps);
  track.miss = miss.clone();
  return track;
}

export class Track {
  constructor(samples, boosts, jumps) {
    this.samples = samples;
    this.length = samples.length;
    this.boosts = boosts;
    this.jumps = jumps;
    this.miss = 0;
  }

  wrap(s) {
    return ((s % this.length) + this.length) % this.length;
  }

  sample(s) {
    return this.samples[Math.floor(this.wrap(s)) % this.length];
  }

  // Where the middle of the track is at s, and which way is forward / up / right there (smoothly in between samples).
  at(s) {
    const w = this.wrap(s);
    const i = Math.floor(w);
    const k = w - i;
    const a = this.samples[i % this.length];
    const b = this.samples[(i + 1) % this.length];
    return {
      pos: a.pos.clone().lerp(b.pos, k),
      forward: a.forward.clone().lerp(b.forward, k).normalize(),
      up: a.up.clone().lerp(b.up, k).normalize(),
      right: a.right.clone().lerp(b.right, k).normalize(),
      kappa: a.kappa,
      gap: Boolean(a.gap),
      loop: Boolean(a.loop),
    };
  }

  // A place in the world: s along the track, lat to the right, h above the road.
  place(s, lat, h = 0) {
    const frame = this.at(s);
    frame.point = frame.pos.clone().addScaledVector(frame.right, lat).addScaledVector(frame.up, h);
    return frame;
  }
}
