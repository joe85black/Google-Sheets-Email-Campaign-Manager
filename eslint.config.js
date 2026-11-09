'use strict';

const js = require('@eslint/js');
const globals = require('globals');

// Apps Script services available at runtime.
const appsScriptGlobals = {
  GmailApp: 'readonly',
  LockService: 'readonly',
  MailApp: 'readonly',
  PropertiesService: 'readonly',
  ScriptApp: 'readonly',
  Session: 'readonly',
  SpreadsheetApp: 'readonly',
  Utilities: 'readonly',
  console: 'readonly',
};

// All .gs files share one global scope, so modules defined in one file
// are visible in the others.
const projectGlobals = {
  CONFIG: 'readonly',
  STATUS: 'readonly',
  CampaignError: 'readonly',
  Mailer: 'readonly',
  SheetRepo: 'readonly',
  State: 'readonly',
  Template: 'readonly',
  Validation: 'readonly',
};

module.exports = [
  { ignores: ['node_modules/'] },
  {
    files: ['src/**/*.gs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...appsScriptGlobals, ...projectGlobals },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Top-level functions are entry points called by menus and triggers.
      'no-unused-vars': ['error', { vars: 'local', caughtErrors: 'none' }],
      'no-redeclare': ['error', { builtinGlobals: false }],
      // Validation.cleanText strips control characters on purpose.
      'no-control-regex': 'off',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
