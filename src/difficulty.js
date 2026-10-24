// How hard the game is. EXTREME is how the game was first built; Ethan found it too hard.
// The player picks one in the menu.

// Bolts (⚡) you get for beating a bad guy or a boss, on every difficulty.
export const BAD_GUY_REWARD = 5;
export const BOSS_REWARD = 10;

export const DIFFICULTIES = {
  easy: {
    hearts: 5,
    hurtSafeMs: 2000, // after getting hit, nothing can hurt you for this long (keep it a multiple of 200)
    enemyShotSpeed: 180,
    enemySeeDistance: 450, // bad guys only shoot when you're this close
    enemyFirstShotMs: 1500, // how long a bad guy waits after seeing you before the first shot
    enemyShotSlowdown: 2, // time between shots is multiplied by this
    bossHp: 12,
    bossActionMs: 2600,
    color: 0x43a047,
  },
  medium: {
    hearts: 4,
    hurtSafeMs: 1600,
    enemyShotSpeed: 220,
    enemySeeDistance: 520,
    enemyFirstShotMs: 1000,
    enemyShotSlowdown: 1.5,
    bossHp: 16,
    bossActionMs: 2300,
    color: 0xfdd835,
  },
  hard: {
    hearts: 3,
    hurtSafeMs: 1400,
    enemyShotSpeed: 260,
    enemySeeDistance: 600,
    enemyFirstShotMs: 600,
    enemyShotSlowdown: 1.2,
    bossHp: 20,
    bossActionMs: 2000,
    color: 0xfb8c00,
  },
  extreme: {
    hearts: 3,
    hurtSafeMs: 1200,
    enemyShotSpeed: 300,
    enemySeeDistance: 650,
    enemyFirstShotMs: 0,
    enemyShotSlowdown: 1,
    bossHp: 25,
    bossActionMs: 1800,
    color: 0xe53935,
  },
};

export const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'extreme'];

export function getDifficulty(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES.medium;
}
