// Local, fake "chain". Everything the UI knows about slots comes from here.
// A real backend or Solana program can replace these functions later.

import { CONFIG as C } from './config.js';
import { LAYOUT } from './layout.js';
import { SEED, WALLETS } from './seed.js';
import { rng, pixelAvatar, icon, logo, poster } from './art.js';

const E = C.economy;
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR, WEEK = 7 * DAY;
const STORE_KEY = 'every-element-v2';
const STYLE_WORDS = ['hl', 'b', 'i', 's', 'u', 'up', 'box'];
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];

let now = () => Date.now();
export function setClock(fn) { now = fn; }

let slots = [];
let events = [];
let credits = {};
let shuffle = null; // { until, pairs: { id: partnerId } }
let shuffleLog = []; // timestamps of past shuffles
let listeners = [];

// ---------- helpers ----------

export function parseStyle(str = '') {
  const style = { color: 'default', size: 'md' };
  for (const w of String(str).split(/\s+/).filter(Boolean)) {
    if (STYLE_WORDS.includes(w)) style[w] = true;
    else if (SIZES.includes(w)) style.size = w;
    else if (C.textColors[w]) style.color = w;
  }
  return style;
}

function blankContent(text = '', style = {}) {
  return { text, style: { color: 'default', size: 'md', ...style }, url: '', image: '', video: '', bg: '' };
}

const round = (n) => Math.round(n * 1e6) / 1e6;
function uid() { return globalThis.crypto?.randomUUID?.() || String(Math.random()).slice(2) + now(); }

function record(kind, slot, wallet, amount = 0, extra = {}) {
  const e = { id: uid(), kind, slotId: slot ? slot.id : null, path: slot ? slot.path : '', wallet, amount: round(amount), unit: 'SOL', time: now(), ...extra };
  events.unshift(e);
  if (events.length > 1500) events.length = 1500;
  return e;
}

function credit(wallet, amount) { credits[wallet] = round((credits[wallet] || 0) + amount); }

function save() {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ v: 2, slots, events, credits, shuffle, shuffleLog })); } catch { /* storage full or unavailable: keep working in memory */ }
}

function emit(ids) { save(); listeners.forEach((fn) => fn(ids)); }

export function subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter((x) => x !== fn); }; }

function find(id) {
  const s = slots.find((x) => x.id === Number(id));
  if (!s) throw new Error('Unknown slot');
  return s;
}

// ---------- prices ----------

export function basePriceOf(s, t = now()) {
  const weeks = Math.min(E.decayMaxWeeks, Math.max(0, (t - s.lastActivity) / WEEK));
  return Math.max(E.floor, s.price * Math.pow(E.decayPerWeek, weeks));
}
export function priceOf(s, t = now()) { return round(basePriceOf(s, t) * (s.owner ? s.markup : 1)); }
export function takePriceOf(s, t = now()) { return round(priceOf(s, t) * E.takeMultiplier); }
export function costToAcquire(s) { return s.owner ? takePriceOf(s) : priceOf(s); }
export function minRentRate(s) { return round(priceOf(s) * E.rentFloorPerDay); }
export function cooldownLeft(s) { return Math.max(0, s.lastTakeAt + E.cooldownMinutes * MIN - now()); }
export function tenantActive(s) { return !!(s.tenant && s.tenant.until > now()); }
export function isRentable(s) { return !!(s.owner && s.rent && !tenantActive(s)); }
export function effectiveKind(s) { return s.upgrade && s.upgrade.until > now() ? s.upgrade.type : s.kind; }

// What an owner can upgrade this slot to.
export function upgradeOptions(s) {
  if (s.kind !== 'text' && s.kind !== 'link') return [];
  return Object.keys(E.upgradeBurn).filter((type) => {
    if (type === s.kind) return false;
    if (type === 'image' || type === 'background') return s.room === 'm' || s.room === 'l';
    if (type === 'video') return s.room === 'l';
    return true;
  });
}

// ---------- reading ----------

export function getSlots() { return slots; }
export function getSlot(id) { return find(id); }
export function getEvents() { return events; }
export function getBalance(wallet) { return credits[wallet] || 0; }
export function getShuffle() { return shuffle && shuffle.until > now() ? shuffle : null; }

function ownContent(s) { return tenantActive(s) ? s.tenant.content : s.content; }

