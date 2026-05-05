import { state, resetState } from "./state.js";
import { CARD_TYPES, PHASE, GAME, UNIT_XP } from "./constants.js";
import { createPlayerUnit, applyUpgrade, applySpecial } from "./units.js";
import {
  drawInitialHand,
  getCardById,
  removeCardFromHand,
  rollLevelUpCards,
  rollUnitLevelUpOptions,
} from "./cards.js";
import { spawnWave } from "./waves.js";
import { combatTick } from "./combat.js";
import { addPlayerXP, xpForKill, xpForWaveComplete } from "./xp.js";
import { addUnitXP } from "./unit-xp.js";
import { spawnLevelUpText, spawnFloatingText } from "./effects.js";
import { play as playSfx, unlockOnFirstInteraction } from "./audio.js";
import {
  initUI,
  renderAll,
  syncUnitsFrame,
  processCombatEvents,
  renderHUD,
  renderParty,
  renderXPBar,
  renderModal,
  renderGameOverModal,
  closeModal,
  clearGameDOM,
  getEffectsLayer,
} from "./ui.js";

function canCardDrop(payload, target) {
  if (state.phase === PHASE.GAME_OVER) return false;
  if (!payload || !target) return false;
  const zone = target.dataset.dropZone;
  const cardType = payload.cardType;

  if (cardType === CARD_TYPES.CHARACTER) {
    return zone === "field";
  }

  if (zone === "unit") {
    const unitId = Number(target.dataset.unitId);
    return state.units.some((u) => u.id === unitId);
  }
  return false;
}

function onCardDrop({ zone, clientX, clientY, payload, target }) {
  const card = getCardById(payload.cardId);
  if (!card) return;

  if (card.type === CARD_TYPES.CHARACTER) {
    if (zone === "field") {
      spawnCharacterAtClient(card, clientX, clientY);
    }
    return;
  }

  if (zone === "unit") {
    const unitId = Number(target.dataset.unitId);
    applyUpgradeCard(card, unitId);
  }
}

function spawnCharacterAtClient(card, clientX, clientY) {
  const bf = document.getElementById("battlefield");
  if (!bf) return;
  const r = bf.getBoundingClientRect();
  const margin = 16;
  const x = Math.max(
    margin,
    Math.min(state.field.width - margin, clientX - r.left),
  );
  const y = Math.max(
    margin,
    Math.min(state.field.height - margin, clientY - r.top),
  );

  const unit = createPlayerUnit(x, y);
  state.units.push(unit);
  removeCardFromHand(card.id);
  renderAll();
}

function applyUpgradeCard(card, unitId) {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return;
  applyUpgrade(unit, card.type);
  removeCardFromHand(card.id);
  renderAll();
}

function onStartBattle() {
  if (state.units.length === 0) return;
  state.phase = PHASE.BATTLE;
  state.wave = 1;
  spawnWave(state.wave);
  playSfx("startBattle");
  setTimeout(() => playSfx("waveStart"), 180);
  renderAll();
}

function handlePostTickEvents() {
  let scoreDelta = 0;
  let killDelta = 0;
  let xpDelta = 0;

  const layer = getEffectsLayer();
  for (const ev of state.pendingEvents) {
    if (ev.type !== "death") continue;
    const u = ev.unit;
    if (u.kind === "enemy") {
      scoreDelta += 10;
      killDelta += 1;
      const xp = xpForKill(state.wave);
      xpDelta += xp;
      if (layer) {
        spawnFloatingText(layer, u.x, u.y - u.size / 2, `+${xp} XP`, "xp");
      }
      playSfx("enemyDeath");
      playSfx("xpGain");
    }
  }

  if (scoreDelta || killDelta) {
    state.score += scoreDelta;
    state.enemiesKilled += killDelta;
  }
  if (xpDelta > 0) {
    awardPlayerXP(xpDelta);
  }
}

function awardPlayerXP(amount) {
  const levels = addPlayerXP(amount);
  for (let i = 0; i < levels; i++) {
    state.pendingLevelUps.push({ kind: "player" });
  }
  if (levels > 0) playSfx("levelUp");
}

function checkUnitLevelUps() {
  let totalLevels = 0;
  for (const u of state.units) {
    const levels = addUnitXP(u, 0);
    for (let i = 0; i < levels; i++) {
      state.pendingLevelUps.push({ kind: "unit", unitId: u.id });
      const layer = getEffectsLayer();
      if (layer) spawnLevelUpText(layer, u.x, u.y - u.size);
    }
    totalLevels += levels;
  }
  if (totalLevels > 0) playSfx("levelUp");
  void UNIT_XP;
}

