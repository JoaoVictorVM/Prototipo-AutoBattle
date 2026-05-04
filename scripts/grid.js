import { GAME } from "./constants.js";
import { state, nextId } from "./state.js";

const SPACING = GAME.SLOT_SPACING;

function slotKey(col, row) {
  return `${col},${row}`;
}

function findSlot(col, row) {
  return state.slots.find((s) => s.col === col && s.row === row);
}

function colRowToXY(col, row) {
  const centerX = state.field.width / 2;
  const baseY = state.field.height - 60;
  return {
    x: centerX + col * SPACING,
    y: baseY - row * SPACING,
  };
}

function isWithinPlayerHalf(y) {
  return y >= GAME.PLAYER_HALF_Y && y <= state.field.height;
}

export function initGrid() {
  state.slots = [];
  addSlot(0, 0);
}

function addSlot(col, row) {
  if (findSlot(col, row)) return;
  const { x, y } = colRowToXY(col, row);
  if (!isWithinPlayerHalf(y)) return;
  if (x < 24 || x > state.field.width - 24) return;
  state.slots.push({
    id: nextId("nextSlotId"),
    col,
    row,
    x,
    y,
    occupied: false,
    unitId: null,
    key: slotKey(col, row),
  });
}

export function expandFromSlot(col, row) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dc, dr] of dirs) {
    addSlot(col + dc, row + dr);
  }
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