// The content that should be drawn on the page right now.
export function visibleContent(s) {
  const sh = getShuffle();
  if (sh && sh.pairs[s.id]) return ownContent(find(sh.pairs[s.id]));
  return ownContent(s);
}

export function cheapestSlot() {
  let best = null;
  for (const s of slots) {
    if (s.owner && cooldownLeft(s) > 0) continue;
    if (s.owner === C.sessionWallet) continue;
    const c = costToAcquire(s);
    if (!best || c < best.cost) best = { slot: s, cost: c };
  }
  return best && best.slot;
}

// ---------- validation ----------

export function validateContent(s, content) {
  const c = { ...blankContent(), ...content, style: { ...blankContent().style, ...(content.style || {}) } };
  const limit = s.long ? C.limits.long : C.limits.text;
  if (String(c.text).length > limit) throw new Error(`Text is limited to ${limit} characters.`);
  if (c.url && !/^https?:\/\/[^\s]+$/i.test(c.url)) throw new Error('Use a complete https:// link.');
  if (c.image && !/^data:image\/(png|jpe?g|gif|webp|svg\+xml)/i.test(c.image)) throw new Error('Choose a PNG, JPG, GIF or WebP image.');
  if (c.video && !/^data:video\/(mp4|webm)/i.test(c.video)) throw new Error('Choose an MP4 or WebM video.');
  if (c.bg && !(c.bg in C.backgroundColors)) throw new Error('Unknown background color.');
  if (!(c.style.color in C.textColors)) c.style.color = 'default';
  if (!SIZES.includes(c.style.size)) c.style.size = 'md';
  c.hover = String(content.hover || '').slice(0, 80);
  return c;
}

function leaveShuffle(s) {
  const sh = getShuffle();
  if (!sh || !sh.pairs[s.id]) return;
  const partner = sh.pairs[s.id];
  delete sh.pairs[s.id];
  delete sh.pairs[partner];
}

// ---------- actions ----------

export function buySlot(id, content, wallet = C.sessionWallet) {
  tick();
  const s = find(id);
  if (s.owner) throw new Error('This slot was just bought by someone else. Reopen it to take it.');
  const c = validateContent(s, content);
  const paid = priceOf(s);
  credit('treasury', paid * (1 - E.creatorShare));
  credit('creator', paid * E.creatorShare);
  Object.assign(s, { owner: wallet, content: c, hover: c.hover, price: paid, markup: 1, lastSale: paid, lastActivity: now(), rent: null });
  leaveShuffle(s);
  record('buy', s, wallet, paid);
  emit([s.id]);
  return s;
}

export function takeSlot(id, content, wallet = C.sessionWallet) {
  tick();
  const s = find(id);
  if (!s.owner) throw new Error('This slot is unclaimed. Buy it instead.');
  if (s.owner === wallet) throw new Error('You already own this slot.');
  if (cooldownLeft(s) > 0) throw new Error(`Cooldown: this slot can be taken again in ${Math.ceil(cooldownLeft(s) / MIN)} min.`);
  const c = validateContent(s, content);
  const price = priceOf(s);
  const paid = round(price * E.takeMultiplier);
  const toPrevious = round(price * E.previousOwnerShare);
  const toCreator = round(paid * E.creatorShare);
  credit(s.owner, toPrevious);
  credit('creator', toCreator);
  credit('treasury', paid - toPrevious - toCreator);
  const previous = s.owner;
  Object.assign(s, { owner: wallet, content: c, hover: c.hover, price: paid, markup: 1, lastSale: paid, lastActivity: now(), lastTakeAt: now(), takes: s.takes + 1, rent: null });
  leaveShuffle(s);
  record('take', s, wallet, paid, { from: previous, toPrevious });
  emit([s.id]);
  return s;
}

export function editSlot(id, content, wallet = C.sessionWallet) {
  tick();
  const s = find(id);
  const c = validateContent(s, content);
  if (tenantActive(s)) {
    if (s.tenant.wallet !== wallet) throw new Error('A tenant controls this slot until their rental ends.');
    s.tenant.content = c;
  } else {
    if (s.owner !== wallet) throw new Error('Only the owner can edit this slot.');
    s.content = c;
    s.hover = c.hover;
  }
  record('edit', s, wallet, 0);
  emit([s.id]);
  return s;
}

