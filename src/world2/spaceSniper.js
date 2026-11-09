import * as THREE from 'three';
import { audio } from '../audio.js';
import { t } from '../i18n.js';
import { sniperAmmo, takeSniperShot, SNIPER_WAIT_MS, SNIPER_BOSS_SHARE } from '../supaSniper.js';

// The SUPA SNIPER in World 2 (the same rules as the 2D one in src/supaSniper.js). T (🎯, A + Y) freezes
// the game and moves the camera into SupaCapybara's eyes, looking the way he faces, with the blaster at the
// bottom (an HTML overlay). Arrows move the target, X (or ENTER) fires, tapping fires right there, T or ✕ puts
// it away. The shot is a ray from the eyes through the target: the nearest bad guy (or Grape Boss) on it
// gets hit, unless a planet is in the way. SpaceWorld calls update(dt) instead of its game while `busy`.

const AIM_SPEED = 0.9; // screen widths per second
const RANGE = 150;
const FIRE_SHOW_MS = 450;

const BLASTER_SVG = `<svg viewBox="0 0 200 160" width="100%" height="100%">
  <ellipse cx="110" cy="150" rx="70" ry="38" fill="#6d4c41"/>
  <polygon points="20,160 70,40 180,160" fill="#546e7a"/>
  <rect x="48" y="10" width="46" height="90" fill="#78909c"/>
  <circle cx="71" cy="12" r="16" fill="#263238"/>
  <circle cx="71" cy="52" r="7" fill="#d32f2f"/>
  <polygon points="118,90 140,60 128,90 150,90 112,130 124,96" fill="#ffd23f"/>
</svg>`;

const CROSSHAIR_SVG = `<svg viewBox="-45 -45 90 90" width="90" height="90">
  <circle r="26" fill="none" stroke="#ff1744" stroke-width="4"/>
  <path d="M-40 0H-10M10 0H40M0 -40V-10M0 10V40" stroke="#ff1744" stroke-width="4"/>
  <circle r="3" fill="#ff1744"/>
</svg>`;

export class SpaceSniper {
  constructor(world) {
    this.world = world;
    this.readyAt = 0;
    this.aiming = null;
    this.firing = null;
  }

  get busy() {
    return Boolean(this.aiming || this.firing);
  }

  status() {
    const world = this.world;
    const name = `T = 🎯 ${t('sniper.name')}`;
    if (world.now < this.readyAt) return `${name}: ${t('game.wait', { seconds: Math.ceil((this.readyAt - world.now) / 1000) })}`;
    return `${name} x${sniperAmmo(world.save)}`;
  }

