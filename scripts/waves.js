// Geração de waves — Fase 3.
import { WAVE, ENEMY_TYPES, GAME } from "./constants.js";
import { state } from "./state.js";
import { createEnemy } from "./units.js";

export function enemyCountForWave(wave) {
  return WAVE.BASE_COUNT + Math.floor(wave * WAVE.COUNT_SCALE);
}

function pickEnemyType(wave) {
  const available = Object.values(ENEMY_TYPES).filter((t) => wave >= t.minWave);
  const total = available.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of available) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return available[0];
}

export function spawnWave(wave) {
  const count = enemyCountForWave(wave);
  state.enemies = [];
  const margin = 30;
  const usableW = state.field.width - margin * 2;
  const topY = 24;
  const rows = Math.ceil(count / 6);
  let placed = 0;
  for (let r = 0; r < rows && placed < count; r++) {
    const inRow = Math.min(6, count - placed);
    for (let i = 0; i < inRow; i++) {
      const t = pickEnemyType(wave);
      const x = margin + (usableW * (i + 1)) / (inRow + 1);
      const y = topY + r * 30;
      const e = createEnemy(t, x, y, wave);
      state.enemies.push(e);
      placed += 1;
    }
  }
  void GAME;
}
