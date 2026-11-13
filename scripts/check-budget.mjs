import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('dist');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const initialAssets = new Set([...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"?#]+)"/g)].map(match => match[1]));
let initialBytes = 0;
for (const path of initialAssets) initialBytes += (await stat(resolve(root, path))).size;
const viewerBytes = (await stat(resolve(root, 'japanese-tower.html'))).size
  + (await stat(resolve(root, 'japanese-tower-data.js'))).size;
const models = await readdir(resolve(root, 'anatomy/models'));
let compressedModelBytes = 0;
for (const file of models.filter(file => file.endsWith('.gz'))) {
  compressedModelBytes += (await stat(resolve(root, 'anatomy/models', file))).size;
}
// These are delivery budgets in bytes, not measured Core Web Vitals targets.
const budgets = [
  { name: 'Initial local homepage assets', bytes: initialBytes, limit: 100_000 },
  { name: 'On-demand tower HTML and data', bytes: viewerBytes, limit: 3_500_000 },
  { name: 'All compressed anatomy chunks', bytes: compressedModelBytes, limit: 35_000_000 },
];
for (const budget of budgets) {
  const pass = budget.bytes <= budget.limit;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${budget.name}: ${budget.bytes} / ${budget.limit} bytes`);
  if (!pass) process.exitCode = 1;
}
