import { state } from "./state.js";
import { PHASE } from "./constants.js";
import { totalUpgrades } from "./units.js";
import {
  flashDamage,
  playAttackPunch,
  playDeath,
  spawnFloatingText,
} from "./effects.js";
import { enableDrag } from "./drag.js";
import { play as playSfx } from "./audio.js";

const dom = {
  hudWave: null,
  hudScore: null,
  hudStatus: null,
  battlefield: null,
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
  canCardDrop: null,
  onCardDrop: null,
  onStartBattle: null,
};

export function initUI(callbacks) {
  Object.assign(handlers, callbacks);

  dom.hudWave = document.getElementById("hud-wave");
  dom.hudScore = document.getElementById("hud-score");
  dom.hudStatus = document.getElementById("hud-status");
  dom.battlefield = document.getElementById("battlefield");
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
    layoutHand();
  });

  // Tracking do cursor em coordenadas do battlefield, pra usar
  // pelo magnet das XP orbs.
  window.addEventListener("mousemove", (ev) => {
    const r = dom.battlefield.getBoundingClientRect();
    state.cursor.x = ev.clientX - r.left;
    state.cursor.y = ev.clientY - r.top;
  });
}

export function getEffectsLayer() {
  return dom.effectsLayer;
}

export function renderAll() {
  renderHUD();
  renderUnits();
  renderXPBar();
  renderParty();
  renderHand();
  renderStartButton();
}

export function renderHUD() {
  dom.hudWave.textContent = state.wave;
  dom.hudScore.textContent = state.score;
  dom.hudStatus.textContent = phaseLabel();
  document.body.dataset.phase = state.phase;
}

function phaseLabel() {
  switch (state.phase) {
    case PHASE.SETUP:
      return "MONTANDO TIME";
    case PHASE.BATTLE:
      return `BATALHA — ${state.enemies.length} inimigos`;
    case PHASE.BETWEEN_WAVES: {
      const t = Math.max(0, state.pendingWaveTimer);
      return `PRÓXIMA WAVE EM ${t.toFixed(1)}s`;
    }
    case PHASE.PAUSED_LEVEL_UP:
      return "LEVEL UP";
    case PHASE.GAME_OVER:
      return "GAME OVER";
    default:
      return state.phase;
  }
}

export function renderStartButton() {
  const canStart = state.phase === PHASE.SETUP && state.units.length > 0;
  dom.startBtn.disabled = !canStart;
  dom.startBtn.style.display =
    state.phase === PHASE.SETUP ? "inline-block" : "none";
}

// Mantém um Map id→DOM das orbs para criar/atualizar/remover sem
// reconstruir tudo a cada frame.
const renderedOrbs = new Map();

export function syncOrbsFrame() {
  if (!dom.effectsLayer) return;
  const present = new Set();

  for (const orb of state.xpOrbs) {
    present.add(orb.id);
    let el = renderedOrbs.get(orb.id);
    if (!el) {
      el = document.createElement("div");
      el.className = "xp-orb";
      dom.effectsLayer.appendChild(el);
      renderedOrbs.set(orb.id, el);
    }
    el.style.left = `${orb.x}px`;
    el.style.top = `${orb.y}px`;
  }

  // Limpa orbs que saíram do estado (coletadas ou expiradas).
  for (const [id, el] of renderedOrbs) {
    if (!present.has(id)) {
      el.classList.add("xp-orb--collected");
      setTimeout(() => el.remove(), 220);
      renderedOrbs.delete(id);
    }
  }
}

export function clearAllOrbs() {
  for (const [, el] of renderedOrbs) {
    el.classList.add("xp-orb--collected");
    setTimeout(() => el.remove(), 220);
  }
  renderedOrbs.clear();
}

export function syncUnitsFrame() {
  for (const u of state.units) {
    if (!u.el) continue;
    u.el.style.left = `${u.x}px`;
    u.el.style.top = `${u.y}px`;
    if (u._hpFill) {
      const pct = Math.max(0, Math.min(1, u.hp / u.maxHp));
      u._hpFill.style.width = `${pct * 100}%`;
    }
  }
  for (const e of state.enemies) {
    if (!e.el) continue;
    e.el.style.left = `${e.x}px`;
    e.el.style.top = `${e.y}px`;
    if (e._hpFill) {
      const pct = Math.max(0, Math.min(1, e.hp / e.maxHp));
      e._hpFill.style.width = `${pct * 100}%`;
    }
  }
}

