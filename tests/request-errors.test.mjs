import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { requestError, validateJsonBody } from '../netlify/server/request-errors.mjs';
import { apiFetch } from '../src/api-fetch.mjs';

test('database errors return useful statuses without leaking query details', () => {
  for (const [code, status] of [['23505',409],['23503',409],['22003',400]]) {
    const result = requestError({ message: 'private query', cause: { code, detail: 'private values' } });
    assert.equal(result.status, status);
    assert.doesNotMatch(result.message, /private/);
  }
  assert.equal(requestError(new Error('private query')).status, 500);
  assert.deepEqual(requestError({status:400,message:'تحقق من الكمية'}), {status:400,message:'تحقق من الكمية'});
});

test('invalid JSON and non-object payloads return 400 before business handlers', async () => {
  const app = new Hono();
  app.use('/api/*', validateJsonBody);
  app.post('/api/probe', async c => c.json(await c.req.json()));
  app.post('/api/logo', c => c.json({ok:true}));
  for (const body of ['{','null','[]','42','"text"']) {
    const response = await app.request('/api/probe', {method:'POST',body});
    assert.equal(response.status,400);
  }
  const valid = await app.request('/api/probe', {method:'POST',body:'{"name":"مادة"}'});
  assert.deepEqual(await valid.json(),{name:'مادة'});
  assert.equal((await app.request('/api/logo',{method:'POST',body:'multipart upload'})).status,200);
});

test('network failures show actionable Arabic feedback and never replay writes', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.ok(options.signal instanceof AbortSignal);
    throw new TypeError('Failed to fetch');
  };
  try {
    await assert.rejects(apiFetch('/api/entries',{method:'POST'}), /تحقق من الاتصال وحالة العملية/);
    assert.equal(calls,1);
    globalThis.fetch = async () => {throw new DOMException('timeout','TimeoutError')};
    await assert.rejects(apiFetch('/api/state'), /انتهت مهلة الاتصال/);
  } finally {globalThis.fetch=original}
});
