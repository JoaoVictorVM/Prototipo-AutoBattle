import { state } from "./state.js";
import { PHASE, EFFECTS, GAME, SPECIALS } from "./constants.js";
import { hasSpecial } from "./units.js";

export function combatTick(dt) {
  if (state.phase !== PHASE.BATTLE) return;

  for (const u of state.units) {
    u.attackCooldown = Math.max(0, u.attackCooldown - dt);
    tickDoubleAttack(u, dt);
  }
  for (const e of state.enemies)
    e.attackCooldown = Math.max(0, e.attackCooldown - dt);

  for (const u of state.units) {
    if (u.isDead) continue;
    aiAlly(u, dt);
  }
  for (const e of state.enemies) {
    if (e.isDead) continue;
    aiEnemy(e, dt);
  }

  resolveCollisions();
  removeDead();

  if (state.units.length === 0) {
    state.phase = PHASE.GAME_OVER;
    return;
  }
  if (state.enemies.length === 0) {
    state.phase = PHASE.BETWEEN_WAVES;
    state.pendingWaveTimer = GAME.WAVE_PAUSE_MS / 1000;
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestEnemy(unit) {
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (e.isDead) continue;
    const d = dist(unit, e);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function pickAllyTarget(enemy, mode) {
  let best = null;
  let bestScore = Infinity;
  for (const u of state.units) {
    if (u.isDead) continue;
    let score;
    if (mode === "lowestHp") score = u.hp;
    else if (mode === "highestHp") score = -u.hp;
    else score = dist(enemy, u);
    if (score < bestScore) {
      bestScore = score;
      best = u;
    }
  }
  return best;
}

function clampToField(unit) {
  const half = unit.size / 2;
  unit.x = Math.max(half, Math.min(state.field.width - half, unit.x));
  unit.y = Math.max(half, Math.min(state.field.height - half, unit.y));
}

function moveStep(actor, dx, dy, dist01, dt) {
  const step = actor.moveSpeed * dt;
  const len = dist01 || 1;
  actor.x += (dx / len) * Math.min(step, len);
  actor.y += (dy / len) * Math.min(step, len);
  actor.facing.x = dx / len;
  actor.facing.y = dy / len;
  clampToField(actor);
}

function aiAlly(u, dt) {
  if (
    !u.targetId ||
    !state.enemies.find((e) => e.id === u.targetId && !e.isDead)
  ) {
    const t = nearestEnemy(u);
    u.targetId = t ? t.id : null;
  }
  if (!u.targetId) return;
  const target = state.enemies.find((e) => e.id === u.targetId);
  if (!target) return;

  const range = u.range;
  const dx = target.x - u.x;
  const dy = target.y - u.y;
  const d = Math.hypot(dx, dy);

  if (d > range) {
    moveStep(u, dx, dy, d, dt);
  } else {
    u.facing.x = dx / (d || 1);
    u.facing.y = dy / (d || 1);
    if (u.attackCooldown <= 0) {
      doAttack(u, target);
      u.attackCooldown = 1 / u.atkSpeed;
    }
  }
}

function aiEnemy(e, dt) {
  let mode = "nearest";
  if (e.type === "tank") mode = "highestHp";
  if (e.type === "fast") mode = "lowestHp";

  if (
    !e.targetId ||
    !state.units.find((u) => u.id === e.targetId && !u.isDead)
  ) {
    const t = pickAllyTarget(e, mode);
    e.targetId = t ? t.id : null;
  }
  if (!e.targetId) return;
  const target = state.units.find((u) => u.id === e.targetId);
  if (!target) return;

  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const d = Math.hypot(dx, dy);
  const range = e.type === "ranged" ? EFFECTS.RANGED_RANGE : e.range;
  const keepDistance = e.type === "ranged" ? EFFECTS.RANGED_RANGE - 20 : 0;

  if (d > range) {
    moveStep(e, dx, dy, d, dt);
  } else if (keepDistance && d < keepDistance) {
    moveStep(e, -dx, -dy, d, dt);
  } else {
    e.facing.x = dx / (d || 1);
    e.facing.y = dy / (d || 1);
  }

  if (d <= range && e.attackCooldown <= 0) {
    doAttack(e, target);
    e.attackCooldown = 1 / e.atkSpeed;
  }
}

function tickDoubleAttack(u, dt) {
  if (!u.doubleAttackPending) return;
  u.doubleAttackTimer -= dt;
  if (u.doubleAttackTimer > 0) return;

  u.doubleAttackPending = false;
  let target = state.enemies.find(
    (e) => e.id === u.doubleAttackTargetId && !e.isDead,
  );
  if (!target) target = nearestEnemy(u);
  if (!target) return;
  doAttack(u, target, /* isFollowUp */ true);
}

function doAttack(attacker, target, isFollowUp = false) {
  const damage = attacker.atk;
  applyDamage(attacker, target, damage);

  if (attacker.kind === "ally" && hasSpecial(attacker, SPECIALS.SPLASH.key)) {
    for (const e of state.enemies) {
      if (e === target || e.isDead) continue;
      if (Math.hypot(e.x - target.x, e.y - target.y) <= EFFECTS.SPLASH_RADIUS) {
        applyDamage(attacker, e, damage);
      }
    }
  }

  if (attacker.kind === "ally" && hasSpecial(attacker, SPECIALS.VAMPIRE.key)) {
    const heal = damage * EFFECTS.VAMPIRE_RATIO;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
  }

  if (
    !isFollowUp &&
    attacker.kind === "ally" &&
    hasSpecial(attacker, SPECIALS.DOUBLE.key)
  ) {
    attacker.doubleAttackPending = true;
    attacker.doubleAttackTimer = EFFECTS.DOUBLE_ATK_DELAY / 1000;
    attacker.doubleAttackTargetId = target.id;
  }
}

function applyDamage(attacker, target, damage) {
  if (target.isDead) return;
  target.hp -= damage;

  state.pendingEvents.push({
    type: "attack",
    attacker,
    target,
    damage,
  });

  if (target.hp <= 0 && !target.isDead) {
    target.hp = 0;
    target.isDead = true;
    state.pendingEvents.push({ type: "death", unit: target, killer: attacker });
  }
}

function resolveCollisions() {
  const all = [];
  for (const u of state.units) if (!u.isDead) all.push(u);
  for (const e of state.enemies) if (!e.isDead) all.push(e);

  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      const minDist = (a.size + b.size) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);

      if (d >= minDist) continue;

      let nx, ny;
      if (d < 0.0001) {
        nx = 1;
        ny = 0;
      } else {
        nx = dx / d;
        ny = dy / d;
      }
      const overlap = (minDist - d) / 2;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
    }
  }

  for (const u of all) clampToField(u);
}

function removeDead() {
  state.units = state.units.filter((u) => !u.isDead);
  state.enemies = state.enemies.filter((e) => !e.isDead);
}