export function processCombatEvents() {
  if (state.pendingEvents.length === 0) return;
  const events = state.pendingEvents;
  state.pendingEvents = [];

  for (const ev of events) {
    if (ev.type === "attack") {
      const { attacker, target, damage } = ev;
      if (attacker.el) {
        playAttackPunch(
          attacker.el,
          target.x - attacker.x,
          target.y - attacker.y,
        );
      }
      if (target.el) flashDamage(target.el);
      playSfx("hit");
      void damage;
    } else if (ev.type === "death") {
      const { unit } = ev;
      playDeath(unit.el, () => {
        unit.el = null;
        unit._hpFill = null;
      });
    }
  }
}

export function renderUnits() {
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
      el.dataset.dropZone = "unit";
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
  }
  if (u._hpFill) {
    const pct = Math.max(0, Math.min(1, u.hp / u.maxHp));
    u._hpFill.style.width = `${pct * 100}%`;
  }
}

function blendSpecialColors(specials) {
  if (!specials || specials.length === 0) return "var(--color-ally)";
  if (specials.length === 1) {
    return specials[0]?.color || "var(--color-ally)";
  }
  const rgbs = specials.map((s) => hexToRgb(s?.color)).filter(Boolean);
  if (rgbs.length === 0) return "var(--color-ally)";
  if (rgbs.length === 1) {
    const c = rgbs[0];
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
  }
  const avg = rgbs.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
    { r: 0, g: 0, b: 0 },
  );
  const n = rgbs.length;
  return `rgb(${Math.round(avg.r / n)}, ${Math.round(avg.g / n)}, ${Math.round(
    avg.b / n,
  )})`;
}

// Adiciona mini-cartas representando os upgrades aplicados ao herói:
// uma por tipo de upgrade (com badge de quantidade) seguida de uma por
// habilidade especial (sem badge — habilidades são únicas).
function appendUnitMiniCards(container, unit) {
  const order = [
    { key: "hp", className: "party-mini-card--hp" },
    { key: "atk", className: "party-mini-card--atk" },
    { key: "atkSpeed", className: "party-mini-card--atk_speed" },
    { key: "moveSpeed", className: "party-mini-card--move_speed" },
  ];
  for (const { key, className } of order) {
    const count = unit.upgrades[key] || 0;
    if (count <= 0) continue;
    const el = document.createElement("div");
    el.className = `party-mini-card ${className}`;
    if (count > 1) {
      const badge = document.createElement("div");
      badge.className = "party-mini-card__count";
      badge.textContent = `x${count}`;
      el.appendChild(badge);
    }
    container.appendChild(el);
  }
  for (const special of unit.specials) {
    const el = document.createElement("div");
    el.className = "party-mini-card party-mini-card--special";
    el.style.borderColor = special.color || "var(--color-ally)";
    container.appendChild(el);
  }
}

function hexToRgb(hex) {
  if (typeof hex !== "string") return null;
  const h = hex.replace("#", "");
  if (h.length < 6) return null;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
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
  if (state.units.length === 0) return;
  for (const u of state.units) {
    const card = document.createElement("div");
    card.className = "party-member";

    const icon = document.createElement("div");
    icon.className = "party-member__icon";
    icon.style.background =
      u.specials.length > 0
        ? blendSpecialColors(u.specials)
        : "var(--color-ally)";
    card.appendChild(icon);

    const info = document.createElement("div");
    info.className = "party-member__info";

    const row = document.createElement("div");
    row.className = "party-member__row";

    const name = document.createElement("span");
    name.className = "party-member__name";
    name.textContent = u.name;
    row.appendChild(name);

    const cards = document.createElement("div");
    cards.className = "party-member__cards";
    appendUnitMiniCards(cards, u);
    row.appendChild(cards);

    const hp = document.createElement("span");
    hp.className = "party-member__hp";
    hp.textContent = `HP ${Math.ceil(u.hp)}/${u.maxHp}`;
    row.appendChild(hp);

    info.appendChild(row);
    card.appendChild(info);

    card.dataset.unitId = String(u.id);
    card.dataset.dropZone = "unit";
    dom.partyList.appendChild(card);
  }
}

