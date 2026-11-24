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
const drillProgress = document.querySelector('#drillProgress');
const drillActiveCard = document.querySelector('#drillActiveCard');
const drillSummary = document.querySelector('#drillSummary');
const drillSummaryHeading = document.querySelector('#drillSummaryHeading');
const drillFinalScore = document.querySelector('#drillFinalScore');
const drillSummaryNote = document.querySelector('#drillSummaryNote');
const drillFinalBest = document.querySelector('#drillFinalBest');
const drillRepeatBtn = document.querySelector('#drillRepeatBtn');
const drillChangeBtn = document.querySelector('#drillChangeBtn');
const roundCount = document.querySelector('#letterRoundCount');
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
      <legend class="px-2 text-sm font-bold">${type}</legend>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-bold text-slate-500" data-group-count="${type}">0/${choices.length} dipilih</span>
        <button type="button" class="secondary-button !px-3 !py-1.5 text-xs" data-toggle-group="${type}">Pilih Semua</button>
      </div>
      <div class="drill-tile-grid">${choices.map(({item, index}) => `<button type="button" class="drill-tile" data-index="${index}" aria-pressed="false"><span lang="ja" class="font-kanji font-bold">${escapeHtml(item[0])}</span><span class="font-mono text-xs text-slate-500">${escapeHtml(item[1])}</span></button>`).join('')}</div>
    </fieldset>`;
  }).join('');
  const indexes = preset.value === 'katakana' ? items.map((x, i) => x[2] === 'Katakana' && x[0].length === 1 ? i : -1).filter(i => i >= 0).slice(0, 10) : Array.from({length: 10}, (_, i) => i);
  menus.querySelectorAll('[data-index]').forEach(tile => {
    const selected = preset.value === 'custom' || indexes.includes(Number(tile.dataset.index));
    tile.setAttribute('aria-pressed', String(selected));
  });
  updateSelection();
}
function updateSelection() {
  selectedItems = [...menus.querySelectorAll('[data-index][aria-pressed="true"]')].map(tile => items[Number(tile.dataset.index)]);
  menus.querySelectorAll('[data-toggle-group]').forEach(button => {
    const group = button.closest('fieldset');
    const choices = [...group.querySelectorAll('[data-index]')];
    const checked = choices.filter(choice => choice.getAttribute('aria-pressed') === 'true').length;
    const allChecked = checked === choices.length && choices.length > 0;
    button.textContent = allChecked ? 'Hapus Semua' : 'Pilih Semua';
    const counter = group.querySelector('[data-group-count]');
    if (counter) counter.textContent = `${checked}/${choices.length} dipilih`;
  });
  startButton.disabled = selectedItems.length === 0;
  const total = rounds.value === 'all' ? selectedItems.length : Math.min(Number(rounds.value), selectedItems.length);
  hint.textContent = selectedItems.length ? `${selectedItems.length} pilihan. Sesi ini berisi ${total} soal tanpa pengulangan.` : 'Pilih setidaknya satu karakter.';
}
menus.addEventListener('click', event => {
  const tile = event.target.closest('[data-index]');
  if (tile) {
    const nextPressed = tile.getAttribute('aria-pressed') !== 'true';
    tile.setAttribute('aria-pressed', String(nextPressed));
    preset.value = 'custom';
    updateSelection();
    return;
  }
  const toggleGroup = event.target.closest('[data-toggle-group]');
  if (!toggleGroup) return;
  const choices = [...toggleGroup.closest('fieldset').querySelectorAll('[data-index]')];
  const allChecked = choices.length > 0 && choices.every(choice => choice.getAttribute('aria-pressed') === 'true');
  choices.forEach(choice => { choice.setAttribute('aria-pressed', String(!allChecked)); });
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
  character.style.fontSize = [...current[0]].length > 1 ? 'clamp(2rem, 9vw, 3.5rem)' : '';
  document.querySelector('#letterType').textContent = current[2];
  if (roundCount) roundCount.textContent = `Soal ${round + 1} / ${queue.length}`;
  if (drillProgress) {
    drillProgress.max = queue.length;
    drillProgress.value = round;
  }
  input.value = '';
  input.readOnly = false;
  form.querySelector('button').disabled = false;
  next.hidden = true;
  feedback.textContent = 'Tulis bacaan yang dipelajari pada pilihan karakter.';
  feedback.className = 'mt-4 text-sm text-slate-600';
  remaining.textContent = queue.length - round;
  input.focus();
}
function closeGame() {
  game.hidden = true;
  setup.hidden = false;
  startButton.focus();
}
if (typeof window !== 'undefined') {
  window.__hongoBackHandler = () => {
    if (game.hidden) return false;
    closeGame();
    return true;
  };
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
  if (drillActiveCard) drillActiveCard.hidden = false;
  if (drillSummary) drillSummary.hidden = true;
  if (drillProgress) {
    drillProgress.max = queue.length;
    drillProgress.value = 0;
  }
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
function advanceRound() {
  if (!answered || finished) return;
  if (++round < queue.length) return showQuestion();
  finished = true;
  recordDrill(sessionKey, score, queue.length);
  const previous = getProgress().bestDrills[sessionKey];
  best.textContent = `Skor terbaik untuk pilihan ini: ${previous.score}/${previous.total}.`;
  if (drillProgress) {
    drillProgress.max = queue.length;
    drillProgress.value = queue.length;
  }
  if (drillActiveCard) drillActiveCard.hidden = true;
  if (drillSummary) drillSummary.hidden = false;
  if (drillFinalScore) drillFinalScore.textContent = `${score} / ${queue.length}`;
  if (drillSummaryNote) drillSummaryNote.textContent = `Kamu menjawab benar ${score} dari ${queue.length} soal.`;
  if (drillFinalBest) drillFinalBest.textContent = `Skor terbaik: ${previous.score}/${previous.total}`;
  feedback.textContent = `Latihan selesai. Skor ${score} dari ${queue.length}.`;
  feedback.className = 'mt-4 feedback feedback-correct';
  next.hidden = true;
  input.blur();
  (drillSummaryHeading || feedback).focus();
}
form.addEventListener('submit', event => {
  event.preventDefault();
  if (finished) return;
  if (answered) return advanceRound();
  if (!input.value.trim()) return;
  answered = true;
  const current = queue[round];
  const correct = acceptsReading(input.value, current[1], current[0]);
  if (correct) score++;
  scoreText.textContent = `${score}/${queue.length}`;
  remaining.textContent = queue.length - round - 1;
  if (drillProgress) drillProgress.value = round + 1;
  feedback.textContent = correct ? 'Benar. Bacaanmu tepat.' : `Belum tepat. Bacaan yang dilatih: ${current[1]}.`;
  feedback.className = `mt-4 feedback ${correct ? 'feedback-correct' : 'feedback-incorrect'}`;
  input.readOnly = true;
  form.querySelector('button').disabled = true;
  next.textContent = round === queue.length - 1 ? 'Lihat hasil latihan' : 'Soal berikutnya';
  next.hidden = false;
  if (document.activeElement !== input) next.focus();
});
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && answered && !finished) {
    event.preventDefault();
    advanceRound();
  }
});
next.addEventListener('click', advanceRound);
document.querySelector('#backLetterGame').addEventListener('click', closeGame);
document.querySelector('#refreshActiveLetterGame').addEventListener('click', start);
drillRepeatBtn?.addEventListener('click', start);
drillChangeBtn?.addEventListener('click', closeGame);
renderMenus();
