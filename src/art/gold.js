// Turning something into a shiny gold trophy (the Bad Guy King's zapper): every color becomes a shade of gold
// (bright parts light gold, dark parts dark gold), so even a green crocodile looks like real gold.
// Without WebGL effects it falls back to a gold tint.

const GOLD = 0xffd54f;
const SHINE = 1.45;
// Brightness (0.3 red + 0.59 green + 0.11 blue), then turned into gold: lots of red, a bit less green, little blue
const GOLD_MATRIX = [
  ...[0.3, 0.59, 0.11].map((w) => w * SHINE * 1.0), 0, 0,
  ...[0.3, 0.59, 0.11].map((w) => w * SHINE * 0.82), 0, 0,
  ...[0.3, 0.59, 0.11].map((w) => w * SHINE * 0.3), 0, 0,
  0, 0, 0, 1, 0,
];

export function goldify(object) {
  if (!object.preFX) return object.setTint(GOLD);
  if (!object.goldFx) {
    object.goldFx = object.preFX.addColorMatrix();
    object.goldFx.set(GOLD_MATRIX);
  }
  return object;
}

export function ungoldify(object) {
  if (object.goldFx) {
    object.preFX.remove(object.goldFx);
    object.goldFx = null;
  }
  return object.clearTint();
}
