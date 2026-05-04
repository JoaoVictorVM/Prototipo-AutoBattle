import { GAME } from "./constants.js";
import { state, nextId } from "./state.js";

const SPACING = GAME.SLOT_SPACING;

function findSlot(col, row) {
  return state.slots.find((s) => s.col === col && s.row === row);
}

function colRowToXY(col, row) {
  const origin = state.gridOrigin;
  if (!origin) return { x: 0, y: 0 };
  return {
    x: origin.x + col * SPACING,
    y: origin.y - row * SPACING,
  };
}

function isWithinField(x, y) {
  const margin = GAME.SLOT_SIZE / 2;
  return (
    x >= margin &&
    x <= state.field.width - margin &&
    y >= margin &&
    y <= state.field.height - margin
  );
}

export function initGrid() {
  state.slots = [];
  state.gridOrigin = null;
}

// Cria o primeiro slot (col=0,row=0) na posição clicada e expande adjacentes.
// Retorna o slot criado ou null se a posição estiver fora do campo.
export function placeFirstSlotAt(x, y) {
  if (state.gridOrigin || state.slots.length > 0) return null;
  if (!isWithinField(x, y)) return null;
  state.gridOrigin = { x, y };
  const slot = {
    id: nextId("nextSlotId"),
    col: 0,
    row: 0,
    x,
    y,
    occupied: false,
    unitId: null,
  };
  state.slots.push(slot);
  return slot;
}

function addSlot(col, row) {
  if (findSlot(col, row)) return;
  const { x, y } = colRowToXY(col, row);
  if (!isWithinField(x, y)) return;
  state.slots.push({
    id: nextId("nextSlotId"),
    col,
    row,
    x,
    y,
    occupied: false,
    unitId: null,
  });
}

export function expandFromSlot(col, row) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dc, dr] of dirs) addSlot(col + dc, row + dr);
}

export function getAvailableSlots() {
  return state.slots.filter((s) => !s.occupied);
}

export function getSlotById(id) {
  return state.slots.find((s) => s.id === id);
}

export function occupySlot(slotId, unitId) {
  const slot = getSlotById(slotId);
  if (!slot || slot.occupied) return false;
  slot.occupied = true;
  slot.unitId = unitId;
  expandFromSlot(slot.col, slot.row);
  return true;
}

export function freeSlotByUnit(unitId) {
  const slot = state.slots.find((s) => s.unitId === unitId);
  if (slot) {
    slot.occupied = false;
    slot.unitId = null;
  }
}