function maybeStartLevelUpFlow() {
  if (state.pendingLevelUps.length === 0) return;
  if (state.phase === PHASE.PAUSED_LEVEL_UP) return;
  if (state.phase === PHASE.GAME_OVER) return;
  state.resumePhase = state.phase;
  state.phase = PHASE.PAUSED_LEVEL_UP;
  showNextLevelUp();
}

function showNextLevelUp() {
  if (state.pendingLevelUps.length === 0) {
    state.phase = state.resumePhase || PHASE.BATTLE;
    state.resumePhase = null;
    closeModal();
    renderAll();
    return;
  }
  const next = state.pendingLevelUps.shift();
  if (next.kind === "player") {
    showPlayerLevelUpModal();
  } else {
    showUnitLevelUpModal(next.unitId);
  }
}

function safePickHandler(applyFn) {
  let consumed = false;
  return (option) => {
    if (consumed) return;
    consumed = true;
    closeModal();
    try {
      applyFn(option);
    } catch (err) {
      console.error("[level-up] erro ao aplicar escolha:", err);
    }
    try {
      renderAll();
    } catch (err) {
      console.error("[level-up] erro ao re-renderizar:", err);
    }
    showNextLevelUp();
  };
}

function showPlayerLevelUpModal() {
  const cards = rollLevelUpCards(3);
  renderModal({
    title: `Nível ${state.player.level}!`,
    subtitle: "Escolha uma carta",
    cards,
    onPick: safePickHandler((card) => {
      state.hand.push(card);
    }),
  });
}

function showUnitLevelUpModal(unitId) {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) {
    showNextLevelUp();
    return;
  }
  const options = rollUnitLevelUpOptions(unit, 3);
  renderModal({
    title: `${unit.name} — Lv.${unit.level}`,
    subtitle: "Escolha um upgrade",
    cards: options,
    onPick: safePickHandler((option) => {
      applyUnitLevelUpOption(unit, option);
    }),
  });
}

function applyUnitLevelUpOption(unit, option) {
  if (option.kind === "special") {
    applySpecial(unit, option.special);
  } else {
    applyUpgrade(unit, option.type);
  }
}

let lastFrame = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.phase === PHASE.BATTLE) {
    const prevPhase = state.phase;
    combatTick(dt);
    handlePostTickEvents();
    checkUnitLevelUps();

    if (prevPhase === PHASE.BATTLE && state.phase === PHASE.BETWEEN_WAVES) {
      awardPlayerXP(xpForWaveComplete(state.wave));
    }

    processCombatEvents();
    syncUnitsFrame();

    renderHUD();
    renderParty();
    renderXPBar();

    maybeStartLevelUpFlow();
    maybeShowGameOver();
  } else if (state.phase === PHASE.BETWEEN_WAVES) {
    state.pendingWaveTimer -= dt;
    processCombatEvents();
    syncUnitsFrame();
    renderHUD();
    renderXPBar();
    if (state.pendingWaveTimer <= 0) {
      state.wave += 1;
      spawnWave(state.wave);
      state.phase = PHASE.BATTLE;
      playSfx("waveStart");
      renderAll();
    }
  } else if (state.phase === PHASE.PAUSED_LEVEL_UP) {
    processCombatEvents();
    syncUnitsFrame();
  } else if (state.phase === PHASE.GAME_OVER) {
    maybeShowGameOver();
  }

  requestAnimationFrame(frame);
}

function maybeShowGameOver() {
  if (state.phase !== PHASE.GAME_OVER) return;
  if (state.gameOverShown) return;
  state.gameOverShown = true;
  playSfx("gameOver");
  renderHUD();
  renderGameOverModal(
    {
      wave: state.wave,
      kills: state.enemiesKilled,
      score: state.score,
    },
    restartGame,
  );
}

function restartGame() {
  resetState();
  clearGameDOM();
  drawInitialHand();
  renderAll();
}

function start() {
  initUI({
    canCardDrop,
    onCardDrop,
    onStartBattle,
  });
  unlockOnFirstInteraction();
  resetState();
  drawInitialHand();
  renderAll();

  lastFrame = performance.now();
  requestAnimationFrame(frame);
  void GAME;
}

start();
