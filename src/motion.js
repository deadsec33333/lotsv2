// Springs for every slot on the page. One requestAnimationFrame loop drives:
//  - jelly scroll: each slot trails behind while you scroll, then catches up with a soft overshoot
//  - hover: the slot tilts toward the cursor and leans in a little, then wobbles back when you leave
//  - drag (mouse): grab any slot and pull it on a rubber band; let go and it springs home
//  - kicks: when a slot is bought or taken it pops, and the slots around it get knocked away
//  - shake: every visible slot gets a random shove (used by SHAKE)
// Idle bobbing is plain CSS (see .bob in styles.css). Everything writes CSS variables only,
// so layout never changes and clicks land where you expect.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const rand = (n) => { const s = Math.sin(n * 91.345 + 7.13) * 43758.5453; return s - Math.floor(s); };

const items = new Map(); // element -> state
let raf = 0;
let lastT = 0;
let lastScroll = 0;
let mouse = { x: 0, y: 0, sx: 0, sy: 0 }; // raw and smoothed, -1..1
let hovered = null;
let drag = null; // { item, startX, startY, moved, lastX, lastY }
let swallowClick = false;
let io = null;
let enabled = true;

function state(el, n) {
  const r1 = rand(n), r2 = rand(n + 17), r3 = rand(n + 41), r4 = rand(n + 73);
  return {
    el,
    // jelly scroll (vertical)
    jy: 0, jv: 0,
    k: 150 + r1 * 130, // stiffness: each slot settles at its own pace
    c: 7 + r2 * 5, // low damping, so it overshoots and bounces back
    lag: 0.65 + r3 * 0.5,
    // pointer / drag offset
    x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0,
    // tilt
    rx: 0, ry: 0, vrx: 0, vry: 0, trx: 0, try: 0,
    // scale pop and spin
    sc: 0, vsc: 0, rot: 0, vrot: 0,
    depth: 0.3 + r4 * 0.7,
    visible: true,
    last: '',
  };
}

function write(it) {
  const f = (n) => (Math.abs(n) < 0.02 ? 0 : Math.round(n * 10) / 10);
  const jx = f(it.x), jy = f(it.y + it.jy), rx = f(it.rx), ry = f(it.ry), sc = Math.round(it.sc * 1000) / 1000, rot = f(it.rot);
  const key = `${jx}|${jy}|${rx}|${ry}|${sc}|${rot}`;
  if (key === it.last) return;
  it.last = key;
  const st = it.el.style;
  if (jx || jy) { st.setProperty('--jx', jx + 'px'); st.setProperty('--jy', jy + 'px'); } else { st.removeProperty('--jx'); st.removeProperty('--jy'); }
  if (rx || ry || sc || rot) {
    st.setProperty('--rx', rx + 'deg'); st.setProperty('--ry', ry + 'deg');
    st.setProperty('--sc', String(1 + sc)); st.setProperty('--rot', rot + 'deg');
    st.setProperty('--pw', String(Math.min(1, (Math.abs(rx) + Math.abs(ry)) / 14)));
  } else { ['--rx', '--ry', '--sc', '--rot', '--pw'].forEach((p) => st.removeProperty(p)); }
}

function reset(it) {
  Object.assign(it, { jy: 0, jv: 0, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, rx: 0, ry: 0, vrx: 0, vry: 0, trx: 0, try: 0, sc: 0, vsc: 0, rot: 0, vrot: 0 });
  write(it);
}

function spring(pos, vel, target, k, c, dt) {
  const a = -k * (pos - target) - c * vel;
  vel += a * dt;
  return [pos + vel * dt, vel];
}

