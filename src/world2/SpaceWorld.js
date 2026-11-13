import { showDisco } from '../disco.js';
import { discoReward, Magic, MAGIC_SPEED, takeStrawberry, bagText, rainbowColor } from '../strawberry.js';
import * as THREE from 'three';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { getCharacter, pickDance } from '../characters.js';
import { getDifficulty, BAD_GUY_REWARD, BOSS_REWARD } from '../difficulty.js';
import { writeSave, addBaby, activePowerUps } from '../save.js';
import { megaBeamOn } from '../megaBeam.js';
import { Hud } from './hud.js';
import { tipWanted, markTipSeen, tipText, TIP_MIN_MS } from '../tips.js';
import { drawingMode, ThreeSketch } from '../sketch.js';
import { PLANETS, START_PLANET, FORCE_FIELD_RADIUS, JUMPS, BOLT_RINGS, BAD_GUYS, SAUCERS, SHIP } from './level.js';
import * as models from './models.js';
import { SpaceMegaBeam } from './spaceMegaBeam.js';
import { SpaceSniper } from './spaceSniper.js';

// World 2: 3D space. Each little planet pulls you toward its center, so you can walk all the way around it.
// Jumping is floaty (moon jumps); jump from the yellow rings to reach the next planet.
// Positions are in "meters": SuperCapybara is about 1.2 tall.

const GRAVITY = 9;
const JUMP_SPEED = 11;
const RUN_SPEED = 6;
const TURN_SPEED = 2.6; // radians per second
const FLY_SPEED = 7;
const LOST_IN_SPACE = 30; // this far from every planet = lost in space
const BOUNCE_MS = 300;

const LASER_SPEED = 30;
const LASER_LIFE = 0.8; // seconds
const ATTACK_COOLDOWN_MS = { laser: 250, superLaser: 220, goldLaser: 220, scratch: 300, tongue: 450, moon: 400, rocket: 300, cuffs: 400, snowball: 300, gadget: 450 };
const SCRATCH_REACH = 2.4;
const TONGUE_REACH = 6;
const TONGUE_MS = 260;

const INVISIBLE_MS = 10000;
const INVISIBLE_WAIT_MS = 30000;
const SHIELD_MS = 10000;
const SHIELD_WAIT_MS = 30000;
const FLY_MS = 10000;
const FLY_WAIT_MS = 30000;
const SHADOW_MS = 5000;
const SHADOW_WAIT_MS = 30000;
const SHADOW_SPEED = 1.6;
const MECHA_MS = 15000;
const MOON_SPEED = 16;

const ROBOT_SPEED = 1.2;
const BOSS_JUMP_HEIGHT = 10;
const BOSS_HEIGHT = 4.2;
const WAVE_SPEED = 2; // how fast Grape Boss's ground pound wave spreads (radians per second)
const WAVE_WIDTH = 0.15;

// Aliens and their flying saucers
const SAUCER_ALTITUDE = 2.3;
const SAUCER_SPEED = 2.2;
const SAUCER_HP = 3;
const SAUCER_REST_MS = 5000; // after a beam, before it can beam you again
const BEAM_RANGE = 1.4; // how close below the saucer you have to be
const BEAM_MS = 3500; // how long until you're pulled inside
const WIGGLES_TO_ESCAPE = 8;
const ALIEN_SPEED = 1.8;
const SHIP_ALIEN_SPEED = 1.1; // slower inside the spaceship, where there are lots of them
const SAUCER_GRACE_MS = 3000; // after landing on a planet, before its saucer can beam you

const ATTACK_NAMES = {
  laser: 'game.attack.laser',
  superLaser: 'game.attack.superLaser',
  scratch: 'game.attack.scratch',
  tongue: 'game.attack.tongue',
  moon: 'game.attack.moon',
  goldLaser: 'game.attack.goldLaser',
  cuffs: 'game.attack.cuffs',
  snowball: 'game.attack.snowball',
  gadget: 'game.attack.gadget',
};
// AGENT WHISKERS' spy gadgets: they fly a short way, land, blink, and explode
const GADGET_FUSE = 0.5; // seconds
const GADGET_BLAST = 2.6;
// Her cardboard box hideout on the secret planet (see createAgentBox)
const AGENT_BOX_TOUCH = 1.7;
// CAPTAIN WADDLE's WADDLE SLIDE (C): a fast belly slide that knocks over bad guys in front of him
const SLIDE_MS = 520;
const SLIDE_WAIT_MS = 1200;
const SLIDE_SPEED = 2.6; // times running speed
const SLIDE_REACH = 1.9;

const vec = (array) => new THREE.Vector3(...array);

// Turns `object` so its +Y points along `up` and its +Z along `forward`.
function orient(object, up, forward) {
  let z = forward.clone().addScaledVector(up, -forward.dot(up));
  z = z.lengthSq() < 1e-8 ? anyTangent(up) : z.normalize();
  const x = new THREE.Vector3().crossVectors(up, z).normalize();
  const matrix = new THREE.Matrix4().makeBasis(x, up, z);
  object.quaternion.setFromRotationMatrix(matrix);
}

// Any direction along the ground at a point whose "up" is `up`.
function anyTangent(up) {
  const helper = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  return helper.addScaledVector(up, -helper.dot(up)).normalize();
}

// Moves a direction on a sphere toward `heading` by `angle` radians; turns the heading along with it.
function slide(dir, heading, angle) {
  const axis = new THREE.Vector3().crossVectors(dir, heading).normalize();
  if (axis.lengthSq() === 0) return;
  dir.applyAxisAngle(axis, angle).normalize();
  heading.applyAxisAngle(axis, angle).normalize();
}

export class SpaceWorld {
  constructor({ container, save, onExit, discoPictures }) {
    this.container = container;
    this.discoPictures = discoPictures;
    this.disco = false;
    this.magic = new Magic(); // the magic strawberry (strawberry.js)
    this.megaBeam = new SpaceMegaBeam(this); // the MEGA BEAM (spaceMegaBeam.js)
    this.powerUps = activePowerUps(save); // the power-ups you own that are switched ON
    this.sniper = this.powerUps.includes('supa-sniper') ? new SpaceSniper(this) : null; // the SUPA SNIPER (spaceSniper.js)
    this.save = save;
    this.onExit = onExit;
    this.character = getCharacter(save.selected);
    this.settings = getDifficulty(save.difficulty);
    this.keysDown = new Set();
    this.keysPressed = new Set();
    this.pausedFor = 0; // time spent frozen by Baby Capybara's tips (this.now doesn't count it)
    this.now = performance.now();
    this.startedAt = this.now;
    this.tip = null;
    this.ended = false;

    this.setUpRenderer();
    this.createWorld();
    this.createPlayer();
    this.createHud();
    this.listen();

    audio.setMuted(save.muted);
    audio.playMusic('space');
    this.hud.message(t('game.world2'), t('game.findCrystals'), 4000);
    setTimeout(() => {
      if (!this.ended && !this.bossStarted) this.hud.message('', t('game.jumpHint'), 4000);
    }, 4200);

    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame((time) => this.loop(time));
  }

  // ---------- Setup ----------

  setUpRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    this.container.style.position = 'relative';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05081a);
    this.camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 2000);
    this.resize = () => {
      const { clientWidth: width, clientHeight: height } = this.container;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    };
    this.resize();
    window.addEventListener('resize', this.resize);

    this.scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x2a1840, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(30, 60, 40);
    this.scene.add(sun);
    this.scene.add(models.makeStars());

    // A big blue planet far away, just to look at
    const earth = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 24), new THREE.MeshStandardMaterial({ color: 0x1e88e5, emissive: 0x0d2a5c }));
    earth.position.set(-160, 40, -260);
    this.scene.add(earth);
  }

  createWorld() {
    this.planets = PLANETS.map((data, i) => {
      const planet = { ...data, center: vec(data.center), spawn: vec(data.spawn).normalize() };
      planet.mesh = models.makePlanet(planet.radius, planet.color, i + 1);
      planet.mesh.position.copy(planet.center);
      this.scene.add(planet.mesh);
      return planet;
    });
    this.planet = (id) => this.planets.find((p) => p.id === id);
    this.bossPlanet = this.planet('boss');

    // Purple rings point back the way you came (only where there's no yellow ring for it already)
    const has = (a, b) => JUMPS.some(([from, to]) => from === a && to === b);
    const backJumps = JUMPS.filter(([from, to]) => !has(to, from)).map(([from, to]) => [to, from, true]);
    for (const [fromId, toId, back] of [...JUMPS, ...backJumps]) {
      const from = this.planet(fromId);
      const dir = this.planet(toId).center.clone().sub(from.center).normalize();
      const ring = back ? models.makeJumpRing(0xb388ff) : models.makeJumpRing();
      ring.position.copy(this.pointOn(from, dir, 0.05));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      this.scene.add(ring);
      (this.rings ??= []).push(ring);
      if (!back) from.jumpDir ??= dir;
    }

    // Rocket that brought you here, next to where you start
    const start = this.planet(START_PLANET);
    const rocketDir = start.spawn.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.35).normalize();
    const rocket = models.makeRocket();
    rocket.position.copy(this.pointOn(start, rocketDir, 0));
    orient(rocket, rocketDir, anyTangent(rocketDir));
    this.scene.add(rocket);
    this.parkedRocket = rocket; // it flies over to pick you up after Grape Boss
    this.createDiscoCrack(rocket);
    this.createAgentBox();

    this.crystals = this.planets
      .filter((p) => p.crystal)
      .map((planet) => {
        const dir = vec(planet.crystal).normalize();
        const mesh = models.makeCrystal();
        mesh.position.copy(this.pointOn(planet, dir, 1.3));
        orient(mesh, dir, anyTangent(dir));
        this.scene.add(mesh);
        return { planet, dir, mesh, taken: false };
      });
    this.crystalsFound = 0;

    this.bolts = [];
    for (const [planetId, count, tilt] of BOLT_RINGS) {
      const planet = this.planet(planetId);
      const normal = vec(tilt).normalize();
      const a = anyTangent(normal);
      const b = new THREE.Vector3().crossVectors(normal, a);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dir = a.clone().multiplyScalar(Math.cos(angle)).addScaledVector(b, Math.sin(angle)).normalize();
        const mesh = models.makeBolt();
        mesh.position.copy(this.pointOn(planet, dir, 0.9));
        orient(mesh, dir, anyTangent(dir));
        this.scene.add(mesh);
        this.bolts.push({ mesh, taken: false });
      }
    }

    this.forceField = models.makeForceField(FORCE_FIELD_RADIUS);
    this.forceField.position.copy(this.bossPlanet.center);
    this.scene.add(this.forceField);
    this.fieldDown = false;

    this.enemies = BAD_GUYS.map(([kind, planetId, dir]) => {
      const planet = this.planet(planetId);
      const mesh = kind === 'apple' ? models.makeApple() : kind === 'robot' ? models.makeRobot() : models.makeSunglasses();
      this.scene.add(mesh);
      const enemyDir = vec(dir).normalize();
      return {
        kind,
        planet,
        dir: enemyDir,
        heading: anyTangent(enemyDir),
        altitude: 0,
        mesh,
        alive: true,
        nextShotAt: 0,
        shotEveryMs: kind === 'apple' ? 2000 : 1600,
        phase: Math.random() * 6,
      };
    });

    // Flying saucers are bad guys too (kind 'saucer'), so lasers, scratches and the Freeze Ray work on them.
    for (const [planetId, dir] of SAUCERS) {
      const { group, lights } = models.makeSaucer();
      this.scene.add(group);
      const saucerDir = vec(dir).normalize();
      this.enemies.push({
        kind: 'saucer',
        planet: this.planet(planetId),
        dir: saucerDir,
        heading: anyTangent(saucerDir),
        altitude: SAUCER_ALTITUDE,
        mesh: group,
        lights,
        alive: true,
        hp: SAUCER_HP,
        hitRadius: 2.2,
        readyAt: 0,
        phase: Math.random() * 6,
      });
    }

    // The inside of the alien spaceship: a floor planet far away, inside a metal room
    this.shipPlanet = { id: 'ship', ship: true, center: vec(SHIP.center), radius: SHIP.radius, color: 0x90a4ae, spawn: new THREE.Vector3(0, 1, 0) };
    this.shipPlanet.mesh = models.makePlanet(SHIP.radius, 0x90a4ae, 9);
    this.shipPlanet.mesh.position.copy(this.shipPlanet.center);
    this.scene.add(this.shipPlanet.mesh);
    const room = models.makeShipRoom(SHIP.room);
    room.position.copy(this.shipPlanet.center);
    this.scene.add(room);
    this.planets.push(this.shipPlanet);

    this.shots = []; // lasers and blaster shots that fly around planets
    this.effects = []; // short-lived things: pops, slashes, the tongue
  }

  createPlayer() {
    const palette = this.save.keys.includes('world3') ? this.save.palette ?? 0 : 0; // secret colors
    const { group, legs, cape } = models.makeHero(this.character.id, palette, this.save.wearing?.[this.character.id]);
    this.scene.add(group);
    // The hero gets its own materials, so turning invisible doesn't make anything else see-through.
    this.heroMaterials = [];
    group.traverse((part) => {
      if (!part.material) return;
      part.material = part.material.clone();
      part.material.transparent = true;
      this.heroMaterials.push(part.material);
    });
    const planet = this.planet(START_PLANET);
    this.player = {
      model: group,
      legs,
      cape,
      planet,
      checkpoint: planet,
      pos: this.pointOn(planet, planet.spawn, 0),
      vel: new THREE.Vector3(),
      forward: planet.jumpDir.clone().addScaledVector(planet.spawn, -planet.jumpDir.dot(planet.spawn)).normalize(),
      onGround: true,
      airJumpsLeft: 0,
      hearts: this.settings.hearts,
      safeUntil: 0,
      hurtAt: -Infinity,
      nextAttackAt: 0,
      invisibleUntil: 0,
      invisibleReadyAt: 0,
      shieldUntil: 0,
      shieldReadyAt: 0,
      flyUntil: 0,
      flyReadyAt: 0,
      shadowUntil: 0,
      shadowReadyAt: 0,
      mechaUntil: 0,
      mechaUsed: false,
      tongue: null,
    };
    this.hasMecha = this.powerUps.includes('mecha-capybara');
    this.hasFreeze = this.powerUps.includes('freeze');
    this.mechaModel = models.makeMecha();
    this.mechaModel.visible = false;
    this.scene.add(this.mechaModel);
    this.hasShield = this.powerUps.includes('shield');
    this.shieldIsBubble = this.powerUps.includes('multi-direction');
    this.hasFly = this.powerUps.includes('fly');

    if (this.character.fireAura) {
      this.aura = models.makeAura(this.character.auraColor);
      this.scene.add(this.aura);
    }
    this.shieldMesh = this.shieldIsBubble
      ? new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 16), new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.25, depthWrite: false }))
      : new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.12), new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.45 }));
    this.shieldMesh.visible = false;
    this.scene.add(this.shieldMesh);

    this.camera.position.copy(this.player.pos).add(new THREE.Vector3(0, 6, 10));
  }

  createHud() {
    const attack = t(ATTACK_NAMES[this.character.attack]);
    this.hud = new Hud(this.container, {
      title: t('game.world2'),
      difficulty: t(`difficulty.${this.save.difficulty}`),
      hint: this.character.doubleJump ? `${attack}   ${t('game.jumpTwice')}` : attack,
      controls: t('game.controls3d'),
      menu: `${t('game.sound')}   ${t('game.menu')}`,
      maxHearts: this.settings.hearts,
      crystals: this.crystals.length,
      bossName: t('game.grapeBoss'),
    });
    if (this.save.touch) this.hud.hideKeyboardHints();
    this.hud.setHearts(this.player.hearts);
    this.hud.setBolts(this.save.bolts);
    this.hud.setCrystals(0);
  }

  listen() {
    this.onKeyDown = (event) => {
      if (!this.keysDown.has(event.code)) this.keysPressed.add(event.code);
      this.keysDown.add(event.code);
      if (event.code === 'Escape') {
        if (this.sniper?.aiming) this.sniper.close(); // ESC only puts the SUPA SNIPER away
        else if (!this.sniper?.busy) this.exit();
      }
      if (event.code === 'KeyM') {
        this.save.muted = !this.save.muted;
        writeSave(this.save);
        audio.setMuted(this.save.muted);
      }
    };
    this.onKeyUp = (event) => this.keysDown.delete(event.code);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  down(...codes) {
    return codes.some((code) => this.keysDown.has(code));
  }

  pressed(...codes) {
    return codes.some((code) => this.keysPressed.has(code));
  }

  // ---------- Helpers ----------

  pointOn(planet, dir, altitude) {
    return planet.center.clone().addScaledVector(dir, planet.radius + altitude);
  }

  // The planet whose ground is closest to `pos` (that's the one pulling you).
  nearestPlanet(pos) {
    let best = null;
    let bestDistance = Infinity;
    for (const planet of this.planets) {
      const distance = pos.distanceTo(planet.center) - planet.radius;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = planet;
      }
    }
    return { planet: best, altitude: bestDistance };
  }

  upAt(planet, pos) {
    return pos.clone().sub(planet.center).normalize();
  }

  playerBody() {
    return this.player.pos.clone().addScaledVector(this.upAt(this.player.planet, this.player.pos), 0.6);
  }

  get invisible() {
    return this.now < this.player.invisibleUntil;
  }

  get shielded() {
    return this.now < this.player.shieldUntil;
  }

  get flying() {
    return this.now < this.player.flyUntil;
  }

  get shadow() {
    return this.now < this.player.shadowUntil;
  }

  get mecha() {
    return this.now < this.player.mechaUntil;
  }

  get sliding() {
    return this.now < (this.player.slideUntil ?? 0);
  }

  // A magic strawberry's rainbow magic: super fast, nothing hurts you, touching bad guys pops them
  get rainbow() {
    return this.magic.active(this.now);
  }

  eatStrawberry() {
    const berry = takeStrawberry(this.save);
    if (!berry) {
      audio.play('error');
      this.hud.message(t('strawberry.empty'), '', 2000);
      return;
    }
    this.magic.start(berry, this.now);
    this.hud.message(t(berry === 'gold' ? 'strawberry.goldEaten' : 'strawberry.eaten'), '', 1500);
  }

  // The rainbow glow around the hero while the magic lasts
  updateRainbow() {
    this.magic.update(this.now);
    if (!this.rainbowGlow) {
      this.rainbowGlow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false }));
      this.scene.add(this.rainbowGlow);
    }
    this.rainbowGlow.visible = this.rainbow;
    if (!this.rainbow) return;
    this.rainbowGlow.position.copy(this.playerBody());
    this.rainbowGlow.material.color.setHex(rainbowColor(this.now));
    this.rainbowGlow.scale.setScalar(1 + Math.sin(this.now / 80) * 0.08);
  }

  // ---------- Every frame ----------

  loop(time) {
    if (this.ended) return;
    const dt = Math.min((time - this.lastFrame) / 1000, 0.05);
    if (this.tip || this.disco || this.sniper?.busy) this.pausedFor += time - this.lastFrame; // frozen: the clock stops too
    this.lastFrame = time;
    this.now = performance.now() - this.pausedFor;

    if (this.disco) {
      // The secret disco party is on (an HTML overlay): everything waits
      this.keysPressed.clear();
      this.frame = requestAnimationFrame((next) => this.loop(next));
      return;
    }

    if (this.sniper?.busy) {
      // Looking through SupaCapybara's eyes with the SUPA SNIPER: everything else waits
      this.sniper.update(dt);
      this.keysPressed.clear();
      this.draw();
      this.frame = requestAnimationFrame((next) => this.loop(next));
      return;
    }
    if (this.tip) {
      this.updateTip(dt);
      this.keysPressed.clear();
      this.draw();
      this.frame = requestAnimationFrame((next) => this.loop(next));
      return;
    }
    if (this.trip) {
      this.updateTrip(dt);
    } else if (this.danceState) {
      this.updateDance(dt);
    } else if (!this.won) {
      if (this.beam) this.updateBeam(dt);
      else this.updatePlayer(dt);
      this.updatePowers();
      this.updateEnemies(dt);
      this.updateShip();
      this.updateAgentBox();
      this.updateBoss(dt);
      this.checkTips();
    }
    this.updateShots(dt);
    this.updateEffects(dt);
    this.updatePickups(dt);
    if (!this.trip) this.updateCamera(dt);

    this.keysPressed.clear();
    this.draw();
    this.frame = requestAnimationFrame((next) => this.loop(next));
  }

  // DRAWING MODE (save.drawingMode): the 3D world drawn like a notebook sketch (see src/sketch.js)
  draw() {
    if (drawingMode(this.save)) {
      this.sketch ??= new ThreeSketch(this.renderer);
      this.sketch.render(this.scene, this.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    if (!p.onGround) p.planet = this.nearestPlanet(p.pos).planet;
    const up = this.upAt(p.planet, p.pos);
    p.forward.addScaledVector(up, -p.forward.dot(up));
    if (p.forward.lengthSq() < 1e-6) p.forward.copy(anyTangent(up));
    p.forward.normalize();

    const turn = (this.down('ArrowLeft', 'KeyA') ? 1 : 0) - (this.down('ArrowRight', 'KeyD') ? 1 : 0);
    p.forward.applyAxisAngle(up, turn * TURN_SPEED * dt);
    const move = (this.down('ArrowUp', 'KeyW') ? 1 : 0) - (this.down('ArrowDown', 'KeyS') ? 1 : 0);
    const bouncing = this.now < p.hurtAt + BOUNCE_MS;
    const jumpPressed = this.pressed('Space');

    const runSpeed = RUN_SPEED * (this.shadow ? SHADOW_SPEED : 1) * (this.rainbow ? MAGIC_SPEED : 1);
    if (this.flying) {
      // Flying: no gravity. Hold SPACE to go up; let go to hover.
      const rise = this.down('Space') ? FLY_SPEED * 0.7 : 0;
      p.vel.copy(p.forward).multiplyScalar(move * FLY_SPEED).addScaledVector(up, rise);
      p.onGround = false;
    } else if (p.onGround && !bouncing) {
      p.vel.copy(p.forward).multiplyScalar(this.sliding ? runSpeed * SLIDE_SPEED : move * runSpeed);
      p.airJumpsLeft = this.character.doubleJump ? 1 : 0;
      if (jumpPressed) {
        p.vel.addScaledVector(up, JUMP_SPEED);
        p.onGround = false;
        audio.play('jump');
      }
    } else {
      p.vel.addScaledVector(up, -GRAVITY * dt);
      // A little steering in the air
      const radial = p.vel.dot(up);
      const along = p.vel.clone().addScaledVector(up, -radial);
      if (move !== 0 && !bouncing) along.lerp(p.forward.clone().multiplyScalar(move * runSpeed), Math.min(1, dt * 2));
      p.vel.copy(along).addScaledVector(up, radial);
      if (jumpPressed && p.airJumpsLeft > 0) {
        p.airJumpsLeft -= 1;
        p.vel.copy(along).addScaledVector(up, JUMP_SPEED);
        audio.play('doubleJump');
      }
    }

    p.pos.addScaledVector(p.vel, dt);
    this.pushOutOfForceField();

    // Land on (or stay on) the closest planet
    const { planet, altitude } = this.nearestPlanet(p.pos);
    const groundUp = this.upAt(planet, p.pos);
    const keepWalking = p.onGround && planet === p.planet && altitude < 0.3;
    if (altitude <= 0 || keepWalking) {
      p.pos.copy(this.pointOn(planet, groundUp, 0));
      const radial = p.vel.dot(groundUp);
      if (radial < 0) p.vel.addScaledVector(groundUp, -radial);
      if (!p.onGround && !this.flying) this.landed(planet);
      p.onGround = !this.flying || altitude <= 0;
      p.planet = planet;
    } else {
      p.onGround = false;
    }

    if (altitude > LOST_IN_SPACE) {
      audio.play('fall');
      if (this.loseHeart()) this.respawn();
    }

    // Model, running legs and cape
    const modelUp = this.upAt(p.planet, p.pos);
    p.model.position.copy(p.pos);
    const target = new THREE.Object3D();
    orient(target, modelUp, p.forward);
    if (this.sliding) target.rotateX(1.4); // flat on his belly, head first
    p.model.quaternion.slerp(target.quaternion, Math.min(1, dt * 12));
    const running = p.onGround && move !== 0;
    p.legs.forEach((leg, i) => (leg.rotation.x = running ? Math.sin(this.now / 60 + i * Math.PI) * 0.6 : 0));
    p.cape.rotation.x = running || !p.onGround ? 1.1 : 0.5;
    const blinking = this.now < p.safeUntil && Math.floor(this.now / 100) % 2 === 0;
    p.model.visible = !blinking && !this.mecha;
    for (const material of this.heroMaterials) material.opacity = this.invisible ? 0.25 : this.shadow ? 0.45 : 1;
    // In the Mecha suit, show the giant robot instead
    this.mechaModel.visible = this.mecha && !blinking;
    if (this.mecha) {
      this.mechaModel.position.copy(p.model.position);
      this.mechaModel.quaternion.copy(p.model.quaternion);
    }
    if (this.aura) this.aura.position.copy(this.playerBody());

    if (this.pressed('KeyX') || this.down('KeyX')) this.attack();
    this.updateTongue();

    if (this.pendingDance && p.onGround && !this.beam) {
      const { id, done } = this.pendingDance;
      this.pendingDance = null;
      p.mechaUntil = Math.min(p.mechaUntil, this.now);
      p.flyUntil = Math.min(p.flyUntil, this.now);
      p.vel.set(0, 0, 0);
      p.model.visible = true;
      this.mechaModel.visible = false;
      this.danceState = { id, done, start: this.now, ms: id === 'wiggle' ? 1900 : 1700, hop: -1 };
      audio.play('dance');
    }
  }

  landed(planet) {
    this.landedAt = this.now;
    if (planet.ship) return;
    if (!planet.boss || this.fieldDown) this.player.checkpoint = planet;
    if (this.fieldDown && planet.boss && !this.bossStarted) this.startBoss();
  }

  pushOutOfForceField() {
    if (this.fieldDown) return;
    const p = this.player;
    const fromCenter = p.pos.clone().sub(this.bossPlanet.center);
    if (fromCenter.length() >= FORCE_FIELD_RADIUS) return;
    fromCenter.normalize();
    p.pos.copy(this.bossPlanet.center).addScaledVector(fromCenter, FORCE_FIELD_RADIUS);
    const inward = p.vel.dot(fromCenter);
    if (inward < 0) p.vel.addScaledVector(fromCenter, -inward * 1.5);
    if (this.now > (this.fieldMessageAt ?? 0)) {
      this.fieldMessageAt = this.now + 4000;
      audio.play('error');
      this.hud.message('', t('game.needCrystals', { count: this.crystals.length - this.crystalsFound }), 2500);
    }
  }

  updatePowers() {
    const p = this.player;
    if (this.character.invisibility && this.pressed('KeyC') && !this.invisible && this.now >= p.invisibleReadyAt) {
      p.invisibleUntil = this.now + INVISIBLE_MS;
      audio.play('invisible');
    }
    if (p.invisibleUntil && !this.invisible) this.becomeVisible();

    if (this.hasShield && this.pressed('KeyV') && !this.shielded && this.now >= p.shieldReadyAt) {
      p.shieldUntil = this.now + SHIELD_MS;
      audio.play('shield');
    }
    if (p.shieldUntil && !this.shielded) {
      p.shieldUntil = 0;
      p.shieldReadyAt = this.now + SHIELD_WAIT_MS;
    }
    this.shieldMesh.visible = this.shielded;
    if (this.shielded) {
      const up = this.upAt(p.planet, p.pos);
      if (this.shieldIsBubble) {
        this.shieldMesh.position.copy(this.playerBody());
      } else {
        this.shieldMesh.position.copy(this.playerBody()).addScaledVector(p.forward, 1.1);
        orient(this.shieldMesh, up, p.forward);
      }
    }

    if (this.character.shadow && this.pressed('KeyC') && !this.shadow && this.now >= p.shadowReadyAt) {
      p.shadowUntil = this.now + SHADOW_MS;
      audio.play('shadow');
    }
    if (p.shadowUntil && !this.shadow) {
      p.shadowUntil = 0;
      p.shadowReadyAt = this.now + SHADOW_WAIT_MS;
    }

    if (this.character.slide && this.pressed('KeyC') && !this.sliding && !this.flying && !this.mecha && this.now >= (p.slideReadyAt ?? 0)) {
      p.slideUntil = this.now + SLIDE_MS;
      p.nextSlideHitAt = 0;
      audio.play('slide');
    }
    if (p.slideUntil) this.updateSlide();

    if (this.hasMecha && this.pressed('KeyR') && !this.mecha && !p.mechaUsed) {
      p.mechaUsed = true; // once per level
      p.mechaUntil = this.now + MECHA_MS;
      audio.play('mecha');
    }

    if (this.pressed('KeyB')) this.eatStrawberry();
    if (this.pressed('KeyG') && megaBeamOn(this.save)) this.megaBeam.start();
    if (this.sniper && this.pressed('KeyT')) this.sniper.open();
    this.megaBeam.update();
    this.updateRainbow();

    if (this.hasFreeze && this.pressed('KeyZ')) this.useFreezeRay(this.enemies);
    this.meltIce(this.enemies);

    if (this.hasFly && this.pressed('KeyF')) {
      if (this.flying) {
        p.flyUntil = this.now; // F again stops flying early
      } else if (this.now >= p.flyReadyAt) {
        p.flyUntil = this.now + FLY_MS;
        audio.play('fly');
      }
    }
    if (p.flyUntil && !this.flying) {
      p.flyUntil = 0;
      p.flyReadyAt = this.now + FLY_WAIT_MS;
    }

    const seconds = (ms) => Math.ceil(ms / 1000);
    const status = (key, name, activeUntil, readyAt) => {
      if (this.now < activeUntil) return `${name}! ${seconds(activeUntil - this.now)}`;
      if (this.now < readyAt) return `${key} = ${name}: ${t('game.wait', { seconds: seconds(readyAt - this.now) })}`;
      return `${key} = ${name}: ${t('game.ready')}`;
    };
    const parts = [];
    if (this.character.invisibility) parts.push(status('C', t('game.invisible'), p.invisibleUntil, p.invisibleReadyAt));
    if (this.hasShield) parts.push(status('V', t('game.shield'), p.shieldUntil, p.shieldReadyAt));
    if (this.character.shadow) parts.push(status('C', t('game.shadow'), p.shadowUntil, p.shadowReadyAt));
    if (this.character.slide) parts.push(status('C', t('game.slide'), p.slideUntil ?? 0, p.slideReadyAt ?? 0));
    if (this.hasFly) parts.push(status('F', t('game.fly'), p.flyUntil, p.flyReadyAt));
    if (this.hasFreeze) parts.push(status('Z', t('game.freeze'), this.freezeUntil ?? 0, this.freezeReadyAt ?? 0));
    if (this.hasMecha) {
      parts.push(p.mechaUsed && !this.mecha ? `R = ${t('game.mecha')}: ${t('game.used')}` : status('R', t('game.mecha'), p.mechaUntil, 0));
    }
    if (megaBeamOn(this.save)) parts.push(this.megaBeam.status());
    if (this.sniper) parts.push(this.sniper.status());
    if (this.rainbow) parts.push(`🌈 ${t('strawberry.magic')}! ${this.magic.secondsLeft(this.now)}`);
    else parts.push(bagText(this.save));
    this.hud.setPower(parts.filter(Boolean).join('     '));
  }

  // The WADDLE SLIDE knocks over every bad guy right in front of him (a few times a slide, so bosses get bumped too)
  updateSlide() {
    const p = this.player;
    if (!this.sliding) {
      p.slideUntil = 0;
      p.slideReadyAt = this.now + SLIDE_WAIT_MS;
      return;
    }
    if (this.now < p.nextSlideHitAt) return;
    p.nextSlideHitAt = this.now + 150;
    const body = this.playerBody();
    let hit = false;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const to = this.enemyPosition(enemy).sub(body);
      if (to.length() < SLIDE_REACH && to.dot(p.forward) > -0.3) {
        this.defeat(enemy, 2);
        hit = true;
      }
    }
    if (this.bossIsHittable()) {
      const to = this.bossCenter().sub(body);
      if (to.length() < SLIDE_REACH + 1.4 && to.dot(p.forward) > -0.3) {
        this.hitBoss(1);
        hit = true;
      }
    }
    if (hit) this.landedHit();
  }

  becomeVisible() {
    this.player.invisibleUntil = 0;
    this.player.invisibleReadyAt = this.now + INVISIBLE_WAIT_MS;
  }

  // ---------- Attacks ----------

  attack() {
    const p = this.player;
    if (this.now < p.nextAttackAt) return;
    const kind = this.mecha ? 'rocket' : this.character.attack;
    p.nextAttackAt = this.now + ATTACK_COOLDOWN_MS[kind];
    const start = this.playerBody().addScaledVector(this.upAt(p.planet, p.pos), 0.3).addScaledVector(p.forward, 0.9);

    if (kind === 'rocket') {
      audio.play('rocketShot');
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 1.4), new THREE.MeshBasicMaterial({ color: 0xff7043 }));
      this.addShot({ mesh, planet: p.planet, start: start.addScaledVector(this.upAt(p.planet, p.pos), 1), dir: p.forward, speed: LASER_SPEED * 0.8, life: LASER_LIFE * 1.3, damage: 3, fromPlayer: true });
    } else if (kind === 'cuffs') {
      // COPYBARA: spinning handcuffs that send a bad guy to jail
      audio.play('laser');
      this.addShot({ mesh: models.makeHandcuffs(), planet: p.planet, start, dir: p.forward, speed: LASER_SPEED * 0.7, life: LASER_LIFE * 1.2, damage: 2, fromPlayer: true, cuffs: true });
    } else if (kind === 'snowball') {
      // CAPTAIN WADDLE: a snowball that flies far
      audio.play('snowball');
      this.addShot({ mesh: models.makeSnowball(), planet: p.planet, start, dir: p.forward, speed: LASER_SPEED * 0.8, life: LASER_LIFE * 1.4, damage: 1, fromPlayer: true });
    } else if (kind === 'gadget') {
      // AGENT WHISKERS: a spy gadget that lands a little way ahead and explodes (landGadget)
      audio.play('gadget');
      this.addShot({ mesh: models.makeGadget(), planet: p.planet, start, dir: p.forward, speed: LASER_SPEED * 0.4, life: 0.35, damage: 2, fromPlayer: true, gadget: true });
    } else if (kind === 'moon') {
      // Bloodmoon Cat: a red moon that flies to the nearest bad guy by itself
      audio.play('moon');
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshBasicMaterial({ color: 0xd50000 }));
      this.addShot({ mesh, planet: p.planet, start, dir: p.forward, speed: MOON_SPEED, life: 2, damage: 2, fromPlayer: true, homing: true });
    } else if (kind === 'laser' || kind === 'superLaser' || kind === 'goldLaser') {
      const big = kind !== 'laser';
      audio.play(big ? 'superLaser' : 'laser');
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(big ? 0.3 : 0.14, big ? 0.3 : 0.14, big ? 1.8 : 1.3),
        new THREE.MeshBasicMaterial({ color: { laser: 0xff2020, superLaser: 0xff4fd8, goldLaser: 0xffd54f }[kind] }),
      );
      this.addShot({ mesh, planet: p.planet, start, dir: p.forward, speed: LASER_SPEED, life: LASER_LIFE, damage: big ? 2 : 1, fromPlayer: true });
    } else if (kind === 'scratch') {
      audio.play('scratch');
      this.scratch();
    } else {
      audio.play('tongue');
      p.tongue = { startedAt: this.now, hit: false };
    }
    // Right next to the disco crack, any attack breaks it (scratches and tongues too)
    if (this.discoCrack && this.discoSpot().distanceTo(this.playerBody()) < 2.4) this.openDisco();
    // ...and the same for AGENT WHISKERS' cardboard box
    if (this.agentBox && this.agentBoxCenter().distanceTo(this.playerBody()) < 2.6) this.findAgent();
  }

  // ---------- The secret capybara disco (the easter egg, see disco.js): a crack on the back of the parked rocket ----------

  createDiscoCrack(rocket) {
    if (!this.discoPictures) return;
    const crack = new THREE.Group();
    const lines = [
      [0, 0.25, 0.5, 0.25],
      [0.05, -0.1, 0.4, -0.35],
      [-0.05, -0.4, 0.35, 0.3],
      [0.18, 0.05, 0.25, 1.1],
      [-0.14, -0.15, 0.22, -1.0],
    ];
    for (const [x, y, length, angle] of lines) {
      const dark = new THREE.Mesh(new THREE.BoxGeometry(0.06, length, 0.04), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
      dark.position.set(x, y, 0);
      dark.rotation.z = angle;
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.025, length * 0.8, 0.05), new THREE.MeshBasicMaterial({ color: 0xff4dd2 }));
      glow.position.set(x, y, 0.01);
      glow.rotation.z = angle;
      crack.add(dark, glow);
    }
    // On the back of the body (the window is on the front)
    crack.position.set(0, 1.5, -0.81);
    crack.rotation.y = Math.PI;
    rocket.add(crack);
    this.discoCrack = crack;
  }

  discoSpot() {
    return this.discoCrack.getWorldPosition(new THREE.Vector3());
  }

  openDisco() {
    if (!this.discoCrack || this.won) return;
    const crack = this.discoCrack;
    this.discoCrack = null;
    // The crack breaks into a glowing hole with flashing disco lights
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), new THREE.MeshBasicMaterial({ color: 0xff4dd2 }));
    hole.position.copy(crack.position);
    hole.rotation.y = Math.PI;
    crack.parent.add(hole);
    crack.parent.remove(crack);
    const colors = [0xff1744, 0x00e5ff, 0xffea00, 0x76ff03, 0xd500f9];
    const flash = setInterval(() => hole.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]), 250);
    this.pop(hole.getWorldPosition(new THREE.Vector3()), 0xff4dd2, 1);
    this.disco = true;
    this.keysDown.clear();
    setTimeout(() => {
      showDisco({
        ...this.discoPictures,
        music: audio.wantedSong,
        reward: discoReward(this.save, 'World2'),
        onDone: () => (this.disco = false),
      });
    }, 450);
    this.discoFlash = flash;
  }

  // ---------- AGENT WHISKERS' hideout: a wobbly cardboard box on the secret planet (level.js 'hideout') ----------

  createAgentBox() {
    const planet = this.planets.find((p) => p.agentBox);
    if (!planet || this.save.owned.includes('agent-whiskers')) return; // (already found her: the box is gone)
    const up = vec(planet.agentBox).normalize();
    const box = models.makeAgentBox();
    box.position.copy(this.pointOn(planet, up, 0));
    orient(box, up, anyTangent(up));
    this.scene.add(box);
    this.agentBox = box;
    this.agentBoxUp = up;
    this.agentBoxBase = box.position.clone();
    this.agentBoxForward = anyTangent(up);
  }

  agentBoxCenter() {
    return this.agentBox.position.clone().addScaledVector(this.agentBoxUp, 0.6);
  }

  // Every couple of seconds the box hops and wiggles, and her sunglasses peek up and duck down.
  // Walking into it finds her too.
  updateAgentBox() {
    if (!this.agentBox) return;
    const box = this.agentBox;
    const phase = (this.now / 1000) % 2.6;
    const hop = phase < 0.45 ? Math.sin((phase / 0.45) * Math.PI) * 0.3 : 0;
    box.position.copy(this.agentBoxBase).addScaledVector(this.agentBoxUp, hop);
    orient(box, this.agentBoxUp, this.agentBoxForward);
    if (phase < 0.9) box.rotateY(Math.sin(phase * 25) * 0.12 * (1 - phase / 0.9));
    box.userData.peek.position.y = Math.max(-0.12, Math.sin(this.now / 600) * 0.12);
    if (this.agentBoxCenter().distanceTo(this.playerBody()) < AGENT_BOX_TOUCH) this.findAgent();
  }

  // The box pops open, AGENT WHISKERS jumps out, whispers, and joins your team (saved as an owned hero).
  findAgent() {
    if (!this.agentBox || this.won) return;
    const box = this.agentBox;
    const up = this.agentBoxUp;
    const base = this.agentBoxBase;
    this.agentBox = null;
    this.scene.remove(box);
    audio.play('agentBox');
    this.pop(base.clone().addScaledVector(up, 0.6), 0xc19a6b, 2);
    // Bits of cardboard fly off
    for (let i = 0; i < 5; i++) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0xc19a6b }));
      const out = new THREE.Vector3().randomDirection().addScaledVector(up, 1.5).normalize();
      this.addEffect(piece, 0.8, (m, k) => {
        m.position.copy(base).addScaledVector(out, k * 4).addScaledVector(up, Math.sin(k * Math.PI) * 1.5);
        m.rotation.set(k * 9, k * 7, 0);
        m.scale.setScalar(1 - k * 0.7);
      });
    }

    if (!this.save.owned.includes('agent-whiskers')) this.save.owned.push('agent-whiskers');
    writeSave(this.save);

    // She jumps out, looks at you, and whispers in a comic bubble
    const { group } = models.makeHero('agent-whiskers');
    const toPlayer = this.player.pos.clone().sub(base);
    toPlayer.addScaledVector(up, -toPlayer.dot(up));
    const facing = toPlayer.lengthSq() > 1e-4 ? toPlayer.normalize() : anyTangent(up);
    // She leaps out and lands next to you (off to the side, so the camera sees her), turned toward you
    const p = this.player;
    const planet = this.nearestPlanet(base).planet;
    const right = new THREE.Vector3().crossVectors(p.forward, this.upAt(p.planet, p.pos)).normalize();
    const landDir = p.pos.clone().addScaledVector(right, 2.2).addScaledVector(p.forward, 1.2).sub(planet.center).normalize();
    const land = this.pointOn(planet, landDir, 0);
    const toHero = p.pos.clone().sub(land).addScaledVector(p.forward, -4);
    toHero.addScaledVector(landDir, -toHero.dot(landDir));
    orient(group, landDir, toHero.lengthSq() > 1e-4 ? toHero.normalize() : facing);
    const bubble = document.createElement('div');
    bubble.style.cssText =
      'position:absolute;transform:translate(-50%,-100%);max-width:300px;padding:10px 16px;background:#fff;border:4px solid #000;border-radius:18px;' +
      'font:18px "Comic Sans MS","Chalkboard SE",Arial,sans-serif;color:#000;text-align:center;pointer-events:none;z-index:20;visibility:hidden;';
    bubble.innerHTML = '<div style="font:bold 13px Arial,sans-serif;color:#d81b60;margin-bottom:4px"></div><div></div>' +
      '<div style="position:absolute;left:50%;bottom:-14px;width:20px;height:20px;margin-left:-10px;background:#fff;border-right:4px solid #000;border-bottom:4px solid #000;transform:rotate(45deg)"></div>';
    bubble.children[0].textContent = `🕶️ ${t('name.agent-whiskers').toUpperCase()}`;
    bubble.children[1].textContent = t('agent.shh');
    this.container.append(bubble);
    this.agentBubble = bubble;
    const seconds = 5;
    this.addEffect(group, seconds, (m, k) => {
      const time = k * seconds;
      const leap = Math.min(1, time / 0.7);
      const jump = time < 0.7 ? Math.sin(leap * Math.PI) * 2.4 : Math.abs(Math.sin(time * 3)) * 0.08;
      m.position.copy(base).lerp(land, leap).addScaledVector(landDir, jump);
      if (time > 0.7 && bubble.isConnected) {
        bubble.style.visibility = 'visible';
        const head = this.toScreen(land.clone().addScaledVector(landDir, 1.9));
        bubble.style.left = `${Math.min(Math.max(head.x, 160), this.container.clientWidth - 160)}px`;
        bubble.style.top = `${Math.min(Math.max(head.y, bubble.offsetHeight + 10), this.container.clientHeight - 30)}px`;
      }
      if (k < 1) return;
      // POOF: spies vanish
      bubble.remove();
      this.agentBubble = null;
      this.pop(land.clone().addScaledVector(landDir, 0.6), 0x37474f, 1.5);
      audio.play('key');
      this.hud.message(t('agent.joined'), t('agent.pickHer'), 4500);
    });
  }

  // mega: a MEGA BEAM laser (its damage to Grape Boss counts toward the beam's limit)
  // cuffs: COPYBARA's handcuffs (they spin, and a bad guy they beat goes to jail)
  // gadget: AGENT WHISKERS' spy gadget (it lands and explodes when its life runs out or it bumps into something)
  addShot({ mesh, planet, start, dir, speed, life, damage = 1, fromPlayer, homing = false, mega = false, cuffs = false, gadget = false }) {
    const offset = start.clone().sub(planet.center);
    const up = offset.clone().normalize();
    const heading = dir.clone().addScaledVector(up, -dir.dot(up)).normalize();
    this.scene.add(mesh);
    this.shots.push({ mesh, planet, offset, heading, speed, life, damage, fromPlayer, homing, mega, cuffs, gadget });
  }

  scratch() {
    const p = this.player;
    const body = this.playerBody();
    const slash = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      line.position.x = i * 0.3;
      line.rotation.z = 0.5;
      slash.add(line);
    }
    slash.position.copy(body).addScaledVector(p.forward, 1.2);
    orient(slash, this.upAt(p.planet, p.pos), p.forward);
    this.addEffect(slash, 0.2, (mesh, k) => mesh.scale.setScalar(1 + k * 0.4));

    let hit = false;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const to = this.enemyPosition(enemy).sub(body);
      if (to.length() < SCRATCH_REACH && to.dot(p.forward) > -0.2) {
        this.defeat(enemy, 2);
        hit = true;
      }
    }
    if (this.bossIsHittable()) {
      const to = this.bossCenter().sub(body);
      if (to.length() < SCRATCH_REACH + 1.4 && to.dot(p.forward) > -0.2) {
        this.hitBoss(2);
        hit = true;
      }
    }
    if (hit) this.landedHit();
  }

  updateTongue() {
    const p = this.player;
    if (p.tongueMesh) {
      this.scene.remove(p.tongueMesh);
      p.tongueMesh = null;
    }
    if (!p.tongue) return;
    const k = (this.now - p.tongue.startedAt) / TONGUE_MS;
    if (k >= 1) {
      p.tongue = null;
      return;
    }
    const length = TONGUE_REACH * Math.sin(Math.PI * k);
    const mouth = this.playerBody().addScaledVector(p.forward, 0.9);
    const tip = mouth.clone().addScaledVector(p.forward, length);
    p.tongueMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, length, 6), new THREE.MeshBasicMaterial({ color: 0xff6fa8 }));
    p.tongueMesh.position.copy(mouth).lerp(tip, 0.5);
    p.tongueMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.forward);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3d8b }));
    ball.position.y = length / 2;
    p.tongueMesh.add(ball);
    this.scene.add(p.tongueMesh);

    if (p.tongue.hit) return;
    const near = (point, reach) => {
      const along = point.clone().sub(mouth).dot(p.forward);
      if (along < 0 || along > length) return false;
      return point.distanceTo(mouth.clone().addScaledVector(p.forward, along)) < reach;
    };
    const enemy = this.enemies.find((e) => e.alive && near(this.enemyPosition(e), e.hitRadius ?? 1));
    if (enemy) {
      this.defeat(enemy);
      p.tongue.hit = true;
    } else if (this.bossIsHittable() && near(this.bossCenter(), 2.2)) {
      this.hitBoss(1);
      p.tongue.hit = true;
    }
    if (p.tongue.hit) this.landedHit();
  }

  landedHit() {
    if (this.invisible) this.becomeVisible();
  }

  // ---------- Shots: they fly around the planet they started on ----------

  updateShots(dt) {
    const body = this.playerBody();
    for (const shot of this.shots) {
      shot.life -= dt;
      if (shot.homing) this.steerTowardNearest(shot);
      const axis = new THREE.Vector3().crossVectors(shot.offset, shot.heading).normalize();
      const angle = (shot.speed * dt) / shot.offset.length();
      shot.offset.applyAxisAngle(axis, angle);
      shot.heading.applyAxisAngle(axis, angle).normalize();
      shot.mesh.position.copy(shot.planet.center).add(shot.offset);
      shot.mesh.lookAt(shot.mesh.position.clone().add(shot.heading));
      if (shot.cuffs) shot.mesh.rotateY(this.now / 60);

      if (shot.fromPlayer && this.discoCrack && this.discoSpot().distanceTo(shot.mesh.position) < 1.2) {
        shot.life = 0;
        this.openDisco();
      } else if (shot.fromPlayer && this.agentBox && this.agentBoxCenter().distanceTo(shot.mesh.position) < 1.4) {
        shot.life = 0;
        if (!shot.gadget) this.findAgent();
      } else if (shot.gadget) {
        // Spy gadgets don't hit on the way: they stop when they bump into something, then explode (landGadget)
        const bump = this.enemies.some((e) => e.alive && this.enemyPosition(e).distanceTo(shot.mesh.position) < (e.hitRadius ?? 1));
        if (bump || (this.bossIsHittable() && this.bossCenter().distanceTo(shot.mesh.position) < 2.6)) shot.life = 0;
      } else if (shot.fromPlayer) {
        const enemy = this.enemies.find((e) => e.alive && this.enemyPosition(e).distanceTo(shot.mesh.position) < (e.hitRadius ?? 1));
        if (enemy) {
          if (shot.cuffs && (enemy.hp ?? 0) <= shot.damage) this.sendToJail(this.enemyPosition(enemy), this.upAt(enemy.planet, this.enemyPosition(enemy)));
          this.defeat(enemy, shot.damage);
          shot.life = 0;
          this.landedHit();
        } else if (this.bossIsHittable() && this.bossCenter().distanceTo(shot.mesh.position) < 2.6) {
          if (shot.mega) this.megaBeam.hitBoss(shot.damage);
          else this.hitBoss(shot.damage);
          shot.life = 0;
          this.landedHit();
        }
      } else if (!this.won) {
        const toShot = shot.mesh.position.clone().sub(body);
        if (this.shielded && (this.shieldIsBubble ? toShot.length() < 1.6 : toShot.length() < 1.8 && toShot.dot(this.player.forward) > 0.6)) {
          shot.life = 0;
        } else if (toShot.length() < 0.8 && !this.invisible) {
          this.hurt(shot.mesh.position);
          shot.life = 0;
        }
      }
    }
    for (const shot of this.shots.filter((s) => s.life <= 0)) {
      this.scene.remove(shot.mesh);
      if (shot.gadget) this.landGadget(shot);
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  // AGENT WHISKERS' spy gadget lands on the ground, blinks, and goes BOOM: everything close by gets hit.
  landGadget(shot) {
    const up = shot.offset.clone().normalize();
    const pos = shot.planet.center.clone().addScaledVector(up, shot.planet.radius + 0.2);
    const mesh = models.makeGadget();
    mesh.position.copy(pos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    audio.play('gadgetBeep');
    let boomed = false;
    this.addEffect(mesh, GADGET_FUSE, (m, k) => {
      m.scale.setScalar(1 + Math.abs(Math.sin(k * Math.PI * 3)) * 0.4);
      m.userData.light.visible = Math.floor(k * 8) % 2 === 0;
      if (k < 1 || boomed) return;
      boomed = true;
      this.gadgetBoom(pos, shot.damage);
    });
  }

  gadgetBoom(pos, damage) {
    audio.play('gadgetBoom');
    this.pop(pos, 0xff9100, 2.2);
    this.pop(pos, 0xffea00, 1.2);
    this.shakeUntil = this.now + 200;
    if (this.won) return;
    let hit = false;
    for (const enemy of this.enemies) {
      if (enemy.alive && this.enemyPosition(enemy).distanceTo(pos) < GADGET_BLAST + (enemy.hitRadius ?? 1) - 0.5) {
        this.defeat(enemy, damage);
        hit = true;
      }
    }
    if (this.bossIsHittable() && this.bossCenter().distanceTo(pos) < GADGET_BLAST + 1.6) {
      this.hitBoss(damage);
      hit = true;
    }
    if (this.discoCrack && this.discoSpot().distanceTo(pos) < GADGET_BLAST) this.openDisco();
    if (this.agentBox && this.agentBoxCenter().distanceTo(pos) < GADGET_BLAST) this.findAgent();
    if (hit) this.landedHit();
  }

  // COPYBARA's arrest: a little jail drops over the spot, shakes, and goes POOF.
  sendToJail(position, up) {
    const jail = models.makeJail();
    this.addEffect(jail, 0.7, (mesh, k) => {
      mesh.position.copy(position).addScaledVector(up, Math.max(0, 1 - k * 4) * 3);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      mesh.scale.setScalar(k > 0.85 ? 1 + (k - 0.85) * 6 : 1);
      if (k > 0.3 && k < 0.85) mesh.position.addScaledVector(new THREE.Vector3(1, 0, 0), Math.sin(k * 80) * 0.06);
    });
  }

  // Turns a homing shot toward the closest bad guy (or Grape Boss) on its planet.
  steerTowardNearest(shot) {
    const position = shot.planet.center.clone().add(shot.offset);
    const targets = this.enemies.filter((e) => e.alive && e.planet === shot.planet).map((e) => this.enemyPosition(e));
    if (this.bossIsHittable() && this.boss.planet === shot.planet) targets.push(this.bossCenter());
    let best = null;
    for (const target of targets) {
      if (target.distanceTo(position) < 15 && (!best || target.distanceTo(position) < best.distanceTo(position))) best = target;
    }
    if (!best) return;
    const up = shot.offset.clone().normalize();
    const toward = best.clone().sub(position);
    toward.addScaledVector(up, -toward.dot(up));
    if (toward.lengthSq() < 1e-6) return;
    shot.heading.lerp(toward.normalize(), 0.15).addScaledVector(up, -shot.heading.dot(up)).normalize();
  }

  // ---------- Bad guys ----------

  enemyPosition(enemy) {
    return this.pointOn(enemy.planet, enemy.dir, enemy.altitude + 0.5);
  }

  updateEnemies(dt) {
    const p = this.player;
    const body = this.playerBody();
    const seeDistance = this.settings.enemySeeDistance / 50;
    const shotSpeed = this.settings.enemyShotSpeed / 30;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.ice) {
        // Frozen: stays still inside its ice cube (and can't hurt you)
        enemy.ice.position.copy(this.enemyPosition(enemy));
        continue;
      }
      if (enemy.kind === 'saucer') {
        this.updateSaucer(enemy, dt);
        continue;
      }
      if (enemy.kind === 'robot' && this.now > (enemy.bouncedUntil ?? 0)) {
        slide(enemy.dir, enemy.heading, (ROBOT_SPEED * dt) / enemy.planet.radius);
      }
      if (enemy.kind === 'alien' && p.planet === enemy.planet && this.now > (enemy.bouncedUntil ?? 0)) {
        // Aliens run after you
        this.turnToward(enemy, this.upAt(enemy.planet, p.pos), dt * 3);
        slide(enemy.dir, enemy.heading, ((enemy.inShip ? SHIP_ALIEN_SPEED : ALIEN_SPEED) * dt) / enemy.planet.radius);
      }
      if (enemy.kind === 'sunglasses') enemy.altitude = 0.25 + 0.25 * Math.sin(this.now / 400 + enemy.phase);

      // Face SuperCapybara when he's on the same planet
      const sameplanet = p.planet === enemy.planet;
      const position = this.enemyPosition(enemy);
      const toPlayer = body.clone().sub(position);
      const facing = sameplanet ? toPlayer.clone() : enemy.heading.clone();
      enemy.mesh.position.copy(this.pointOn(enemy.planet, enemy.dir, enemy.altitude));
      orient(enemy.mesh, enemy.dir, facing.lengthSq() > 0 ? facing : enemy.heading);

      // Touching
      if (toPlayer.length() < 1.1 && !this.won) {
        const falling = p.vel.dot(this.upAt(p.planet, p.pos)) < 0;
        if (falling && !p.onGround && p.pos.distanceTo(enemy.planet.center) > position.distanceTo(enemy.planet.center)) {
          this.defeat(enemy);
          this.stompBounce();
        } else if (this.character.fireAura || this.mecha || this.rainbow) {
          this.defeat(enemy);
        } else if (!this.invisible) {
          this.hurt(position);
        }
        continue;
      }

      // Shield bubble bounces bad guys away
      if (this.shielded && this.shieldIsBubble && toPlayer.length() < 2.2) {
        const away = toPlayer.clone().negate();
        away.addScaledVector(enemy.dir, -away.dot(enemy.dir)).normalize();
        slide(enemy.dir, away, 1.5 / enemy.planet.radius);
        enemy.heading = anyTangent(enemy.dir);
        enemy.bouncedUntil = this.now + 300;
        audio.play('bounce');
      }

      // Shooting
      if (enemy.kind === 'sunglasses' || !sameplanet || this.invisible) continue;
      if (toPlayer.length() > seeDistance) continue;
      if (!enemy.nextShotAt) enemy.nextShotAt = this.now + this.settings.enemyFirstShotMs;
      if (this.now < enemy.nextShotAt) continue;
      enemy.nextShotAt = this.now + enemy.shotEveryMs * this.settings.enemyShotSlowdown;
      const directions = enemy.kind === 'apple' ? [toPlayer, toPlayer.clone().negate()] : [toPlayer];
      const color = enemy.kind === 'alien' ? 0x76ff03 : 0xffa000; // aliens shoot green ray-gun zaps
      for (const dir of directions) this.enemyShoot(enemy.planet, position, dir, shotSpeed, color);
    }
  }

  enemyShoot(planet, start, dir, speed, color = 0xffa000) {
    audio.play('enemyShot');
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color }));
    this.addShot({ mesh, planet, start: start.clone().addScaledVector(dir.clone().normalize(), 0.6), dir, speed, life: 4, fromPlayer: false });
  }

  // damage only matters for bad guys with more than 1 hit (flying saucers).
  defeat(enemy, damage = 1) {
    if (!enemy.alive) return;
    if (enemy.hp > damage) {
      enemy.hp -= damage;
      audio.play('bossHit');
      this.pop(this.enemyPosition(enemy), 0xffffff, 0.6);
      return;
    }
    enemy.alive = false;
    if (enemy.kind === 'saucer') this.saucerDown(enemy);
    // A frozen bad guy shatters, for double bolts
    audio.play(enemy.ice ? 'shatter' : 'pop');
    this.addBolts(enemy.ice ? BAD_GUY_REWARD * 2 : BAD_GUY_REWARD);
    this.scene.remove(enemy.mesh);
    this.pop(this.enemyPosition(enemy), 0xffffff);
  }

  stompBounce() {
    const up = this.upAt(this.player.planet, this.player.pos);
    const radial = this.player.vel.dot(up);
    this.player.vel.addScaledVector(up, JUMP_SPEED * 0.7 - radial);
    this.player.safeUntil = Math.max(this.player.safeUntil, this.now + 250);
    audio.play('stomp');
    this.landedHit();
  }

  // ---------- Getting hurt ----------

  hurt(fromPos) {
    const p = this.player;
    if (this.won || this.invisible || this.shadow || this.mecha || this.rainbow || this.sliding || this.now < p.safeUntil) return;
    audio.play('hurt');
    if (!this.loseHeart()) return;
    const up = this.upAt(p.planet, p.pos);
    const away = p.pos.clone().sub(fromPos);
    away.addScaledVector(up, -away.dot(up));
    if (away.lengthSq() > 0) away.normalize();
    p.vel.copy(away).multiplyScalar(3).addScaledVector(up, 5);
    p.onGround = false;
    p.hurtAt = this.now;
    p.safeUntil = this.now + this.settings.hurtSafeMs;
  }

  // Returns false if that was the last heart (then you start again at the checkpoint).
  loseHeart() {
    const p = this.player;
    p.hearts -= 1;
    if (p.hearts > 0) {
      this.hud.setHearts(p.hearts);
      return true;
    }
    p.hearts = this.settings.hearts;
    this.hud.setHearts(p.hearts);
    this.respawn();
    return false;
  }

  respawn() {
    const p = this.player;
    if (this.beam) this.endBeam(false);
    if (this.inShip) this.clearShip();
    const planet = p.checkpoint;
    p.planet = planet;
    p.pos.copy(this.pointOn(planet, planet.spawn, 0));
    p.vel.set(0, 0, 0);
    p.onGround = true;
    p.forward.copy(planet.jumpDir ?? anyTangent(planet.spawn));
    p.safeUntil = this.now + this.settings.hurtSafeMs;
    p.flyUntil = 0;
    this.landedAt = this.now;
  }

  // ---------- Flying saucers and the alien spaceship ----------

  // Turns a bad guy's heading toward a spot on its planet (given as a direction from the planet's center).
  turnToward(enemy, targetDir, amount) {
    const toward = targetDir.clone().addScaledVector(enemy.dir, -targetDir.dot(enemy.dir));
    if (toward.lengthSq() < 1e-6) return;
    enemy.heading.lerp(toward.normalize(), Math.min(1, amount));
    enemy.heading.addScaledVector(enemy.dir, -enemy.heading.dot(enemy.dir)).normalize();
  }

  // A saucer flies after you. Right above you, it switches on its tractor beam.
  updateSaucer(saucer, dt) {
    const p = this.player;
    saucer.lights.forEach((light, i) => light.material.emissive.setHex(Math.floor(this.now / 150 + i) % 2 ? 0xffeb3b : 0x000000));
    if (saucer.ice) {
      saucer.ice.position.copy(this.enemyPosition(saucer));
      return;
    }
    const position = this.enemyPosition(saucer);
    if (this.beam?.saucer !== saucer) {
      const hunting = p.planet === saucer.planet && !this.invisible && !this.inShip && !this.megaBeam.active(); // no grabbing during the MEGA BEAM
      const playerDir = this.upAt(saucer.planet, p.pos);
      const distance = saucer.dir.angleTo(playerDir) * saucer.planet.radius;
      if (hunting) this.turnToward(saucer, playerDir, dt * 2);
      if (!hunting || distance > 0.4) slide(saucer.dir, saucer.heading, (SAUCER_SPEED * dt) / (saucer.planet.radius + SAUCER_ALTITUDE));
      const settled = this.now > (this.landedAt ?? 0) + SAUCER_GRACE_MS;
      if (hunting && settled && distance < BEAM_RANGE && p.onGround && this.now > saucer.readyAt) this.startBeam(saucer);
    }
    saucer.mesh.position.copy(this.pointOn(saucer.planet, saucer.dir, saucer.altitude + 0.15 * Math.sin(this.now / 400 + saucer.phase)));
    orient(saucer.mesh, saucer.dir, saucer.heading);

    // Jump on it from above to knock it
    const toPlayer = this.playerBody().sub(position);
    const falling = p.vel.dot(this.upAt(p.planet, p.pos)) < 0;
    if (!this.beam && toPlayer.length() < 1.7 && falling && toPlayer.dot(saucer.dir) > 0.3) {
      this.defeat(saucer);
      this.stompBounce();
    }
  }

  // Knocked down: the saucer breaks, and the alien jumps out to fight you on foot.
  saucerDown(saucer) {
    if (this.beam?.saucer === saucer) this.endBeam(false);
    audio.play('explosion');
    this.pop(this.enemyPosition(saucer), 0xb0bec5, 2);
    this.addAlien(saucer.planet, saucer.dir.clone());
  }

  addAlien(planet, dir, extra = {}) {
    const mesh = models.makeAlien();
    this.scene.add(mesh);
    this.enemies.push({ kind: 'alien', planet, dir, heading: anyTangent(dir), altitude: 0, mesh, alive: true, nextShotAt: 0, shotEveryMs: 1800, phase: 0, ...extra });
  }

  startBeam(saucer) {
    this.beam = { saucer, startedAt: this.now, wiggles: 0, lastSide: 0, mesh: models.makeTractorBeam() };
    this.scene.add(this.beam.mesh);
    audio.play('fly');
    this.hud.message('', t('game.wiggle'), 2500);
  }

  // In the beam: you float up toward the saucer. Press left and right, left and right... to wiggle free!
  updateBeam(dt) {
    const beam = this.beam;
    const saucer = beam.saucer;
    const p = this.player;
    if (!saucer.alive || saucer.ice) {
      this.endBeam(true);
      return;
    }
    const side = this.pressed('ArrowLeft', 'KeyA') ? -1 : this.pressed('ArrowRight', 'KeyD') ? 1 : 0;
    if (side && side !== beam.lastSide) {
      beam.wiggles += 1;
      beam.lastSide = side;
      audio.play('click');
    }
    if (beam.wiggles >= WIGGLES_TO_ESCAPE) {
      this.endBeam(true);
      return;
    }
    const k = (this.now - beam.startedAt) / BEAM_MS;
    const up = saucer.dir;
    p.planet = saucer.planet;
    p.pos.copy(this.pointOn(saucer.planet, up, Math.min(1, k) * (SAUCER_ALTITUDE - 1.2)));
    p.vel.set(0, 0, 0);
    p.onGround = false;
    p.forward.applyAxisAngle(up, dt * 4).addScaledVector(up, -p.forward.dot(up)).normalize(); // spinning around
    p.model.position.copy(p.pos);
    orient(p.model, up, p.forward);
    if (this.aura) this.aura.position.copy(this.playerBody());
    beam.mesh.position.copy(this.pointOn(saucer.planet, up, saucer.altitude));
    beam.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    beam.mesh.scale.set(1, saucer.altitude, 1);
    if (k >= 1) this.enterShip();
  }

  endBeam(escaped) {
    const beam = this.beam;
    this.scene.remove(beam.mesh);
    this.beam = null;
    beam.saucer.readyAt = this.now + SAUCER_REST_MS;
    if (!escaped) return;
    audio.play('bounce');
    this.hud.message('', t('game.escaped'), 1500);
    this.player.safeUntil = this.now + 1000;
  }

  // Pulled inside the spaceship: it's full of aliens!
  enterShip() {
    const saucer = this.beam.saucer;
    this.endBeam(false);
    saucer.readyAt = this.now + SAUCER_REST_MS * 2;
    this.shipReturn = { planet: saucer.planet, dir: saucer.dir.clone() };
    this.inShip = true;
    const p = this.player;
    const ship = this.shipPlanet;
    p.planet = ship;
    p.pos.copy(this.pointOn(ship, ship.spawn, 0));
    p.vel.set(0, 0, 0);
    p.onGround = true;
    p.forward.copy(anyTangent(ship.spawn));
    p.safeUntil = this.now + this.settings.hurtSafeMs * 2;
    this.landedAt = this.now;
    this.camera.position.copy(p.pos).addScaledVector(ship.spawn, 3.5).addScaledVector(p.forward, -7);
    for (const dir of SHIP.aliens) this.addAlien(ship, vec(dir).normalize(), { inShip: true });
    audio.play('blastOff');
    this.hud.message(t('game.abducted'), t('game.beatAliens'), 3000);
  }

  // Beat all the aliens and the big red button shows up. Press it (walk onto it) to drop back down.
  updateShip() {
    if (!this.inShip) return;
    const aliensLeft = this.enemies.some((e) => e.inShip && e.alive);
    if (!aliensLeft && !this.redButton) {
      const dir = vec(SHIP.button).normalize();
      this.redButton = models.makeRedButton();
      this.redButton.position.copy(this.pointOn(this.shipPlanet, dir, 0));
      orient(this.redButton, dir, anyTangent(dir));
      this.scene.add(this.redButton);
      audio.play('crystal');
      this.hud.message('', t('game.pressButton'), 3000);
    }
    if (this.redButton && this.redButton.position.distanceTo(this.player.pos) < 1.3) this.leaveShip();
  }

  clearShip() {
    for (const enemy of this.enemies.filter((e) => e.inShip)) {
      enemy.alive = false;
      this.scene.remove(enemy.mesh);
      if (enemy.ice) this.scene.remove(enemy.ice);
    }
    this.enemies = this.enemies.filter((e) => !e.inShip);
    if (this.redButton) this.scene.remove(this.redButton);
    this.redButton = null;
    this.inShip = false;
  }

  // You pressed the button: back down to the planet, with an alien baby for Cube Islands!
  leaveShip() {
    this.clearShip();
    const p = this.player;
    const { planet, dir } = this.shipReturn;
    p.planet = planet;
    p.pos.copy(this.pointOn(planet, dir, 0));
    p.vel.set(0, 0, 0);
    p.onGround = true;
    p.safeUntil = this.now + this.settings.hurtSafeMs;
    this.landedAt = this.now;
    this.camera.position.copy(p.pos).addScaledVector(dir, 3.5).addScaledVector(p.forward, -7);
    addBaby(this.save, 'alien', 'alien');
    audio.play('key');
    this.pop(this.playerBody(), 0x76ff03, 2);
    this.hud.message(t('game.alienBaby'), t('game.alienBabySub'), 4000);
  }

  // ---------- Bolts, crystals and the key ----------

  updatePickups(dt) {
    const body = this.playerBody();
    for (const bolt of this.bolts) {
      if (bolt.taken) continue;
      bolt.mesh.rotateY(dt * 3);
      if (bolt.mesh.position.distanceTo(body) < 1.1) {
        bolt.taken = true;
        this.scene.remove(bolt.mesh);
        this.addBolts(10);
        audio.play('bolt');
      }
    }

    for (const crystal of this.crystals) {
      if (crystal.taken) continue;
      crystal.mesh.rotateY(dt * 2);
      if (crystal.mesh.position.distanceTo(body) < 1.5) {
        crystal.taken = true;
        this.scene.remove(crystal.mesh);
        this.crystalsFound += 1;
        this.hud.setCrystals(this.crystalsFound);
        audio.play('crystal');
        this.pop(crystal.mesh.position, 0x00e5ff);
        if (this.crystalsFound === this.crystals.length) this.lowerForceField();
      }
    }

    if (this.forceField.visible) {
      const fade = this.fieldDown ? Math.max(0, this.forceField.material.opacity - dt * 0.2) : 0.15 + 0.05 * Math.sin(this.now / 300);
      this.forceField.material.opacity = fade;
      if (fade === 0) this.forceField.visible = false;
    }

    if (this.key) {
      this.key.rotateY(dt * 2);
      if (this.key.position.distanceTo(body) < 1.6) {
        this.scene.remove(this.key);
        this.key = null;
        this.win();
      }
    }
  }

  // Twice as much with the Double power-up.
  addBolts(amount) {
    this.save.bolts += amount * (this.powerUps.includes('double') ? 2 : 1);
    writeSave(this.save);
    this.hud.setBolts(this.save.bolts);
  }

  lowerForceField() {
    this.fieldDown = true;
    audio.play('forceField');
    this.hud.message('', t('game.forceFieldDown'), 4000);
  }

  // ---------- Grape Boss ----------

  bossIsHittable() {
    return this.boss && this.boss.state !== 'arriving' && this.boss.state !== 'defeated';
  }

  bossCenter() {
    return this.boss.mesh.position.clone().addScaledVector(this.boss.up, BOSS_HEIGHT / 2);
  }

  startBoss() {
    this.bossStarted = true;
    this.player.checkpoint = this.bossPlanet;
    audio.playMusic('boss');
    this.hud.message(`${t('game.grapeBoss')}!`, '', 2000);
    const mesh = models.makeGrapeBoss();
    this.scene.add(mesh);
    const dir = this.player.planet === this.bossPlanet ? this.upAt(this.bossPlanet, this.player.pos).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.6).normalize() : this.bossPlanet.spawn.clone();
    this.boss = {
      mesh,
      hp: this.settings.bossHp,
      planet: this.bossPlanet,
      dir,
      up: dir.clone(),
      state: 'arriving',
      startedAt: this.now,
      nextActionAt: this.now + 2500,
      wave: null,
    };
    this.hud.showBoss(1);
  }

  updateBoss(dt) {
    const boss = this.boss;
    if (!boss || boss.state === 'defeated') return;
    const ground = this.pointOn(boss.planet, boss.dir, 0);

    if (boss.state === 'arriving') {
      // Drops down from space onto the planet
      const k = Math.min(1, (this.now - boss.startedAt) / 1500);
      boss.up.copy(boss.dir);
      boss.mesh.position.copy(ground).addScaledVector(boss.dir, (1 - k) * 25);
      if (k === 1) {
        boss.state = 'standing';
        audio.play('bossRoar');
        this.groundPound();
      }
    } else if (boss.state === 'jumping') {
      const jump = boss.jump;
      const k = Math.min(1, (this.now - jump.startedAt) / jump.duration);
      boss.up.copy(jump.fromUp).lerp(jump.toUp, k).normalize();
      boss.mesh.position.copy(jump.from).lerp(jump.to, k).addScaledVector(boss.up, Math.sin(Math.PI * k) * BOSS_JUMP_HEIGHT);
      jump.marker.rotation.z += dt * 3;
      if (k === 1) {
        this.scene.remove(jump.marker);
        boss.planet = jump.planet;
        boss.dir.copy(jump.dir);
        boss.up.copy(jump.dir);
        boss.state = 'standing';
        this.groundPound();
      }
    } else {
      boss.mesh.position.copy(ground);
      boss.up.copy(boss.dir);
      if (this.now >= boss.nextActionAt) {
        if (this.frozen) boss.nextActionAt = this.now + 1500; // slowed down by the Freeze Ray
        else this.bossJump();
      }
    }

    // Face SuperCapybara
    const toPlayer = this.player.pos.clone().sub(boss.mesh.position);
    toPlayer.addScaledVector(boss.up, -toPlayer.dot(boss.up));
    orient(boss.mesh, boss.up, toPlayer.lengthSq() > 0.01 ? toPlayer : anyTangent(boss.up));

    this.updateWave();

    // Touching Grape Boss
    const p = this.player;
    const body = this.playerBody();
    if (boss.state === 'arriving') return;
    const top = boss.mesh.position.clone().addScaledVector(boss.up, BOSS_HEIGHT);
    const falling = p.vel.dot(this.upAt(p.planet, p.pos)) < 0 && !p.onGround;
    if (falling && p.pos.distanceTo(top) < 1.8) {
      this.hitBoss(1);
      this.stompBounce();
    } else if (body.distanceTo(this.bossCenter()) < 2.3) {
      if (this.character.fireAura || this.mecha || this.rainbow) {
        if (this.now > (boss.burnReadyAt ?? 0)) {
          boss.burnReadyAt = this.now + 300;
          this.hitBoss(1);
        }
      } else {
        this.hurt(boss.mesh.position);
      }
    }
  }

  // Grape Boss jumps at you: to the planet you're on, landing where you are. A red ring shows where he'll land.
  bossJump() {
    const boss = this.boss;
    const p = this.player;
    const bossPlanets = this.planets.filter((planet) => planet.boss);
    const chasing = p.planet.boss && (p.onGround || this.nearestPlanet(p.pos).altitude < 4);
    const planet = chasing ? p.planet : bossPlanets.filter((x) => x !== boss.planet)[Math.floor(Math.random() * 2)];
    const dir = chasing ? this.upAt(planet, p.pos) : planet.spawn.clone();

    const marker = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
    marker.position.copy(this.pointOn(planet, dir, 0.08));
    marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.scene.add(marker);

    const slowness = this.settings.bossActionMs / 1800;
    boss.state = 'jumping';
    boss.jump = {
      from: boss.mesh.position.clone(),
      fromUp: boss.up.clone(),
      to: this.pointOn(planet, dir, 0),
      toUp: dir.clone(),
      planet,
      dir: dir.clone(),
      marker,
      startedAt: this.now,
      duration: 1800 * slowness,
    };
    boss.nextActionAt = this.now + boss.jump.duration + this.settings.bossActionMs * 1.4;
  }

  // Lands with a BOOM: a wave spreads out across the planet. Jump over it!
  groundPound() {
    const boss = this.boss;
    audio.play('pound');
    this.shakeUntil = this.now + 600;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 6, 40), new THREE.MeshBasicMaterial({ color: 0xff9100 }));
    this.scene.add(ring);
    if (boss.wave) this.scene.remove(boss.wave.ring);
    boss.wave = { planet: boss.planet, dir: boss.dir.clone(), startedAt: this.now, ring };

    // Landing right on you hurts
    if (this.player.planet === boss.planet && this.playerBody().distanceTo(this.pointOn(boss.planet, boss.dir, 1)) < 2.5) {
      this.hurt(boss.mesh.position);
    }
  }

  updateWave() {
    const wave = this.boss.wave;
    if (!wave) return;
    const angle = ((this.now - wave.startedAt) / 1000) * WAVE_SPEED;
    if (angle > Math.PI) {
      this.scene.remove(wave.ring);
      this.boss.wave = null;
      return;
    }
    const { planet, dir } = wave;
    wave.ring.position.copy(planet.center).addScaledVector(dir, (planet.radius + 0.15) * Math.cos(angle));
    wave.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    wave.ring.scale.setScalar(Math.max(0.01, (planet.radius + 0.15) * Math.sin(angle)));

    const p = this.player;
    if (p.planet === planet && p.onGround) {
      const playerAngle = this.upAt(planet, p.pos).angleTo(dir);
      if (Math.abs(playerAngle - angle) < WAVE_WIDTH) this.hurt(p.pos.clone().sub(this.upAt(planet, p.pos)));
    }
  }

  hitBoss(amount) {
    const boss = this.boss;
    if (!this.bossIsHittable()) return;
    boss.hp = Math.max(0, boss.hp - amount);
    this.hud.showBoss(boss.hp / this.settings.bossHp);
    audio.play('bossHit');
    boss.mesh.scale.setScalar(1.12);
    setTimeout(() => boss.mesh.scale.setScalar(1), 80);
    if (boss.hp === 0) this.defeatBoss();
  }

  defeatBoss() {
    const boss = this.boss;
    boss.state = 'defeated';
    this.megaBeam.stop();
    if (boss.jump?.marker) this.scene.remove(boss.jump.marker);
    if (boss.wave) this.scene.remove(boss.wave.ring);
    audio.stopMusic();
    audio.play('explosion');
    this.addBolts(BOSS_REWARD);
    this.shakeUntil = this.now + 900;
    const center = this.bossCenter();
    for (let i = 0; i < 6; i++) this.pop(center.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(1.5)), 0x9c27b0, 2.5);
    this.scene.remove(boss.mesh);
    for (const shot of this.shots.filter((s) => !s.fromPlayer)) shot.life = 0;

    // Grape Boss's revenge: one last sticky grape flies off into space (it hits your rocket later!)
    const grape = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), new THREE.MeshStandardMaterial({ color: 0x8e24aa, emissive: 0x4a148c }));
    const from = center.clone();
    this.addEffect(grape, 1.6, (m, k) => m.position.copy(from).addScaledVector(boss.dir, k * k * 60));
    this.hud.message('', t('game.grapeRevenge'), 3500);

    // Win dance, then the key shows up
    this.startDance(() => {
      this.key = models.makeKey();
      this.key.position.copy(this.pointOn(boss.planet, boss.dir, 1.6));
      orient(this.key, boss.dir, anyTangent(boss.dir));
      this.scene.add(this.key);
    });
  }

  // ---------- Baby Capybara's tips (see tips.js) ----------

  checkTips() {
    if (!this.save.tips || this.won || this.danceState || this.beam) return;
    const p = this.player;
    if (!p.onGround) return;
    const body = this.playerBody();
    // Only things you can see on the screen
    const near = (list, distance) => list.find((pos) => pos.distanceTo(body) < distance && this.onScreen(pos));
    // First how planets work (after the "WORLD 2" message), then the rest
    if (tipWanted(this.save, 'planet')) {
      if (this.now - this.startedAt > 8500) this.showTip('planet', body);
      return;
    }
    let spot = near((this.rings ?? []).map((ring) => ring.position), 7);
    if (spot) this.showTip('ring', spot);
    spot = near(this.crystals.filter((c) => !c.taken).map((c) => c.mesh.position), 9);
    if (spot) this.showTip('crystal', spot);
    spot = near(this.enemies.filter((e) => e.alive && e.kind === 'saucer').map((e) => e.mesh.position), 14);
    if (spot) this.showTip('saucer', spot);
    if (this.boss && this.boss.state !== 'arriving' && this.boss.state !== 'defeated' && this.onScreen(this.bossCenter())) this.showTip('boss2', this.bossCenter());
  }

  // Freezes the game. Baby Capybara (a mini SuperCapybara) flies over, floats next to `target`, points at it,
  // and an HTML comic bubble shows the tip above him.
  showTip(id, target) {
    if (this.tip || !tipWanted(this.save, id)) return;
    markTipSeen(this.save, id);
    const up = this.upAt(this.nearestPlanet(target).planet, target);
    const toCamera = this.camera.position.clone().sub(target);
    const right = new THREE.Vector3().crossVectors(up, toCamera).normalize();
    const spot = target.clone().addScaledVector(up, 1.2).addScaledVector(right, 1.8).addScaledVector(toCamera.normalize(), 0.8);
    const { group } = models.makeHero('supa-capybara');
    group.scale.setScalar(0.45);
    orient(group, up, target.clone().sub(spot));
    this.scene.add(group);

    const bubble = document.createElement('div');
    bubble.style.cssText =
      'position:absolute;transform:translate(-50%,-100%);max-width:320px;padding:12px 18px;background:#fff;border:4px solid #000;border-radius:18px;' +
      'font:19px "Comic Sans MS","Chalkboard SE",Arial,sans-serif;color:#000;text-align:center;pointer-events:none;z-index:20;visibility:hidden;';
    bubble.innerHTML = '<div></div><div style="font:bold 13px Arial,sans-serif;color:#666;margin-top:6px"></div>' +
      '<div style="position:absolute;left:50%;bottom:-14px;width:20px;height:20px;margin-left:-10px;background:#fff;border-right:4px solid #000;border-bottom:4px solid #000;transform:rotate(45deg)"></div>';
    bubble.children[0].textContent = tipText(this.save, id);
    bubble.children[1].textContent = t('tip.gotIt');
    const finger = document.createElement('div');
    finger.textContent = '👉';
    finger.style.cssText = 'position:absolute;transform:translate(-50%,-50%);font-size:30px;pointer-events:none;z-index:20;visibility:hidden;';
    this.container.append(bubble, finger);
    this.tip = { id, group, up, spot, target: target.clone(), bubble, finger, age: 0, shownAt: Infinity };
    audio.play('fly');
  }

  onScreen(pos) {
    const v = pos.clone().project(this.camera);
    return v.z < 1 && Math.abs(v.x) < 0.8 && Math.abs(v.y) < 0.8;
  }

  // Where a 3D point is on the screen, in pixels of the container.
  toScreen(pos) {
    const v = pos.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * this.container.clientWidth, y: ((1 - v.y) / 2) * this.container.clientHeight };
  }

  updateTip(dt) {
    const tip = this.tip;
    tip.age += dt;
    const k = Math.min(1, tip.age / 0.55);
    tip.group.position.copy(tip.spot).addScaledVector(tip.up, 8 * (1 - k) * (1 - k));
    if (k < 1) return;
    if (tip.shownAt === Infinity) {
      tip.shownAt = performance.now();
      tip.bubble.style.visibility = tip.finger.style.visibility = 'visible';
      audio.play('click');
    }
    tip.group.position.addScaledVector(tip.up, Math.sin(tip.age * 4) * 0.1); // floating
    const head = this.toScreen(tip.spot.clone().addScaledVector(tip.up, 0.9));
    tip.bubble.style.left = `${Math.min(Math.max(head.x, 170), this.container.clientWidth - 170)}px`;
    tip.bubble.style.top = `${Math.min(Math.max(head.y - 20, tip.bubble.offsetHeight + 10), this.container.clientHeight - 30)}px`;
    const from = this.toScreen(tip.spot);
    const to = this.toScreen(tip.target);
    tip.finger.style.left = `${from.x + (to.x - from.x) * 0.45}px`;
    tip.finger.style.top = `${from.y + (to.y - from.y) * 0.45}px`;
    tip.finger.style.transform = `translate(-50%,-50%) scaleX(${to.x < from.x ? -1 : 1})`;

    if (performance.now() - tip.shownAt < TIP_MIN_MS) return;
    if (!this.pressed('Space', 'Enter', 'KeyX')) return;
    tip.bubble.remove();
    tip.finger.remove();
    this.tip = null;
    this.player.safeUntil = Math.max(this.player.safeUntil, this.now + 800);
    // Bye-bye! He flies away
    const start = tip.group.position.clone();
    this.addEffect(tip.group, 0.7, (m, j) => m.position.copy(start).addScaledVector(tip.up, j * j * 12));
  }

  // ---------- Win dance (see DANCES in characters.js) ----------

  // Once you're standing on the ground, your hero dances, then `done` runs. No dance bought = `done` right away.
  startDance(done) {
    const id = pickDance(this.save, this.character.id);
    if (!id) return done();
    this.pendingDance = { id, done };
  }

  // Waits for the hero to land (the normal loop keeps running until then), then dances in place, facing the camera.
  updateDance() {
    const p = this.player;
    const d = this.danceState;
    const k = Math.min(1, (this.now - d.start) / d.ms);
    const up = this.upAt(p.planet, p.pos);
    p.model.position.copy(p.pos);
    orient(p.model, up, p.forward.clone().negate());
    p.legs.forEach((leg) => (leg.rotation.x = 0));
    if (d.id === 'wiggle') {
      p.model.rotateY(Math.sin(k * Math.PI * 14) * 0.5);
      p.model.rotateZ(Math.sin(k * Math.PI * 18) * 0.2);
    } else if (d.id === 'bunny') {
      const hop = Math.floor(k * 3);
      if (hop !== d.hop && hop < 3) {
        d.hop = hop;
        audio.play('jump');
      }
      p.model.position.addScaledVector(up, Math.abs(Math.sin(k * Math.PI * 3)) * 1.1);
      p.model.rotateY(hop % 2 ? 0.6 : -0.6);
    } else {
      // Backflip: go up, spin all the way around (around the middle of the body), come down
      p.model.position.addScaledVector(up, Math.sin(k * Math.PI) * 2.4);
      p.model.translateY(0.6);
      p.model.rotateX(-Math.PI * 2 * (k < 0.15 ? 0 : k > 0.85 ? 1 : (k - 0.15) / 0.7));
      p.model.translateY(-0.6);
    }
    if (this.aura) this.aura.position.copy(this.playerBody());
    if (k >= 1) {
      this.danceState = null;
      orient(p.model, up, p.forward);
      d.done();
    }
  }

  win() {
    this.won = true;
    audio.play('key');
    setTimeout(() => audio.play('win'), 400);
    if (!this.save.keys.includes('world2')) this.save.keys.push('world2');
    writeSave(this.save);
    this.hud.message(t('game.gotKey'), t('game.world2Done'), 0);
    this.exitTimer = setTimeout(() => this.startTrip(), 2500);
  }

  // ---------- Off to the volcano: the rocket picks you up, and Grape Boss's sticky grape SPLATs it ----------

  startTrip() {
    const p = this.player;
    const up = this.upAt(p.planet, p.pos);
    const side = new THREE.Vector3().crossVectors(up, p.forward).normalize();
    const landDir = up.clone().applyAxisAngle(side, -3 / p.planet.radius); // a few steps in front of you
    const land = this.pointOn(p.planet, landDir, 0);
    if (this.parkedRocket) this.scene.remove(this.parkedRocket);
    const rocket = models.makeRocket();
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 12), new THREE.MeshBasicMaterial({ color: 0xff7043 }));
    flame.rotation.x = Math.PI; // pointing down
    flame.position.y = -0.6;
    rocket.add(flame);
    orient(rocket, landDir, p.forward);
    this.scene.add(rocket);
    this.hud.message('', t('game.rocketComing'), 4000);
    audio.play('rocket');
    // The camera backs off to the side so you can watch the whole thing
    const camera = land.clone().addScaledVector(p.forward, -12).addScaledVector(side, 9).addScaledVector(landDir, 5);
    this.trip = { start: this.now, rocket, flame, land, up: landDir, camera, heroFrom: p.model.position.clone(), beeps: 0, splatted: false };
    // A black curtain for the fade at the end
    this.curtain = document.createElement('div');
    this.curtain.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity 0.8s;';
    this.container.appendChild(this.curtain);
  }

  updateTrip(dt) {
    const trip = this.trip;
    const { rocket, flame, land, up } = trip;
    const p = this.player;
    const time = (this.now - trip.start) / 1000;
    const ease = (k) => 1 - (1 - k) * (1 - k);

    if (time < 2) {
      // Fly down from the sky and land
      rocket.position.copy(land).addScaledVector(up, 30 * (1 - ease(time / 2)));
      flame.scale.setScalar(0.8 + Math.random() * 0.4);
    } else if (time < 2.8) {
      // Hop in (the hero shrinks into the door)
      rocket.position.copy(land);
      flame.visible = false;
      const k = (time - 2) / 0.8;
      p.model.position.lerpVectors(trip.heroFrom, land.clone().addScaledVector(up, 1.5), k);
      p.model.scale.setScalar(Math.max(0.01, 1 - k));
      if (this.aura) this.aura.visible = false;
    } else if (time < 4.4) {
      p.model.visible = false;
      const beep = Math.floor((time - 2.8) / 0.5);
      if (beep > trip.beeps - 1 && beep < 3) {
        trip.beeps = beep + 1;
        audio.play('countdown');
      }
    } else {
      // Blast off!
      if (!trip.blasted) {
        trip.blasted = true;
        audio.play('blastOff');
        this.shakeUntil = this.now + 1500;
      }
      const flying = time - 4.4;
      flame.visible = true;
      flame.scale.setScalar(1.3 + Math.random() * 0.5);
      rocket.position.copy(land).addScaledVector(up, 3 * flying * flying);
      if (flying > 1.1 && !trip.grape) {
        // Here comes the sticky grape from Grape Boss's revenge...
        trip.grape = true;
        const grape = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), new THREE.MeshStandardMaterial({ color: 0x8e24aa, emissive: 0x4a148c }));
        const from = rocket.position.clone().addScaledVector(this.camera.position.clone().sub(rocket.position).cross(up).normalize(), 25);
        this.addEffect(grape, 0.5, (m, k) => m.position.lerpVectors(from, rocket.position.clone().addScaledVector(up, 1.5), k));
      }
      if (flying > 1.6 && !trip.splatted) {
        // SPLAT! The sticky grape comes back and hits the engine
        trip.splatted = true;
        audio.play('splat');
        this.pop(rocket.position.clone(), 0x8e24aa, 3);
        const goo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshStandardMaterial({ color: 0x8e24aa, emissive: 0x4a148c }));
        goo.position.set(0.7, 0.8, 0);
        goo.scale.set(0.6, 1, 1);
        rocket.add(goo);
        this.hud.message(t('game.splat'), '', 2000);
      }
      if (trip.splatted) {
        // Smoke, and the rocket wobbles
        rocket.rotateZ(Math.sin(this.now / 90) * 0.04);
        if (Math.random() < dt * 25) this.pop(rocket.position.clone().addScaledVector(up, -0.5), 0x616161, 1.2);
      }
      if (flying > 3.2 && !trip.fading) {
        trip.fading = true;
        this.curtain.style.opacity = '1';
      }
      if (flying > 4.2) {
        this.exit('World3');
        return;
      }
    }

    // The camera watches the rocket (and rises a bit to follow it)
    const lift = Math.max(0, rocket.position.distanceTo(land) - (time < 2 ? 30 : 0)) * 0.6;
    const smooth = 1 - Math.exp(-dt * 3);
    this.camera.position.lerp(trip.camera.clone().addScaledVector(up, lift), smooth);
    this.camera.up.lerp(up, smooth).normalize();
    const look = rocket.position.clone().addScaledVector(up, 2);
    if (this.now < (this.shakeUntil ?? 0)) look.add(new THREE.Vector3().randomDirection().multiplyScalar(0.25));
    this.camera.lookAt(look);
  }


  // Freeze Ray (Z): every bad guy freezes inside an ice cube for 5 seconds; the boss only slows down.
  useFreezeRay(enemies) {
    if (this.now < (this.freezeUntil ?? 0) || this.now < (this.freezeReadyAt ?? 0)) return;
    this.freezeUntil = this.now + 5000;
    audio.play('freeze');
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.ice) continue;
      enemy.ice = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.8, 1.6),
        new THREE.MeshBasicMaterial({ color: 0x80d8ff, transparent: true, opacity: 0.45, depthWrite: false }),
      );
      this.scene.add(enemy.ice);
    }
  }

  get frozen() {
    return this.now < (this.freezeUntil ?? 0);
  }

  // When the freeze ends (or a frozen bad guy is beaten), the ice goes away.
  meltIce(enemies) {
    for (const enemy of enemies) {
      if (enemy.ice && (!this.frozen || !enemy.alive)) {
        this.scene.remove(enemy.ice);
        enemy.ice = null;
      }
    }
    if (this.freezeUntil && !this.frozen) {
      this.freezeUntil = 0;
      this.freezeReadyAt = this.now + 30000;
    }
  }

  // ---------- Effects and camera ----------

  // A puff that grows and fades.
  pop(position, color, size = 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5 * size, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true }));
    mesh.position.copy(position);
    this.addEffect(mesh, 0.35, (m, k) => {
      m.scale.setScalar(1 + k * 2);
      m.material.opacity = 1 - k;
    });
  }

  addEffect(mesh, seconds, update) {
    this.scene.add(mesh);
    this.effects.push({ mesh, seconds, age: 0, update });
  }

  updateEffects(dt) {
    for (const effect of this.effects) {
      effect.age += dt;
      effect.update(effect.mesh, Math.min(1, effect.age / effect.seconds));
      if (effect.age >= effect.seconds) this.scene.remove(effect.mesh);
    }
    this.effects = this.effects.filter((e) => e.age < e.seconds);
  }

  updateCamera(dt) {
    const p = this.player;
    const up = this.upAt(p.planet, p.pos);
    const wanted = p.pos.clone().addScaledVector(p.forward, -7).addScaledVector(up, 3.5);
    const smooth = 1 - Math.exp(-dt * 5);
    this.camera.position.lerp(wanted, smooth);
    this.camera.up.lerp(up, smooth).normalize();
    const lookAt = p.pos.clone().addScaledVector(up, 1.2).addScaledVector(p.forward, 2);
    if (this.now < (this.shakeUntil ?? 0)) lookAt.add(new THREE.Vector3().randomDirection().multiplyScalar(0.25));
    this.camera.lookAt(lookAt);
  }

  // ---------- Leaving ----------

  // next: the scene to go to ('World3' after the rocket trip), or nothing for the menu
  exit(next) {
    if (this.ended) return;
    this.destroy();
    this.onExit(next);
  }

  destroy() {
    this.ended = true;
    this.magic.stop();
    this.megaBeam.stop();
    this.sniper?.destroy();
    clearInterval(this.discoFlash);
    cancelAnimationFrame(this.frame);
    clearTimeout(this.exitTimer);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resize);
    this.hud.destroy();
    this.curtain?.remove();
    this.tip?.bubble.remove();
    this.agentBubble?.remove();
    this.sketch?.dispose();
    this.tip?.finger.remove();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
