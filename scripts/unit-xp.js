// XP individual dos personagens.
import { UNIT_XP } from "./constants.js";

// Adiciona XP a um personagem e retorna quantos níveis ele subiu.
export function addUnitXP(unit, amount) {
  unit.xp += amount;
  let levels = 0;
  while (unit.xp >= unit.xpNeeded) {
    unit.xp -= unit.xpNeeded;
    unit.level += 1;
    unit.xpNeeded = UNIT_XP.LEVEL_BASE * unit.level;
    levels += 1;
  }
  return levels;
}
