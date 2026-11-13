import { toHiragana, toRomaji } from 'wanakana';

export function normalizeRomaji(value) {
  const text = value.normalize('NFKC').toLowerCase().trim()
    .replace(/[āīūēō]/g, vowel => ({ ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ei', ō: 'ou' })[vowel])
    .replace(/n-([aiueoy])/g, "n'$1")
    .replace(/[\s-]/g, '');
  return toRomaji(toHiragana(text)).replace(/ou/g, 'oo').replace(/ei/g, 'ee');
}

export function acceptsReading(value, reading, character = '') {
  const normalized = normalizeRomaji(value);
  const alternatives = [reading];
  if (character === 'を' || character === 'ヲ') alternatives.push('o');
  if (character === 'こんにちは') alternatives.push('konnichiha');
  return alternatives.some(alternative => normalizeRomaji(alternative) === normalized);
}
