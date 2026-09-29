import './styles.css';
import { CONFIG as C } from './config.js';
import * as D from './data.js';
import { initMotion, rescan, kick, shake, consumeDragClick } from './motion.js';

const E = C.economy;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

Object.entries(C.colors).forEach(([k, v]) => document.documentElement.style.setProperty('--' + k, v));

const ui = {
  currency: 'SOL',
  clean: false,
  heat: false,
  build: false,
  connected: false,
  cardId: null,
  draft: null, // { id, mode, content, days, markup, rate, upgrade }
  indexerFilter: 'all',
};

let byPath = {};
function indexSlots() { byPath = {}; D.getSlots().forEach((s) => { byPath[s.path] = s; }); }
indexSlots();

// ---------- formatting ----------

function money(sol) {
  if (ui.currency === 'USD') {
    const usd = sol * E.fakeSolUsd;
    return '$' + usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const digits = sol < 0.1 ? 4 : sol < 10 ? 3 : 2;
  return sol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: digits }) + ' SOL';
}
const num = (n) => Number(n).toLocaleString();
const pad = (id) => String(id).padStart(3, '0');
function ago(t) {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}
function left(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return m + ' min';
  if (m < 1440) return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  return Math.floor(m / 1440) + 'd ' + Math.floor((m % 1440) / 60) + 'h';
}
function fillTokens(text) {
  return String(text)
    .replaceAll('{views}', C.pageViews)
    .replaceAll('{slots}', D.getSlots().length)
    .replaceAll('$TICKER', C.ticker)
    .replaceAll('PROJECT_NAME', C.name);
}

// ---------- slot rendering ----------

function styleAttr(st) {
  const color = C.textColors[st.color] || '';
  if (st.color === 'gradient') return ` style="background:${color};-webkit-background-clip:text;background-clip:text;color:transparent"`;
  if (st.color && st.color !== 'default') return ` style="color:${color}"`;
  return '';
}
function styleClass(st) {
  return ['t', 'z-' + (st.size || 'md'), ...['hl', 'b', 'i', 's', 'u', 'up', 'box'].filter((k) => st[k])].join(' ');
}

function labelHTML(s) {
  const sh = D.getShuffle();
  const tier = tierOf(s);
  const shuffled = (sh && sh.pairs[s.id] ? '<b class="bdg sh" title="Shaken: showing another slot\u2019s content">↯</b>' : '') + (tier ? `<b class="bdg ${tier}">${tier.toUpperCase()}</b>` : '');
  if (D.tenantActive(s)) return `<span class="w">${esc(s.tenant.wallet)}</span><b class="bdg t">RENTED</b>${shuffled}`;
  if (!s.owner) return `<span class="w">UNCLAIMED</span><b class="bdg u">${money(D.priceOf(s))}</b>`;
  if (s.owner === C.sessionWallet) return `<span class="w">${esc(s.owner)}</span><b class="bdg me">YOURS</b>${shuffled}`;
  return `<span class="w">${esc(s.owner)}</span>${D.isRentable(s) ? '<b class="bdg r">RENTABLE</b>' : '<b class="bdg o">OWNED</b>'}${shuffled}`;
}

function contentHTML(s, c) {
  const kind = D.effectiveKind(s);
  const st = c.style || {};
  if (kind === 'image') {
    return c.image
      ? `<img class="im" src="${esc(c.image)}" alt="${esc(c.text || 'slot image')}">`
      : `<span class="hatch"><span>${esc(fillTokens(c.text || s.def.text))}</span></span>`;
  }
  if (kind === 'video') {
    return c.video
      ? `<video class="im" src="${esc(c.video)}" muted autoplay loop playsinline></video>`
      : `<span class="hatch"><span>THIS VIDEO SLOT IS EMPTY</span></span>`;
  }
  if (kind === 'background' && s.kind !== 'background') {
    return `<span class="bgup"${c.image ? ` style="background-image:url('${esc(c.image)}')"` : ''}><span class="${styleClass(st)}"${styleAttr(st)}>${esc(fillTokens(c.text)).replace(/\n/g, '<br>')}</span></span>`;
  }
  if (s.kind === 'background') return `<span class="bgmark">BG</span>`;
  const text = esc(fillTokens(c.text || '')).replace(/\n/g, '<br>');
  return `<span class="${styleClass(st)}"${styleAttr(st)}>${text || '&nbsp;'}</span>`;
}

function tierOf(s) { return s.takes >= 10 ? 'gold' : s.takes >= 6 ? 'holo' : ''; }
function heatLevel(s) { return s.takes >= 6 ? 3 : s.takes >= 3 ? 2 : s.takes >= 1 ? 1 : 0; }
function chipText(s) {
  if (ui.heat) return `#${pad(s.id)} · ${s.takes} takes`;
  return `#${pad(s.id)} · ${money(D.costToAcquire(s))}`;
}

function slotAttrs(s) {
  return `data-id="${s.id}" data-tier="${tierOf(s)}" data-chip="${esc(chipText(s))}" data-heat="${heatLevel(s)}" tabindex="0" role="button" aria-label="Slot ${s.id}: ${esc(s.path)}"`;
}

// Returns the HTML for one slot, used inside the page templates.
function S(path, cls = '') {
  const s = byPath[path];
  if (!s) return `<!-- missing ${path} -->`;
  const k = D.effectiveKind(s);
  return `<span class="s k-${k} ${s.owner ? '' : 'unclaimed'} ${cls}" ${slotAttrs(s)}><span class="foil" aria-hidden="true"></span><span class="lbl">${labelHTML(s)}</span><span class="c">${contentHTML(s, D.visibleContent(s))}</span></span>`;
}

// Background slots: a small tag in the section corner, and the section color.
function BG(path) { return S(path, 'bgslot'); }
function sectionStyle(s) {
  const c = D.visibleContent(s);
  const color = C.backgroundColors[c.bg] || '';
  if (c.image) return `background:linear-gradient(#0008,#0008),url('${c.image}') center/cover`;
  return color ? `background:${color}` : '';
}

function redrawSlot(id, contentOverride = null) {
  const s = D.getSlot(id);
  const content = contentOverride || D.visibleContent(s);
  $$(`.s[data-id="${id}"]`).forEach((el) => {
    const k = D.effectiveKind(s);
    el.className = el.className.replace(/\bk-\w+/, 'k-' + k);
    el.dataset.chip = chipText(s);
    el.dataset.heat = heatLevel(s);
    el.dataset.tier = tierOf(s);
    el.classList.toggle('unclaimed', !s.owner);
    el.innerHTML = `<span class="foil" aria-hidden="true"></span><span class="lbl">${labelHTML(s)}</span><span class="c">${contentHTML(s, content)}</span>`;
  });
  if (s.kind === 'background') {
    const sec = $(`[data-bg="${s.path}"]`);
    if (sec) sec.style.cssText = contentOverride ? sectionStyleFrom(contentOverride) : sectionStyle(s);
  }
}
function sectionStyleFrom(c) {
  if (c.image) return `background:linear-gradient(#0008,#0008),url('${c.image}') center/cover`;
  const color = C.backgroundColors[c.bg] || '';
  return color ? `background:${color}` : '';
}
function redrawAll() { D.getSlots().forEach((s) => redrawSlot(s.id)); }

