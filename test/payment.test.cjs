const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const staged = fs.existsSync(path.join(__dirname, 'paymentRules.cjs'));
const rules = require(staged ? './paymentRules.cjs' : '../utils/paymentRules.cjs');
const event = { _id: 'event1', title: 'Concert', bannerImage: { url: 'banner' }, tickets: [{ _id: 'vip', name: 'VIP', price: 100.25 }, { _id: 'free', name: 'Free', price: 0 }] };
const valid = { status: 'VALID', tran_id: 'transaction1', amount: '200.50', currency: 'BDT', risk_level: '0' };
test('cart uses database prices, supports mixed tickets and exact total', () => {
  assert.deepEqual(rules.buildCart(event, [{ ticketId: 'vip', quantity: 2, unitPrice: 1 }, { ticketId: 'free', quantity: 1 }]), {
    items: [{ ticketId: 'vip', ticketName: 'VIP', unitPrice: 100.25, quantity: 2 }, { ticketId: 'free', ticketName: 'Free', unitPrice: 0, quantity: 1 }], quantity: 3, total: 200.5,
  });
});
test('rejects empty, duplicate, unknown, fractional, negative and over-limit selections', () => {
  for (const items of [[], [{ ticketId: 'missing', quantity: 1 }], [{ ticketId: 'vip', quantity: -1 }], [{ ticketId: 'vip', quantity: 1.5 }], [{ ticketId: 'vip', quantity: 10 }, { ticketId: 'free', quantity: 1 }], [{ ticketId: 'vip', quantity: 1 }, { ticketId: 'vip', quantity: 1 }]]) assert.throws(() => rules.buildCart(event, items));
});
test('verification requires gateway status, transaction, amount, currency and low risk', () => {
  const order = { transactionId: 'transaction1', total: 200.5 };
  assert.equal(rules.verifiedPayment(order, valid), true);
  assert.equal(rules.verifiedPayment(order, { ...valid, status: 'VALIDATED' }), true);
  for (const bad of [{ status: 'FAILED' }, { tran_id: 'other' }, { amount: 2 }, { amount: '' }, { currency: 'USD' }, { risk_level: '1' }, { risk_level: undefined }]) assert.equal(rules.verifiedPayment(order, { ...valid, ...bad }), false);
});
function harness() {
  const routes = {};
  const order = { _id: 'order1', transactionId: 'transaction1', total: 200.5, status: 'pending', callbackToken: 'a'.repeat(64), user: 'buyer' };
  let writes = 0;
  let gatewayResult = valid;
  let payload;
  const Order = {
    findOne: query => {
      const value = query.transactionId === order.transactionId && (!query.user || query.user === order.user) ? order : null;
      return { select: async () => value, then: resolve => resolve(value) };
    },
    updateOne: async (query, update) => {
      if ((query.status === 'pending' && order.status !== 'pending') || (query.status?.$ne && order.status === query.status.$ne)) return;
      Object.assign(order, update.$set); writes++;
    },
    create: async data => { Object.assign(order, data); return order; },
  };
  const router = { post: (p, ...handlers) => routes['POST '+p] = handlers.at(-1), get: (p, ...handlers) => routes['GET '+p] = handlers.at(-1) };
  const modules = { 'sslcommerz-lts': class {
    constructor(id, password, live) { assert.equal(id, 'test'); assert.equal(password, 'test'); assert.equal(live, false); }
    async init(data) { payload = new URLSearchParams(data); return gatewayResult; }
  }, express: { Router: () => router }, mongoose: { isValidObjectId: () => true, Types: { ObjectId: class { toString() { return 'transaction1'; } } } }, crypto: require('crypto'), '../middleware/authMiddleware': () => {}, '../models/Event': { findOne: async () => event }, '../models/User': { findById: async () => ({ _id: 'buyer', name: 'Buyer', email: 'buyer@example.com' }) }, '../models/Order': Order, '../utils/paymentRules.cjs': rules };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, staged ? 'paymentRoutes.js' : '../routes/paymentRoutes.js'), 'utf8'), {
    require: name => modules[name], module: { exports: {} }, process: { env: { SSL_STORE_ID: 'test', SSL_STORE_PASSWORD: 'test', API_BASE_URL: 'https://example.com/api' } },
    URL, URLSearchParams, AbortSignal, Buffer, setTimeout, clearTimeout, fetch: async (url, options) => { payload = options.body; return { ok: true, json: async () => gatewayResult }; },
  });
  const res = { code: 200, status(n) { this.code=n; return this; }, json(data) { this.data=data; return this; }, sendStatus(n) { this.code=n; return this; }, redirect(n,url) { this.code=n; this.url=url; } };
  return { routes, order, res, writes: () => writes, setResult: r => gatewayResult=r, payload: () => payload };
}
test('success callback is idempotent; cancellation cannot overwrite paid', async () => {
  const h=harness();
  const req={ params: { outcome: 'success', transactionId: 'transaction1' }, query: { token: h.order.callbackToken }, body: { val_id: 'validation1' } };
  await h.routes['POST /callback/:outcome/:transactionId'](req,h.res);
  await h.routes['POST /callback/:outcome/:transactionId'](req,h.res);
  req.params.outcome='cancelled';
  await h.routes['POST /callback/:outcome/:transactionId'](req,h.res);
  assert.equal(h.order.status,'paid'); assert.equal(h.writes(),1); assert.equal(h.res.code,303);
});
test('forged callback token cannot mutate an order', async () => {
  const h=harness();
  await h.routes['POST /callback/:outcome/:transactionId']({ params: { outcome: 'cancelled', transactionId: 'transaction1' }, query: { token: 'b'.repeat(64) }, body: {} },h.res);
  assert.equal(h.res.code,400); assert.equal(h.writes(),0);
});
test('IPN rejects wrong totals; verified delayed IPN can confirm cancelled order', async () => {
  const h=harness(); h.setResult({ ...valid, amount: '1' });
  await h.routes['POST /ipn']({ body: { tran_id: 'transaction1', val_id: 'v' } },h.res);
  assert.equal(h.res.code,400); assert.equal(h.writes(),0);
  h.order.status='cancelled'; h.setResult(valid);
  await h.routes['POST /ipn']({ body: { tran_id: 'transaction1', val_id: 'v' } },h.res);
  assert.equal(h.order.status,'paid'); assert.equal(h.res.code,200);
});
test('receipt endpoint prevents cross-account access', async () => {
  const h=harness();
  await h.routes['GET /orders/:transactionId']({ params: { transactionId: 'transaction1' }, user: { userId: 'other' } },h.res);
  assert.equal(h.res.code,404);
});
test('paid checkout passes server total and redirects to sandbox', async () => {
  const h=harness(); h.setResult({ status: 'SUCCESS', GatewayPageURL: 'https://sandbox.sslcommerz.com/pay' });
  await h.routes['POST /checkout']({ user: { role:'user',userId:'buyer' }, body: { eventId:'event1', items:[{ ticketId:'vip',quantity:2,unitPrice:1 }], phone:'01711111111',address:'Dhaka' } },h.res);
  assert.equal(h.payload().get('total_amount'),'200.50'); assert.equal(h.order.status,'pending'); assert.equal(h.res.data.paymentUrl,'https://sandbox.sslcommerz.com/pay');
});
test('free checkout confirms without calling gateway', async () => {
  const h=harness();
  await h.routes['POST /checkout']({ user: { role:'user',userId:'buyer' }, body: { eventId:'event1', items:[{ ticketId:'free',quantity:1 }] } },h.res);
  assert.equal(h.order.status,'paid'); assert.equal(h.payload(),undefined); assert.ok(h.res.data.redirectUrl.includes('transactionId='));
});
test('gateway initialization failure does not confirm purchase', async () => {
  const h=harness(); h.setResult({ status:'FAILED' });
  await h.routes['POST /checkout']({ user: { role:'user',userId:'buyer' }, body: { eventId:'event1',items:[{ticketId:'vip',quantity:1}],phone:'01711111111',address:'Dhaka' } },h.res);
  assert.equal(h.res.code,503); assert.equal(h.order.status,'failed');
});
