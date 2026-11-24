import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { quizData } from '../js/quiz-data.js';
import { KANJI_N5 } from '../js/kanji-data.js';
import { cleanSpeechText } from '../js/speech.js';

const root = resolve(import.meta.dirname, '..');
const phrases = new Set();
const hasJapanese = (t) => /[\u3040-\u30ff\u4e00-\u9faf]/.test(t);

function addPhrase(raw) {
  const cleaned = cleanSpeechText(raw);
  if (cleaned && hasJapanese(cleaned)) phrases.add(cleaned);
}

function rubyToSpoken(html) {
  return String(html || '')
    .replace(/<ruby>([\s\S]*?)<rt>([\s\S]*?)<\/rt><\/ruby>/g, '$2')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. Quiz / Kosakata / Flashcard SRS (194 items)
for (const group of Object.values(quizData)) {
  for (const item of group.items || []) {
    addPhrase(item.f || item.q);
  }
}

// 2. 100 Kanji N5
for (const item of KANJI_N5) {
  addPhrase(item.reading);
}

// 3. Settings test phrase
addPhrase('こんにちは、ほんごスタディです。');

// 4. Roleplay Percakapan (ruby: '...')
const percakapanSrc = await readFile(resolve(root, 'js/percakapan.js'), 'utf8');
for (const m of percakapanSrc.matchAll(/ruby:\s*'([^']+)'/g)) {
  addPhrase(rubyToSpoken(m[1]));
}

// 5. Lab Visual 2D terms
const labSrc = await readFile(resolve(root, 'js/lab-visual.js'), 'utf8');
for (const m of labSrc.matchAll(/\[\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
  addPhrase(m[2] || m[1]);
}

// 6. Kamus Grammar entries in js/main.js
const mainSrc = await readFile(resolve(root, 'js/main.js'), 'utf8');
for (const m of mainSrc.matchAll(/example:'([^']+)'/g)) {
  addPhrase(rubyToSpoken(m[1]));
}

// 7. Grammar detail pages (grammar/*.html)
const grammarFiles = await readdir(resolve(root, 'grammar'));
for (const file of grammarFiles) {
  if (!file.endsWith('.html')) continue;
  const html = await readFile(resolve(root, 'grammar', file), 'utf8');
  for (const m of html.matchAll(/<div class="example-box[\s\S]*?<p class="font-display[^"]*">([\s\S]*?)<\/p>/g)) {
    addPhrase(rubyToSpoken(m[1]));
  }
}

// 8. Kosakata detail pages (kosakata/*.html)
const kosakataFiles = await readdir(resolve(root, 'kosakata'));
for (const file of kosakataFiles) {
  if (!file.endsWith('.html')) continue;
  const html = await readFile(resolve(root, 'kosakata', file), 'utf8');
  for (const m of html.matchAll(/<li[\s\S]*?<\/li>/g)) {
    const spanMatch = m[0].match(/<span class="font-display[^"]*">([\s\S]*?)<\/span>/);
    if (!spanMatch) continue;
    const raw = spanMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      .replace(/^[（(]/, '').replace(/[）)]$/, '');
    const parts = raw.split(/[／/]/).map((s) => s.trim()).filter(Boolean);
    const spoken = (parts.length > 1 && hasJapanese(parts[1]) ? parts[1] : parts[0]) || '';
    addPhrase(spoken);
  }
}

const sorted = [...phrases].sort();
await writeFile(resolve(root, 'scripts/audio-phrases.json'), JSON.stringify(sorted, null, 2), 'utf8');
console.log(`Extracted ${sorted.length} unique Japanese audio phrases.`);
