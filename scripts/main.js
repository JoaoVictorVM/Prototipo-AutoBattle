import { state, resetState } from "./state.js";
import { CARD_TYPES, PHASE, GAME, LOOT, SPECIALS } from "./constants.js";
import { createPlayerUnit, applyUpgrade, applySpecial } from "./units.js";
import {
  drawInitialHand,
  getCardById,
  removeCardFromHand,
  rollLevelUpCards,
} from "./cards.js";
import { spawnWave } from "./waves.js";
import { combatTick } from "./combat.js";
import { addPlayerXP, xpForKill, xpForWaveComplete } from "./xp.js";
import { spawnFloatingText } from "./effects.js";
import { play as playSfx, unlockOnFirstInteraction } from "./audio.js";
import {
  initUI,
  renderAll,
  syncUnitsFrame,
  processCombatEvents,
  renderHUD,
  renderParty,
  renderXPBar,
  renderLootModal,
  playLootFlyAnimation,
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
    const unit = state.units.find((u) => u.id === unitId);
    if (!unit) return false;
    // Special: bloqueia se o herói já tem essa habilidade.
    if (cardType === CARD_TYPES.SPECIAL) {
      return !unit.specials.some((s) => s.key === payload.specialKey);
    }
    return true;
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

  if (card.type === CARD_TYPES.SPECIAL) {
    const special = getSpecialByKey(card.specialKey);
    if (!special) return;
    if (unit.specials.some((s) => s.key === special.key)) return;
    applySpecial(unit, special);
  } else {
    applyUpgrade(unit, card.type);
  }
  removeCardFromHand(card.id);
  renderAll();
}

function getSpecialByKey(key) {
  return Object.values(SPECIALS).find((s) => s.key === key) || null;
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
    state.pendingLevelUps.push({ kind: "loot", reason: "level" });
  }
  if (levels > 0) playSfx("levelUp");
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
  showLootModal(next);
}

function showLootModal(entry) {
  let cards = rollLevelUpCards(LOOT.CARDS_PER_DROP);
  let rerollTimer = null;

  const title =
    entry.reason === "wave"
      ? `Wave ${state.wave} concluída!`
      : `Nível ${state.player.level}!`;
  const subtitle = `Você ganhou ${LOOT.CARDS_PER_DROP} cartas`;

  // Atualiza só as cartas e o texto do botão de reroll, sem recriar
  // o modal inteiro (evita re-disparar fade-in/scale-up).
  const swapModalCards = () => {
    const modalRoot = document.getElementById("modal-root");
    const cardsWrap = modalRoot?.querySelector(
      ".modal--loot .modal__cards",
    );
    if (!cardsWrap) {
      // Modal não existe ainda — abre normal.
      renderModalFresh();
      return;
    }
    cardsWrap.innerHTML = "";
    for (const card of cards) {
      const el = document.createElement("div");
      el.className = `card card--${card.type}`;
      if (card.type === CARD_TYPES.SPECIAL && card.color) {
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
    }
    const rerollBtn = modalRoot?.querySelector(".modal__btn--secondary");
    if (rerollBtn) {
      rerollBtn.textContent = `Rerolar (${state.rerollsLeft})`;
      rerollBtn.disabled = state.rerollsLeft <= 0;
    }
  };

  const renderModalFresh = () => {
    renderLootModal({
      title,
      subtitle,
      cards,
      rerollsLeft: state.rerollsLeft,
      onAccept: (modalRects) => {
        if (rerollTimer) {
          clearTimeout(rerollTimer);
          rerollTimer = null;
        }
        const collected = cards.slice();
        closeModal();

        // Já adiciona as cartas à mão marcadas como "chegando".
        // O renderHand vai criá-las invisíveis no slot final.
        for (const c of collected) {
          c._pendingArrival = true;
          state.hand.push(c);
        }
        renderAll();

        // Captura posição final exata de cada carta nova na mão.
        const handEl = document.getElementById("hand-list");
        const targetInfos = collected.map((c) => {
          const el = handEl?.querySelector(
            `[data-card-id="${c.id}"]`,
          );
          if (!el) return null;
          return {
            rect: el.getBoundingClientRect(),
            rot:
              parseFloat(el.style.getPropertyValue("--curve-rot")) || 0,
          };
        });

        playLootFlyAnimation(collected, modalRects, targetInfos, () => {
          // Revela as cartas reais no slot final, sem re-renderizar.
          for (const c of collected) {
            c._pendingArrival = false;
            const el = handEl?.querySelector(
              `[data-card-id="${c.id}"]`,
            );
            if (el) el.classList.remove("is-arriving");
          }
          showNextLevelUp();
        });
      },
      onReroll: () => {
        if (state.rerollsLeft <= 0 || rerollTimer) return;
        state.rerollsLeft -= 1;
        playSfx("cardDiscard");

        // Fade rápido das cartas atuais antes de re-renderizar o modal.
        const modalRoot = document.getElementById("modal-root");
        const oldCards = modalRoot?.querySelectorAll(
          ".modal--loot .modal__cards .card",
        );
        if (oldCards) {
          oldCards.forEach((el) => {
            el.style.transition =
              "opacity 180ms ease-out, transform 180ms ease-out";
            el.style.opacity = "0";
            el.style.transform = "scale(0.85) translateY(8px) rotate(-3deg)";
          });
        }

        rerollTimer = setTimeout(() => {
          rerollTimer = null;
          cards = rollLevelUpCards(LOOT.CARDS_PER_DROP);
          swapModalCards();
        }, 180);
      },
    });
  };

  renderModalFresh();
}

let lastFrame = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.phase === PHASE.BATTLE) {
    const prevPhase = state.phase;
    combatTick(dt);
    handlePostTickEvents();

    if (prevPhase === PHASE.BATTLE && state.phase === PHASE.BETWEEN_WAVES) {
      awardPlayerXP(xpForWaveComplete(state.wave));
      // Loot de wave: 3 cartas garantidas além do XP.
      state.pendingLevelUps.push({ kind: "loot", reason: "wave" });
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
