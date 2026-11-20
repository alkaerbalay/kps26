import { readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

const snapshotPath = constants => resolve(constants.PUBLISH_DIR, '../.netlify/react-entry/index.html');

export async function verifyEntry(html, publishDir) {
  if (/<html\b[^>]*\s(?:amp|⚡)(?:\s|=|>)/i.test(html)) {
    throw new Error('The React entry page must not be converted to AMP.');
  }
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(([, attributes]) => /\btype\s*=\s*["']module["']/i.test(attributes))
    .map(([, attributes]) => attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1])
    .filter(Boolean);
  if (!scripts.length) throw new Error('The React module entrypoint is missing.');
  const root = resolve(publishDir);
  for (const src of scripts) {
    if (!src.startsWith('/') || src.startsWith('//')) throw new Error('Expected a local React module.');
    const asset = resolve(root, src.slice(1));
    if (!asset.startsWith(root + sep)) throw new Error('Invalid React module path.');
    await access(asset);
  }
}

export default {
  async onBuild({ constants }) {
    const html = await readFile(resolve(constants.PUBLISH_DIR, 'index.html'), 'utf8');
    await verifyEntry(html, constants.PUBLISH_DIR);
    const snapshot = snapshotPath(constants);
    await mkdir(dirname(snapshot), { recursive: true });
    await writeFile(snapshot, html);
  },
  async onPostBuild({ constants, utils }) {
    const snapshot = snapshotPath(constants);
    const original = await readFile(snapshot, 'utf8');
    await verifyEntry(original, constants.PUBLISH_DIR);
    const entry = resolve(constants.PUBLISH_DIR, 'index.html');
    const processed = await readFile(entry, 'utf8');
    if (processed !== original) {
      // This is a client-rendered React page, not an AMP document. Preserve the
      // actual Vite output rather than trying to reconstruct stripped scripts.
      await writeFile(entry, original);
      utils.status.show({ title: 'React entry restored', summary: 'Preserved the original application HTML after HTML post-processing.' });
    }
    await verifyEntry(await readFile(entry, 'utf8'), constants.PUBLISH_DIR);
    await rm(snapshot, { force: true });
  },
};
