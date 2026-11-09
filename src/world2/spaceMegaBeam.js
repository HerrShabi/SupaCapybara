import * as THREE from 'three';
import { audio } from '../audio.js';
import { t } from '../i18n.js';
import { writeSave } from '../save.js';
import { rainbowColor } from '../strawberry.js';
import { megaBeamCount } from '../megaBeam.js';

// The MEGA BEAM in World 2 (Ethan, 2026-11-09). Same as in 2D (src/megaBeam.js): for 10 seconds a giant
// rainbow beam shoots straight ahead, bending around the planet you're on, with fire, lightning and moons
// swirling along it, plus rainbow lasers in every direction. Works on the ground, jumping and flying.
// - Bad guys in the beam (flying saucers too, whatever their height) get blasted.
// - Grape Boss takes big damage, but one MEGA BEAM never takes more than BOSS_SHARE of his health.
// - While it's on, saucers can't grab you with their tractor beam (SpaceWorld asks active()).
// Same buttons as 2D: G, the 🌈 touch button, pressing the left stick. Bought in the supermarket only.

const BEAM_MS = 10000;
const HIT_EVERY_MS = 500;
const LASER_EVERY_MS = 140;
const LASER_SPEED = 30;
const LASER_LIFE = 0.6;
const BEAM_LENGTH = 30; // meters along the planet
const SEGMENTS = 30;
const BEAM_RADIUS = 0.45;
const BEAM_REACH = 1.2; // how far beside the beam still counts as in it
const BOSS_SHARE = 0.4;
const SWIRL_COLORS = [0xff6d00, 0xffeb3b, 0xeceff1, 0xff3d00, 0xfff176, 0xe0e0e0]; // fire, lightning, moon...

export class SpaceMegaBeam {
  constructor(world) {
    this.world = world;
    this.until = 0;
    this.parts = null;
  }

  active() {
    return this.world.now < this.until;
  }

