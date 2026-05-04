// XP do jogador.
import { XP } from "./constants.js";
import { state } from "./state.js";

export function xpForKill(wave) {
  return XP.KILL_BASE + wave * XP.KILL_PER_WAVE;
}

export function xpForWaveComplete(wave) {
  return XP.WAVE_BONUS_BASE + wave * XP.WAVE_BONUS_PER_WAVE;
}

// Adiciona XP ao jogador e retorna quantos níveis ele subiu nesse ganho.
export function addPlayerXP(amount) {
  state.player.xp += amount;
  let levels = 0;
  while (state.player.xp >= state.player.xpNeeded) {
    state.player.xp -= state.player.xpNeeded;
    state.player.level += 1;
    state.player.xpNeeded = XP.LEVEL_BASE * state.player.level;
    levels += 1;
  }
  return levels;
}