export function renderHand() {
  dom.handList.innerHTML = "";
  if (state.hand.length === 0) return;

  for (const card of state.hand) {
    const el = document.createElement("div");
    el.className = `card card--${card.type}`;
    if (card._pendingArrival) el.classList.add("is-arriving");
    if (card.type === "special" && card.color) {
      el.style.borderColor = card.color;
    }
    el.dataset.cardId = String(card.id);

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

    enableDrag(el, {
      payload: {
        cardId: card.id,
        cardType: card.type,
        specialKey: card.specialKey,
      },
      canDrop: (target, payload) =>
        handlers.canCardDrop?.(payload, target) ?? false,
      onDragStart: () => {
        playSfx("cardPickup");
        // Re-layout pra mão "fechar o buraco" da carta sendo arrastada.
        requestAnimationFrame(layoutHand);
      },
      onDrop: (info) => {
        playSfx("cardDropValid");
        handlers.onCardDrop?.(info);
      },
      onCancel: () => {
        playSfx("cardDropInvalid");
        // Drag cancelado — re-layout normal (a carta voltou).
        requestAnimationFrame(layoutHand);
      },
      onDragEnd: () => requestAnimationFrame(layoutHand),
    });

    dom.handList.appendChild(el);
  }

  layoutHand();
}

