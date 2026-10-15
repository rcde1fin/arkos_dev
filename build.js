#!/usr/bin/env node
/*
 * Arkos — zero-dependency build (plain JavaScript, Node built-ins only).
 * Minifies styles.css and index.html and strips full-line comments from app.js
 * into dist/. Run: node build.js
 */
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'dist');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.cpSync(path.join(SRC, 'assets'), path.join(OUT, 'assets'), { recursive: true });
fs.cpSync(path.join(SRC, 'vendor'), path.join(OUT, 'vendor'), { recursive: true });

const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const size = f => `${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1)}K`;

/* CSS: strip comments, collapse whitespace, drop spaces around structural chars */
const css = read('styles.css')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/ ?([{};>,]) ?/g, '$1')
  .replace(/: /g, ':')
  .replace(/;}/g, '}');
fs.writeFileSync(path.join(OUT, 'styles.css'), css);

/* HTML: strip comments, collapse whitespace (keeps quotes & attributes intact) */
const html = read('index.html')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\s+/g, ' ')
  .replace(/> </g, '><');
fs.writeFileSync(path.join(OUT, 'index.html'), html);

/* JS: remove full-line comments only — everything else stays byte-identical */
const js = read('app.js')
  .split('\n')
  .filter(line => { const t = line.trim(); return !(t.startsWith('//') || /^\/\*.*\*\/$/.test(t)); })
  .join('\n');
fs.writeFileSync(path.join(OUT, 'app.js'), js);

console.log(`Built dist/: index.html ${size('index.html')}, styles.css ${size('styles.css')}, app.js ${size('app.js')}`);
