import { state } from "./state.js";
import { CARD_TYPES, PHASE } from "./constants.js";
import { totalUpgrades, upgradeSummary } from "./units.js";

const dom = {
  hudWave: null,
  hudScore: null,
  hudStatus: null,
  battlefield: null,
  gridLayer: null,
  unitsLayer: null,
  effectsLayer: null,
  startBtn: null,
  xpFill: null,
  xpLevel: null,
  xpCurrent: null,
  xpNeeded: null,
  partyList: null,
  handList: null,
  modalRoot: null,
};

const handlers = {
  onSlotClick: null,
  onCardClick: null,
  onUnitClick: null,
  onPartyMemberClick: null,
  onStartBattle: null,
};

export function initUI(callbacks) {
  Object.assign(handlers, callbacks);

  dom.hudWave = document.getElementById("hud-wave");
  dom.hudScore = document.getElementById("hud-score");
  dom.hudStatus = document.getElementById("hud-status");
  dom.battlefield = document.getElementById("battlefield");
  dom.gridLayer = document.getElementById("grid-layer");
  dom.unitsLayer = document.getElementById("units-layer");
  dom.effectsLayer = document.getElementById("effects-layer");
  dom.startBtn = document.getElementById("start-battle-btn");
  dom.xpFill = document.getElementById("xp-bar-fill");
  dom.xpLevel = document.getElementById("xp-level");
  dom.xpCurrent = document.getElementById("xp-current");
  dom.xpNeeded = document.getElementById("xp-needed");
  dom.partyList = document.getElementById("party-list");
  dom.handList = document.getElementById("hand-list");
  dom.modalRoot = document.getElementById("modal-root");

  const rect = dom.battlefield.getBoundingClientRect();
  state.field.width = rect.width;
  state.field.height = rect.height;

  dom.startBtn.addEventListener("click", () => handlers.onStartBattle?.());

  window.addEventListener("resize", () => {
    const r = dom.battlefield.getBoundingClientRect();
    state.field.width = r.width;
    state.field.height = r.height;
  });
}

export function getEffectsLayer() {
  return dom.effectsLayer;
}

export function renderAll() {
  renderHUD();
  renderGrid();
  renderUnits();
  renderXPBar();
  renderParty();
  renderHand();
  renderStartButton();
}

export function renderHUD() {
  dom.hudWave.textContent = state.wave;
  dom.hudScore.textContent = state.score;
  dom.hudStatus.textContent = state.phase;
}

export function renderStartButton() {
  const canStart =
    state.phase === PHASE.SETUP && state.units.length > 0;
  dom.startBtn.disabled = !canStart;
  dom.startBtn.style.display =
    state.phase === PHASE.SETUP ? "inline-block" : "none";
}

export function renderGrid() {
  dom.gridLayer.innerHTML = "";
  const showSlots =
    state.phase === PHASE.SETUP || isPickingCharacterSlot();

  if (!showSlots) return;

  for (const slot of state.slots) {
    if (slot.occupied) continue;
    const el = document.createElement("div");
    el.className = "slot";
    if (isPickingCharacterSlot()) el.classList.add("slot--highlighted");
    el.style.left = `${slot.x}px`;
    el.style.top = `${slot.y}px`;
    el.dataset.slotId = String(slot.id);
    el.addEventListener("click", () => handlers.onSlotClick?.(slot.id));
    dom.gridLayer.appendChild(el);
  }
}

function isPickingCharacterSlot() {
  if (!state.selectedCardId) return false;
  const card = state.hand.find((c) => c.id === state.selectedCardId);
  return card?.type === CARD_TYPES.CHARACTER;
}

export function renderUnits() {
  // Renderização inicial: cria elementos para unidades sem `el`.
  for (const u of state.units) {
    if (!u.el) {
      const el = document.createElement("div");
      el.className = "unit unit--ally";
      const hpBar = document.createElement("div");
      hpBar.className = "unit__hp-bar";
      const hpFill = document.createElement("div");
      hpFill.className = "unit__hp-fill";
      hpBar.appendChild(hpFill);
      el.appendChild(hpBar);
      el.dataset.unitId = String(u.id);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        handlers.onUnitClick?.(u.id);
      });
      dom.unitsLayer.appendChild(el);
      u.el = el;
      u._hpFill = hpFill;
    }
    syncUnitVisual(u);
  }

  for (const e of state.enemies) {
    if (!e.el) {
      const el = document.createElement("div");
      el.className = `unit unit--enemy unit--${e.type}`;
      const hpBar = document.createElement("div");
      hpBar.className = "unit__hp-bar";
      const hpFill = document.createElement("div");
      hpFill.className = "unit__hp-fill";
      hpBar.appendChild(hpFill);
      el.appendChild(hpBar);
      el.dataset.enemyId = String(e.id);
      dom.unitsLayer.appendChild(el);
      e.el = el;
      e._hpFill = hpFill;
    }
    syncUnitVisual(e);
  }
}

