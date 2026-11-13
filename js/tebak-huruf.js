import { createRound, escapeHtml } from './study-core.js';
import { acceptsReading } from './romaji.js';
import { getProgress, recordDrill, recordVisit } from './progress.js';

const kana = [
  ['あいうえお', ['a', 'i', 'u', 'e', 'o']], ['かきくけこ', ['ka', 'ki', 'ku', 'ke', 'ko']],
  ['さしすせそ', ['sa', 'shi', 'su', 'se', 'so']], ['たちつてと', ['ta', 'chi', 'tsu', 'te', 'to']],
  ['なにぬねの', ['na', 'ni', 'nu', 'ne', 'no']], ['はひふへほ', ['ha', 'hi', 'fu', 'he', 'ho']],
  ['まみむめも', ['ma', 'mi', 'mu', 'me', 'mo']], ['やゆよ', ['ya', 'yu', 'yo']],
  ['らりるれろ', ['ra', 'ri', 'ru', 're', 'ro']], ['わをん', ['wa', 'wo', 'n']],
  ['がぎぐげご', ['ga', 'gi', 'gu', 'ge', 'go']], ['ざじずぜぞ', ['za', 'ji', 'zu', 'ze', 'zo']],
  ['だぢづでど', ['da', 'ji', 'zu', 'de', 'do']], ['ばびぶべぼ', ['ba', 'bi', 'bu', 'be', 'bo']],
  ['ぱぴぷぺぽ', ['pa', 'pi', 'pu', 'pe', 'po']],
];
const hiragana = kana.flatMap(([letters, readings]) => [...letters].map((letter, index) => [letter, readings[index], 'Hiragana']));
const katakana = hiragana.map(([letter, reading]) => [String.fromCodePoint(letter.codePointAt(0) + 0x60), reading, 'Katakana']);
const wordGroups = [
  ['Hiragana', [['こんにちは', 'konnichiwa'], ['ありがとう', 'arigatou'], ['せんせい', 'sensei'], ['がっこう', 'gakkou'], ['きょうしつ', 'kyoushitsu'], ['ともだち', 'tomodachi'], ['べんきょう', 'benkyou'], ['たべもの', 'tabemono']]],
  ['Katakana', [['テスト', 'tesuto'], ['クラス', 'kurasu'], ['ノート', 'nooto'], ['ペン', 'pen'], ['デスク', 'desuku'], ['センセイ', 'sensei'], ['コンピューター', 'konpyuutaa'], ['スポーツ', 'supootsu']]],
  ['Kanji', [['学生', 'gakusei'], ['先生', 'sensei'], ['学校', 'gakkou'], ['日本', 'nihon'], ['食べる', 'taberu'], ['飲む', 'nomu'], ['名前', 'namae'], ['大きい', 'ookii'], ['小さい', 'chiisai']]],
];
const words = wordGroups.flatMap(([type, values]) => values.map(([word, reading]) => [word, reading, type]));
const kanji = [
  ['日','hi'], ['月','tsuki'], ['火','hi'], ['水','mizu'], ['木','ki'], ['金','kane'], ['土','tsuchi'],
  ['山','yama'], ['川','kawa'], ['田','ta'], ['天','ten'], ['気','ki'], ['雨','ame'], ['空','sora'],
  ['人','hito'], ['子','ko'], ['女','onna'], ['男','otoko'], ['父','chichi'], ['母','haha'], ['友','tomo'],
  ['先','saki'], ['生','sei'], ['学','gaku'], ['校','kou'], ['本','hon'], ['名','na'], ['年','toshi'],
  ['上','ue'], ['下','shita'], ['中','naka'], ['大','dai'], ['小','shou'], ['長','chou'], ['高','kou'],
  ['新','shin'], ['古','ko'], ['白','shiro'], ['赤','aka'], ['青','ao'], ['食','shoku'], ['飲','in'],
  ['見','ken'], ['聞','bun'], ['話','wa'], ['読','doku'], ['書','sho'], ['行','kou'], ['来','rai'], ['電','den'],
  ['車','kuruma'], ['駅','eki'], ['道','michi'], ['何','nani'], ['毎','mai'], ['円','en'], ['午','go'], ['前','mae'], ['後','ato'],
].map(([letter, reading]) => [letter, reading, 'Kanji']);
const items = [...hiragana, ...katakana, ...kanji, ...words];

const character = document.querySelector('#letterCharacter');
const game = document.querySelector('#letterGame');
const form = document.querySelector('#letterForm');
const input = document.querySelector('#letterInput');
const feedback = document.querySelector('#letterFeedback');
const next = document.querySelector('#letterNext');
const scoreText = document.querySelector('#letterScore');
const remaining = document.querySelector('#letterRemaining');
const setup = document.querySelector('#letterSetup');
const menus = document.querySelector('#letterMenus');
const preset = document.querySelector('#letterPreset');
const rounds = document.querySelector('#letterRounds');
const startButton = document.querySelector('#startLetterGame');
const hint = document.querySelector('#selectionHint');
const best = document.querySelector('#letterBest');
let selectedItems = [];
let queue = [];
let round = 0;
let score = 0;
let answered = false;
let finished = false;
let sessionKey = '';

