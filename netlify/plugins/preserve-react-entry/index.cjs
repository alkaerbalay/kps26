const {readFile, writeFile} = require('node:fs/promises');
const {join} = require('node:path');

// The dashboard AMP plugin rewrites every HTML file, including non-AMP SPAs.
// Capture Vite's public entry before post-processing and restore it after AMP.
let entry;
module.exports = {
  async onBuild({constants, utils}) {
    entry = await readFile(join(constants.PUBLISH_DIR, 'index.html'), 'utf8');
    if (!/<script\b[^>]*type="module"[^>]*src="[^"]+"/.test(entry) || /<html\b[^>]*\samp(?:\s|>)/i.test(entry)) {
      utils.build.failBuild('The React entry must contain its Vite module and must not be AMP.');
    }
  },
  async onPostBuild({constants, utils}) {
    if (!entry) return utils.build.failBuild('The original React entry was not captured.');
    await writeFile(join(constants.PUBLISH_DIR, 'index.html'), entry);
    utils.status.show({title:'React entry preserved', summary:'Kept the application module and styles after HTML post-processing.'});
  }
};
