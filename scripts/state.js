import { PHASE } from "./constants.js";

export const state = {
  phase: PHASE.SETUP,
  isPaused: false,

  wave: 1,
  score: 0,
  enemiesKilled: 0,

  player: {
    level: 1,
    xp: 0,
    xpNeeded: 100,
  },

  units: [],
  enemies: [],
  hand: [],
  xpOrbs: [],

  cursor: { x: -9999, y: -9999 },

  nextUnitId: 1,
  nextEnemyId: 1,
  nextCardId: 1,
  nextOrbId: 1,

  field: {
    width: 0,
    height: 0,
  },

  pendingWaveTimer: 0,

  pendingEvents: [],

  pendingLevelUps: [],
  resumePhase: null,

  rerollsLeft: 3,

  gameOverShown: false,
};

export function resetState() {
  state.phase = PHASE.SETUP;
  state.isPaused = false;
  state.wave = 1;
  state.score = 0;
  state.enemiesKilled = 0;
  state.player.level = 1;
  state.player.xp = 0;
  state.player.xpNeeded = 100;
  state.units = [];
  state.enemies = [];
  state.hand = [];
  state.xpOrbs = [];
  state.cursor.x = -9999;
  state.cursor.y = -9999;
  state.nextUnitId = 1;
  state.nextEnemyId = 1;
  state.nextCardId = 1;
  state.nextOrbId = 1;
  state.pendingWaveTimer = 0;
  state.pendingEvents = [];
  state.pendingLevelUps = [];
  state.resumePhase = null;
  state.rerollsLeft = 3;
  state.gameOverShown = false;
}

export function nextId(key) {
  const id = state[key];
  state[key] = id + 1;
  return id;
}
