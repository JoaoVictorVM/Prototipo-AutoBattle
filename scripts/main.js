import { state } from "./state.js";
import { CARD_TYPES, PHASE } from "./constants.js";
import { initGrid, getSlotById, occupySlot } from "./grid.js";
import { createPlayerUnit, applyUpgrade } from "./units.js";
import { drawInitialHand, getCardById, removeCardFromHand } from "./cards.js";
import { initUI, renderAll } from "./ui.js";

function onSlotClick(slotId) {
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

function onCardClick(cardId) {
  const card = getCardById(cardId);
  if (!card) return;
  state.selectedCardId =
    state.selectedCardId === cardId ? null : cardId;
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
  // Loop de combate é ativado na Fase 2.
  renderAll();
}

function start() {
  initUI({
    onSlotClick,
    onCardClick,
    onUnitClick,
    onPartyMemberClick,
    onStartBattle,
  });
  initGrid();
  drawInitialHand();
  renderAll();

  // Loop de game (delta time). Por ora, só re-renderiza unidades caso movam.
  let last = performance.now();
  function frame(now) {
    const dt = (now - last) / 1000;
    last = now;
    void dt;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
