import { state, resetState } from "./state.js";
import { CARD_TYPES, PHASE, GAME, UNIT_XP } from "./constants.js";
import {
  initGrid,
  getSlotById,
  occupySlot,
  freeSlotByUnit,
  placeFirstSlotAt,
} from "./grid.js";
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
import { spawnLevelUpText } from "./effects.js";
import {
  initUI,
  renderAll,
  syncUnitsFrame,
  processCombatEvents,
  renderHUD,
  renderParty,
  renderXPBar,
  renderModal,
  closeModal,
  getEffectsLayer,
} from "./ui.js";

// ---- Handlers de UI ----------------------------------------------------

function onSlotClick(slotId) {
  if (state.phase === PHASE.GAME_OVER) return;
  const card = state.selectedCardId ? getCardById(state.selectedCardId) : null;
  if (!card || card.type !== CARD_TYPES.CHARACTER) return;

  const slot = getSlotById(slotId);
  if (!slot || slot.occupied) return;

  const unit = createPlayerUnit(slot.x, slot.y, slot.id);
  state.units.push(unit);
  occupySlot(slot.id, unit.id);
  removeCardFromHand(card.id);
  state.selectedCardId = null;
  renderAll();
}

function onFieldClick(x, y) {
  if (state.phase === PHASE.GAME_OVER) return;
  const card = state.selectedCardId ? getCardById(state.selectedCardId) : null;
  if (!card || card.type !== CARD_TYPES.CHARACTER) return;
  if (state.gridOrigin) return;

  const slot = placeFirstSlotAt(x, y);
  if (!slot) return;

  const unit = createPlayerUnit(slot.x, slot.y, slot.id);
  state.units.push(unit);
  occupySlot(slot.id, unit.id);
  removeCardFromHand(card.id);
  state.selectedCardId = null;
  renderAll();
}

function onCardClick(cardId) {
  const card = getCardById(cardId);
  if (!card) return;
  state.selectedCardId = state.selectedCardId === cardId ? null : cardId;
  renderAll();
}

function onUnitClick(unitId) {
  applyCardToUnit(unitId);
}

function onPartyMemberClick(unitId) {
  applyCardToUnit(unitId);
}

function applyCardToUnit(unitId) {
  const card = state.selectedCardId ? getCardById(state.selectedCardId) : null;
  if (!card) return;
  if (card.type === CARD_TYPES.CHARACTER) return;

  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return;

  applyUpgrade(unit, card.type);
  removeCardFromHand(card.id);
  state.selectedCardId = null;
  renderAll();
}

function onStartBattle() {
  if (state.units.length === 0) return;
  state.phase = PHASE.BATTLE;
  state.wave = 1;
  spawnWave(state.wave);
  renderAll();
}

// ---- Eventos pós-combate (XP, score, slots livres) ---------------------

function handlePostTickEvents() {
  let scoreDelta = 0;
  let killDelta = 0;
  let xpDelta = 0;

  for (const ev of state.pendingEvents) {
    if (ev.type !== "death") continue;
    const u = ev.unit;
    if (u.kind === "enemy") {
      scoreDelta += 10;
      killDelta += 1;
      xpDelta += xpForKill(state.wave);
    } else if (u.kind === "ally") {
      freeSlotByUnit(u.id);
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

// ---- Level up flow -----------------------------------------------------

function awardPlayerXP(amount) {
  const levels = addPlayerXP(amount);
  for (let i = 0; i < levels; i++) {
    state.pendingLevelUps.push({ kind: "player" });
  }
}

function checkUnitLevelUps() {
  // combat.js já incrementou unit.xp; aqui só consumimos os thresholds.
  for (const u of state.units) {
    const levels = addUnitXP(u, 0);
    for (let i = 0; i < levels; i++) {
      state.pendingLevelUps.push({ kind: "unit", unitId: u.id });
      const layer = getEffectsLayer();
      if (layer) spawnLevelUpText(layer, u.x, u.y - u.size);
    }
  }
  void UNIT_XP;
}

function maybeStartLevelUpFlow() {
  if (state.pendingLevelUps.length === 0) return;
  if (state.phase === PHASE.PAUSED_LEVEL_UP) return;
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

// Garante que o ciclo apply→render→nextModal não fique parado se algo
// dentro do apply ou do render lançar uma exceção. Também previne
// double-click consumindo dois itens da fila com um único pick.
function safePickHandler(applyFn) {
  let consumed = false;
  return (option) => {
    if (consumed) return;
    consumed = true;
    closeModal(); // feedback imediato; o próximo modal substitui se houver
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

// ---- Loop principal ----------------------------------------------------

let lastFrame = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.phase === PHASE.BATTLE) {
    const prevPhase = state.phase;
    combatTick(dt);
    handlePostTickEvents();
    checkUnitLevelUps();

    // Bônus de XP se a wave foi concluída neste tick.
    if (prevPhase === PHASE.BATTLE && state.phase === PHASE.BETWEEN_WAVES) {
      awardPlayerXP(xpForWaveComplete(state.wave));
    }

    processCombatEvents();
    syncUnitsFrame();

    renderHUD();
    renderParty();
    renderXPBar();

    maybeStartLevelUpFlow();

    if (state.phase === PHASE.GAME_OVER) {
      renderAll();
    }
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
      renderAll();
    }
  } else if (state.phase === PHASE.PAUSED_LEVEL_UP) {
    // Pausa total — modal fica visível, só processamos animações
    // residuais para nada ficar travado no meio.
    processCombatEvents();
    syncUnitsFrame();
  }

  requestAnimationFrame(frame);
}

// ---- Bootstrap ---------------------------------------------------------

function start() {
  initUI({
    onSlotClick,
    onFieldClick,
    onCardClick,
    onUnitClick,
    onPartyMemberClick,
    onStartBattle,
  });
  resetState();
  initGrid();
  drawInitialHand();
  renderAll();

  lastFrame = performance.now();
  requestAnimationFrame(frame);
  void GAME;
}

start();
