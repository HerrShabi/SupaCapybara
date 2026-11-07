// The Bad Guy King (Ethan's round 6 design): a crocodile king in shiny black armor with a gold crown,
// sitting on a flying golden throne with a laser cannon on each side. He faces left.

export const KING_WIDTH = 220;
export const KING_HEIGHT = 200;

export function createCrocKingTexture(scene) {
  if (scene.textures.exists('croc-king')) return;
  const g = scene.make.graphics({ add: false });
  // Jet flames under the throne
  g.fillStyle(0xff6f00);
  g.fillTriangle(70, 168, 96, 168, 83, 198);
  g.fillTriangle(130, 168, 156, 168, 143, 198);
  g.fillStyle(0xffeb3b);
  g.fillTriangle(76, 168, 90, 168, 83, 186);
  g.fillTriangle(136, 168, 150, 168, 143, 186);

  // Tail curling out on the right
  g.fillStyle(0x2e7d32);
  g.fillTriangle(160, 120, 160, 145, 214, 100);
  g.fillStyle(0x1b5e20);
  for (let i = 0; i < 4; i++) g.fillTriangle(168 + i * 11, 118 - i * 5, 176 + i * 11, 116 - i * 5, 172 + i * 11, 108 - i * 5);

  // The throne: backrest, seat, base
  g.fillStyle(0xffc107);
  g.fillRoundedRect(110, 20, 60, 120, 14);
  g.fillStyle(0xc62828);
  g.fillRoundedRect(120, 32, 40, 96, 10);
  g.fillStyle(0xffc107);
  g.fillRoundedRect(50, 120, 130, 26, 8);
  g.fillStyle(0xffa000);
  g.fillRoundedRect(58, 146, 114, 24, 8);
  g.fillStyle(0xe53935);
  g.fillCircle(140, 22, 7); // a ruby on top
  // Laser cannons on both sides
  g.fillStyle(0x455a64);
  g.fillRect(14, 132, 46, 14);
  g.fillRect(170, 132, 40, 14);
  g.fillStyle(0xff1744);
  g.fillRect(6, 134, 10, 10);
  g.fillRect(206, 134, 10, 10);

  // Legs (green) and black armored body
  g.fillStyle(0x2e7d32);
  g.fillRoundedRect(70, 108, 22, 30, 8);
  g.fillRoundedRect(96, 108, 22, 30, 8);
  g.fillStyle(0x212121);
  g.fillRoundedRect(72, 58, 58, 62, 14);
  g.fillStyle(0x616161);
  g.fillRoundedRect(80, 64, 16, 40, 6); // shine
  g.fillStyle(0xffc107);
  g.fillRect(72, 98, 58, 6); // gold belt
  // Arm holding the trophy zapper
  g.fillStyle(0x2e7d32);
  g.fillRoundedRect(52, 76, 34, 14, 7);
  g.fillStyle(0x9c27b0);
  g.fillRect(30, 74, 26, 10);
  g.fillStyle(0xffeb3b);
  g.fillCircle(30, 79, 6);

  // Head with a long snout pointing left
  g.fillStyle(0x388e3c);
  g.fillRoundedRect(82, 22, 46, 40, 14);
  g.fillRoundedRect(28, 36, 64, 22, 9);
  g.fillStyle(0xffffff); // teeth
  for (let i = 0; i < 6; i++) g.fillTriangle(32 + i * 9, 56, 39 + i * 9, 56, 35 + i * 9, 64);
  g.fillStyle(0x1b5e20);
  g.fillCircle(34, 41, 3); // nostril
  g.fillStyle(0xffeb3b); // mean yellow eye
  g.fillCircle(100, 32, 9);
  g.fillStyle(0x000000);
  g.fillRect(98, 25, 4, 14);
  g.lineStyle(4, 0x1b5e20);
  g.lineBetween(88, 22, 110, 28); // angry eyebrow

  // Gold crown
  g.fillStyle(0xffc107);
  g.fillRect(88, 10, 40, 12);
  g.fillTriangle(88, 12, 94, 2, 100, 12);
  g.fillTriangle(100, 12, 108, 0, 116, 12);
  g.fillTriangle(116, 12, 122, 2, 128, 12);
  g.fillStyle(0x2196f3);
  g.fillCircle(108, 16, 3);
  g.generateTexture('croc-king', KING_WIDTH, KING_HEIGHT);
  g.destroy();
}
