import { PLAYER_UNIT, ENEMY_BASE, WAVE, EFFECTS, SPECIALS } from "./constants.js";
import { state, nextId } from "./state.js";

let heroCounter = 0;

export function createPlayerUnit(x, y, level = 0) {
  heroCounter += 1;
  // Multiplicador exponencial dos atributos base por nível da carta.
  // Hero+ (level 1) = stats base × 2, Hero++ (level 2) = × 4, etc.
  const mul = Math.pow(2, level);
  const unit = {
    id: nextId("nextUnitId"),
    kind: "ally",
    name: `Herói ${heroCounter}`,
    cardLevel: level,
    x,
    y,
    hp: PLAYER_UNIT.HP * mul,
    maxHp: PLAYER_UNIT.HP * mul,
    atk: PLAYER_UNIT.ATK * mul,
    atkSpeed: PLAYER_UNIT.ATK_SPEED * mul,
    moveSpeed: PLAYER_UNIT.MOVE_SPEED * mul,
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

// Aplica um upgrade. `level` é o nível da carta usada (0 = normal,
// 1 = "+", 2 = "++", etc.). Stats e contador escalam com 2^level — uma
// carta de nível 2 vale 4 cartas comuns no contador e nos bônus.
export function applyUpgrade(unit, kind, level = 0) {
  const mul = Math.pow(2, level);
  switch (kind) {
    case "hp": {
      unit.upgrades.hp += mul;
      unit.maxHp += 25 * mul;
      unit.hp += 25 * mul;
      break;
    }
    case "atk": {
      unit.upgrades.atk += mul;
      unit.atk += 8 * mul;
      break;
    }
    case "atk_speed": {
      unit.upgrades.atkSpeed += mul;
      unit.atkSpeed += 0.3 * mul;
      break;
    }
    case "move_speed": {
      unit.upgrades.moveSpeed += mul;
      unit.moveSpeed += 20 * mul;
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