  open() {
    const world = this.world;
    if (this.busy || world.won || world.beam) return;
    if (world.now < this.readyAt) {
      audio.play('error');
      return;
    }
    if (sniperAmmo(world.save) <= 0) {
      audio.play('error');
      world.hud.message('', t('sniper.none'), 2000);
      return;
    }
    audio.play('click');
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;z-index:15;overflow:hidden;font-family:"Arial Black",Arial,sans-serif;color:#fff;text-shadow:0 0 5px #000,0 0 5px #000;';
    overlay.innerHTML = `
      <div style="position:absolute;inset:0;box-shadow:inset 0 0 120px 40px rgba(0,0,0,0.75);pointer-events:none"></div>
      <div style="position:absolute;top:4%;width:100%;text-align:center;font-size:24px"></div>
      <div style="position:absolute;top:11%;width:100%;text-align:center;font:bold 15px Arial,sans-serif"></div>
      <div style="position:absolute;top:3%;right:3%;font-size:30px;cursor:pointer">✕</div>
      <div style="position:absolute;right:22%;bottom:0;width:22%;height:42%;pointer-events:none">${BLASTER_SVG}</div>
      <div style="position:absolute;width:90px;height:90px;transform:translate(-50%,-50%);pointer-events:none">${CROSSHAIR_SVG}</div>`;
    const [, title, help, close, , crosshair] = overlay.children;
    title.textContent = `🎯 ${t('sniper.name')}  x${sniperAmmo(world.save)}`;
    help.textContent = t(world.save.touch ? 'sniper.helpTouch' : 'sniper.help');
    close.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      this.close();
    });
    overlay.addEventListener('pointerdown', (event) => {
      const box = overlay.getBoundingClientRect();
      this.aiming.x = (event.clientX - box.left) / box.width;
      this.aiming.y = (event.clientY - box.top) / box.height;
      this.fire();
    });
    world.container.appendChild(overlay);
    world.player.model.visible = false; // (the camera is inside his head)
    if (world.aura) world.aura.visible = false;
    world.hud.root.style.visibility = 'hidden';
    this.aiming = { overlay, crosshair, x: 0.5, y: 0.5, openedAt: performance.now() };
    this.placeCamera();
    this.aimAtNearest();
    this.placeCrosshair();
  }

  // The camera at SupaCapybara's eyes, looking straight ahead
  placeCamera() {
    const world = this.world;
    const p = world.player;
    const up = world.upAt(p.planet, p.pos);
    const eyes = world.playerBody().addScaledVector(up, 0.4).addScaledVector(p.forward, 0.4);
    world.camera.position.copy(eyes);
    world.camera.up.copy(up);
    world.camera.lookAt(eyes.clone().addScaledVector(p.forward, 10).addScaledVector(up, -0.6));
    world.camera.updateMatrixWorld();
  }

  // The target starts on the nearest bad guy you can see (or in the middle)
  aimAtNearest() {
    const world = this.world;
    const eyes = world.camera.position;
    let best = null;
    const targets = world.enemies.filter((e) => e.alive).map((e) => world.enemyPosition(e));
    if (world.bossIsHittable()) targets.push(world.bossCenter());
    for (const target of targets) {
      const distance = target.distanceTo(eyes);
      const screen = target.clone().project(world.camera);
      if (screen.z > 1 || Math.abs(screen.x) > 0.9 || Math.abs(screen.y) > 0.9 || distance > RANGE) continue;
      if (!best || distance < best.distance) best = { distance, screen };
    }
    if (!best) return;
    this.aiming.x = (best.screen.x + 1) / 2;
    this.aiming.y = (1 - best.screen.y) / 2;
  }

  placeCrosshair() {
    const { crosshair, x, y } = this.aiming;
    crosshair.style.left = `${x * 100}%`;
    crosshair.style.top = `${y * 100}%`;
  }

  update(dt) {
    const world = this.world;
    if (this.firing) {
      if (performance.now() >= this.firing.until) this.finishShot();
      return;
    }
    const aiming = this.aiming;
    if (!aiming || performance.now() - aiming.openedAt < 150) return;
    if (world.pressed('KeyT')) return this.close(); // (ESC closes it too: see SpaceWorld.listen)
    const dx = (world.down('ArrowRight', 'KeyD') ? 1 : 0) - (world.down('ArrowLeft', 'KeyA') ? 1 : 0);
    const dy = (world.down('ArrowDown', 'KeyS') ? 1 : 0) - (world.down('ArrowUp', 'KeyW') ? 1 : 0);
    aiming.x = Math.min(1, Math.max(0, aiming.x + dx * AIM_SPEED * dt));
    aiming.y = Math.min(1, Math.max(0, aiming.y + dy * AIM_SPEED * dt * 1.6));
    this.placeCrosshair();
    if (world.pressed('KeyX', 'Enter', 'Space')) this.fire();
  }

  // BANG: a ray from the eyes through the target
  fire() {
    const world = this.world;
    const aiming = this.aiming;
    if (!aiming) return;
    if (!takeSniperShot(world.save)) return this.close();
    this.placeCrosshair();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(aiming.x * 2 - 1, 1 - aiming.y * 2), world.camera);
    const { origin, direction } = ray.ray;

    // What's on the ray? The nearest thing wins.
    let hit = null;
    const consider = (kind, thing, center, radius) => {
      const along = center.clone().sub(origin).dot(direction);
      if (along < 0 || along > RANGE) return;
      if (ray.ray.distanceToPoint(center) > radius) return;
      if (!hit || along < hit.along) hit = { kind, thing, along };
    };
    for (const enemy of world.enemies) {
      if (enemy.alive) consider('enemy', enemy, world.enemyPosition(enemy), (enemy.hitRadius ?? 1) * 1.3);
    }
    if (world.bossIsHittable()) consider('boss', world.boss, world.bossCenter(), 2.8);
    // A planet in front of it blocks the shot
    let end = origin.clone().addScaledVector(direction, hit ? hit.along : RANGE);
    for (const planet of world.planets) {
      const sphere = new THREE.Sphere(planet.center, planet.radius);
      const point = ray.ray.intersectSphere(sphere, new THREE.Vector3());
      if (!point) continue;
      const along = point.clone().sub(origin).dot(direction);
      if (along > 0 && along < origin.distanceTo(end)) {
        hit = null;
        end = point;
      }
    }

    // The laser: from the blaster (bottom right, just below the eyes) to where it hits
    audio.play('superLaser');
    const camera = world.camera;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const down = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).negate();
    const muzzle = origin.clone().addScaledVector(direction, 0.6).addScaledVector(right, 0.12).addScaledVector(down, 0.12);
    const length = muzzle.distanceTo(end);
    const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, length, 6), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
    laser.position.copy(muzzle).lerp(end, 0.5);
    laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(muzzle).normalize());
    world.scene.add(laser);
    if (hit) world.pop(end, 0xffd23f, 1.4);
    this.aiming.crosshair.style.filter = 'drop-shadow(0 0 8px #fff)';
    this.firing = { hit, laser, until: performance.now() + FIRE_SHOW_MS };
  }

  finishShot() {
    const world = this.world;
    const { hit, laser } = this.firing;
    world.scene.remove(laser);
    laser.geometry.dispose();
    laser.material.dispose();
    this.firing = null;
    this.close(false);
    this.readyAt = world.now + SNIPER_WAIT_MS;
    if (!hit) {
      world.hud.message('', t('sniper.missed'), 1200);
      return;
    }
    if (hit.kind === 'boss') world.hitBoss(Math.ceil(world.settings.bossHp * SNIPER_BOSS_SHARE));
    else world.defeat(hit.thing, 99);
    world.landedHit();
  }

  // Back to the game (no click after a shot)
  close(click = true) {
    const world = this.world;
    if (!this.aiming) return;
    this.aiming.overlay.remove();
    this.aiming = null;
    world.player.model.visible = true;
    if (world.aura) world.aura.visible = true;
    world.hud.root.style.visibility = '';
    if (click) audio.play('click');
  }

  destroy() {
    this.aiming?.overlay.remove();
    this.aiming = null;
  }
}