export function setMarkup(id, markup, wallet = C.sessionWallet) {
  const s = find(id);
  if (s.owner !== wallet) throw new Error('Only the owner can set the price.');
  const m = Number(markup);
  if (!Number.isFinite(m) || m < E.markupMin || m > E.markupMax) throw new Error(`Markup must be between ${E.markupMin}× and ${E.markupMax}×.`);
  s.markup = round(m);
  record('reprice', s, wallet, priceOf(s));
  emit([s.id]);
  return s;
}

export function listForRent(id, ratePerDay, wallet = C.sessionWallet) {
  const s = find(id);
  if (s.owner !== wallet) throw new Error('Only the owner can list this slot for rent.');
  if (ratePerDay === null) { s.rent = null; record('unlist', s, wallet, 0); emit([s.id]); return s; }
  const rate = Number(ratePerDay);
  if (!Number.isFinite(rate) || rate < minRentRate(s)) throw new Error(`Daily rate must be at least ${minRentRate(s)} SOL.`);
  s.rent = { rate: round(rate) };
  record('list', s, wallet, rate);
  emit([s.id]);
  return s;
}

export function rentSlot(id, days, content, wallet = C.sessionWallet) {
  tick();
  const s = find(id);
  if (!isRentable(s)) throw new Error('This slot is not available for rent right now.');
  if (s.owner === wallet) throw new Error('You own this slot. Just edit it.');
  const d = Number(days);
  if (!Number.isInteger(d) || d < 1 || d > E.rentMaxDays) throw new Error(`Rent for 1 to ${E.rentMaxDays} days.`);
  const c = validateContent(s, content);
  const paid = round(s.rent.rate * d);
  credit(s.owner, paid * (1 - E.rentProtocolCut));
  credit('treasury', paid * E.rentProtocolCut);
  s.tenant = { wallet, until: now() + d * DAY, content: c };
  s.lastActivity = now();
  record('rent', s, wallet, paid, { days: d });
  emit([s.id]);
  return s;
}

export function upgradeSlot(id, type, wallet = C.sessionWallet) {
  const s = find(id);
  if (s.owner !== wallet) throw new Error('Only the owner can upgrade this slot.');
  if (!upgradeOptions(s).includes(type)) throw new Error('This slot is too small for that upgrade.');
  s.upgrade = { type, until: now() + E.upgradeDays * DAY };
  record('upgrade', s, wallet, E.upgradeBurn[type], { unit: 'TOKEN', to: type });
  emit([s.id]);
  return s;
}

export function withdraw(wallet = C.sessionWallet) {
  const amount = getBalance(wallet);
  if (amount <= 0) throw new Error('Nothing to withdraw yet.');
  credits[wallet] = 0;
  record('withdraw', null, wallet, amount);
  emit([]);
  return amount;
}

export function startShuffle(wallet = C.sessionWallet) {
  tick();
  if (getShuffle()) throw new Error('A shuffle is already running.');
  shuffleLog = shuffleLog.filter((t) => t > now() - WEEK);
  if (shuffleLog.length >= E.shuffleMaxPerWeek) throw new Error('Shuffle limit reached for this week.');
  const r = rng(now() % 100000);
  const pairs = {};
  const groups = [
    slots.filter((s) => s.owner && ['text', 'link'].includes(effectiveKind(s))),
    slots.filter((s) => s.owner && effectiveKind(s) === 'image'),
  ];
  for (const g of groups) {
    const list = [...g].sort(() => r() - 0.5);
    for (let i = 0; i + 1 < list.length; i += 2) { pairs[list[i].id] = list[i + 1].id; pairs[list[i + 1].id] = list[i].id; }
  }
  shuffle = { until: now() + E.shuffleMinutes * MIN, pairs };
  shuffleLog.push(now());
  record('shuffle', null, wallet, 0);
  emit(Object.keys(pairs).map(Number));
  return shuffle;
}

export function endShuffle() {
  if (!shuffle) return;
  const ids = Object.keys(shuffle.pairs).map(Number);
  shuffle = null;
  record('unshuffle', null, 'system', 0);
  emit(ids);
}

