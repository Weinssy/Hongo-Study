import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../js/storage.js';
import { createConversationState, createRound, isCorrectChoice, updateWrongAnswers, validWrongAnswers } from '../js/study-core.js';
import { acceptsReading, normalizeRomaji } from '../js/romaji.js';
import { quizData, vocabularyCount } from '../js/quiz-data.js';
import { toHiragana } from 'wanakana';

test('only the exact answer matches when date labels share a prefix', () => {
  const values = ['Tanggal 1', 'Tanggal 10', 'Tanggal 14', 'Tanggal 2'];
  assert.deepEqual(values.filter(value => isCorrectChoice(value, 'Tanggal 1')), ['Tanggal 1']);
  assert.equal(isCorrectChoice('Minggu lalu', 'Minggu'), false);
});

test('a drill visits each selected item at most once, including with constant RNG', () => {
  const items = ['あ', 'い', 'う', 'え', 'お'];
  const round = createRound(items, 10, () => 0);
  assert.equal(new Set(round).size, items.length);
  assert.equal(round.length, items.length);
  assert.equal(createRound(items, 2, () => 0).length, 2);
  assert.deepEqual(items, ['あ', 'い', 'う', 'え', 'お']);
});

test('repeated answers require one explicit next action per conversation turn', () => {
  const state = createConversationState(2);
  assert.equal(state.next(), false);
  assert.equal(state.answer(false), true);
  assert.equal(state.answer(true), true);
  assert.equal(state.answer(true), false);
  assert.equal(state.index, 0);
  assert.equal(state.next(), true);
  assert.equal(state.index, 1);
  assert.equal(state.next(), false);
  state.reset();
  assert.equal(state.index, 0);
  assert.equal(state.answered, false);
});

test('blocked storage keeps the current session in memory', () => {
  const store = createStorage(() => { throw new Error('Storage blocked'); });
  assert.equal(store.get('theme', 'light'), 'light');
  assert.equal(store.available, false);
  assert.equal(store.write('answers', ['今日']), false);
  assert.deepEqual(store.read('answers', [], validWrongAnswers), ['今日']);
});

test('wrong-answer history rejects valid JSON of the wrong shape and broken JSON', () => {
  for (const raw of ['{}', 'false', '[1]', 'null', '{invalid']) {
    const store = createStorage(() => ({ getItem: () => raw }));
    assert.deepEqual(store.read('answers', [], validWrongAnswers), []);
  }
  assert.deepEqual(updateWrongAnswers({}, '今日', false), ['今日']);
  assert.deepEqual(updateWrongAnswers(['今日'], '今日', true), []);
  assert.deepEqual(updateWrongAnswers(['今日'], '今日', false), ['今日']);
});

test('documented romaji variants work without accepting a different consonant', () => {
  for (const [input, expected] of [['si', 'shi'], ['ti', 'chi'], ['tu', 'tsu'], ['hu', 'fu'], ['gakkoo', 'gakkou'], ['sensei', 'sensee'], ['kō', 'kou']]) {
    assert.equal(acceptsReading(input, expected), true, `${input} / ${expected}`);
  }
  assert.equal(acceptsReading('o', 'wo', 'を'), true);
  assert.equal(acceptsReading('ka', 'ga'), false);
  assert.equal(acceptsReading('konyoubi', 'kin-youbi'), false);
});

test('canonical vocabulary has unique IDs and consistent kana/romaji', () => {
  const items = Object.values(quizData).flatMap(group => group.items);
  assert.equal(items.length, vocabularyCount);
  assert.equal(new Set(items.map(item => item.id)).size, items.length);
  for (const item of items) {
    assert.ok(item.q && item.a && item.r && item.f, item.id);
    assert.match(item.f, /^[\p{Script=Hiragana}\p{Script=Katakana}ー\s・]+$/u, item.id);
    assert.deepEqual(item.r.split('/').map(normalizeRomaji).sort(), item.f.split('・').map(normalizeRomaji).sort(), item.q);
    if (/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(item.q)) {
      assert.equal(toHiragana(item.q), toHiragana(item.f), item.q);
    }
  }
});

test('weekday kana use reviewed dictionary readings', () => {
  const expected = { 月曜日: 'げつようび', 火曜日: 'かようび', 水曜日: 'すいようび', 木曜日: 'もくようび', 金曜日: 'きんようび', 土曜日: 'どようび', 日曜日: 'にちようび' };
  for (const [word, reading] of Object.entries(expected)) {
    assert.equal(quizData.waktu.items.find(item => item.q === word).f, reading);
  }
});
