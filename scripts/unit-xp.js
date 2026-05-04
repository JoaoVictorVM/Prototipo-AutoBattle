// XP individual dos personagens — Fase 3.
import { UNIT_XP } from "./constants.js";

export function addUnitXP(unit, amount) {
  unit.xp += amount;
  let leveled = false;
  while (unit.xp >= unit.xpNeeded) {
    unit.xp -= unit.xpNeeded;
    unit.level += 1;
    unit.xpNeeded = UNIT_XP.LEVEL_BASE * unit.level;
    leveled = true;
  }
  return leveled;
}
