import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { publicWorkspaceAccess } from '../netlify/server/workspace-access.mjs';
import { apiFetch } from '../src/api-fetch.mjs';

const app = new Hono();
app.use('/api/*', publicWorkspaceAccess);
app.all('/api/probe', c => c.json({ role: c.get('role'), actor: c.get('actor') }));

test('visitors with no session or a stale cookie receive the same shared workspace', async () => {
  for (const headers of [{}, { Cookie: 'nf_jwt=expired-session' }]) {
    const response = await app.request('https://example.com/api/probe', { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.deepEqual(await response.json(), { role: 'admin', actor: 'وصول مشترك دون حساب' });
  }
});

test('all business write methods allow same-origin access without credentials', async () => {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const response = await app.request('https://example.com/api/probe', {
      method, headers: { Origin: 'https://example.com' },
    });
    assert.equal(response.status, 200);
  }
});

test('writes from a foreign, null, or absent origin remain rejected', async () => {
  for (const origin of ['https://foreign.example', 'null', undefined]) {
    const response = await app.request('https://example.com/api/probe', {
      method: 'POST', headers: origin ? { Origin: origin } : {},
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
});

test('the client sends requests directly and does not replay a failed write', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ error: 'unavailable' }, { status: 503 });
  };
  try {
    const response = await apiFetch('/api/entries', {
      method: 'POST', body: '{"amount":10}', headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(response.status, 503);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/entries');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.body, '{"amount":10}');
    assert.equal(calls[0].options.credentials, 'same-origin');
    assert.equal(calls[0].options.cache, 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
