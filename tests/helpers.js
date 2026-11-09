'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = path.join(__dirname, '..', 'src');

/**
 * Loads the given .gs files into one sandbox, mirroring how Apps Script shares
 * a single global scope across files. Returns a function that evaluates an
 * expression inside that sandbox.
 */
function loadGs(files) {
  const context = vm.createContext({ console });
  const source = files.map((f) => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n;\n');
  vm.runInContext(source, context, { filename: 'apps-script-bundle.js' });
  return (expression) => vm.runInContext(expression, context);
}

module.exports = { loadGs };
