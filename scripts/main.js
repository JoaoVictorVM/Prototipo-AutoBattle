import { state, resetState } from "./state.js";
import { CARD_TYPES, PHASE, GAME } from "./constants.js";
import {
  initGrid,
  getSlotById,
  occupySlot,
  freeSlotByUnit,
  placeFirstSlotAt,
} from "./grid.js";
import { createPlayerUnit, applyUpgrade } from "./units.js";
import { drawInitialHand, getCardById, removeCardFromHand } from "./cards.js";
import { spawnWave } from "./waves.js";
import { combatTick } from "./combat.js";
import {
  initUI,
  renderAll,
  syncUnitsFrame,
  processCombatEvents,
  renderHUD,
  renderParty,
  renderXPBar,
} from "./ui.js";

// ---- Handlers de UI ----------------------------------------------------

function onSlotClick(slotId) {
  if (state.phase !== PHASE.SETUP) return;
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
  if (state.phase !== PHASE.SETUP) return;
  const card = state.selectedCardId ? getCardById(state.selectedCardId) : null;
  if (!card || card.type !== CARD_TYPES.CHARACTER) return;
  if (state.gridOrigin) return; // só ativo quando ainda não há origem

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

// ---- Processamento de eventos pós-combate ------------------------------

function handlePostTickEvents() {
  let scoreDelta = 0;
  let killDelta = 0;

  for (const ev of state.pendingEvents) {
    if (ev.type !== "death") continue;
    const u = ev.unit;
    if (u.kind === "enemy") {
      scoreDelta += 10;
      killDelta += 1;
    } else if (u.kind === "ally") {
      freeSlotByUnit(u.id);
    }
  }

  if (scoreDelta || killDelta) {
    state.score += scoreDelta;
    state.enemiesKilled += killDelta;
  }
}

// ---- Loop principal ----------------------------------------------------

let lastFrame = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.phase === PHASE.BATTLE && !state.isPaused) {
    combatTick(dt);
    handlePostTickEvents();
    processCombatEvents();
    syncUnitsFrame();

    // Atualiza HUD/party/xp leve a cada frame de batalha
    // (são re-renderizações baratas do estado).
    renderHUD();
    renderParty();
    renderXPBar();

    if (state.phase === PHASE.GAME_OVER) {
      renderAll();
    } else if (state.phase === PHASE.BETWEEN_WAVES) {
      renderAll();
    }
  } else if (state.phase === PHASE.BETWEEN_WAVES && !state.isPaused) {
    state.pendingWaveTimer -= dt;
    processCombatEvents();
    syncUnitsFrame();
    if (state.pendingWaveTimer <= 0) {
      state.wave += 1;
      spawnWave(state.wave);
      state.phase = PHASE.BATTLE;
      renderAll();
    }
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