function flash(id) {
  $$(`.s[data-id="${id}"]`).forEach((el) => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); });
}

// ---------- page templates ----------

function range(n) { return Array.from({ length: n }, (_, i) => i + 1); }

function home() {
  return `
  <section class="sec strip" data-bg="STRIP.BG">${BG('STRIP.BG')}
    <div class="wrap row">${S('STRIP.1')}${S('STRIP.2')}${S('STRIP.3')}${S('STRIP.4')}</div>
    <div class="wrap row">${S('STRIP.5')}${S('STRIP.6')}${S('STRIP.7')}</div>
  </section>

  <header class="sec navrow"><div class="wrap row nav">
    ${range(12).map((i) => S('NAV.' + i, D.getSlot(byPath['NAV.' + i].id).kind === 'image' ? 'ico' : '')).join('')}
    <button class="connect" data-action="connect">${ui.connected ? esc(C.sessionWallet) : 'Connect Wallet'}</button>
  </div></header>

  <section class="sec hero" data-bg="HERO.BG">${BG('HERO.BG')}
    <div class="wrap hero-grid">
      <div class="hero-l">
        ${S('HERO.EYEBROW', 'blk eyebrow')}
        ${S('HERO.TAG', 'blk')}
        <h1>${S('HERO.HEADLINE', 'blk headline')}</h1>
        ${S('HERO.STRIKE', 'blk')}
        <div class="row">${S('HERO.BUTTON', 'btn')}${S('HERO.CHIP')}</div>
        ${S('HERO.SMALL', 'blk small')}
      </div>
      <div class="hero-r">${S('HERO.IMAGE', 'blk bigimg')}</div>
    </div>
  </section>

  <section class="sec band" data-bg="BAND.BG">${BG('BAND.BG')}
    <div class="wrap">${S('BAND.TITLE', 'blk bandtitle')}
      <div class="tiles">${range(6).map((i) => S('BAND.TILE' + i, 'tile')).join('')}</div>
    </div>
  </section>

  <section class="sec testi"><div class="wrap">
    ${S('TESTIMONIALS.KICKER', 'blk center kicker')}
    ${S('TESTIMONIALS.DISPLAY', 'blk center display')}
    <div class="cards4">${range(4).map((i) => `
      <div class="card">
        ${S(`TESTIMONIALS.${i}.ICON`, 'ico blk')}
        ${S(`TESTIMONIALS.${i}.NAME`, 'blk cname')}
        ${S(`TESTIMONIALS.${i}.BODY`, 'blk cbody')}
      </div>`).join('')}
    </div>
  </div></section>

  <section class="sec showcase"><div class="wrap two">
    <div>
      ${S('SHOWCASE.KICKER', 'blk kicker')}
      <ul class="bullets">${range(5).map((i) => `<li>${S('SHOWCASE.LIST' + i)}</li>`).join('')}</ul>
      ${S('SHOWCASE.BOXED', 'blk wide')}
      ${S('SHOWCASE.IMAGE', 'blk bigimg poster')}
    </div>
    <div>
      ${S('SHOWCASE.LONG', 'blk longtext')}
      <div class="rentblock">
        ${S('SHOWCASE.RENT.TITLE', 'blk')}
        ${S('SHOWCASE.RENT.BODY', 'blk')}
        <ul class="bullets dots">${range(3).map((i) => `<li>${S('SHOWCASE.RENT.P' + i)}</li>`).join('')}</ul>
        ${S('SHOWCASE.RENT.DM', 'blk wide')}
      </div>
    </div>
  </div></section>

  <section class="sec band stats" data-bg="STATS.BG">${BG('STATS.BG')}
    <div class="wrap grid4">${range(4).map((i) => `
      <div class="stat">${S(`STATS.${i}.VALUE`, 'blk statv')}${S(`STATS.${i}.CAPTION`, 'blk statc')}</div>`).join('')}
    </div>
  </section>

  <section class="sec features"><div class="wrap">
    ${S('FEATURES.ARROW', 'blk center arrow')}
    <div class="grid2">${range(6).map((i) => `
      <div class="card fcard">
        ${S(`FEATURES.${i}.TITLE`, 'blk ftitle')}
        <div class="frow">${S(`FEATURES.${i}.ICON`, 'ico')}
          <div>${S(`FEATURES.${i}.NAME`, 'blk fname')}${S(`FEATURES.${i}.SUB`, 'blk fsub')}</div>
        </div>
      </div>`).join('')}
    </div>
  </div></section>

  <section class="sec pricing"><div class="wrap">
    ${S('PRICING.KICKER', 'blk center kicker2')}
    <div class="grid3">${range(3).map((i) => `
      <div class="card tier ${i === 2 ? 'hot' : ''}">
        ${S(`PRICING.${i}.NAME`, 'blk tname')}
        ${S(`PRICING.${i}.PRICE`, 'blk tprice')}
        ${S(`PRICING.${i}.BLURB`, 'blk tblurb')}
        <ul class="bullets dots">${range(3).map((j) => `<li>${S(`PRICING.${i}.LINE${j}`)}</li>`).join('')}</ul>
        ${S(`PRICING.${i}.BUTTON`, 'blk wide tbtn')}
      </div>`).join('')}
    </div>
  </div></section>

  <section class="sec band logos" data-bg="LOGOS.BG">${BG('LOGOS.BG')}
    <div class="wrap logogrid">${range(12).map((i) => S('LOGOS.' + i, 'logo')).join('')}</div>
  </section>

  <section class="sec faq"><div class="wrap narrow">
    ${S('FAQ.KICKER', 'blk kicker')}
    ${range(5).map((i) => `<div class="qa">${S(`FAQ.${i}.QUESTION`, 'blk q')}${S(`FAQ.${i}.ANSWER`, 'blk a')}</div>`).join('')}
  </div></section>

  <section class="sec ad"><div class="wrap center">
    ${S('AD.DISPLAY', 'blk addisplay')}
    ${S('AD.LINK', 'blk')}
    ${S('AD.BUTTON', 'btn red')}
  </div></section>

  <footer class="sec band foot" data-bg="FOOTER.BG">${BG('FOOTER.BG')}
    <div class="wrap grid5">${[3, 3, 3, 2, 2].map((n, c) => `<div class="fcol">${range(n).map((j) => S(`FOOTER.${c + 1}.${j}`, 'blk')).join('')}</div>`).join('')}</div>
  </footer>`;
}