  start() {
    const world = this.world;
    const save = world.save;
    if (this.active()) return;
    if (megaBeamCount(save) <= 0) {
      audio.play('error');
      world.hud.message('', t('mega.none'), 2000);
      return;
    }
    save.megaBeams -= 1;
    writeSave(save);
    const now = world.now;
    this.until = now + BEAM_MS;
    this.nextHitAt = now;
    this.nextLaserAt = now;
    this.laserAngle = 0;
    this.bossDamage = 0;
    audio.play('superLaser');
    audio.play('key');
    world.hud.message(t('mega.go'), '', 1500);
    if (world.beam) world.endBeam(true); // it breaks a tractor beam that has you

    const group = new THREE.Group();
    const segments = [];
    const outer = new THREE.CylinderGeometry(BEAM_RADIUS, BEAM_RADIUS, 1, 10, 1, true);
    const core = new THREE.CylinderGeometry(BEAM_RADIUS * 0.35, BEAM_RADIUS * 0.35, 1, 8, 1, true);
    for (let i = 0; i < SEGMENTS; i++) {
      const segment = new THREE.Mesh(outer, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false }));
      segment.add(new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color: 0xffffff })));
      group.add(segment);
      segments.push(segment);
    }
    const glow = new THREE.Mesh(new THREE.SphereGeometry(BEAM_RADIUS * 1.3, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
    group.add(glow);
    const swirls = SWIRL_COLORS.map((color) => {
      const swirl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color }));
      group.add(swirl);
      return swirl;
    });
    world.scene.add(group);
    this.parts = { group, segments, glow, swirls, geometries: [outer, core] };
  }

  stop() {
    this.until = 0;
    if (!this.parts) return;
    this.world.scene.remove(this.parts.group);
    this.parts.group.traverse((part) => part.material?.dispose());
    for (const geometry of this.parts.geometries) geometry.dispose();
    this.parts = null;
  }

  // The beam's path: from the hero's eyes, straight ahead around the planet, at the hero's height.
  path() {
    const world = this.world;
    const p = world.player;
    const planet = p.planet;
    const offset = world.playerBody().addScaledVector(world.upAt(planet, p.pos), 0.2).sub(planet.center);
    const up = offset.clone().normalize();
    const ahead = p.forward.clone().addScaledVector(up, -p.forward.dot(up)).normalize();
    const axis = new THREE.Vector3().crossVectors(up, ahead).normalize();
    const start = offset.clone().addScaledVector(ahead, 0.9);
    const totalAngle = Math.min(Math.PI * 1.5, BEAM_LENGTH / start.length());
    const points = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      points.push(start.clone().applyAxisAngle(axis, (totalAngle * i) / SEGMENTS).add(planet.center));
    }
    return { planet, points };
  }

  update() {
    if (!this.parts) return;
    const world = this.world;
    const now = world.now;
    if (now >= this.until) return this.stop();
    const { planet, points } = this.path();
    const { segments, glow, swirls } = this.parts;

    // The rainbow beam: each piece a different color, flowing along, and wobbling fat and thin
    const wobble = 1 + 0.15 * Math.sin(now / 40);
    const yAxis = new THREE.Vector3(0, 1, 0);
    segments.forEach((segment, i) => {
      const a = points[i];
      const b = points[i + 1];
      const along = b.clone().sub(a);
      segment.position.copy(a).lerp(b, 0.5);
      segment.quaternion.setFromUnitVectors(yAxis, along.clone().normalize());
      segment.scale.set(wobble, along.length() * 1.05, wobble);
      segment.material.color.setHex(rainbowColor(now * 2 - i * 140));
    });
    glow.position.copy(points[0]);
    glow.scale.setScalar(wobble);

    // Fire, lightning and moons swirling along it
    swirls.forEach((swirl, i) => {
      const k = (((now / 900 + i / swirls.length) % 1) + 1) % 1;
      const at = k * SEGMENTS;
      const index = Math.min(SEGMENTS - 1, Math.floor(at));
      const spot = points[index].clone().lerp(points[index + 1], at - index);
      const up = spot.clone().sub(planet.center).normalize();
      const along = points[index + 1].clone().sub(points[index]).normalize();
      const side = new THREE.Vector3().crossVectors(up, along);
      const spin = now / 120 + i * 2;
      swirl.position.copy(spot).addScaledVector(up, Math.sin(spin) * 0.8).addScaledVector(side, Math.cos(spin) * 0.8);
    });

    // Everything in the beam gets hit
    if (now >= this.nextHitAt) {
      this.nextHitAt = now + HIT_EVERY_MS;
      this.hitAlong(planet, points);
    }

    // ...and lasers in every color shooting in every direction
    while (now >= this.nextLaserAt) {
      this.nextLaserAt += LASER_EVERY_MS;
      this.laserAngle += 2.4;
      this.fireLaser(rainbowColor(now + this.laserAngle * 300));
    }
  }

  // How close a spot on the planet (a direction from its center) is to the beam, along the ground.
  // Height doesn't matter, so flying saucers above the beam get blasted too.
  nearBeam(planet, points, dir, reach) {
    return points.some((point) => point.clone().sub(planet.center).normalize().angleTo(dir) * planet.radius < reach);
  }

  hitAlong(planet, points) {
    const world = this.world;
    let hit = false;
    for (const enemy of world.enemies) {
      if (!enemy.alive || enemy.planet !== planet) continue;
      if (this.nearBeam(planet, points, enemy.dir, (enemy.hitRadius ?? 1) + BEAM_REACH)) {
        world.defeat(enemy, 1);
        hit = true;
      }
    }
    if (world.bossIsHittable() && world.boss.planet === planet && this.nearBeam(planet, points, world.boss.dir, 1.6 + BEAM_REACH)) {
      this.hitBoss(2);
      hit = true;
    }
    if (world.discoCrack && points.some((point) => point.distanceTo(world.discoSpot()) < 1.5)) world.openDisco();
    if (hit) world.landedHit();
  }

  // Big damage to Grape Boss, but never more than BOSS_SHARE of his health from one MEGA BEAM.
  hitBoss(amount) {
    const world = this.world;
    const most = Math.ceil(world.settings.bossHp * BOSS_SHARE);
    const damage = Math.min(amount, most - this.bossDamage);
    if (damage <= 0) return;
    this.bossDamage += damage;
    world.hitBoss(damage);
  }

  fireLaser(color) {
    const world = this.world;
    const p = world.player;
    const up = world.upAt(p.planet, p.pos);
    const dir = p.forward.clone().applyAxisAngle(up, this.laserAngle);
    const start = world.playerBody().addScaledVector(up, 0.3).addScaledVector(dir, 0.9);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.2), new THREE.MeshBasicMaterial({ color }));
    world.addShot({ mesh, planet: p.planet, start, dir, speed: LASER_SPEED, life: LASER_LIFE, damage: 1, fromPlayer: true, mega: true });
  }

  // For the power line: "G = MEGA BEAM x2", or "🌈 MEGA BEAM! 7" while it's on
  status() {
    const world = this.world;
    if (this.active()) return `🌈 ${t('mega.name')}! ${Math.ceil((this.until - world.now) / 1000)}`;
    const count = megaBeamCount(world.save);
    return count > 0 ? `G = ${t('mega.name')} x${count}` : '';
  }
}
