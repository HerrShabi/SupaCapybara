// Grape Boss in 2D (for the moon fight in Boss Rush), looking like his World 2 model:
// a bunch of grapes in a space helmet, an angry face, a blaster on each side and purple feet.

export const GRAPE_WIDTH = 170;
export const GRAPE_HEIGHT = 170;

export function createGrapeBossTextures(scene) {
  if (scene.textures.exists('grape-boss')) return;
  const g = scene.make.graphics({ add: false });
  const cx = 85;

  // Legs and purple feet
  g.lineStyle(5, 0x1a2a6c);
  g.lineBetween(cx - 18, 128, cx - 22, 152);
  g.lineBetween(cx + 18, 128, cx + 22, 152);
  g.fillStyle(0x6a1b9a);
  g.fillEllipse(cx - 26, 158, 30, 16);
  g.fillEllipse(cx + 26, 158, 30, 16);

  // Blasters on both sides
  for (const side of [-1, 1]) {
    const x = side < 0 ? 0 : 130;
    g.fillStyle(0x37474f);
    g.fillRoundedRect(x, 86, 40, 16, 4);
    g.fillStyle(0x263238);
    g.fillRect(side < 0 ? x : x + 30, 82, 10, 24);
    g.lineStyle(5, 0x1a2a6c);
    g.lineBetween(cx + side * 34, 84, cx + side * 50, 94);
  }

  // The bunch: rows of grapes, smaller toward the bottom
  const rows = [
    [44, 7, 50],
    [64, 6, 42],
    [84, 5, 34],
    [104, 4, 26],
    [122, 2, 12],
  ];
  for (const [y, count, half] of rows) {
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? cx : cx - half + (2 * half * i) / (count - 1);
      g.fillStyle(0x4a148c);
      g.fillCircle(x, y + 1, 13);
      g.fillStyle(0x7b1fa2);
      g.fillCircle(x, y, 12);
      g.fillStyle(0xce93d8, 0.7);
      g.fillCircle(x - 4, y - 4, 3);
    }
  }

  // Angry face
  for (const side of [-1, 1]) {
    g.fillStyle(0xffffff);
    g.fillCircle(cx + side * 16, 66, 9);
    g.fillStyle(0x000000);
    g.fillCircle(cx + side * 15, 68, 4);
    g.lineStyle(4, 0x000000);
    g.lineBetween(cx + side * 26, 50, cx + side * 6, 58);
  }
  g.lineStyle(4, 0x311b92);
  g.lineBetween(cx - 12, 92, cx + 12, 88);

  // Stem
  g.fillStyle(0x5d4037);
  g.fillRect(cx - 3, 14, 6, 18);
  g.fillStyle(0x66bb6a);
  g.fillEllipse(cx + 12, 20, 18, 9);

  // Space helmet (a see-through bubble)
  g.fillStyle(0xbbefff, 0.18);
  g.fillCircle(cx, 72, 72);
  g.lineStyle(3, 0xe1f5fe, 0.8);
  g.strokeCircle(cx, 72, 72);
  g.lineStyle(4, 0xffffff, 0.7);
  g.beginPath();
  g.arc(cx, 72, 60, Math.PI * 1.15, Math.PI * 1.4);
  g.strokePath();

  g.generateTexture('grape-boss', GRAPE_WIDTH, GRAPE_HEIGHT);
  g.clear();

  // The ground pound wave: a purple shockwave rolling along the floor
  g.fillStyle(0xea80fc, 0.9);
  g.fillEllipse(24, 22, 44, 40);
  g.fillStyle(0xaa00ff);
  g.fillEllipse(24, 26, 34, 28);
  g.fillStyle(0xffffff, 0.8);
  g.fillEllipse(20, 18, 10, 6);
  g.generateTexture('grape-wave', 48, 40);
  g.clear();

  // His blaster shot: a little glowing grape
  g.fillStyle(0xea80fc);
  g.fillCircle(10, 10, 10);
  g.fillStyle(0x9c27b0);
  g.fillCircle(10, 10, 7);
  g.fillStyle(0xffffff);
  g.fillCircle(7, 7, 2.5);
  g.generateTexture('grape-shot', 20, 20);
  g.destroy();
}
