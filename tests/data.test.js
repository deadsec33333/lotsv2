import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG as C } from '../src/config.js';
import {
  setClock, resetState, getSlots, getSlot, getEvents, getBalance, priceOf, takePriceOf, basePriceOf,
  buySlot, takeSlot, editSlot, setMarkup, listForRent, rentSlot, upgradeSlot, upgradeOptions,
  startShuffle, visibleContent, getShuffle, withdraw, tick, cheapestSlot, minRentRate, tenantActive,
} from '../src/data.js';

const E = C.economy;
const DAY = 86400000, WEEK = 7 * DAY;
let t = Date.UTC(2026, 8, 1);
setClock(() => t);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
const txt = (text) => ({ text, style: { color: 'default', size: 'md' } });

test('there are exactly 165 unique slots and most start owned', () => {
  resetState();
  const slots = getSlots();
  assert.equal(slots.length, 165);
  assert.equal(new Set(slots.map((s) => s.id)).size, 165);
  assert.equal(new Set(slots.map((s) => s.path)).size, 165);
  const owned = slots.filter((s) => s.owner).length;
  assert.ok(owned / 165 > 0.8, `only ${owned} owned`);
  for (const s of slots) assert.ok(priceOf(s) > 0);
});

test('buy an unclaimed slot at its price, then edit it', () => {
  resetState({ seeded: false });
  const s = getSlots()[0];
  const price = priceOf(s);
  buySlot(s.id, txt('mine'));
  assert.equal(s.owner, C.sessionWallet);
  close(s.lastSale, price);
  assert.equal(getEvents()[0].kind, 'buy');
  editSlot(s.id, txt('edited'));
  assert.equal(s.content.text, 'edited');
  assert.throws(() => editSlot(s.id, txt('nope'), 'someone'));
  assert.throws(() => buySlot(s.id, txt('again'), 'someone'));
});

test('take costs 1.4x, previous owner is credited 1.15x, cooldown applies', () => {
  resetState({ seeded: false });
  const s = getSlots()[5];
  buySlot(s.id, txt('first'), 'alice');
  const price = priceOf(s);
  close(takePriceOf(s), price * E.takeMultiplier);
  takeSlot(s.id, txt('second'), 'bob');
  assert.equal(s.owner, 'bob');
  assert.equal(s.takes, 1);
  close(getBalance('alice'), price * E.previousOwnerShare);
  close(s.price, price * E.takeMultiplier);
  assert.throws(() => takeSlot(s.id, txt('third'), 'carol'), /Cooldown/);
  t += 16 * 60000;
  takeSlot(s.id, txt('third'), 'carol');
  assert.equal(s.owner, 'carol');
});

test('owner markup is limited to 0.1x to 4x and resets on take', () => {
  resetState({ seeded: false });
  const s = getSlots()[10];
  buySlot(s.id, txt('x'), 'alice');
  assert.throws(() => setMarkup(s.id, 5, 'alice'));
  assert.throws(() => setMarkup(s.id, 2, 'bob'));
  const base = basePriceOf(s);
  setMarkup(s.id, 2, 'alice');
  close(priceOf(s), base * 2);
  t += 20 * 60000;
  takeSlot(s.id, txt('y'), 'bob');
  assert.equal(s.markup, 1);
});

test('idle slots decay 10% per week down to the floor', () => {
  resetState({ seeded: false });
  const s = getSlots().find((x) => x.weight >= 30);
  buySlot(s.id, txt('x'), 'alice');
  const p0 = priceOf(s);
  t += WEEK;
  close(priceOf(s), Math.max(E.floor, p0 * 0.9));
  t += 60 * WEEK;
  assert.ok(priceOf(s) >= E.floor);
});

test('renting: floor rate, tenant controls content, owner earns 65%', () => {
  resetState({ seeded: false });
  const s = getSlots()[20];
  buySlot(s.id, txt('owner text'), 'alice');
  assert.throws(() => listForRent(s.id, minRentRate(s) / 2, 'alice'));
  listForRent(s.id, 0.01, 'alice');
  assert.throws(() => rentSlot(s.id, 8, txt('t'), 'bob'));
  rentSlot(s.id, 3, txt('tenant text'), 'bob');
  assert.ok(tenantActive(s));
  assert.equal(visibleContent(s).text, 'tenant text');
  close(getBalance('alice'), 0.03 * (1 - E.rentProtocolCut));
  assert.throws(() => editSlot(s.id, txt('owner edit'), 'alice'));
  t += 4 * DAY;
  tick();
  assert.equal(visibleContent(s).text, 'owner text');
});

test('upgrades need enough room and expire after 21 days', () => {
  resetState({ seeded: false });
  const small = getSlots().find((x) => x.kind === 'text' && x.room === 's');
  buySlot(small.id, txt('x'), 'alice');
  assert.ok(!upgradeOptions(small).includes('image'));
  assert.throws(() => upgradeSlot(small.id, 'image', 'alice'));
  upgradeSlot(small.id, 'link', 'alice');
  assert.equal(small.upgrade.type, 'link');
  t += 22 * DAY;
  tick();
  assert.equal(small.upgrade, null);
});

test('shuffle swaps owned slots only and snaps back after 90 minutes', () => {
  resetState({ seeded: false });
  const [a, b, c] = getSlots().filter((x) => x.kind === 'text');
  buySlot(a.id, txt('A'), 'alice');
  buySlot(b.id, txt('B'), 'bob');
  startShuffle('alice');
  assert.equal(visibleContent(a).text, 'B');
  assert.equal(visibleContent(b).text, 'A');
  assert.equal(visibleContent(c).text, c.def.text);
  t += 91 * 60000;
  tick();
  assert.equal(getShuffle(), null);
  assert.equal(visibleContent(a).text, 'A');
});

test('validation, withdraw and cheapest slot', () => {
  resetState();
  const s = getSlots().find((x) => !x.owner);
  assert.throws(() => buySlot(s.id, { ...txt('x'), url: 'javascript:alert(1)' }));
  assert.throws(() => buySlot(s.id, txt('x'.repeat(1000))));
  assert.ok(cheapestSlot());
  assert.throws(() => withdraw('nobody'));
  const o = getSlots().find((x) => x.owner && x.owner !== 'bob');
  t += 20 * 60000;
  const prev = o.owner;
  const before = getBalance(prev);
  takeSlot(o.id, txt('mine'), 'bob');
  const got = withdraw(prev);
  assert.ok(got > before);
  assert.equal(getBalance(prev), 0);
  assert.ok(getSlot(o.id));
});
