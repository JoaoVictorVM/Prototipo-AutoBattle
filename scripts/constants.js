export const GAME = {
  MAX_WIDTH: 900,
  FIELD_WIDTH: 852,
  FIELD_HEIGHT: 400,
  PLAYER_HALF_Y: 200,
  WAVE_PAUSE_MS: 1000,
  SLOT_SIZE: 48,
  SLOT_SPACING: 56,
  INITIAL_HAND_SIZE: 3,
};

export const PLAYER_UNIT = {
  HP: 80,
  ATK: 12,
  ATK_SPEED: 1.2,
  MOVE_SPEED: 60,
  RANGE: 40,
  SIZE: 24,
};

export const ENEMY_BASE = {
  HP: 50,
  ATK: 8,
  ATK_SPEED: 0.8,
  MOVE_SPEED: 45,
  RANGE: 40,
  SIZE: 24,
  SCALE_PER_WAVE: 0.18,
};

export const ENEMY_TYPES = {
  BASIC: {
    key: "basic",
    hpMul: 1,
    atkMul: 1,
    speedMul: 1,
    sizeMul: 1,
    rangeMul: 1,
    minWave: 1,
    weight: 4,
  },
  TANK: {
    key: "tank",
    hpMul: 2.5,
    atkMul: 0.6,
    speedMul: 0.7,
    sizeMul: 1.25,
    rangeMul: 1,
    minWave: 3,
    weight: 1.5,
  },
  FAST: {
    key: "fast",
    hpMul: 0.6,
    atkMul: 0.8,
    speedMul: 1.8,
    sizeMul: 0.9,
    rangeMul: 1,
    minWave: 5,
    weight: 1.5,
  },
  RANGED: {
    key: "ranged",
    hpMul: 0.8,
    atkMul: 1.2,
    speedMul: 0.9,
    sizeMul: 1,
    rangeMul: 3,
    minWave: 7,
    weight: 1.2,
  },
};

export const WAVE = {
  BASE_COUNT: 2,
  COUNT_SCALE: 1.2,
  ENEMY_MAX_SIZE: 32,
  ENEMY_GROWTH_PER_WAVE: 0.08,
};

export const XP = {
  KILL_BASE: 10,
  KILL_PER_WAVE: 2,
  WAVE_BONUS_BASE: 30,
  WAVE_BONUS_PER_WAVE: 5,
  LEVEL_BASE: 100,
};

export const UNIT_XP = {
  LEVEL_BASE: 50,
  SPECIAL_CHANCE: 0.3,
};

export const UPGRADES = {
  HP_BONUS: 25,
  ATK_BONUS: 8,
  ATK_SPEED_BONUS: 0.3,
  MOVE_SPEED_BONUS: 20,
};

export const EFFECTS = {
  PUNCH_DISTANCE: 8,
  SPLASH_RADIUS: 60,
  RANGED_RANGE: 150,
  VAMPIRE_RATIO: 0.3,
  DOUBLE_ATK_DELAY: 200,
  SPEED_SPECIAL_BONUS: 25,
};

export const AUDIO = {
  MASTER_VOLUME: 0.35,
  HIT_THROTTLE_MS: 35, // limita rajadas de hits muito próximas
};

export const LOOT = {
  CARDS_PER_DROP: 3,
  MAX_REROLLS_PER_GAME: 3,
};

export const CARD_POOL = {
  CHARACTER: 0.25,
  HP: 0.2,
  ATK: 0.2,
  ATK_SPEED: 0.18,
  MOVE_SPEED: 0.17,
};

export const CARD_TYPES = {
  CHARACTER: "character",
  HP: "hp",
  ATK: "atk",
  ATK_SPEED: "atk_speed",
  MOVE_SPEED: "move_speed",
};

export const CARD_INFO = {
  [CARD_TYPES.CHARACTER]: {
    title: "Herói",
    typeLabel: "Personagem",
    // desc: "Coloca um novo aliado em qualquer ponto do campo.",
  },
  [CARD_TYPES.HP]: {
    title: "+Vida",
    typeLabel: "Upgrade",
    // desc: `+${UPGRADES.HP_BONUS} HP em um aliado.`,
  },
  [CARD_TYPES.ATK]: {
    title: "+Dano",
    typeLabel: "Upgrade",
    // desc: `+${UPGRADES.ATK_BONUS} ATK em um aliado.`,
  },
  [CARD_TYPES.ATK_SPEED]: {
    title: "+Vel. Ataque",
    typeLabel: "Upgrade",
    // desc: `+${UPGRADES.ATK_SPEED_BONUS} ATK/s em um aliado.`,
  },
  [CARD_TYPES.MOVE_SPEED]: {
    title: "+Vel.",
    typeLabel: "Upgrade",
    // desc: `+${UPGRADES.MOVE_SPEED_BONUS} velocidade.`,
  },
};

export const SPECIALS = {
  DOUBLE: {
    key: "double",
    name: "Ataque Duplo",
    color: "#4A90D9",
    // desc: "Dispara 2x por ataque (200ms).",
  },
  RANGED: {
    key: "ranged",
    name: "Ataque à Distância",
    color: "#F5A623",
    // desc: "Range aumenta para 150px.",
  },
  SPLASH: {
    key: "splash",
    name: "Splash",
    color: "#9B59B6",
    // desc: "Dano em raio de 60px.",
  },
  VAMPIRE: {
    key: "vampire",
    name: "Vampirismo",
    color: "#C0392B",
    // desc: "30% do dano vira HP.",
  },
  SPEED: {
    key: "speed",
    name: "Velocidade",
    color: "#1ABC9C",
    // desc: "+25 MOVE_SPEED.",
  },
};

export const PHASE = {
  SETUP: "SETUP",
  BATTLE: "BATTLE",
  PAUSED_LEVEL_UP: "PAUSED_LEVEL_UP",
  BETWEEN_WAVES: "BETWEEN_WAVES",
  GAME_OVER: "GAME_OVER",
};
