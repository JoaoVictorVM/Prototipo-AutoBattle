import {
  CARD_POOL,
  CARD_TYPES,
  CARD_INFO,
  GAME,
  SPECIALS,
  UNIT_XP,
} from "./constants.js";
import { state, nextId } from "./state.js";

const POOL_ORDER = [
  { type: CARD_TYPES.CHARACTER, weight: CARD_POOL.CHARACTER },
  { type: CARD_TYPES.HP, weight: CARD_POOL.HP },
  { type: CARD_TYPES.ATK, weight: CARD_POOL.ATK },
  { type: CARD_TYPES.ATK_SPEED, weight: CARD_POOL.ATK_SPEED },
  { type: CARD_TYPES.MOVE_SPEED, weight: CARD_POOL.MOVE_SPEED },
];

function pickCardType() {
  const r = Math.random();
  let acc = 0;
  for (const entry of POOL_ORDER) {
    acc += entry.weight;
    if (r <= acc) return entry.type;
  }
  return POOL_ORDER[0].type;
}

export function makeCard(type) {
  const info = CARD_INFO[type];
  return {
    id: nextId("nextCardId"),
    type,
    title: info.title,
    typeLabel: info.typeLabel,
    desc: info.desc,
  };
}

export function drawInitialHand() {
  const cards = [];
  cards.push(makeCard(CARD_TYPES.CHARACTER));
  while (cards.length < GAME.INITIAL_HAND_SIZE) {
    cards.push(makeCard(pickCardType()));
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  state.hand = cards;
}

export function removeCardFromHand(cardId) {
  state.hand = state.hand.filter((c) => c.id !== cardId);
}

export function getCardById(cardId) {
  return state.hand.find((c) => c.id === cardId) || null;
}

export function rollLevelUpCards(count = 3) {
  const result = [];
  for (let i = 0; i < count; i++) result.push(makeCard(pickCardType()));
  return result;
}

const UNIT_UPGRADE_TYPES = [
  CARD_TYPES.HP,
  CARD_TYPES.ATK,
  CARD_TYPES.ATK_SPEED,
  CARD_TYPES.MOVE_SPEED,
];

function makeUpgradeOption(type) {
  const info = CARD_INFO[type];
  return {
    id: nextId("nextCardId"),
    kind: "upgrade",
    type,
    title: info.title,
    typeLabel: "Upgrade",
    desc: info.desc,
  };
}

function makeSpecialOption(special) {
  return {
    id: nextId("nextCardId"),
    kind: "special",
    type: "special",
    special,
    title: special.name,
    typeLabel: "Habilidade",
    desc: special.desc,
  };
}

export function rollUnitLevelUpOptions(unit, count = 3) {
  const available = Object.values(SPECIALS).filter(
    (s) => !unit.specials.find((x) => x.key === s.key),
  );
  let specialUsed = false;
  const result = [];
  for (let i = 0; i < count; i++) {
    const rollSpecial =
      !specialUsed &&
      available.length > 0 &&
      Math.random() < UNIT_XP.SPECIAL_CHANCE;
    if (rollSpecial) {
      const idx = Math.floor(Math.random() * available.length);
      const [special] = available.splice(idx, 1);
      result.push(makeSpecialOption(special));
      specialUsed = true;
    } else {
      const t =
        UNIT_UPGRADE_TYPES[
          Math.floor(Math.random() * UNIT_UPGRADE_TYPES.length)
        ];
      result.push(makeUpgradeOption(t));
    }
  }
  return result;
}
