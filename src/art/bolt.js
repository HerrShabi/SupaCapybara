// The lightning bolt coin: Ethan's money for buying power-ups.

export const BOLT_SIZE = 26;

export function createBoltTexture(scene) {
  if (scene.textures.exists('bolt')) return;
  const g = scene.make.graphics({ add: false });
  const r = BOLT_SIZE / 2;
  g.fillStyle(0xb8860b);
  g.fillCircle(r, r, r);
  g.fillStyle(0xffd23f);
  g.fillCircle(r, r, r - 3);
  g.fillStyle(0xffffff);
  g.fillPoints(
    [
      { x: 15, y: 4 }, { x: 7, y: 14 }, { x: 12, y: 14 },
      { x: 10, y: 22 }, { x: 19, y: 11 }, { x: 14, y: 11 }, { x: 17, y: 4 },
    ],
    true,
  );
  g.generateTexture('bolt', BOLT_SIZE, BOLT_SIZE);
  g.destroy();
}
