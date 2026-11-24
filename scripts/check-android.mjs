import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';

const EXPECTED_HTML_COUNT = 23;
const SIZE_LIMIT_BYTES = 15_000_000;
const FORBIDDEN_PATTERN = /menara-jepang|japanese-tower|anatomy\//i;
const EXTERNAL_FONT_PATTERN = /fonts\.(?:googleapis|gstatic)\.com/i;
const FONT_EXT_PATTERN = /\.(?:woff2?|ttf|otf|eot)$/i;

const root = resolve('dist-android');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(entry =>
        entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name)
      )
    )
  ).flat();
}

function formatMB(bytes) {
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

try {
  const info = await stat(root);
  if (!info.isDirectory()) throw new Error('not a directory');
} catch {
  console.error('FAIL: dist-android/ not found. Run "npm run build:android" first.');
  process.exit(1);
}

const allFiles = await walk(root);
const pages = allFiles.filter(file => file.endsWith('.html'));
const documents = new Map(
  await Promise.all(pages.map(async page => [page, await readFile(page, 'utf8')]))
);

const failures = [];

if (pages.length !== EXPECTED_HTML_COUNT) {
  failures.push(`Expected exactly ${EXPECTED_HTML_COUNT} HTML pages in dist-android, found ${pages.length}`);
}

let totalBytes = 0;
let fontBytes = 0;

for (const file of allFiles) {
  const relPath = relative(root, file).replaceAll('\\', '/');
  const { size } = await stat(file);
  totalBytes += size;
  if (FONT_EXT_PATTERN.test(relPath)) fontBytes += size;

  const forbiddenPathMatch = relPath.match(FORBIDDEN_PATTERN);
  if (forbiddenPathMatch) {
    failures.push(`Forbidden file path in dist-android: ${relPath}`);
  }
}

let checked = 0;

for (const [page, html] of documents) {
  const relPage = relative(root, page).replaceAll('\\', '/');

  const forbiddenHtmlMatch = html.match(FORBIDDEN_PATTERN);
  if (forbiddenHtmlMatch) {
    failures.push(`${relPage}: forbidden reference "${forbiddenHtmlMatch[0]}"`);
  }

  const externalFontMatch = html.match(EXTERNAL_FONT_PATTERN);
  if (externalFontMatch) {
    failures.push(`${relPage}: external Google Fonts reference "${externalFontMatch[0]}"`);
  }

  for (const match of html.matchAll(/<(a|link|script|iframe|img|source)\b[^>]*?\b(?:href|src)=["']([^"']+)["']/gi)) {
    const value = match[2];
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
    const url = new URL(value, 'https://local.test/' + relPage);
    let target = resolve(root, '.' + decodeURIComponent(url.pathname));
    checked++;
    try {
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      await stat(target);
      if (url.hash && documents.has(target)) {
        const id = decodeURIComponent(url.hash.slice(1));
        const ids = [...documents.get(target).matchAll(/\bid=["']([^"']+)["']/g)].map(result => result[1]);
        if (!ids.includes(id)) failures.push(`${relPage}: missing fragment ${value}`);
      }
    } catch {
      failures.push(`${relPage}: missing file ${value}`);
    }
  }
}

if (totalBytes > SIZE_LIMIT_BYTES) {
  failures.push(
    `dist-android size ${formatMB(totalBytes)} (${totalBytes} bytes) exceeds ${formatMB(SIZE_LIMIT_BYTES)} (${SIZE_LIMIT_BYTES} bytes) limit`
  );
}

console.log(
  `dist-android summary: ${pages.length} HTML pages, ${checked} local references, total ${formatMB(totalBytes)} (${totalBytes} / ${SIZE_LIMIT_BYTES} bytes), fonts ${formatMB(fontBytes)} (${fontBytes} bytes)`
);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: dist-android verified');
}