function tick(t) {
  raf = 0;
  const dt = Math.min(1 / 30, (t - lastT) / 1000 || 1 / 60);
  lastT = t;
  const sy = window.scrollY;
  const dy = sy - lastScroll;
  lastScroll = sy;
  const mobile = isMobile();
  const maxJ = mobile ? 24 : 44;
  // smooth the mouse for parallax
  mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 4);
  mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 4);
  const parallax = !mobile && finePointer();
  let moving = Math.abs(mouse.x - mouse.sx) > 0.001 || Math.abs(mouse.y - mouse.sy) > 0.001;

  for (const it of items.values()) {
    if (!it.visible) { if (it.last) reset(it); continue; }
    // jelly scroll
    it.jy += dy * it.lag * 0.55;
    it.jy = Math.max(-maxJ, Math.min(maxJ, it.jy));
    [it.jy, it.jv] = spring(it.jy, it.jv, 0, it.k, it.c, dt);

    // pointer / drag
    let tx = it.tx, ty = it.ty;
    if (parallax && it.el.classList.contains('bob')) { tx += mouse.sx * it.depth * 7; ty += mouse.sy * it.depth * 5; }
    if (drag && drag.item === it && drag.moved) { it.x = it.tx; it.y = it.ty; it.vx = 0; it.vy = 0; } else {
      [it.x, it.vx] = spring(it.x, it.vx, tx, 170, 9, dt);
      [it.y, it.vy] = spring(it.y, it.vy, ty, 170, 9, dt);
    }
    [it.rx, it.vrx] = spring(it.rx, it.vrx, it.trx, 210, 12, dt);
    [it.ry, it.vry] = spring(it.ry, it.vry, it.try, 210, 12, dt);
    [it.sc, it.vsc] = spring(it.sc, it.vsc, 0, 260, 11, dt);
    [it.rot, it.vrot] = spring(it.rot, it.vrot, 0, 200, 9, dt);

    const busy = Math.abs(it.jy) > 0.05 || Math.abs(it.jv) > 0.5 || Math.abs(it.x - tx) > 0.05 || Math.abs(it.vx) > 0.5 || Math.abs(it.y - ty) > 0.05 || Math.abs(it.vy) > 0.5
      || Math.abs(it.rx - it.trx) > 0.05 || Math.abs(it.ry - it.try) > 0.05 || Math.abs(it.vrx) > 0.5 || Math.abs(it.vry) > 0.5
      || Math.abs(it.sc) > 0.001 || Math.abs(it.vsc) > 0.01 || Math.abs(it.rot) > 0.05 || Math.abs(it.vrot) > 0.5;
    if (busy) moving = true;
    else { it.jy = 0; it.jv = 0; it.x = tx; it.y = ty; it.vx = 0; it.vy = 0; it.rx = it.trx; it.ry = it.try; it.sc = 0; it.vsc = 0; it.rot = 0; it.vrot = 0; }
    write(it);
  }
  if (moving || dy !== 0 || drag) wake();
}

function wake() {
  if (!enabled) return;
  if (!raf) { if (!lastT) lastT = performance.now(); raf = requestAnimationFrame(tick); }
}

// Find every slot on the page (call after the page is re-rendered).
export function rescan() {
  if (!io) return;
  const found = new Set(document.querySelectorAll('#view .s[data-id]:not(.bgslot), #top .s[data-id]'));
  for (const [el, it] of items) if (!found.has(el) || !el.isConnected) { io.unobserve(el); items.delete(el); reset(it); }
  let n = 0;
  found.forEach((el) => {
    n++;
    if (items.has(el)) return;
    const it = state(el, n + Number(el.dataset.id) * 3);
    items.set(el, it);
    // small things bob gently on their own; big text blocks only do the jelly
    const big = el.classList.contains('blk') && !el.classList.contains('ico') && !el.classList.contains('eyebrow') && !el.classList.contains('small');
    if (!big || el.classList.contains('bigimg')) {
      el.classList.add('bob', 'bob-' + (n % 3));
      el.style.setProperty('--bd', (6 + rand(n + 5) * 5).toFixed(2) + 's');
      el.style.setProperty('--bdl', (-rand(n + 9) * 8).toFixed(2) + 's');
    }
    io.observe(el);
  });
}

function itemFor(target) {
  const el = target && target.closest && target.closest('.s[data-id]');
  return el ? items.get(el) : null;
}

// A slot pops, and everything nearby gets knocked away from it.
export function kick(id, power = 1) {
  if (!enabled) return;
  const el = document.querySelector(`#view .s[data-id="${id}"], #top .s[data-id="${id}"]`);
  const it = el && items.get(el);
  if (!it) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  it.vsc += 2.6 * power;
  it.vrot += (Math.random() < 0.5 ? -1 : 1) * 90 * power;
  const R = isMobile() ? 220 : 340;
  for (const other of items.values()) {
    if (other === it || !other.visible) continue;
    const o = other.el.getBoundingClientRect();
    const dx = o.left + o.width / 2 - cx, dy = o.top + o.height / 2 - cy;
    const d = Math.hypot(dx, dy);
    if (d > R || d < 1) continue;
    const f = (1 - d / R) * 520 * power;
    other.vx += (dx / d) * f;
    other.vy += (dy / d) * f;
    other.vrot += (dx > 0 ? 1 : -1) * (1 - d / R) * 60 * power;
  }
  wake();
}