// Expire tenancies, upgrades and shuffles.
export function tick() {
  const changed = [];
  for (const s of slots) {
    if (s.tenant && s.tenant.until <= now()) { record('rent-end', s, s.tenant.wallet, 0); s.tenant = null; changed.push(s.id); }
    if (s.upgrade && s.upgrade.until <= now()) {
      record('retire', s, 'system', 0, { to: s.kind });
      s.upgrade = null;
      s.content = { ...s.content, image: '', video: '', bg: '' };
      changed.push(s.id);
    }
  }
  if (shuffle && shuffle.until <= now()) { changed.push(...Object.keys(shuffle.pairs).map(Number)); shuffle = null; record('unshuffle', null, 'system', 0); }
  if (changed.length) emit(changed);
  return changed;
}

// ---------- demo & simulation ----------

const SIM_TEXT = [
  ['gm from the kitchen', 'hl'], ['$PIXL TO THE MOON', 'lime b up'], ['i just wanted one slot', 'muted i'],
  ['OUTBID YOU LOL', 'red b up'], ['buy my sticker pack', 'orange b'], ['THIS IS MY SLOT NOW', 'hl b up'],
  ['hello from Vilnius', 'blue b'], ['$SNAIL is slow but steady', 'green'], ['do not take this', 'pink b u'],
  ['wagmi (probably)', 'purple i'], ['my cat approved this text', 'yellow'], ['REFUND? NEVER.', 'box b up'],
];
const SIM_WALLETS = WALLETS.concat(['Pz4a…Wq7e', 'Mn8c…Hk2t', 'Rf5s…Jb9u', 'Xq1d…Ls6p']);

function simContent(s, r) {
  const k = effectiveKind(s);
  const [text, style] = SIM_TEXT[Math.floor(r() * SIM_TEXT.length)];
  const c = blankContent(k === 'image' ? '' : text, parseStyle(style));
  if (k === 'image') c.image = r() < 0.6 ? pixelAvatar(Math.floor(r() * 1e6)) : icon(Math.floor(r() * 1e6));
  if (k === 'background') { c.text = ''; c.bg = Object.keys(C.backgroundColors)[Math.floor(r() * 7)]; }
  return c;
}

export function simulateEvent(excludeId = null) {
  tick();
  const r = rng(now() % 1e9 + events.length);
  const pickWallet = (not) => { let w; do { w = SIM_WALLETS[Math.floor(r() * SIM_WALLETS.length)]; } while (w === not); return w; };
  const pool = slots.filter((s) => s.id !== excludeId && s.owner !== C.sessionWallet);
  const roll = r();
  try {
    if (roll < 0.45) {
      const takeable = pool.filter((x) => x.owner && cooldownLeft(x) === 0);
      const s = takeable[Math.floor(r() * takeable.length)];
      if (s) return takeSlot(s.id, simContent(s, r), pickWallet(s.owner));
    }
    if (roll < 0.6) {
      const free = pool.filter((x) => !x.owner);
      if (free.length) { const s = free[Math.floor(r() * free.length)]; return buySlot(s.id, simContent(s, r), pickWallet()); }
    }
    const owned = pool.filter((x) => x.owner && !String(x.owner).startsWith('DeMo'));
    const s = owned[Math.floor(r() * owned.length)];
    if (!s) return null;
    if (roll < 0.75) return setMarkup(s.id, Math.round((0.6 + r() * 2) * 10) / 10, s.owner);
    if (roll < 0.85 && !tenantActive(s)) return editSlot(s.id, simContent(s, r), s.owner);
    if (roll < 0.95 && isRentable(s)) return rentSlot(s.id, 1 + Math.floor(r() * 7), simContent(s, r), pickWallet(s.owner));
    return listForRent(s.id, round(minRentRate(s) * (1 + r() * 3)), s.owner);
  } catch {
    return null;
  }
}

export function fillAll() {
  const r = rng(now() % 1e9);
  for (const s of slots) if (!s.owner) {
    const w = SIM_WALLETS[Math.floor(r() * SIM_WALLETS.length)];
    Object.assign(s, { owner: w, content: simContent(s, r), price: priceOf(s), markup: 1, lastSale: priceOf(s), lastActivity: now() });
    record('buy', s, w, s.price);
  }
  emit(slots.map((s) => s.id));
}

export function emptyAll() {
  for (const s of slots) {
    Object.assign(s, { owner: null, content: structuredClone(s.def), hover: '', price: E.floor * s.weight, markup: 1, takes: 0, lastSale: 0, lastActivity: now(), lastTakeAt: 0, rent: null, tenant: null, upgrade: null });
  }
  shuffle = null;
  emit(slots.map((s) => s.id));
}

