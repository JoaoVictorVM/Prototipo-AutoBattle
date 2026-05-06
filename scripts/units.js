import { PLAYER_UNIT, ENEMY_BASE, WAVE, EFFECTS, SPECIALS } from "./constants.js";
import { state, nextId } from "./state.js";

let heroCounter = 0;

export function createPlayerUnit(x, y) {
  heroCounter += 1;
  const unit = {
    id: nextId("nextUnitId"),
    kind: "ally",
    name: `Herói ${heroCounter}`,
    x,
    y,
    hp: PLAYER_UNIT.HP,
    maxHp: PLAYER_UNIT.HP,
    atk: PLAYER_UNIT.ATK,
    atkSpeed: PLAYER_UNIT.ATK_SPEED,
    moveSpeed: PLAYER_UNIT.MOVE_SPEED,
    range: PLAYER_UNIT.RANGE,
    size: PLAYER_UNIT.SIZE,
    upgrades: { hp: 0, atk: 0, atkSpeed: 0, moveSpeed: 0 },
    specials: [],
    attackCooldown: 0,
    targetId: null,
    el: null,
    isDead: false,
    pendingDoubleAt: 0,
    facing: { x: 0, y: -1 },
  };
  return unit;
}

export function createEnemy(typeDef, x, y, wave) {
  const scale = 1 + (wave - 1) * ENEMY_BASE.SCALE_PER_WAVE;
  const sizeBoost = Math.min(
    WAVE.ENEMY_MAX_SIZE,
    ENEMY_BASE.SIZE * (1 + (wave - 1) * WAVE.ENEMY_GROWTH_PER_WAVE)
  );
  const enemy = {
    id: nextId("nextEnemyId"),
    kind: "enemy",
    type: typeDef.key,
    x,
    y,
    hp: ENEMY_BASE.HP * scale * typeDef.hpMul,
    maxHp: ENEMY_BASE.HP * scale * typeDef.hpMul,
    atk: ENEMY_BASE.ATK * scale * typeDef.atkMul,
    atkSpeed: ENEMY_BASE.ATK_SPEED * typeDef.speedMul,
    moveSpeed: ENEMY_BASE.MOVE_SPEED * typeDef.speedMul,
    range: ENEMY_BASE.RANGE * typeDef.rangeMul,
    size: sizeBoost * typeDef.sizeMul,
    attackCooldown: 0,
    targetId: null,
    el: null,
    isDead: false,
    facing: { x: 0, y: 1 },
  };
  return enemy;
}

export function applyUpgrade(unit, kind) {
  switch (kind) {
    case "hp": {
      unit.upgrades.hp += 1;
      unit.maxHp += 25;
      unit.hp += 25;
      break;
    }
    case "atk": {
      unit.upgrades.atk += 1;
      unit.atk += 8;
      break;
    }
    case "atk_speed": {
      unit.upgrades.atkSpeed += 1;
      unit.atkSpeed += 0.3;
      break;
    }
    case "move_speed": {
      unit.upgrades.moveSpeed += 1;
      unit.moveSpeed += 20;
      break;
    }
  }
}

export function applySpecial(unit, special) {
  if (!special) return;
  if (unit.specials.find((s) => s.key === special.key)) return;
  unit.specials.push(special);
  if (special.key === SPECIALS.RANGED.key) {
    unit.range = Math.max(unit.range, EFFECTS.RANGED_RANGE);
  } else if (special.key === SPECIALS.SPEED.key) {
    unit.moveSpeed += EFFECTS.SPEED_SPECIAL_BONUS;
  }
}

export function hasSpecial(unit, key) {
  return unit.specials.some((s) => s.key === key);
}

export function totalUpgrades(unit) {
  const u = unit.upgrades;
  return u.hp + u.atk + u.atkSpeed + u.moveSpeed;
}

export function upgradeSummary(unit) {
  const parts = [];
  if (unit.upgrades.hp) parts.push(`Vida +${unit.upgrades.hp * 25}`);
  if (unit.upgrades.atk) parts.push(`Dmg +${unit.upgrades.atk * 8}`);
  if (unit.upgrades.atkSpeed)
    parts.push(`AtkSpd +${(unit.upgrades.atkSpeed * 0.3).toFixed(1)}`);
  if (unit.upgrades.moveSpeed)
    parts.push(`Mov +${unit.upgrades.moveSpeed * 20}`);
  for (const s of unit.specials) parts.push(s.name);
  return parts.join("  ");
}
