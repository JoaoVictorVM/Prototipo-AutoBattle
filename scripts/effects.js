// Efeitos visuais — Fase 4.
// Funções pequenas que criam elementos temporários no DOM.

export function spawnFloatingText(layer, x, y, text, variant = "xp") {
  const el = document.createElement("div");
  el.className = `floating-text floating-text--${variant}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

export function flashDamage(unitEl) {
  if (!unitEl) return;
  unitEl.classList.remove("is-damaged");
  void unitEl.offsetWidth;
  unitEl.classList.add("is-damaged");
}

export function playAttackPunch(unitEl, dx, dy) {
  if (!unitEl) return;
  const len = Math.hypot(dx, dy) || 1;
  const px = (dx / len) * 8;
  const py = (dy / len) * 8;
  unitEl.style.setProperty("--punch-x", `${px}px`);
  unitEl.style.setProperty("--punch-y", `${py}px`);
  unitEl.classList.remove("is-attacking");
  void unitEl.offsetWidth;
  unitEl.classList.add("is-attacking");
}

export function playDeath(unitEl, onDone) {
  if (!unitEl) {
    onDone?.();
    return;
  }
  unitEl.classList.add("is-dying");
  setTimeout(() => {
    unitEl.remove();
    onDone?.();
  }, 400);
}