// Shove every visible slot in a random direction.
export function shake(power = 1) {
  if (!enabled) return;
  for (const it of items.values()) {
    if (!it.visible) continue;
    const a = Math.random() * Math.PI * 2;
    const f = (260 + Math.random() * 360) * power;
    it.vx += Math.cos(a) * f;
    it.vy += Math.sin(a) * f;
    it.vrot += (Math.random() - 0.5) * 220 * power;
    it.vsc += (Math.random() - 0.3) * 1.2 * power;
  }
  wake();
}

// True once if the last pointer interaction was a drag (so it should not open the slot card).
export function consumeDragClick() {
  const v = swallowClick;
  swallowClick = false;
  return v;
}

export function initMotion() {
  if (reduced()) { enabled = false; return; }
  io = new IntersectionObserver((entries) => {
    for (const e of entries) { const it = items.get(e.target); if (it) it.visible = e.isIntersecting; }
  }, { rootMargin: '200px 0px' });

  lastScroll = window.scrollY;
  window.addEventListener('scroll', wake, { passive: true });

  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    mouse.x = Math.max(-1, Math.min(1, (ev.clientX / window.innerWidth) * 2 - 1));
    mouse.y = Math.max(-1, Math.min(1, (ev.clientY / window.innerHeight) * 2 - 1));

    if (drag) {
      const dx = ev.clientX - drag.startX, dy = ev.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; drag.item.el.classList.add('dragging'); document.body.classList.add('is-dragging'); }
      if (drag.moved) {
        const M = 110; // rubber band: the farther you pull, the harder it resists
        const band = (d) => (d * M) / (Math.abs(d) + M);
        drag.item.tx = band(dx);
        drag.item.ty = band(dy);
        drag.item.try = Math.max(-18, Math.min(18, (ev.clientX - drag.lastX) * 1.2));
        drag.item.trx = Math.max(-18, Math.min(18, -(ev.clientY - drag.lastY) * 1.2));
        drag.lastX = ev.clientX; drag.lastY = ev.clientY;
      }
      wake();
      return;
    }

    const it = itemFor(ev.target);
    if (hovered && hovered !== it) { hovered.trx = 0; hovered.try = 0; hovered.tx = 0; hovered.ty = 0; hovered = null; }
    if (it) {
      hovered = it;
      const r = it.el.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      const py = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
      const scale = Math.min(1, 220 / Math.max(60, r.width)); // big blocks tilt less
      it.trx = (0.5 - py) * 16 * scale;
      it.try = (px - 0.5) * 16 * scale;
      it.tx = (px - 0.5) * 10 * scale;
      it.ty = (py - 0.5) * 8 * scale;
      it.el.style.setProperty('--sx', (px * 100).toFixed(1) + '%');
      it.el.style.setProperty('--sy', (py * 100).toFixed(1) + '%');
    }
    wake();
  }, { passive: true });

  document.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
    const it = itemFor(ev.target);
    if (!it || ev.target.closest('#editor, #card')) return;
    drag = { item: it, startX: ev.clientX, startY: ev.clientY, lastX: ev.clientX, lastY: ev.clientY, moved: false };
  });

  const release = () => {
    if (!drag) return;
    const it = drag.item;
    if (drag.moved) {
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 60);
      it.el.classList.remove('dragging');
      document.body.classList.remove('is-dragging');
      // fling home: the rubber band snaps back with a wobble
      it.vx = -it.x * 6; it.vy = -it.y * 6;
      it.vrot += (it.x > 0 ? -1 : 1) * Math.min(160, Math.abs(it.x) * 3);
    }
    it.tx = 0; it.ty = 0; it.trx = 0; it.try = 0;
    drag = null;
    wake();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);
  document.documentElement.addEventListener('pointerleave', () => {
    mouse.x = 0; mouse.y = 0;
    if (hovered) { hovered.trx = 0; hovered.try = 0; hovered.tx = 0; hovered.ty = 0; hovered = null; }
    wake();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } });
}
