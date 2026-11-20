import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import plugin, { verifyEntry } from '../netlify/plugins/preserve-react-entry/index.mjs';

test('restores React entry after the installed AMP optimizer removes its scripts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'react-entry-'));
  try {
    const publish = join(root, 'dist');
    await mkdir(join(publish, 'assets'), { recursive: true });
    await writeFile(join(publish, 'assets/app.js'), 'export {};');
    const html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><script type="module" crossorigin src="/assets/app.js"></script></head><body><div id="root"></div></body></html>';
    await writeFile(join(publish, 'index.html'), html);
    const args = { constants: { PUBLISH_DIR: publish }, utils: { status: { show() {} } } };
    await plugin.onBuild(args);
    // Shape observed on the published site after AMP post-processing.
    const transformed = '<html amp i-amphtml-layout transformed="self;v=1"><head><script async src="https://cdn.ampproject.org/v0.js"></script></head><body><div id="root"></div></body></html>';
    assert.ok(!transformed.includes('/assets/app.js'));
    await writeFile(join(publish, 'index.html'), transformed);
    await plugin.onPostBuild(args);
    assert.equal(await readFile(join(publish, 'index.html'), 'utf8'), html);
    await rm(join(publish, 'assets/app.js'));
    await assert.rejects(verifyEntry(html, publish));
    await assert.rejects(verifyEntry('<html amp><body></body></html>', publish), /AMP/);
    await assert.rejects(verifyEntry('<html><body></body></html>', publish), /missing/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
