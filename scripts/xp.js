// XP do jogador — Fase 3.
import { XP } from "./constants.js";
import { state } from "./state.js";

export function xpForKill(wave) {
  return XP.KILL_BASE + wave * XP.KILL_PER_WAVE;
}

export function xpForWaveComplete(wave) {
  return XP.WAVE_BONUS_BASE + wave * XP.WAVE_BONUS_PER_WAVE;
}

export function addPlayerXP(amount) {
  state.player.xp += amount;
  while (state.player.xp >= state.player.xpNeeded) {
    state.player.xp -= state.player.xpNeeded;
    state.player.level += 1;
    state.player.xpNeeded = XP.LEVEL_BASE * state.player.level;
    return true;
  }
  return false;
}
