const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function handler(prisma) {
  let post;
  const router = { post: (_, auth, fn) => { post = fn; }, get() {} };
  vm.runInNewContext(fs.readFileSync('src/routes/order.routes.js', 'utf8'), {
    module: { exports: {} },
    require(name) {
      if (name === 'express') return { Router: () => router };
      if (name === '../lib/prisma') return prisma;
      return { authRequired() {} };
    }
  });
  return async items => {
    let status, body, error;
    await post({ body: { items }, user: { uid: 1 } }, {
      status(code) { status = code; return this; },
      json(value) { body = value; }
    }, err => { error = err; });
    return { status, body, error };
  };
}

test('invalid items and duplicate product IDs are rejected before database access', async () => {
  const run = handler({ $transaction() { throw new Error('unexpected database access'); } });
  for (const items of [[], [null], [{pid: 0, qty: 1}], [{pid: 1, qty: 0}],
    [{pid: 1, qty: 2147483648}], [{pid: 1, qty: 1}, {pid: '1', qty: 2}]]) {
    assert.equal((await run(items)).status, 400);
  }
});

test('out of stock returns conflict and does not create an order', async () => {
  const run = handler({ $transaction: fn => fn({ product: {
    findUnique: async () => ({pid: 1, pname: 'X'}),
    updateMany: async () => ({count: 0})
  }, order: { create() { throw new Error('unexpected order'); } } }) });
  assert.equal((await run([{pid: 1, qty: 2}])).error.statusCode, 409);
});

test('missing product returns 404', async () => {
  const run = handler({ $transaction: fn => fn({ product: { findUnique: async () => null } }) });
  assert.equal((await run([{pid: 1, qty: 2}])).error.statusCode, 404);
});

test('reserve stock conditionally in sorted order, create details and pending shipment', async () => {
  const reservations = [], details = [];
  let shipment;
  const run = handler({
    $transaction: fn => fn({
      product: {
        findUnique: async ({where}) => ({pid: where.pid, price: '100000'}),
        updateMany: async args => { reservations.push(args); return {count: 1}; }
      },
      order: { create: async () => ({oid: 7}) },
      orderDetail: { create: async ({data}) => { details.push(data); } },
      shipment: { create: async ({data}) => { shipment = data; return data; } }
    }),
    order: { findUnique: async () => ({oid: 7}) }
  });
  const result = await run([{pid: 2, qty: 5}, {pid: 1, qty: 2}]);
  assert.equal(result.status, 201);
  assert.deepEqual(JSON.parse(JSON.stringify(reservations)), [
    {where: {pid: 1, quantity: {gte: 2}}, data: {quantity: {decrement: 2}}},
    {where: {pid: 2, quantity: {gte: 5}}, data: {quantity: {decrement: 5}}}
  ]);
  assert.equal(details.length, 2);
  assert.equal(shipment.status, 'PENDING');
  assert.equal(shipment.oid, 7);
});
