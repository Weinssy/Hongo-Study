const JA_CHAR_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const JA_SPLIT_RE = /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ー、。！？「」]+)/u;
const SYNC_THRESHOLD = 45;

function annotateNode(node) {
  if (!node.isConnected) return;
  const fragment = document.createDocumentFragment();
  const pieces = node.data.split(JA_SPLIT_RE);
  pieces.forEach((text, index) => {
    if (!text) return;
    if (index % 2) {
      const span = document.createElement('span');
      span.lang = 'ja';
      span.textContent = text;
      fragment.append(span);
    } else {
      fragment.append(document.createTextNode(text));
    }
  });
  node.replaceWith(fragment);
}

export function annotateJapanese(root = (typeof document !== 'undefined' ? (document.querySelector('main') || document.body) : null), { signal } = {}) {
  if (!root || typeof document === 'undefined') return;
  root.querySelectorAll('ruby:not([lang="ja"])').forEach((element) => { element.lang = 'ja'; });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!JA_CHAR_RE.test(node.data)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest('script, style, textarea, [lang="ja"], [contenteditable], rt')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  if (nodes.length <= SYNC_THRESHOLD || typeof requestAnimationFrame !== 'function') {
    for (const node of nodes) {
      if (signal?.aborted) return;
      annotateNode(node);
    }
    return;
  }

  let index = 0;
  for (; index < SYNC_THRESHOLD; index++) {
    if (signal?.aborted) return;
    annotateNode(nodes[index]);
  }

  const processBatch = () => {
    if (signal?.aborted) return;
    const end = Math.min(index + SYNC_THRESHOLD, nodes.length);
    for (; index < end; index++) {
      annotateNode(nodes[index]);
    }
    if (index < nodes.length) {
      requestAnimationFrame(processBatch);
    }
  };
  requestAnimationFrame(processBatch);
}
