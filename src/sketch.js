import Phaser from 'phaser';
import * as THREE from 'three';
import { createDoodleHeroTextures, createDoodleHatTextures, doodleHeroKey, doodleHatAnchor, DOODLE_HAT_PREFIX } from './art/doodle.js';

// DRAWING MODE (the ✏️ switch in the STORY menu, save.drawingMode): every world looks drawn in Ethan's notebook.
// A shader finds the edges of everything and draws them as blue pen lines, turns the colors into soft
// colored pencil on paper, and adds faint notebook lines. The heroes and hats switch to the drawn ones from
// the Drawings World (art/doodle.js).
// - 2D (Phaser): applySketch(scene) puts the SketchFX post effect on the camera (needs WebGL; main.js registers it).
// - 3D (Three.js, World 2): ThreeSketch renders the world into a picture first, then draws that picture with the shader.

// The shader's main part, shared by Phaser and Three (SAMPLER and UV are filled in for each)
const SKETCH_BODY = `
float lum(vec2 uv) { return dot(texture2D(SAMPLER, uv).rgb, vec3(0.299, 0.587, 0.114)); }
void main() {
  vec2 px = 1.0 / uResolution;
  vec2 uv = UV;
  // A little wobble, so the pen lines look hand drawn
  vec2 wobble = vec2(sin(uv.y * 70.0), cos(uv.x * 60.0)) * px * 0.9;
  vec2 p = uv + wobble;
  float tl = lum(p + px * vec2(-1.0, 1.0));
  float t  = lum(p + px * vec2(0.0, 1.0));
  float tr = lum(p + px * vec2(1.0, 1.0));
  float l  = lum(p + px * vec2(-1.0, 0.0));
  float r  = lum(p + px * vec2(1.0, 0.0));
  float bl = lum(p + px * vec2(-1.0, -1.0));
  float b  = lum(p + px * vec2(0.0, -1.0));
  float br = lum(p + px * vec2(1.0, -1.0));
  float gx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
  float gy = (tl + 2.0 * t + tr) - (bl + 2.0 * b + br);
  float edge = length(vec2(gx, gy));

  vec3 color = texture2D(SAMPLER, uv).rgb;
  float light = dot(color, vec3(0.299, 0.587, 0.114));
  // The page: white paper, blue notebook lines every 30 pixels, and the red margin (like the Drawings World)
  vec3 page = vec3(0.992, 0.988, 0.961);
  float row = abs(fract(uv.y * 18.0) - 0.5);
  page = mix(page, vec3(0.56, 0.79, 0.98), smoothstep(0.47, 0.5, row) * 0.8);
  page = mix(page, vec3(0.94, 0.6, 0.6), (1.0 - smoothstep(0.0, 1.5, abs(uv.x * uResolution.x - 70.0))) * 0.9);
  // Light colored pencil, with diagonal strokes. Dark colors (night sky, space) stay mostly paper.
  vec3 bright = clamp(mix(vec3(light), color, 1.35), 0.0, 1.0);
  float amount = mix(0.08, 0.5, smoothstep(0.1, 0.4, light));
  float stroke = step(0.5, fract((gl_FragCoord.x * 0.6 + gl_FragCoord.y) / 4.0));
  amount *= 0.6 + 0.4 * stroke;
  vec3 pencil = mix(page, bright, amount);
  // Blue ballpoint pen on the outlines
  float ink = smoothstep(0.2, 0.42, edge);
  gl_FragColor = vec4(mix(pencil, vec3(0.10, 0.14, 0.49), ink), 1.0);
}
`;

const PHASER_FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uResolution;
varying vec2 outTexCoord;
${SKETCH_BODY.replaceAll('SAMPLER', 'uMainSampler').replace('UV', 'outTexCoord')}
`;

export class SketchPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'SketchFX', fragShader: PHASER_FRAG });
  }

  onPreRender() {
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }
}

export function drawingMode(save) {
  return Boolean(save?.drawingMode);
}

// A 2D scene in drawing mode: the sketch effect on its camera (WebGL only; otherwise it just looks normal).
// The screen display (things that don't scroll AND sit on top, depth HUD_DEPTH or more: hearts, texts,
// messages, menus) goes on a second camera
// without the effect, so it stays easy to read. Every frame, new things are sorted onto one camera or the other.
const HUD_DEPTH = 9;

export function applySketch(scene) {
  if (scene.game.renderer.type !== Phaser.WEBGL) return;
  const world = scene.cameras.main;
  world.setPostPipeline('SketchFX');
  const hud = scene.cameras.add(0, 0, world.width, world.height);
  const sort = () => {
    for (const child of scene.children.list) {
      if (child.sketchSorted) continue;
      child.sketchSorted = true;
      // (Skies and paper backgrounds don't scroll either, but they're at the back, so they stay sketched)
      if (child.scrollFactorX === 0 && child.scrollFactorY === 0 && child.depth >= HUD_DEPTH) world.ignore(child);
      else hud.ignore(child);
    }
  };
  sort();
  scene.events.on('postupdate', sort);
  scene.events.once('shutdown', () => {
    scene.events.off('postupdate', sort);
    scene.cameras.remove(hud);
  });
}

// Drawn heroes and hats for a side-scroller in drawing mode (see SideScrollerScene's heroLook / hatStyle)
export function useDrawnHeroes(scene) {
  createDoodleHeroTextures(scene);
  createDoodleHatTextures(scene);
  scene.heroLook = (id) => doodleHeroKey(id);
  scene.hatStyle = { prefix: DOODLE_HAT_PREFIX, anchor: doodleHatAnchor };
}

// ---------- 3D (World 2) ----------

const THREE_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const THREE_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
varying vec2 vUv;
${SKETCH_BODY.replaceAll('SAMPLER', 'tDiffuse').replace('UV', 'vUv')}
`;

export class ThreeSketch {
  constructor(renderer) {
    this.renderer = renderer;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.target = new THREE.WebGLRenderTarget(size.x, size.y);
    this.material = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: this.target.texture }, uResolution: { value: size } },
      vertexShader: THREE_VERT,
      fragmentShader: THREE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCamera = new THREE.Camera();
  }

  // Draw the world as a sketch (call instead of renderer.render)
  render(scene, camera) {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    if (size.x !== this.target.width || size.y !== this.target.height) {
      this.target.setSize(size.x, size.y);
      this.material.uniforms.uResolution.value.copy(size);
    }
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  dispose() {
    this.target.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