function syncUnitVisual(u) {
  if (!u.el) return;
  u.el.style.width = `${u.size}px`;
  u.el.style.height = `${u.size}px`;
  u.el.style.left = `${u.x}px`;
  u.el.style.top = `${u.y}px`;
  if (u.kind === "ally") {
    const ups = Math.min(3, totalUpgrades(u));
    u.el.dataset.upgrades = String(ups);
    if (u.specials && u.specials.length > 0) {
      u.el.style.backgroundColor = blendSpecialColors(u.specials);
    }
    const targetable =
      state.selectedCardId &&
      state.hand.find((c) => c.id === state.selectedCardId)?.type !==
        CARD_TYPES.CHARACTER;
    u.el.classList.toggle("is-targetable", !!targetable);
  }
  if (u._hpFill) {
    const pct = Math.max(0, Math.min(1, u.hp / u.maxHp));
    u._hpFill.style.width = `${pct * 100}%`;
  }
}

function blendSpecialColors(specials) {
  if (specials.length === 1) return specials[0].color;
  const rgbs = specials.map(hexToRgb);
  const avg = rgbs.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
    { r: 0, g: 0, b: 0 }
  );
  const n = rgbs.length;
  return `rgb(${Math.round(avg.r / n)}, ${Math.round(avg.g / n)}, ${Math.round(
    avg.b / n
  )})`;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function renderXPBar() {
  const p = state.player;
  const pct = Math.max(0, Math.min(1, p.xp / p.xpNeeded));
  dom.xpFill.style.width = `${pct * 100}%`;
  dom.xpLevel.textContent = p.level;
  dom.xpCurrent.textContent = Math.floor(p.xp);
  dom.xpNeeded.textContent = p.xpNeeded;
}

export function renderParty() {
  dom.partyList.innerHTML = "";
  if (state.units.length === 0) {
    const empty = document.createElement("div");
    empty.className = "party-member__upgrades";
    empty.textContent = "Sem heróis. Use a carta de Personagem.";
    dom.partyList.appendChild(empty);
    return;
  }
  for (const u of state.units) {
    const card = document.createElement("div");
    card.className = "party-member";

    const icon = document.createElement("div");
    icon.className = "party-member__icon";
    icon.style.background =
      u.specials.length > 0 ? blendSpecialColors(u.specials) : "var(--color-ally)";
    card.appendChild(icon);

    const info = document.createElement("div");
    info.className = "party-member__info";

    const row = document.createElement("div");
    row.className = "party-member__row";
    const name = document.createElement("span");
    name.textContent = `${u.name}  Lv.${u.level}`;
    const hp = document.createElement("span");
    hp.textContent = `HP ${Math.ceil(u.hp)}/${u.maxHp}`;
    row.appendChild(name);
    row.appendChild(hp);
    info.appendChild(row);

    const ups = document.createElement("div");
    ups.className = "party-member__upgrades";
    ups.textContent = upgradeSummary(u) || "—";
    info.appendChild(ups);

    const xp = document.createElement("div");
    xp.className = "party-member__xp";
    const xpFill = document.createElement("div");
    xpFill.className = "party-member__xp-fill";
    xpFill.style.width = `${(u.xp / u.xpNeeded) * 100}%`;
    xp.appendChild(xpFill);
    info.appendChild(xp);

    card.appendChild(info);

    card.addEventListener("click", () => handlers.onPartyMemberClick?.(u.id));
    dom.partyList.appendChild(card);
  }
}

export function renderHand() {
  dom.handList.innerHTML = "";
  if (state.hand.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card__desc";
    empty.textContent = "Mão vazia.";
    dom.handList.appendChild(empty);
    return;
  }
  for (const card of state.hand) {
    const el = document.createElement("div");
    el.className = `card card--${card.type}`;
    if (card.id === state.selectedCardId) el.classList.add("card--selected");

    const typeLabel = document.createElement("div");
    typeLabel.className = "card__type";
    typeLabel.textContent = card.typeLabel;
    el.appendChild(typeLabel);

    const title = document.createElement("div");
    title.className = "card__title";
    title.textContent = card.title;
    el.appendChild(title);

    const desc = document.createElement("div");
    desc.className = "card__desc";
    desc.textContent = card.desc;
    el.appendChild(desc);

    el.addEventListener("click", () => handlers.onCardClick?.(card.id));
    dom.handList.appendChild(el);
  }
}

export function renderModal({ title, subtitle, cards, onPick, footer }) {
  dom.modalRoot.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal";

  const t = document.createElement("h2");
  t.className = "modal__title";
  t.textContent = title;
  modal.appendChild(t);

  if (subtitle) {
    const s = document.createElement("div");
    s.className = "modal__subtitle";
    s.textContent = subtitle;
    modal.appendChild(s);
  }

  if (cards && cards.length) {
    const cardsWrap = document.createElement("div");
    cardsWrap.className = "modal__cards";
    cards.forEach((card, idx) => {
      const el = document.createElement("div");
      el.className = `card card--${card.type}`;

      const typeLabel = document.createElement("div");
      typeLabel.className = "card__type";
      typeLabel.textContent = card.typeLabel;
      el.appendChild(typeLabel);

      const title2 = document.createElement("div");
      title2.className = "card__title";
      title2.textContent = card.title;
      el.appendChild(title2);

      const desc = document.createElement("div");
      desc.className = "card__desc";
      desc.textContent = card.desc;
      el.appendChild(desc);

      el.addEventListener("click", () => onPick?.(card, idx));
      cardsWrap.appendChild(el);
    });
    modal.appendChild(cardsWrap);
  }

  if (footer) modal.appendChild(footer);

  overlay.appendChild(modal);
  dom.modalRoot.appendChild(overlay);
}

export function closeModal() {
  dom.modalRoot.innerHTML = "";
}
