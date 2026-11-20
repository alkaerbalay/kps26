import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import plugin from '../netlify/plugins/preserve-app-entry/index.mjs';

test('restores the React entry after AMP removes its script', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'app-entry-'));
  const context = { constants: { PUBLISH_DIR: directory } };
  const path = join(directory, 'index.html');
  const original = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الكفيل</title><script type="module" crossorigin src="/assets/index-example.js"></script></head><body><div id="root"></div></body></html>';
  try {
    await writeFile(path, original);
    await plugin.onBuild(context);
    const transformed = '<!DOCTYPE html><html lang="ar" dir="rtl" amp i-amphtml-layout transformed="self;v=1"><head><title>الكفيل</title><script async src="https://cdn.ampproject.org/v0.js"></script></head><body><div id="root"></div></body></html>';
    assert.doesNotMatch(transformed, /src="\/assets\/index-example.js"/);
    await writeFile(path, transformed);
    await plugin.onPostBuild(context);
    assert.equal(await readFile(path, 'utf8'), original);
    await plugin.onPostBuild(context);
    assert.equal(await readFile(path, 'utf8'), original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects an entry with no application script before publication', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'app-entry-'));
  try {
    await writeFile(join(directory, 'index.html'), '<html><body><div id="root"></div></body></html>');
    await assert.rejects(plugin.onBuild({ constants: { PUBLISH_DIR: directory } }), /missing its compiled JavaScript/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
