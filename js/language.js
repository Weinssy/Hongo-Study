export function annotateJapanese(root = document.body) {
  root.querySelectorAll('ruby').forEach(element => { element.lang = 'ja'; });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(node.data)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest('script, style, textarea, [lang="ja"], [contenteditable]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    const pieces = node.data.split(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ー、。！？「」]+)/u);
    pieces.forEach((text, index) => {
      if (!text) return;
      if (index % 2) {
        const span = document.createElement('span');
        span.lang = 'ja';
        span.textContent = text;
        fragment.append(span);
      } else fragment.append(document.createTextNode(text));
    });
    node.replaceWith(fragment);
  }
}