function bottomRow() {
  const links = [['HISTORY', '#/history'], ['TIMELINE', '#/timeline'], ['X', C.xUrl || '#/docs'], ['DOCS', '#/docs'], ['API', '#/api'], ['WITHDRAW', '#/withdraw'], ['MY SLOTS', '#/my']];
  return `<div class="bottom"><div class="wrap row between">
    <span>${esc(C.name)} · ${esc(C.network)} · DEMO</span>
    <nav>${links.map(([t, h]) => `<a href="${esc(h)}"${h.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`).join('')}</nav>
  </div></div>`;
}

function topbar() {
  return `<div class="topbar"><div class="wrap row between">
    <div class="row brand">${S('TOPBAR.LOGO', 'ico sm')}${S('TOPBAR.WORDMARK', 'wm')}</div>
    <div class="row tools">
      <div class="dd"><button class="wbtn" data-action="menu" data-menu="buy">BUY <span>▾</span></button>
        <div class="menu" data-menu-for="buy">
          <a href="${esc(C.pumpUrl)}" target="_blank" rel="noopener">Buy ${esc(C.ticker)} on pump.fun ↗</a>
          <button data-action="cheapest">Buy the cheapest slot</button>
        </div></div>
      <div class="dd"><button class="gbtn" data-action="menu" data-menu="build">BUILD <span>▾</span></button>
        <div class="menu" data-menu-for="build">
          <button data-action="build">${ui.build ? 'Exit build mode' : 'Build mode (show every slot)'}</button>
          <a href="#/my">My slots</a><a href="#/history">History</a><a href="#/timeline">Timeline</a><a href="#/withdraw">Withdraw</a><a href="#/docs">Docs</a>
        </div></div>
      <button class="sq" data-action="help" aria-label="How this works">?</button>
      <a class="sq" href="${esc(C.xUrl || '#/docs')}" ${C.xUrl ? 'target="_blank" rel="noopener"' : ''} aria-label="X">X</a>
    </div>
  </div></div>`;
}

// ---------- secondary pages ----------

function eventSentence(e) {
  const slot = e.slotId ? `Slot #${e.slotId}` : '';
  const w = esc(e.wallet);
  switch (e.kind) {
    case 'buy': return `${slot} bought by ${w} for ${money(e.amount)}`;
    case 'take': return `${slot} taken by ${w} for ${money(e.amount)} · ${esc(e.from)} earns ${money(e.toPrevious || 0)}`;
    case 'edit': return `${slot} edited by ${w}`;
    case 'reprice': return `${slot} repriced by ${w} to ${money(e.amount)}`;
    case 'list': return `${slot} listed for rent by ${w} at ${money(e.amount)}/day`;
    case 'unlist': return `${slot} unlisted by ${w}`;
    case 'rent': return `${slot} rented by ${w} for ${e.days} day${e.days > 1 ? 's' : ''} (${money(e.amount)})`;
    case 'rent-end': return `Rental on ${slot.toLowerCase()} ended`;
    case 'upgrade': return `${slot} upgraded to ${esc(e.to)} by ${w} · burned ${num(e.amount)} ${esc(C.ticker)}`;
    case 'retire': return `${slot} upgrade expired, back to ${esc(e.to)}`;
    case 'shuffle': return `${w} pressed SHAKE. Everything fell into the wrong place.`;
    case 'unshuffle': return 'The shake wore off. Everything snapped back.';
    case 'withdraw': return `${w} withdrew ${money(e.amount)}`;
    default: return `${slot} ${esc(e.kind)}`;
  }
}

function eventRow(e) {
  return `<button class="ev" data-action="goto" data-id="${e.slotId || ''}">
    <span class="evk k-${esc(e.kind)}">${esc(e.kind === 'shuffle' ? 'SHAKE' : e.kind === 'unshuffle' ? 'SETTLE' : e.kind.toUpperCase())}</span>
    <span class="evs">${eventSentence(e)}${e.path ? `<small>${esc(e.path)}</small>` : ''}</span>
    <span class="evt">${ago(e.time)}</span></button>`;
}

function page(title, label, body) {
  return `<section class="sec pagewrap"><div class="wrap narrow">
    <a class="back" href="#/">← BACK TO THE PAGE</a>
    <div class="plabel">${label}</div><h2 class="ptitle">${title}</h2>${body}</div></section>`;
}

function historyPage() {
  const list = D.getEvents().slice(0, 300);
  return page('History', 'EVERY EVENT, NEWEST FIRST', `<div class="evlist">${list.map(eventRow).join('') || '<p class="muted">Nothing yet.</p>'}</div>`);
}

function timelinePage() {
  const days = {};
  D.getEvents().forEach((e) => {
    const k = new Date(e.time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    (days[k] = days[k] || []).push(e);
  });
  const max = Math.max(1, ...Object.values(days).map((l) => l.length));
  const body = Object.entries(days).map(([day, list]) => {
    const takes = list.filter((e) => e.kind === 'take').length;
    const buys = list.filter((e) => e.kind === 'buy').length;
    const vol = list.reduce((a, e) => a + (e.unit === 'SOL' && ['buy', 'take', 'rent'].includes(e.kind) ? e.amount : 0), 0);
    return `<div class="tday"><div class="tdh"><b>${esc(day)}</b><span>${list.length} events · ${buys} buys · ${takes} takes · ${money(vol)} volume</span></div>
      <div class="tbar"><i style="width:${(list.length / max) * 100}%"></i></div>
      <details><summary>Show events</summary><div class="evlist">${list.slice(0, 80).map(eventRow).join('')}</div></details></div>`;
  }).join('');
  return page('Timeline', 'HOW THE PAGE CHANGED, DAY BY DAY', body);
}

function mySlotsPage() {
  const mine = D.getSlots().filter((s) => s.owner === C.sessionWallet || (D.tenantActive(s) && s.tenant.wallet === C.sessionWallet));
  const body = mine.length ? `<div class="mylist">${mine.map((s) => `<div class="myrow">
      <span class="mono">#${pad(s.id)} ${esc(s.path)}</span>
      <span>${esc(fillTokens(D.visibleContent(s).text || D.effectiveKind(s)))}</span>
      <span class="mono">${D.tenantActive(s) && s.tenant.wallet === C.sessionWallet ? 'RENTING · ' + left(s.tenant.until - Date.now()) + ' left' : 'PRICE ' + money(D.priceOf(s))}</span>
      <button class="obtn" data-action="goto" data-id="${s.id}">OPEN</button></div>`).join('')}</div>`
    : `<p class="muted">You don’t own anything yet. Every slot on the page is for sale.</p><button class="wbtn big" data-action="cheapest">SHOW ME THE CHEAPEST SLOT</button>`;
  return page('My slots', esc(C.sessionWallet), body);
}

function withdrawPage() {
  const bal = D.getBalance(C.sessionWallet);
  return page('Withdraw', 'CLAIMABLE BALANCE', `
    <div class="balance">${money(bal)}</div>
    <p class="muted">When someone takes your slot you are credited ${E.previousOwnerShare}× its price. Rent from tenants lands here too. Payouts are not pushed to you, you claim them. Nothing expires.</p>
    <button class="wbtn big" data-action="withdraw" ${bal > 0 ? '' : 'disabled'}>CLAIM ${money(bal)}</button>`);
}

function apiPage() {
  const data = D.getSlots().map((s) => ({ id: s.id, path: s.path, kind: D.effectiveKind(s), owner: s.owner, price: D.priceOf(s), takePrice: D.takePriceOf(s), takes: s.takes, rentable: D.isRentable(s), text: D.visibleContent(s).text }));
  return page('API', 'EVERY SLOT AS JSON (DEMO DATA)', `<p class="muted">In the real version this is a public read-only endpoint. Here it is the local demo state.</p><pre class="json">${esc(JSON.stringify(data, null, 2))}</pre>`);
}

function docsPage() {
  const p = (t, b) => `<div class="rule"><h3>${t}</h3><p>${b}</p></div>`;
  return page('Everything here is loose.', 'HOW IT WORKS', `
    <p class="lead">It looks like an ordinary landing page. Every visible element, from nav links and headlines to images, section backgrounds and footer links, is a separate slot with its own owner. There are ${D.getSlots().length} of them.</p>
    <h4 class="plabel">HOW IT WORKS</h4>
    ${p('Buy', `An unclaimed slot costs its current price, starting from a floor of ${E.floor} SOL and higher for more valuable spots like the nav and the headline.`)}
    ${p('Edit', 'Only the current owner can change what a slot says, its colors and style, its link and its hover message.')}
    ${p('Take', `Anyone can take an owned slot by paying ${E.takeMultiplier}× its price. The previous owner is credited ${E.previousOwnerShare}×, so being taken is a profit. ${E.creatorShare * 100}% goes to the creator and the rest to the treasury. There is a ${E.cooldownMinutes} minute cooldown between takes on the same slot.`)}
    ${p('Decay', `Idle slots lose ${Math.round((1 - E.decayPerWeek) * 100)}% of their price every week, drifting back toward the floor, for up to ${E.decayMaxWeeks} weeks. Cheap slots are the decayed ones.`)}
    <h4 class="plabel">ONCE YOU OWN A SLOT</h4>
    ${p('Set your own price', `Move your asking price between ${E.markupMin}× and ${E.markupMax}×. Mark it up to scare people off, down to invite a take. It resets when the slot changes hands.`)}
    ${p('Rent it out', `List it at a daily rate (at least ${E.rentFloorPerDay * 100}% of its price per day). A tenant writes in it for up to ${E.rentMaxDays} days while you keep ownership. The protocol keeps ${E.rentProtocolCut * 100}% of rent. A tenancy survives a take.`)}
    ${p('Upgrade it', `Turn a text slot into a link, image, background or video by burning ${esc(C.ticker)}: ${Object.entries(E.upgradeBurn).map(([k, v]) => `${num(v)} for ${k}`).join(', ')}. Upgrades last ${E.upgradeDays} days. Images need a wide slot, video needs a big one.`)}
    ${p('Shake', `Now and then a SHAKE button shows up. Pressing it rattles the whole page, and every owned slot lands in someone else\u2019s spot for ${E.shuffleMinutes} minutes. Nobody loses anything, only what is shown moves. At most ${E.shuffleMaxPerWeek} per week.`)}
    ${p('Rarity', 'Slots that keep getting taken level up. After 6 takes a slot turns HOLO, after 10 it turns GOLD. Hover one and watch the foil move.')}
    ${p('Everything is on a spring', 'Hover a slot and it leans toward you. Grab one with the mouse and pull it, it snaps back when you let go. When a slot gets taken it pops and knocks its neighbours around.')}
    ${p('Withdraw', 'Payouts from takes and rent are credited to your balance. You claim them yourself on the Withdraw page.')}
    <h4 class="plabel">THIS DEMO</h4>
    <p class="muted">${esc(C.copy.demoNote)} Everything is simulated in your browser and saved only for this tab. Press D for demo controls.</p>`);
}

// ---------- app shell ----------

function shell() {
  document.getElementById('app').innerHTML = `
    <div id="top"></div>
    <main id="view"></main>
    <div id="bottomrow"></div>
    <div class="ticker"><button class="live" data-action="indexer"><i></i>LIVE</button><span id="shufflechip"></span><span id="tickertext"></span><button class="idx" data-action="indexer">INDEXER</button></div>
    <div class="float">
      <div class="frow1"><button class="sq" data-action="help" aria-label="Help">?</button>
        <div class="fbox"><span>CLEAN VIEW</span><button class="switch" data-action="clean" aria-pressed="false"><i></i></button><button class="tog" data-action="heat" aria-pressed="false">HEAT</button></div></div>
      <div class="seg"><button data-action="cur" data-cur="USD">USD</button><button data-action="cur" data-cur="SOL" class="on">SOL</button></div>
    </div>
    <button id="shufflebtn" class="shufflebtn" data-action="shuffle" hidden>SHAKE THE PAGE</button>
    <div id="card" class="card-pop" hidden></div>
    <div id="overlay" class="overlay" hidden></div>
    <div id="editor" class="editor" hidden role="dialog" aria-modal="true"></div>
    <div id="modal" class="modal" hidden role="dialog" aria-modal="true"></div>
    <aside id="drawer" class="drawer" hidden></aside>
    <div id="demo" class="demo" hidden></div>
    <div id="toast" class="toast" hidden></div>`;
}

function route() {
  closeCard();
  const h = location.hash.replace(/^#\/?/, '');
  const [name, arg] = h.split('/');
  const pages = { history: historyPage, timeline: timelinePage, my: mySlotsPage, withdraw: withdrawPage, docs: docsPage, api: apiPage };
  $('#top').innerHTML = topbar();
  $('#view').innerHTML = pages[name] ? pages[name]() : home();
  $('#bottomrow').innerHTML = bottomRow();
  D.getSlots().filter((s) => s.kind === 'background').forEach((s) => redrawSlot(s.id));
  window.scrollTo(0, 0);
  rescan();
  if (name === 'slot' && arg) setTimeout(() => gotoSlot(Number(arg)), 50);
}

// ---------- ticker, indexer ----------

function updateTicker() {
  const e = D.getEvents()[0];
  $('#tickertext').innerHTML = e ? `${eventSentence(e)} · ${ago(e.time)}` : 'No activity yet.';
  const sh = D.getShuffle();
  $('#shufflechip').innerHTML = sh ? `<b class="shchip">SHAKEN · SNAPS BACK IN ${left(sh.until - Date.now())}</b>` : '';
  if (!$('#drawer').hidden) renderDrawer();
}

function renderDrawer() {
  const f = ui.indexerFilter;
  const kinds = ['all', 'buy', 'take', 'rent', 'edit', 'reprice'];
  const list = D.getEvents().filter((e) => f === 'all' || e.kind === f).slice(0, 120);
  $('#drawer').innerHTML = `<div class="dhead"><b>INDEXER</b><button class="x" data-action="close-drawer" aria-label="Close">×</button></div>
    <div class="chips">${kinds.map((k) => `<button class="${k === f ? 'on' : ''}" data-action="filter" data-kind="${k}">${k.toUpperCase()}</button>`).join('')}</div>
    <div class="evlist">${list.map(eventRow).join('') || '<p class="muted">Nothing yet.</p>'}</div>`;
}

// ---------- slot card ----------

function cardHTML(s) {
  const me = C.sessionWallet;
  const isMine = s.owner === me;
  const tenantMe = D.tenantActive(s) && s.tenant.wallet === me;
  const c = D.visibleContent(s);
  const cd = D.cooldownLeft(s);
  const row = (k, v) => `<div class="cr"><span>${k}</span><b>${v}</b></div>`;
  const buttons = [];
  if (!s.owner) buttons.push(`<button class="cb primary" data-action="open-editor" data-mode="buy">BUY · ${money(D.priceOf(s))}</button>`);
  else if (isMine) {
    buttons.push(D.tenantActive(s) ? `<button class="cb" disabled>RENTED UNTIL ${new Date(s.tenant.until).toLocaleDateString()}</button>` : `<button class="cb primary" data-action="open-editor" data-mode="edit">EDIT</button>`);
    buttons.push(`<button class="cb" data-action="open-editor" data-mode="price">SET PRICE</button>`);
    buttons.push(s.rent ? `<button class="cb" data-action="unlist">UNLIST FROM RENT</button>` : `<button class="cb" data-action="open-editor" data-mode="list">LIST FOR RENT</button>`);
    if (D.upgradeOptions(s).length) buttons.push(`<button class="cb" data-action="open-editor" data-mode="upgrade">UPGRADE</button>`);
  } else {
    if (tenantMe) buttons.push(`<button class="cb primary" data-action="open-editor" data-mode="edit">EDIT YOUR RENTAL</button>`);
    if (D.isRentable(s)) buttons.push(`<button class="cb" data-action="open-editor" data-mode="rent">RENT IT · ${money(s.rent.rate)}/DAY</button>`);
    buttons.push(cd > 0 ? `<button class="cb" disabled>COOLDOWN · ${left(cd)}</button>` : `<button class="cb primary" data-action="open-editor" data-mode="take">TAKE · ${money(D.takePriceOf(s))}</button>`);
  }
  if (c.url) buttons.push(`<a class="cb" href="${esc(c.url)}" target="_blank" rel="noopener nofollow">VISIT LINK ↗</a>`);
  buttons.push(`<button class="cb" data-action="share">SHARE CARD</button>`);
  buttons.push(`<a class="cb" href="${esc(C.pumpUrl)}" target="_blank" rel="noopener">TRADE ${esc(C.ticker)} ↗</a>`);
  return `<div class="chead"><span>${esc(s.path)} · #${pad(s.id)}</span><button class="x" data-action="close-card" aria-label="Close">×</button></div>
    ${row('OWNER', s.owner ? esc(s.owner) : 'UNCLAIMED')}
    ${D.tenantActive(s) ? row('TENANT', `${esc(s.tenant.wallet)} · ${left(s.tenant.until - Date.now())} left`) : ''}
    ${row('PRICE', money(D.priceOf(s)))}
    ${row('TAKE PRICE', s.owner ? money(D.takePriceOf(s)) : '—')}
    ${row('OWNER MARKUP', s.owner ? `${Number(s.markup).toFixed(2)}×` : '—')}
    ${row('TAKES', s.takes)}
    ${s.rent ? row('RENT', `${money(s.rent.rate)} / day`) : ''}
    ${s.upgrade && s.upgrade.until > Date.now() ? row('UPGRADE', `${esc(s.upgrade.type)} · ${left(s.upgrade.until - Date.now())}`) : ''}
    ${row('ON HOVER', s.hover ? `“${esc(fillTokens(s.hover))}”` : '—')}
    ${row('LAST SALE', s.lastSale ? money(s.lastSale) : '—')}
    <div class="cbtns">${buttons.join('')}</div>`;
}

function openCard(id, anchor) {
  const s = D.getSlot(id);
  ui.cardId = s.id;
  const card = $('#card');
  card.innerHTML = cardHTML(s);
  card.hidden = false;
  $$('.s.sel').forEach((el) => el.classList.remove('sel'));
  const el = anchor || $(`.s[data-id="${id}"]`);
  if (el) el.classList.add('sel');
  if (window.innerWidth < 720 || !el) { card.classList.add('sheet'); card.style.cssText = ''; return; }
  card.classList.remove('sheet');
  const r = el.getBoundingClientRect();
  const w = 300, h = card.offsetHeight;
  let x = r.right + 12;
  if (x + w > window.innerWidth - 12) x = r.left - w - 12;
  if (x < 12) x = Math.min(window.innerWidth - w - 12, Math.max(12, r.left));
  let y = r.top;
  if (y + h > window.innerHeight - 50) y = window.innerHeight - 50 - h;
  card.style.cssText = `left:${x}px;top:${Math.max(12, y)}px`;
}
function closeCard() {
  ui.cardId = null;
  const card = $('#card');
  if (card) card.hidden = true;
  $$('.s.sel').forEach((el) => el.classList.remove('sel'));
}

function gotoSlot(id) {
  if (!id) return;
  const go = () => {
    const el = $(`.s[data-id="${id}"]`);
    if (!el) return;
    ui.holdCardUntil = Date.now() + 1500;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    flash(id);
    setTimeout(() => openCard(id, el), 700);
  };
  if (!$('.sec.hero')) { location.hash = '#/'; setTimeout(go, 80); } else go();
}

// ---------- editor ----------

const CONTENT_MODES = ['buy', 'take', 'edit', 'rent'];

function openEditor(mode) {
  const s = D.getSlot(ui.cardId);
  const own = D.tenantActive(s) && s.tenant.wallet === C.sessionWallet ? s.tenant.content : s.content;
  const start = mode === 'edit' ? own : mode === 'buy' || mode === 'take' || mode === 'rent' ? (s.owner ? { ...D.visibleContent(s) } : { ...s.def }) : null;
  ui.draft = {
    id: s.id, mode,
    content: start ? structuredClone({ ...start, hover: s.hover || '' }) : null,
    days: 1,
    markup: s.markup,
    rate: s.rent ? s.rent.rate : D.minRentRate(s),
    upgrade: D.upgradeOptions(s)[0],
  };
  if (ui.draft.content && mode !== 'edit') ui.draft.content.style = ui.draft.content.style || { color: 'default', size: 'md' };
  closeCard();
  renderEditor();
  $('#overlay').hidden = false;
  $('#editor').hidden = false;
  const first = $('#editor textarea, #editor input, #editor button.primary');
  if (first) first.focus();
}

function closeEditor(restore = true) {
  if (ui.draft && restore) redrawSlot(ui.draft.id);
  ui.draft = null;
  $('#editor').hidden = true;
  $('#overlay').hidden = true;
}

function costPanel(s, d) {
  const row = (k, v) => `<div class="cr"><span>${k}</span><b>${v}</b></div>`;
  if (d.mode === 'buy') return row('YOU PAY', money(D.priceOf(s))) + row('TO CREATOR', money(D.priceOf(s) * E.creatorShare));
  if (d.mode === 'take') {
    const p = D.priceOf(s), paid = p * E.takeMultiplier;
    return row('YOU PAY', money(paid)) + row(`${esc(s.owner)} GETS`, money(p * E.previousOwnerShare)) + row('CREATOR', money(paid * E.creatorShare)) + row('TREASURY', money(paid - p * E.previousOwnerShare - paid * E.creatorShare)) + row('NEW PRICE', money(paid));
  }
  if (d.mode === 'rent') return row('RATE', `${money(s.rent.rate)} / day`) + row('YOU PAY', money(s.rent.rate * d.days)) + row('OWNER GETS', money(s.rent.rate * d.days * (1 - E.rentProtocolCut)));
  return '';
}

function contentFields(s, d) {
  const c = d.content;
  const kind = D.effectiveKind(s);
  const limit = s.long ? C.limits.long : C.limits.text;
  if (s.kind === 'background') {
    return `<label class="fl">SECTION COLOR</label><div class="sw">${Object.entries(C.backgroundColors).map(([k, v]) => `<button class="swb ${c.bg === k ? 'on' : ''}" data-action="bg" data-bg="${k}" style="background:${v || C.colors.bg}" title="${k}"></button>`).join('')}</div>
      <label class="fl">OR AN IMAGE <small>PNG, JPG, GIF, WEBP · MAX 2 MB</small></label><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-field="image">
      ${c.image ? '<button class="linkbtn" data-action="clear-image">Remove image</button>' : ''}`;
  }
  if (kind === 'image') {
    return `<label class="fl">IMAGE <small>PNG, JPG, GIF, WEBP · MAX 2 MB</small></label><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-field="image">
      <label class="fl">DESCRIPTION (ALT TEXT)</label><input type="text" maxlength="${limit}" value="${esc(c.text)}" data-field="text">
      <label class="fl">LINK (OPTIONAL)</label><input type="url" placeholder="https://" value="${esc(c.url)}" data-field="url">
      <label class="fl">ON HOVER MESSAGE</label><input type="text" maxlength="80" value="${esc(c.hover)}" data-field="hover">`;
  }
  if (kind === 'video') {
    return `<label class="fl">VIDEO <small>MP4 or WEBM · MAX 2 MB</small></label><input type="file" accept="video/mp4,video/webm" data-field="video">
      <label class="fl">ON HOVER MESSAGE</label><input type="text" maxlength="80" value="${esc(c.hover)}" data-field="hover">`;
  }
  const st = c.style;
  const toggles = [['b', 'B'], ['i', 'I'], ['s', 'S'], ['u', 'U'], ['up', 'CAPS'], ['hl', 'HIGHLIGHT'], ['box', 'BOX']];
  return `<label class="fl">TEXT <small id="count">${c.text.length}/${limit}</small></label>
    <textarea rows="${s.long ? 5 : 2}" maxlength="${limit}" data-field="text">${esc(c.text)}</textarea>
    <label class="fl">COLOR</label><div class="sw">${Object.entries(C.textColors).map(([k, v]) => `<button class="swb ${st.color === k ? 'on' : ''}" data-action="color" data-color="${k}" style="background:${v}" title="${k}"></button>`).join('')}</div>
    <label class="fl">STYLE</label><div class="tg">${toggles.map(([k, t]) => `<button class="${st[k] ? 'on' : ''}" data-action="style" data-style="${k}">${t}</button>`).join('')}</div>
    <label class="fl">SIZE</label><div class="tg">${['xs', 'sm', 'md', 'lg', 'xl'].map((z) => `<button class="${st.size === z ? 'on' : ''}" data-action="size" data-size="${z}">${z.toUpperCase()}</button>`).join('')}</div>
    ${kind === 'link' ? `<label class="fl">LINK</label><input type="url" placeholder="https://" value="${esc(c.url)}" data-field="url">` : ''}
    ${kind === 'background' ? `<label class="fl">BACKGROUND IMAGE</label><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-field="image">` : ''}
    <label class="fl">ON HOVER MESSAGE</label><input type="text" maxlength="80" value="${esc(c.hover)}" data-field="hover">`;
}

function renderEditor() {
  const d = ui.draft;
  const s = D.getSlot(d.id);
  const titles = { buy: 'Buy this slot', take: 'Take this slot', edit: 'Edit your slot', rent: 'Rent this slot', price: 'Set your price', list: 'List for rent', upgrade: 'Upgrade this slot' };
  const confirm = { buy: `BUY FOR ${money(D.priceOf(s))}`, take: `TAKE FOR ${money(D.takePriceOf(s))}`, edit: 'SAVE CHANGES', rent: `RENT FOR ${money((s.rent?.rate || 0) * d.days)}`, price: 'SET PRICE', list: 'LIST FOR RENT', upgrade: 'BURN & UPGRADE' };
  let body = '';
  if (CONTENT_MODES.includes(d.mode)) {
    body = `<p class="ehint">${d.mode === 'edit' ? 'Changes show on the page as you type.' : 'Write what this slot should say. The page updates live as you type.'}</p>
      ${d.mode === 'rent' ? `<label class="fl">DAYS</label><div class="tg">${Array.from({ length: E.rentMaxDays }, (_, i) => `<button class="${d.days === i + 1 ? 'on' : ''}" data-action="days" data-days="${i + 1}">${i + 1}</button>`).join('')}</div>` : ''}
      ${contentFields(s, d)}
      <div class="cost">${costPanel(s, d)}</div>`;
  } else if (d.mode === 'price') {
    const base = D.basePriceOf(s);
    body = `<p class="ehint">Formula price right now: <b>${money(base)}</b>. Mark it up so nobody takes it, or down to invite a take.</p>
      <label class="fl">MARKUP <small>${Number(d.markup).toFixed(1)}× → ${money(base * d.markup)} · take price ${money(base * d.markup * E.takeMultiplier)}</small></label>
      <input type="range" min="${E.markupMin}" max="${E.markupMax}" step="0.1" value="${d.markup}" data-field="markup">`;
  } else if (d.mode === 'list') {
    body = `<p class="ehint">A tenant writes in your slot for up to ${E.rentMaxDays} days while you keep owning it. You keep ${Math.round((1 - E.rentProtocolCut) * 100)}% of the rent.</p>
      <label class="fl">DAILY RATE (SOL) <small>MINIMUM ${D.minRentRate(s)}</small></label>
      <input type="number" step="0.0001" min="${D.minRentRate(s)}" value="${d.rate}" data-field="rate">`;
  } else if (d.mode === 'upgrade') {
    const opts = D.upgradeOptions(s);
    body = `<p class="ehint">Upgrades burn ${esc(C.ticker)} (sent to a dead address) and last ${E.upgradeDays} days, then the slot goes back to ${esc(s.kind)}.</p>
      <div class="opts">${Object.keys(E.upgradeBurn).filter((k) => k !== s.kind).map((k) => `<button class="opt ${d.upgrade === k ? 'on' : ''}" data-action="upgrade-pick" data-type="${k}" ${opts.includes(k) ? '' : 'disabled'}>
        <b>${k.toUpperCase()}</b><span>${num(E.upgradeBurn[k])} ${esc(C.ticker)}</span>${opts.includes(k) ? '' : '<small>slot too small</small>'}</button>`).join('')}</div>`;
  }
  $('#editor').innerHTML = `<div class="ehead"><div><span class="plabel">${esc(s.path)} · #${pad(s.id)}</span><h3>${titles[d.mode]}</h3></div><button class="x" data-action="cancel" aria-label="Close">×</button></div>
    <div class="ebody">${body}<p class="err" id="err" role="alert"></p></div>
    <div class="efoot"><span class="muted small">${esc(C.copy.demoNote)}</span><div class="row"><button class="obtn" data-action="cancel">CANCEL</button><button class="wbtn primary" data-action="confirm">${confirm[d.mode]}</button></div></div>`;
}

function preview() {
  const d = ui.draft;
  if (d && d.content) redrawSlot(d.id, d.content);
}

function confirmEditor() {
  const d = ui.draft;
  const s = D.getSlot(d.id);
  try {
    if (!ui.connected) connect(true);
    const c = d.content;
    if (d.mode === 'buy') D.buySlot(s.id, c);
    if (d.mode === 'take') D.takeSlot(s.id, c);
    if (d.mode === 'edit') D.editSlot(s.id, c);
    if (d.mode === 'rent') D.rentSlot(s.id, d.days, c);
    if (d.mode === 'price') D.setMarkup(s.id, d.markup);
    if (d.mode === 'list') D.listForRent(s.id, Number(d.rate));
    if (d.mode === 'upgrade') D.upgradeSlot(s.id, d.upgrade);
    const id = s.id;
    closeEditor(false);
    redrawSlot(id);
    flash(id);
    toast({ buy: 'Bought. The slot is yours.', take: 'Taken. The slot is yours.', edit: 'Saved.', rent: 'Rented. Your content is live.', price: 'Price updated.', list: 'Listed for rent.', upgrade: 'Upgraded.' }[d.mode] + ' (demo transaction)');
  } catch (err) {
    $('#err').textContent = err.message;
  }
}

function readFile(input, field) {
  const file = input.files && input.files[0];
  if (!file) return;
  const max = field === 'video' ? C.limits.maxVideoBytes : C.limits.maxImageBytes;
  if (file.size > max) { $('#err').textContent = 'That file is larger than 2 MB.'; input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = () => { ui.draft.content[field] = reader.result; $('#err').textContent = ''; preview(); };
  reader.onerror = () => { $('#err').textContent = 'Could not read that file.'; };
  reader.readAsDataURL(file);
}

// ---------- modal, toast, wallet, demo ----------

function showModal() {
  const m = C.copy.modal;
  $('#modal').innerHTML = `<div class="mbox">
    <button class="x mx" data-action="close-modal" aria-label="Close">×</button>
    <div class="mtop"><div class="plabel">${esc(m.label)}</div><h2>${esc(m.title)}</h2><p>${esc(m.body)}</p></div>
    <div class="mrules">
      <div class="mr"><b>Buy</b><p>Claim an unclaimed slot from <strong>${E.floor} SOL</strong> and set what it says.</p></div>
      <div class="mr"><b>Take</b><p>Anyone can take an owned slot for <strong>${E.takeMultiplier}×</strong> its price. The previous owner is paid <strong>${E.previousOwnerShare}×</strong>, so getting taken pays you.</p></div>
      <div class="mr"><b>Decay</b><p>Idle slots lose <strong>${Math.round((1 - E.decayPerWeek) * 100)}% of their price per week</strong>, sliding back toward the floor. The cheap ones are the forgotten ones.</p></div>
      <div class="mr"><b>Poke it</b><p>Everything here hangs on a <strong>spring</strong>. Hover a slot, grab it, pull it. Slots that keep getting taken turn <strong>HOLO</strong>, then <strong>GOLD</strong>.</p></div>
    </div>
    <div class="mfoot"><a href="#/docs" data-action="close-modal">${esc(m.docs)}</a><div class="row"><button class="ghost" data-action="close-modal">${esc(m.ok)}</button><button class="wbtn" data-action="cheapest">${esc(m.cheapest)}</button></div></div>
  </div>`;
  $('#modal').hidden = false;
}
function closeModal() { $('#modal').hidden = true; try { sessionStorage.setItem('ee-seen', '1'); } catch { /* ignore */ } }

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

function connect(silent = false) {
  ui.connected = true;
  $$('[data-action="connect"]').forEach((b) => { b.textContent = C.sessionWallet; });
  if (!silent) toast('Demo wallet connected. No real wallet was accessed.');
}

function renderDemo() {
  $('#demo').innerHTML = `<div class="dhead"><b>DEMO CONTROLS</b><button class="x" data-action="close-demo" aria-label="Close">×</button></div>
    <button data-action="demo" data-demo="event">Random event</button>
    <button data-action="demo" data-demo="burst">10 events fast</button>
    <button data-action="demo" data-demo="fill">Fill every slot</button>
    <button data-action="demo" data-demo="empty">Empty every slot</button>
    <button data-action="demo" data-demo="shuffle">Show SHAKE button</button>
    <button data-action="demo" data-demo="unshuffle">End the shake</button>
    <button data-action="demo" data-demo="kick">Knock a random slot</button>
    <button data-action="demo" data-demo="week">Skip 1 week (decay)</button>
    <button data-action="demo" data-demo="reset">Reset to starting page</button>
    <p class="muted small">Press D or Escape to hide.</p>`;
}

function runDemo(kind) {
  if (kind === 'event') D.simulateEvent(ui.draft?.id);
  if (kind === 'burst') for (let i = 0; i < 10; i++) D.simulateEvent(ui.draft?.id);
  if (kind === 'fill') D.fillAll();
  if (kind === 'empty') D.emptyAll();
  if (kind === 'shuffle') $('#shufflebtn').hidden = false;
  if (kind === 'unshuffle') { shake(0.5); D.endShuffle(); }
  if (kind === 'kick') { const vis = $$('#view .s[data-id]').filter((el) => { const r = el.getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; }); const el = vis[Math.floor(Math.random() * vis.length)]; if (el) kick(Number(el.dataset.id), 1.3); }
  if (kind === 'week') D.fastForward(1);
  if (kind === 'reset') { D.resetState(); indexSlots(); try { sessionStorage.removeItem('ee-seen'); } catch { /* ignore */ } route(); }
  toast('Demo: ' + kind);
}

// ---------- events ----------

function onAction(el, ev) {
  const a = el.dataset.action;
  switch (a) {
    case 'menu': {
      const m = $(`[data-menu-for="${el.dataset.menu}"]`);
      const open = m.classList.contains('open');
      $$('.menu.open').forEach((x) => x.classList.remove('open'));
      if (!open) m.classList.add('open');
      break;
    }
    case 'cheapest': {
      closeModal();
      $$('.menu.open').forEach((x) => x.classList.remove('open'));
      const s = D.cheapestSlot();
      if (s) gotoSlot(s.id);
      break;
    }
    case 'build':
      ui.build = !ui.build;
      document.body.classList.toggle('build', ui.build);
      $$('.menu.open').forEach((x) => x.classList.remove('open'));
      $('#top').innerHTML = topbar();
      rescan();
      toast(ui.build ? 'Build mode: every slot is outlined with its number and price.' : 'Build mode off.');
      break;
    case 'help': showModal(); break;
    case 'close-modal': closeModal(); break;
    case 'connect': if (ui.connected) toast('Connected as ' + C.sessionWallet + ' (demo).'); else connect(); break;
    case 'clean':
      ui.clean = !ui.clean;
      document.body.classList.toggle('clean', ui.clean);
      el.setAttribute('aria-pressed', ui.clean);
      break;
    case 'heat':
      ui.heat = !ui.heat;
      document.body.classList.toggle('heat', ui.heat);
      el.setAttribute('aria-pressed', ui.heat);
      redrawAll();
      break;
    case 'cur':
      ui.currency = el.dataset.cur;
      $$('[data-action="cur"]').forEach((b) => b.classList.toggle('on', b === el));
      redrawAll();
      if (ui.cardId) openCard(ui.cardId);
      if (!$('.sec.hero')) route();
      updateTicker();
      break;
    case 'indexer': $('#drawer').hidden = !$('#drawer').hidden; if (!$('#drawer').hidden) renderDrawer(); break;
    case 'close-drawer': $('#drawer').hidden = true; break;
    case 'filter': ui.indexerFilter = el.dataset.kind; renderDrawer(); break;
    case 'goto': if (el.dataset.id) { if (window.innerWidth < 720) $('#drawer').hidden = true; gotoSlot(Number(el.dataset.id)); } break;
    case 'close-card': closeCard(); break;
    case 'open-editor': openEditor(el.dataset.mode); break;
    case 'unlist': try { D.listForRent(ui.cardId, null); toast('Unlisted.'); openCard(ui.cardId); } catch (e) { toast(e.message); } break;
    case 'share': {
      const url = location.origin + location.pathname + '#/slot/' + ui.cardId;
      navigator.clipboard?.writeText(url).then(() => toast('Link to this slot copied.'), () => toast(url));
      break;
    }
    case 'cancel': closeEditor(true); break;
    case 'confirm': confirmEditor(); break;
    case 'color': ui.draft.content.style.color = el.dataset.color; renderEditor(); preview(); break;
    case 'style': ui.draft.content.style[el.dataset.style] = !ui.draft.content.style[el.dataset.style]; renderEditor(); preview(); break;
    case 'size': ui.draft.content.style.size = el.dataset.size; renderEditor(); preview(); break;
    case 'bg': ui.draft.content.bg = el.dataset.bg; renderEditor(); preview(); break;
    case 'clear-image': ui.draft.content.image = ''; renderEditor(); preview(); break;
    case 'days': ui.draft.days = Number(el.dataset.days); renderEditor(); break;
    case 'upgrade-pick': ui.draft.upgrade = el.dataset.type; renderEditor(); break;
    case 'withdraw': try { const amt = D.withdraw(); toast(`Claimed ${money(amt)} (demo).`); route(); } catch (e) { toast(e.message); } break;
    case 'shuffle':
      el.hidden = true;
      shake(1.5);
      setTimeout(() => { try { D.startShuffle(); shake(0.7); toast('Shaken! Everything landed in the wrong place for 90 minutes.'); } catch (e) { toast(e.message); } }, 280);
      break;
    case 'close-demo': $('#demo').hidden = true; break;
    case 'demo': runDemo(el.dataset.demo); break;
    default: break;
  }
  if (el.tagName === 'A' && a === 'close-modal') return;
  if (el.tagName === 'BUTTON') ev.preventDefault();
}

function bind() {
  document.addEventListener('click', (ev) => {
    const actionEl = ev.target.closest('[data-action]');
    if (actionEl) { onAction(actionEl, ev); return; }
    const slotEl = ev.target.closest('.s[data-id]');
    if (slotEl && !ev.target.closest('#editor')) {
      ev.preventDefault();
      if (consumeDragClick()) return;
      if (ui.draft) return;
      openCard(Number(slotEl.dataset.id), slotEl);
      return;
    }
    if (!ev.target.closest('#card')) closeCard();
    if (!ev.target.closest('.dd')) $$('.menu.open').forEach((x) => x.classList.remove('open'));
    if (ev.target.id === 'overlay') closeEditor(true);
    if (ev.target.id === 'modal') closeModal();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (!$('#editor').hidden) closeEditor(true);
      else if (!$('#modal').hidden) closeModal();
      else if (!$('#demo').hidden) $('#demo').hidden = true;
      else closeCard();
      return;
    }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if ((ev.key === 'Enter' || ev.key === ' ') && document.activeElement?.matches('.s[data-id]')) {
      ev.preventDefault();
      openCard(Number(document.activeElement.dataset.id), document.activeElement);
    }
    if (!typing && (ev.key === 'd' || ev.key === 'D') && !ev.metaKey && !ev.ctrlKey) {
      const demo = $('#demo');
      demo.hidden = !demo.hidden;
      if (!demo.hidden) renderDemo();
    }
  });

  document.addEventListener('input', (ev) => {
    const f = ev.target.dataset.field;
    if (!f || !ui.draft) return;
    if (f === 'image' || f === 'video') return;
    if (f === 'markup') { ui.draft.markup = Number(ev.target.value); renderEditor(); $('#editor input[type=range]').focus(); return; }
    if (f === 'rate') { ui.draft.rate = ev.target.value; return; }
    ui.draft.content[f] = ev.target.value;
    if (f === 'text' && $('#count')) $('#count').textContent = `${ev.target.value.length}/${D.getSlot(ui.draft.id).long ? C.limits.long : C.limits.text}`;
    preview();
  });

  document.addEventListener('change', (ev) => {
    const f = ev.target.dataset.field;
    if ((f === 'image' || f === 'video') && ui.draft) readFile(ev.target, f);
  });

  // "On hover" message as a native tooltip.
  document.addEventListener('mouseover', (ev) => {
    const el = ev.target.closest('.s[data-id]');
    if (!el) return;
    const s = D.getSlot(Number(el.dataset.id));
    el.title = s.hover ? fillTokens(s.hover) : '';
  });

  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', () => { if (ui.cardId && window.innerWidth >= 720 && Date.now() > (ui.holdCardUntil || 0)) closeCard(); }, { passive: true });
  window.addEventListener('resize', () => closeCard());
}

// Redraw slots whenever the data changes.
D.subscribe((ids) => {
  if (ids.length > 40) { indexSlots(); redrawAll(); } else ids.forEach((id) => { if (!ui.draft || ui.draft.id !== id) redrawSlot(id); });
  if (ids.length <= 40) ids.forEach((id) => { if (!ui.draft || ui.draft.id !== id) flash(id); });
  const last = D.getEvents()[0];
  if (ids.length <= 2 && last && Date.now() - last.time < 2000 && (last.kind === 'take' || last.kind === 'buy' || last.kind === 'rent')) kick(last.slotId, last.kind === 'take' ? 1 : 0.7);
  if (ui.cardId && ids.includes(ui.cardId)) openCard(ui.cardId);
  updateTicker();
});

// Fake network activity every 10-20 seconds while the tab is visible.
function scheduleSimulation() {
  const [a, b] = C.simulationMs;
  setTimeout(() => {
    if (document.visibilityState === 'visible') D.simulateEvent(ui.draft?.id ?? ui.cardId);
    scheduleSimulation();
  }, a + Math.random() * (b - a));
}

// The SHAKE button shows up now and then, at no fixed time.
setInterval(() => {
  const btn = $('#shufflebtn');
  if (!btn || D.getShuffle()) return;
  if (btn.hidden && Math.random() < 0.04) { btn.hidden = false; setTimeout(() => { btn.hidden = true; }, 60000); }
}, 60000);

setInterval(() => { D.tick(); updateTicker(); }, 15000);

shell();
bind();
initMotion();
route();

// The top bar turns into a floating pill as you scroll (--p goes 0 -> 1).
let navRaf = 0;
function navProgress() { navRaf = 0; const tb = $('.topbar'); if (tb) tb.style.setProperty('--p', Math.min(1, window.scrollY / 160).toFixed(3)); }
window.addEventListener('scroll', () => { if (!navRaf) navRaf = requestAnimationFrame(navProgress); }, { passive: true });
updateTicker();
scheduleSimulation();
let seen = false;
try { seen = sessionStorage.getItem('ee-seen') === '1'; } catch { /* ignore */ }
if (!seen) showModal();