// Calcula posição (--curve-x em px) e rotação (--curve-rot em deg) de
// cada carta na mão para formar um leque simétrico. Cartas com classe
// is-drag-source são ignoradas no cálculo (mão "fecha o buraco").
function layoutHand() {
  if (!dom.handList) return;
  const cards = Array.from(dom.handList.children);
  const visible = cards.filter((c) => !c.classList.contains("is-drag-source"));
  const N = visible.length;
  if (N === 0) return;

  // Largura do leque: 70% da viewport, capada em 1000px.
  const handAreaWidth = Math.min(1000, window.innerWidth * 0.7);
  const cardWidth =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-width")) ||
    135;

  const maxStep = cardWidth * 0.55; // sobreposição leve quando há poucas cartas
  const minStep = 22; // sobreposição agressiva quando há muitas
  let step;
  if (N === 1) {
    step = 0;
  } else {
    step = Math.min(maxStep, Math.max(minStep, (handAreaWidth - cardWidth) / (N - 1)));
  }

  const totalWidth = step * (N - 1);
  const startX = -totalWidth / 2;

  const center = (N - 1) / 2;
  // Rotação máxima das cartas das pontas em graus.
  const maxRot = N > 1 ? Math.min(10, 2.5 + N * 0.4) : 0;

  visible.forEach((cardEl, i) => {
    const x = startX + i * step;
    const t = N > 1 ? (i - center) / center : 0; // -1..1
    const rot = t * maxRot;

    cardEl.style.setProperty("--curve-x", `${x}px`);
    cardEl.style.setProperty("--curve-rot", `${rot}deg`);
    cardEl.style.zIndex = String(i + 1);
  });
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

      if (card.kind === "special" && card.special) {
        el.classList.add("card--special");
        el.style.borderColor = card.special.color;
      }

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

// Modal de "loot" — exibe N cartas que o jogador acabou de ganhar.
// Não tem escolha: ele clica em "Aceitar" pra adicionar todas à mão.
// Tem botão "Rerolar" que sorteia novamente, limitado a state.rerollsLeft.
export function renderLootModal({
  title,
  subtitle,
  cards,
  rerollsLeft,
  onAccept,
  onReroll,
}) {
  dom.modalRoot.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal modal--loot";

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

  const cardsWrap = document.createElement("div");
  cardsWrap.className = "modal__cards";
  cardsWrap.dataset.lootCards = "true";
  cards.forEach((card) => {
    const el = document.createElement("div");
    el.className = `card card--${card.type}`;
    if (card.type === "special" && card.color) {
      el.style.borderColor = card.color;
    }

    const typeLabel = document.createElement("div");
    typeLabel.className = "card__type";
    typeLabel.textContent = card.typeLabel;
    el.appendChild(typeLabel);

    const titleEl = document.createElement("div");
    titleEl.className = "card__title";
    titleEl.textContent = card.title;
    el.appendChild(titleEl);

    cardsWrap.appendChild(el);
  });
  modal.appendChild(cardsWrap);

  const footer = document.createElement("div");
  footer.className = "modal__footer";

  const rerollBtn = document.createElement("button");
  rerollBtn.className = "modal__btn modal__btn--secondary";
  rerollBtn.textContent = `Rerolar (${rerollsLeft})`;
  rerollBtn.disabled = rerollsLeft <= 0;
  rerollBtn.addEventListener("click", () => onReroll?.());
  footer.appendChild(rerollBtn);

  const acceptBtn = document.createElement("button");
  acceptBtn.className = "modal__btn";
  acceptBtn.textContent = "Aceitar";
  acceptBtn.addEventListener("click", () => {
    // captura rects antes de remover o modal
    const cardEls = Array.from(cardsWrap.children);
    const rects = cardEls.map((el) => el.getBoundingClientRect());
    onAccept?.(rects);
  });
  footer.appendChild(acceptBtn);

  modal.appendChild(footer);
  overlay.appendChild(modal);
  dom.modalRoot.appendChild(overlay);
}

// Anima clones das cartas voando do modal até a posição exata em que
// vão ficar na mão (passada via targetInfos: { rect, rot } por carta).
// Quando o clone chega, ele é removido e a carta real (que estava
// invisível com .is-arriving) é revelada pelo onComplete.
export function playLootFlyAnimation(cards, fromRects, targetInfos, onComplete) {
  if (!fromRects || fromRects.length === 0) {
    onComplete?.();
    return;
  }

  const FLY_MS = 280;
  const STAGGER_MS = 30;

  const clones = cards.map((card, i) => {
    const r = fromRects[i];
    const clone = document.createElement("div");
    clone.className = `card card--${card.type}`;
    if (card.type === "special" && card.color) {
      clone.style.borderColor = card.color;
    }
    clone.style.position = "fixed";
    clone.style.left = `${r.left}px`;
    clone.style.top = `${r.top}px`;
    clone.style.width = `${r.width}px`;
    clone.style.height = `${r.height}px`;
    clone.style.margin = "0";
    clone.style.transition = `left ${FLY_MS}ms ease-out, top ${FLY_MS}ms ease-out, transform ${FLY_MS}ms ease-out`;
    clone.style.zIndex = "300";
    clone.style.transformOrigin = "50% 50%";
    clone.style.boxShadow = "0 10px 24px rgba(0, 0, 0, 0.55)";

    const typeLabel = document.createElement("div");
    typeLabel.className = "card__type";
    typeLabel.textContent = card.typeLabel;
    clone.appendChild(typeLabel);

    const titleEl = document.createElement("div");
    titleEl.className = "card__title";
    titleEl.textContent = card.title;
    clone.appendChild(titleEl);

    document.body.appendChild(clone);
    return clone;
  });

  requestAnimationFrame(() => {
    clones.forEach((clone, i) => {
      const target = targetInfos?.[i];
      const delay = i * STAGGER_MS;
      setTimeout(() => {
        if (!target) {
          // Sem destino conhecido — encolhe e some.
          clone.style.transform = "scale(0.3)";
          clone.style.opacity = "0";
          return;
        }
        const cx = target.rect.left + target.rect.width / 2;
        const cy = target.rect.top + target.rect.height / 2;
        clone.style.left = `${cx - clone.offsetWidth / 2}px`;
        clone.style.top = `${cy - clone.offsetHeight / 2}px`;
        clone.style.transform = `rotate(${target.rot}deg)`;
      }, delay);
    });
  });

  const totalMs = FLY_MS + (cards.length - 1) * STAGGER_MS + 20;
  setTimeout(() => {
    clones.forEach((c) => c.remove());
    onComplete?.();
  }, totalMs);
}

export function renderGameOverModal({ wave, kills, score }, onRestart) {
  dom.modalRoot.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal modal--game-over";

  const title = document.createElement("h2");
  title.className = "modal__title";
  title.textContent = "GAME OVER";
  modal.appendChild(title);

  const sub = document.createElement("div");
  sub.className = "modal__subtitle";
  sub.textContent = "Seus heróis caíram";
  modal.appendChild(sub);

  const stats = [
    ["Wave alcançada", wave],
    ["Inimigos mortos", kills],
    ["Score", score],
  ];
  for (const [label, value] of stats) {
    const row = document.createElement("div");
    row.className = "modal__stat";
    const span = document.createElement("span");
    span.textContent = String(value);
    row.append(`${label}: `, span);
    modal.appendChild(row);
  }

  const btn = document.createElement("button");
  btn.className = "modal__btn";
  btn.textContent = "Jogar Novamente";
  btn.addEventListener("click", () => onRestart?.());
  modal.appendChild(btn);

  overlay.appendChild(modal);
  dom.modalRoot.appendChild(overlay);
}

// Limpa os elementos das unidades e efeitos remanescentes do DOM.
// Usado no restart, já que as referências de `el` vivem nos objetos
// das unidades em state — quando o estado é resetado, os elementos
// soltos no DOM precisam ser removidos manualmente.
export function clearGameDOM() {
  if (dom.unitsLayer) dom.unitsLayer.innerHTML = "";
  if (dom.effectsLayer) dom.effectsLayer.innerHTML = "";
  renderedOrbs.clear();
  closeModal();
}
