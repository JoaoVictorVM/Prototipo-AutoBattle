import {
  CARD_POOL,
  CARD_TYPES,
  CARD_INFO,
  GAME,
  SPECIALS,
} from "./constants.js";
import { state, nextId } from "./state.js";

const POOL_ORDER = [
  { type: CARD_TYPES.CHARACTER, weight: CARD_POOL.CHARACTER },
  { type: CARD_TYPES.HP, weight: CARD_POOL.HP },
  { type: CARD_TYPES.ATK, weight: CARD_POOL.ATK },
  { type: CARD_TYPES.ATK_SPEED, weight: CARD_POOL.ATK_SPEED },
  { type: CARD_TYPES.MOVE_SPEED, weight: CARD_POOL.MOVE_SPEED },
  { type: CARD_TYPES.SPECIAL, weight: CARD_POOL.SPECIAL },
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
  if (type === CARD_TYPES.SPECIAL) {
    return makeSpecialCard();
  }
  const info = CARD_INFO[type];
  return {
    id: nextId("nextCardId"),
    type,
    title: info.title,
    typeLabel: info.typeLabel,
    desc: info.desc,
  };
}

// Sorteia uma habilidade aleatória do pool de SPECIALS e devolve uma
// carta com type="special" + specialKey + cor.
function makeSpecialCard() {
  const all = Object.values(SPECIALS);
  const special = all[Math.floor(Math.random() * all.length)];
  return {
    id: nextId("nextCardId"),
    type: CARD_TYPES.SPECIAL,
    specialKey: special.key,
    color: special.color,
    title: special.name,
    typeLabel: "Habilidade",
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
