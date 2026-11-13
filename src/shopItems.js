import { POWER_UPS, DANCES } from './characters.js';
import { SHOP_HATS, SHOP_HAT_PRICE } from './art/hats.js';
import { setPowerUpOn } from './save.js';

// Everything the supermarket sells (SupermarketScene), aisle by aisle: power-ups, new hats, win dances.
// Each item: { kind: 'powerUp' | 'hat' | 'dance', id, price, icon (emoji, or null for hats: they show the hat), needs?, usedUp? }
// Names are the same i18n keys as everywhere else ('powerUp.<id>', 'hat.<id>', 'dance.<id>'); the shelf
// descriptions are 'shopInfo.<id>'.

export const POWER_UP_ICONS = { shield: '🛡️', 'multi-direction': '🫧', fly: '🕊️', double: '💰', freeze: '❄️', 'mecha-capybara': '🤖', 'mega-beam': '🌈', 'supa-sniper': '🎯', 'sniper-ammo': '🔫' };

export const AISLES = [
  { id: 'powerUps', items: POWER_UPS.filter((p) => p.ready).map((p) => ({ kind: 'powerUp', icon: POWER_UP_ICONS[p.id] ?? '⚡', ...p })) },
  { id: 'hats', items: SHOP_HATS.map((id) => ({ kind: 'hat', id, price: SHOP_HAT_PRICE, icon: null })) },
  { id: 'dances', items: DANCES.map((d) => ({ kind: 'dance', ...d })) },
];

export function itemName(t, item) {
  return t(`${item.kind}.${item.id}`);
}

// How many used-up things (MEGA BEAMs, sniper shots) of this kind you have.
export function stockOf(save, item) {
  return save[item.stock] ?? 0;
}

// Already yours? (Used-up things are never "owned": you can always buy more, up to item.most.)
export function owns(save, item) {
  if (item.usedUp) return false;
  if (item.kind === 'powerUp') return save.powerUps.includes(item.id);
  if (item.kind === 'hat') return (save.hats ?? []).includes(item.id);
  return (save.dances ?? []).includes(item.id);
}

// How many of this item can still go in the cart (0 = none). `cart` is the list of items in the cart.
export function roomFor(save, item, cart) {
  const inCart = cart.filter((c) => c === item).length;
  if (item.usedUp) return Math.max(0, Math.floor((item.most - stockOf(save, item)) / (item.pack ?? 1)) - inCart);
  return owns(save, item) || inCart ? 0 : 1;
}

// The power-up you need first (like the Shield before Multi Direction), or null. Having it in the cart counts.
export function missingNeed(save, item, cart) {
  if (!item.needs || save.powerUps.includes(item.needs) || cart.some((c) => c.id === item.needs)) return null;
  return item.needs;
}

// Pays for one item and makes it yours (the caller checks the bolts first).
export function buyItem(save, item) {
  save.bolts -= item.price;
  if (item.usedUp) save[item.stock] = stockOf(save, item) + (item.pack ?? 1);
  else if (item.kind === 'powerUp') save.powerUps.push(item.id);
  if (item.kind === 'powerUp') setPowerUpOn(save, item.id, true); // new power-ups come switched ON (PowerUpsScene)
  else if (item.kind === 'hat') (save.hats ??= []).push(item.id);
  else (save.dances ??= []).push(item.id);
}
