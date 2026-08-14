(function (CAP) {
  "use strict";

  const keys = Object.create(null);
  const pointers = new Map();

  const state = {
    left: false,
    right: false,
    down: false,
    jump: false,
    run: false,
    pause: false,
    mute: false,
    jumpPressed: false,
    pausePressed: false,
    mutePressed: false,
    startPressed: false,
    anyPressed: false
  };

  function bind(btn, down) {
    if (btn === "left") state.left = down;
    else if (btn === "right") state.right = down;
    else if (btn === "down") state.down = down;
    else if (btn === "jump") {
      if (down && !state.jump) state.jumpPressed = true;
      state.jump = down;
    } else if (btn === "run") state.run = down;
    else if (btn === "pause") {
      if (down) {
        state.pausePressed = true;
        state.startPressed = true;
      }
    } else if (btn === "mute") {
      if (down) state.mutePressed = true;
    }
    if (down) state.anyPressed = true;
  }

  function keyToBtn(e) {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") return "left";
    if (k === "ArrowRight" || k === "d" || k === "D") return "right";
    if (k === "ArrowDown" || k === "s" || k === "S") return "down";
    if (k === " " || k === "z" || k === "Z" || k === "k" || k === "K" || k === "ArrowUp" || k === "w" || k === "W") return "jump";
    if (k === "Shift" || k === "x" || k === "X" || k === "j" || k === "J") return "run";
    if (k === "Enter" || k === "p" || k === "P" || k === "Escape") return "pause";
    if (k === "m" || k === "M") return "mute";
    return null;
  }

  window.addEventListener("keydown", (e) => {
    const btn = keyToBtn(e);
    if (!btn) return;
    e.preventDefault();
    if (e.repeat && (btn === "pause" || btn === "mute")) return;
    keys[e.code] = true;
    bind(btn, true);
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    const btn = keyToBtn(e);
    if (!btn) return;
    e.preventDefault();
    keys[e.code] = false;
    bind(btn, false);
  }, { passive: false });

  function buttonFromEvent(e) {
    const el = e.target.closest("[data-btn]");
    return el ? el.getAttribute("data-btn") : null;
  }

  function setHeld(btn, down) {
    document.querySelectorAll("[data-btn='" + btn + "']").forEach((el) => {
      el.classList.toggle("held", down);
    });
  }

  function onPointerDown(e) {
    const btn = buttonFromEvent(e);
    if (!btn) return;
    e.preventDefault();
    pointers.set(e.pointerId, btn);
    bind(btn, true);
    setHeld(btn, true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  function onPointerUp(e) {
    const btn = pointers.get(e.pointerId) || buttonFromEvent(e);
    if (!btn) return;
    e.preventDefault();
    pointers.delete(e.pointerId);
    bind(btn, false);
    setHeld(btn, false);
  }

  function attach() {
    const root = document.getElementById("controls");
    if (!root) return;
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);
    root.addEventListener("contextmenu", (e) => e.preventDefault());
    document.getElementById("game").addEventListener("pointerdown", () => {
      state.anyPressed = true;
      state.startPressed = true;
    });
  }

  function consume() {
    const snap = {
      left: state.left,
      right: state.right,
      down: state.down,
      jump: state.jump,
      run: state.run,
      jumpPressed: state.jumpPressed,
      pausePressed: state.pausePressed,
      mutePressed: state.mutePressed,
      startPressed: state.startPressed,
      anyPressed: state.anyPressed
    };
    state.jumpPressed = false;
    state.pausePressed = false;
    state.mutePressed = false;
    state.startPressed = false;
    state.anyPressed = false;
    return snap;
  }

  CAP.input = { attach, consume, state };
})(window.CAP = window.CAP || {});
