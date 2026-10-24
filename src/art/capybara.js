import { drawCape, drawSuitBolt, CAPE } from './heroParts.js';

const FUR = 0x9b6b3d;
const FUR_DARK = 0x6e4a2a;

export function drawCapybara(g, { legOffset = 0, capeFlying = false }, { suit, suitDark, cape = CAPE }) {
  drawCape(g, capeFlying, cape);

  // Legs (suit)
  g.fillStyle(suitDark);
  g.fillRect(18 + legOffset, 36, 7, 10);
  g.fillRect(42 - legOffset, 36, 7, 10);

  // Body (suit) with the lightning bolt
  g.fillStyle(suit);
  g.fillEllipse(32, 29, 42, 24);
  drawSuitBolt(g, 24, 19);

  // Head
  g.fillStyle(FUR);
  g.fillRoundedRect(40, 8, 22, 20, 7);
  g.fillStyle(FUR_DARK);
  g.fillRoundedRect(53, 14, 10, 13, 4); // snout
  g.fillCircle(45, 9, 3.5); // ear

  // Face
  g.fillStyle(0x000000);
  g.fillCircle(51, 15, 2); // eye
  g.fillCircle(60, 17, 1.5); // nose

  // Cape collar
  g.fillStyle(cape);
  g.fillRect(37, 14, 6, 10);
}
