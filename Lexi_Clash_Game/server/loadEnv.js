'use strict';

const fs = require('fs');
const path = require('path');

function parseEnv(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function loadEnv() {
  const projectRoot = path.join(__dirname, '..');
  const candidates = [path.join(projectRoot, '..', '.env'), path.join(projectRoot, '.env')];
  const loaded = {};
  for (const filename of candidates) {
    if (!fs.existsSync(filename)) continue;
    Object.assign(loaded, parseEnv(fs.readFileSync(filename, 'utf8')));
  }
  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

module.exports = { loadEnv, parseEnv };

