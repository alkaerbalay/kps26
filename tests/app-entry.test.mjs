import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import plugin from '../netlify/plugins/preserve-app-entry/index.mjs';

test('restores the React entry after AMP removes its script', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'app-entry-'));
  const context = { constants: { PUBLISH_DIR: directory } };
  const path = join(directory, 'index.html');
  const original = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الكفيل</title><script type="module" crossorigin src="/assets/index-example.js"></script></head><body><div id="root"></div></body></html>';
  try {
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'assets/index-example.js'), 'console.log("app");');
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

test('rejects a script tag whose compiled file is missing or empty', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'app-entry-'));
  const context = { constants: { PUBLISH_DIR: directory } };
  try {
    await writeFile(join(directory, 'index.html'), '<script type="module" src="/assets/app.js"></script>');
    await assert.rejects(plugin.onBuild(context), /file is missing or empty/);
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'assets/app.js'), '');
    await assert.rejects(plugin.onBuild(context), /file is missing or empty/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('preserves unconverted HTML and rejects postprocessing that removes the script or asset', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'app-entry-'));
  const context = { constants: { PUBLISH_DIR: directory } };
  const path = join(directory, 'index.html');
  const original = '<html><script type="module" src="/assets/app.js"></script></html>';
  try {
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'assets/app.js'), '/* application */');
    await writeFile(path, original);
    await plugin.onBuild(context);
    const enhanced = original.replace('<html>', '<html lang="ar">');
    await writeFile(path, enhanced);
    await plugin.onPostBuild(context);
    assert.equal(await readFile(path, 'utf8'), enhanced);
    await writeFile(path, '<html><div id="root"></div></html>');
    await assert.rejects(plugin.onPostBuild(context), /missing its compiled JavaScript/);
    await writeFile(path, '<html amp><div id="root"></div></html>');
    await rm(join(directory, 'assets/app.js'));
    await assert.rejects(plugin.onPostBuild(context), /file is missing or empty/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a failed capture cannot restore a previous build entry', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'app-entry-'));
  const context = { constants: { PUBLISH_DIR: directory } };
  const path = join(directory, 'index.html');
  try {
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'assets/app.js'), '/* application */');
    await writeFile(path, '<html><script type="module" src="/assets/app.js"></script></html>');
    await plugin.onBuild(context);
    await writeFile(path, '<html></html>');
    await assert.rejects(plugin.onBuild(context));
    await writeFile(path, '<html ⚡></html>');
    await assert.rejects(plugin.onPostBuild(context), /was not captured/);
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
