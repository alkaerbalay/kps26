import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

let originalEntry;
const hasAppScript = html => /<script\b[^>]*\bsrc=["']\/assets\/[^"']+\.js["'][^>]*>/i.test(html);

export default {
  async onBuild({ constants }) {
    // Capture Vite's output before the dashboard-installed AMP postprocessor.
    originalEntry = await readFile(join(constants.PUBLISH_DIR, 'index.html'), 'utf8');
    if (!hasAppScript(originalEntry)) {
      throw new Error('The application entry is missing its compiled JavaScript.');
    }
  },
  async onPostBuild({ constants }) {
    const path = join(constants.PUBLISH_DIR, 'index.html');
    const html = await readFile(path, 'utf8');
    // This is a React application; AMP removes the script that mounts its UI.
    if (/<html\b[^>]*\samp(?:\s|=|>)/i.test(html)) {
      if (!originalEntry) throw new Error('The original application entry was not captured.');
      await writeFile(path, originalEntry);
    } else if (!hasAppScript(html)) {
      throw new Error('A postprocessor removed the application JavaScript.');
    }
  },
};
