import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

let originalEntry;

async function validateEntry(html, directory) {
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  const sources = scripts.filter(tag => /\btype\s*=\s*['"]module['"]/i.test(tag))
    .map(tag => tag.match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1])
    .filter(src => src?.startsWith('/assets/') && src.endsWith('.js'));
  if (!sources.length) throw new Error('The application entry is missing its compiled JavaScript.');
  const assetsDirectory = resolve(directory, 'assets') + sep;
  for (const source of sources) {
    const asset = resolve(directory, '.' + source);
    if (!asset.startsWith(assetsDirectory)) throw new Error('Invalid application JavaScript path.');
    const file = await stat(asset).catch(() => null);
    if (!file?.isFile() || file.size === 0) {
      throw new Error('The compiled application JavaScript file is missing or empty.');
    }
  }
}

export default {
  async onBuild({ constants }) {
    // Capture Vite's output before the dashboard-installed AMP postprocessor.
    originalEntry = undefined;
    const directory = resolve(constants.PUBLISH_DIR);
    const html = await readFile(join(directory, 'index.html'), 'utf8');
    await validateEntry(html, directory);
    originalEntry = { directory, html };
  },
  async onPostBuild({ constants }) {
    const directory = resolve(constants.PUBLISH_DIR);
    const path = join(directory, 'index.html');
    const html = await readFile(path, 'utf8');
    // This is a React application; AMP removes the script that mounts its UI.
    if (/<html\b[^>]*\s(?:amp|⚡)(?:\s|=|>)/i.test(html)) {
      if (originalEntry?.directory !== directory) {
        throw new Error('The original application entry was not captured for this publish directory.');
      }
      await validateEntry(originalEntry.html, directory);
      await writeFile(path, originalEntry.html);
    } else {
      await validateEntry(html, directory);
    }
  },
};