function mode() { return setup.querySelector('input[name="letterMode"]:checked').value; }
function renderMenus() {
  menus.innerHTML = ['Hiragana', 'Katakana', 'Kanji'].map(type => {
    const choices = items.map((item, index) => ({item, index})).filter(({item}) => item[2] === type && ([...item[0]].length === 1) === (mode() === 'single'));
    return `<fieldset class="rounded-xl border border-slate-200 p-4">
      <legend class="px-2 font-bold">${type}</legend>
      <label class="option flex items-center gap-2"><input type="checkbox" data-type="${type}"><span>Pilih semua ${type}</span></label>
      <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">${choices.map(({item,index}) => `<label class="option flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" data-index="${index}"><span lang="ja">${escapeHtml(item[0])}</span><span class="text-slate-500">${escapeHtml(item[1])}</span></label>`).join('')}</div>
    </fieldset>`;
  }).join('');
  const indexes = preset.value === 'katakana' ? items.map((x, i) => x[2] === 'Katakana' && x[0].length === 1 ? i : -1).filter(i => i >= 0).slice(0, 10) : Array.from({length: 10}, (_, i) => i);
  menus.querySelectorAll('[data-index]').forEach(box => { box.checked = preset.value === 'custom' || indexes.includes(Number(box.dataset.index)); });
  updateSelection();
}
function updateSelection() {
  selectedItems = [...menus.querySelectorAll('[data-index]:checked')].map(box => items[Number(box.dataset.index)]);
  menus.querySelectorAll('[data-type]').forEach(box => {
    const choices = [...box.closest('fieldset').querySelectorAll('[data-index]')];
    const checked = choices.filter(choice => choice.checked).length;
    box.checked = checked === choices.length && checked > 0;
    box.indeterminate = checked > 0 && checked < choices.length;
  });
  startButton.disabled = selectedItems.length === 0;
  const total = rounds.value === 'all' ? selectedItems.length : Math.min(Number(rounds.value), selectedItems.length);
  hint.textContent = selectedItems.length ? `${selectedItems.length} pilihan. Sesi ini berisi ${total} soal tanpa pengulangan.` : 'Pilih setidaknya satu karakter.';
}
menus.addEventListener('change', event => {
  if (event.target.matches('[data-type]')) event.target.closest('fieldset').querySelectorAll('[data-index]').forEach(box => { box.checked = event.target.checked; });
  preset.value = 'custom';
  updateSelection();
});
preset.addEventListener('change', () => {
  if (preset.value !== 'custom') setup.querySelector('input[value="single"]').checked = true;
  renderMenus();
});
setup.querySelectorAll('[name="letterMode"]').forEach(radio => radio.addEventListener('change', () => { preset.value = 'custom'; renderMenus(); }));
rounds.addEventListener('change', updateSelection);

function showQuestion() {
  const current = queue[round];
  answered = false;
  character.textContent = current[0];
  document.querySelector('#letterType').textContent = current[2];
  input.value = '';
  input.disabled = false;
  form.querySelector('button').disabled = false;
  next.hidden = true;
  feedback.textContent = 'Tulis bacaan yang dipelajari pada pilihan karakter.';
  feedback.className = 'text-sm';
  remaining.textContent = queue.length - round;
  input.focus();
}
function start() {
  if (!selectedItems.length) return;
  queue = createRound(selectedItems, rounds.value === 'all' ? selectedItems.length : Number(rounds.value));
  sessionKey = selectedItems.map(item => item[0]).sort().join('|') + ':' + queue.length;
  round = 0; score = 0; finished = false;
  recordVisit('drill');
  const previous = getProgress().bestDrills[sessionKey];
  best.textContent = previous ? `Skor terbaik untuk pilihan ini: ${previous.score}/${previous.total}.` : 'Belum ada skor untuk pilihan ini.';
  scoreText.textContent = `0/${queue.length}`;
  setup.hidden = true;
  game.hidden = false;
  showQuestion();
}
startButton.addEventListener('click', start);
document.querySelector('#refreshLetterGame').addEventListener('click', () => {
  preset.value = 'hiragana'; rounds.value = '10';
  setup.querySelector('input[value="single"]').checked = true;
  renderMenus();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (answered || finished || !input.value.trim()) return;
  answered = true;
  const current = queue[round];
  const correct = acceptsReading(input.value, current[1], current[0]);
  if (correct) score++;
  scoreText.textContent = `${score}/${queue.length}`;
  remaining.textContent = queue.length - round - 1;
  feedback.textContent = correct ? 'Benar. Bacaanmu tepat.' : `Belum tepat. Bacaan yang dilatih: ${current[1]}.`;
  feedback.className = `feedback ${correct ? 'feedback-correct' : 'feedback-incorrect'}`;
  input.disabled = true;
  form.querySelector('button').disabled = true;
  next.textContent = round === queue.length - 1 ? 'Lihat hasil latihan' : 'Soal berikutnya';
  next.hidden = false;
  next.focus();
});
next.addEventListener('click', () => {
  if (!answered || finished) return;
  if (++round < queue.length) return showQuestion();
  finished = true;
  recordDrill(sessionKey, score, queue.length);
  const previous = getProgress().bestDrills[sessionKey];
  best.textContent = `Skor terbaik untuk pilihan ini: ${previous.score}/${previous.total}.`;
  feedback.textContent = `Latihan selesai. Skor ${score} dari ${queue.length}. Ulangi latihan atau pilih karakter lain.`;
  feedback.className = 'feedback feedback-correct';
  next.hidden = true;
  feedback.focus();
});
document.querySelector('#backLetterGame').addEventListener('click', () => { game.hidden = true; setup.hidden = false; startButton.focus(); });
document.querySelector('#refreshActiveLetterGame').addEventListener('click', start);
renderMenus();