// Demo helper: pretend a number of weeks passed without activity.
export function fastForward(weeks) {
  for (const s of slots) { s.lastActivity -= weeks * WEEK; if (s.tenant) s.tenant.until -= weeks * WEEK; if (s.upgrade) s.upgrade.until -= weeks * WEEK; s.lastTakeAt -= weeks * WEEK; }
  if (shuffle) shuffle.until -= weeks * WEEK;
  tick();
  emit(slots.map((s) => s.id));
}

// ---------- building the starting state ----------

const HOVERS = ['gm', 'you found me', 'dont even think about it', 'hi mom', 'still here', 'buy $TICKER', 'this cost me lunch money'];

function seedImage(kind, seedNum, extras = {}) {
  if (kind === 'avatar') return pixelAvatar(seedNum);
  if (kind === 'icon') return icon(seedNum);
  if (kind === 'logo') return logo(seedNum, extras.word || 'LOGO');
  if (kind === 'poster') return poster(seedNum, extras.word || 'PROJECT', extras.sub || '');
  return '';
}

export function resetState({ seeded = true } = {}) {
  const t = now();
  const r = rng(424242);
  const launch = t - 6 * WEEK;
  events = [];
  credits = {};
  shuffle = null;
  shuffleLog = [];
  slots = LAYOUT.map((d, i) => {
    const def = blankContent(d.text, d.style);
    return {
      id: i + 1, path: d.path, section: d.path.split('.')[0], kind: d.kind, room: d.room, weight: d.weight, long: d.long,
      def, content: { ...def, style: { ...def.style } }, hover: '',
      owner: null, price: E.floor * d.weight, markup: 1, takes: 0, lastSale: 0,
      lastActivity: launch, lastTakeAt: 0, rent: null, tenant: null, upgrade: null,
    };
  });
  if (!seeded) return;
  const history = [];
  for (const s of slots) {
    const entry = SEED[s.path];
    if (!entry) continue;
    const [text, style, walletIndex, takes, extras = {}] = entry;
    const c = blankContent(text, parseStyle(style));
    if (extras.image) c.image = seedImage(extras.image, s.id, extras);
    if (extras.url) c.url = extras.url;
    if (extras.bg !== undefined) c.bg = extras.bg;
    let price = E.floor * s.weight;
    let at = launch + r() * 2 * DAY;
    let owner = SIM_WALLETS[Math.floor(r() * SIM_WALLETS.length)];
    history.push({ id: uid(), kind: 'buy', slotId: s.id, path: s.path, wallet: owner, amount: round(price), unit: 'SOL', time: at });
    for (let k = 0; k < takes; k++) {
      at += r() * 4 * DAY + HOUR;
      const next = k === takes - 1 ? WALLETS[walletIndex] : SIM_WALLETS[Math.floor(r() * SIM_WALLETS.length)];
      const paid = round(price * E.takeMultiplier);
      history.push({ id: uid(), kind: 'take', slotId: s.id, path: s.path, wallet: next, from: owner, amount: paid, toPrevious: round(price * E.previousOwnerShare), unit: 'SOL', time: at });
      price = paid;
      owner = next;
    }
    if (!takes) owner = WALLETS[walletIndex];
    const lastActivity = Math.min(at, t - r() * 3 * WEEK);
    Object.assign(s, {
      owner, content: c, price: round(price), lastSale: round(price), takes, lastActivity,
      markup: r() < 0.25 ? Math.round((0.5 + r() * 3) * 10) / 10 : 1,
      hover: r() < 0.4 ? HOVERS[Math.floor(r() * HOVERS.length)] : '',
      rent: extras.rent ? { rate: extras.rent } : (r() < 0.2 ? { rate: round(E.floor * s.weight * 0.01) } : null),
    });
    if (s.rent && s.rent.rate < minRentRate(s)) s.rent.rate = minRentRate(s);
  }
  events = history.sort((a, b) => b.time - a.time);
}

function restore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY));
    if (saved && saved.v === 2 && saved.slots?.length === LAYOUT.length) {
      ({ slots, events, credits, shuffle, shuffleLog } = saved);
      return true;
    }
  } catch { /* no saved state */ }
  return false;
}

if (!restore()) resetState();
tick();
