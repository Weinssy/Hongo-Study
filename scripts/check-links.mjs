import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';

const root = resolve('dist');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
const pages = (await walk(root)).filter(path => path.endsWith('.html'));
const documents = new Map(await Promise.all(pages.map(async path => [path, await readFile(path, 'utf8')])));
let checked = 0;
const failures = [];
for (const [page, html] of documents) {
  for (const match of html.matchAll(/<(a|link|script|iframe|img|source)\b[^>]*?\b(?:href|src)=["']([^"']+)["']/gi)) {
    const value = match[2];
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
    const url = new URL(value, 'https://local.test/' + relative(root, page).replaceAll('\\', '/'));
    let target = resolve(root, '.' + decodeURIComponent(url.pathname));
    checked++;
    try {
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      await stat(target);
      if (url.hash && documents.has(target)) {
        const id = decodeURIComponent(url.hash.slice(1));
        const ids = [...documents.get(target).matchAll(/\bid=["']([^"']+)["']/g)].map(result => result[1]);
        if (!ids.includes(id)) failures.push(`${relative(root, page)}: missing fragment ${value}`);
      }
    } catch { failures.push(`${relative(root, page)}: missing file ${value}`); }
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`${pages.length} HTML, ${checked} local references: PASS`);
