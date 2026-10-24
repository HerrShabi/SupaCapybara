// Small things: hearts, enemy blaster shots, and the boss key.

export function createItemTextures(scene) {
  if (!scene.textures.exists('heart')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x000000);
    g.fillCircle(9, 9, 9);
    g.fillCircle(21, 9, 9);
    g.fillTriangle(0, 11, 30, 11, 15, 28);
    g.fillStyle(0xff3355);
    g.fillCircle(9, 9, 7);
    g.fillCircle(21, 9, 7);
    g.fillTriangle(3, 11, 27, 11, 15, 25);
    g.fillStyle(0xffffff);
    g.fillCircle(8, 7, 2);
    g.generateTexture('heart', 30, 28);
    g.destroy();
  }

  if (!scene.textures.exists('enemy-shot')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xff9800, 0.5);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffeb3b);
    g.fillCircle(8, 8, 5);
    g.generateTexture('enemy-shot', 16, 16);
    g.destroy();
  }

  if (!scene.textures.exists('key')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xb8860b);
    g.fillCircle(14, 16, 14);
    g.fillRect(22, 12, 34, 9);
    g.fillRect(44, 20, 6, 10);
    g.fillRect(52, 20, 6, 12);
    g.fillStyle(0xffd23f);
    g.fillCircle(14, 16, 11);
    g.fillRect(24, 14, 32, 5);
    g.fillStyle(0xb8860b);
    g.fillCircle(14, 16, 5);
    g.generateTexture('key', 60, 34);
    g.destroy();
  }
}
