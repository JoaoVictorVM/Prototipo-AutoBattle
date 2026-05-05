let active = null;
let lastHover = null;

export function enableDrag(el, options) {
  el.addEventListener("mousedown", (ev) => onMouseDown(ev, el, options));
}

function onMouseDown(ev, sourceEl, options) {
  if (active) return;
  if (ev.button !== 0) return;
  ev.preventDefault();

  const rect = sourceEl.getBoundingClientRect();
  const offsetX = ev.clientX - rect.left;
  const offsetY = ev.clientY - rect.top;

  sourceEl.classList.add("is-drag-source");

  const ghost = sourceEl.cloneNode(true);
  ghost.classList.remove("is-drag-source");
  ghost.classList.add("card--ghost");
  ghost.style.position = "fixed";
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.margin = "0";
  document.body.appendChild(ghost);

  active = {
    sourceEl,
    ghost,
    offsetX,
    offsetY,
    originLeft: rect.left,
    originTop: rect.top,
    options,
    payload: options.payload || null,
  };

  document.body.classList.add("is-dragging");
  if (options.payload?.cardType) {
    document.body.dataset.dragType = options.payload.cardType;
  }

  options.onDragStart?.(active.payload);

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function onMouseMove(ev) {
  if (!active) return;
  active.ghost.style.left = `${ev.clientX - active.offsetX}px`;
  active.ghost.style.top = `${ev.clientY - active.offsetY}px`;

  const target = findDropTarget(ev.clientX, ev.clientY);
  setHover(target && isValidTarget(target) ? target : null);
}

function onMouseUp(ev) {
  if (!active) return;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);

  const target = findDropTarget(ev.clientX, ev.clientY);
  setHover(null);

  if (target && isValidTarget(target)) {
    active.options.onDrop?.({
      target,
      zone: target.dataset.dropZone,
      clientX: ev.clientX,
      clientY: ev.clientY,
      payload: active.payload,
    });
    finishCleanup();
  } else {
    animateReturn();
  }
}

function isValidTarget(target) {
  if (!target) return false;
  const fn = active.options.canDrop;
  if (!fn) return true;
  return !!fn(target, active.payload);
}

function findDropTarget(x, y) {
  if (!active) return null;
  active.ghost.style.visibility = "hidden";
  const el = document.elementFromPoint(x, y);
  active.ghost.style.visibility = "";
  if (!el) return null;
  return el.closest("[data-drop-zone]");
}

function setHover(target) {
  if (lastHover === target) return;
  if (lastHover) lastHover.classList.remove("is-drop-hover");
  if (target) target.classList.add("is-drop-hover");
  lastHover = target;
}

function animateReturn() {
  const { ghost, originLeft, originTop, options, payload } = active;
  ghost.classList.add("is-returning");
  ghost.style.transition =
    "left 250ms ease-out, top 250ms ease-out, transform 250ms ease-out";
  void ghost.offsetWidth;
  ghost.style.left = `${originLeft}px`;
  ghost.style.top = `${originTop}px`;
  ghost.style.transform = "rotate(0deg) translateY(0)";

  setTimeout(() => {
    options.onCancel?.(payload);
    finishCleanup();
  }, 260);
}

function finishCleanup() {
  if (!active) return;
  active.ghost.remove();
  active.sourceEl.classList.remove("is-drag-source");
  active.options.onDragEnd?.(active.payload);
  document.body.classList.remove("is-dragging");
  delete document.body.dataset.dragType;
  if (lastHover) {
    lastHover.classList.remove("is-drop-hover");
    lastHover = null;
  }
  active = null;
}

export function isDragging() {
  return active !== null;
}
