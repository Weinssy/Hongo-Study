import { createConversationState } from './study-core.js';
import { recordVisit } from './progress.js';

const turns = [
  {
    ruby: 'おはようございます。<ruby>宿題<rt>しゅくだい</rt></ruby>はしましたか？',
    romaji: 'Ohayou gozaimasu. Shukudai wa shimashita ka?',
    hint: 'Selamat pagi. Apakah kamu sudah mengerjakan PR?',
    answers: [
      {
        ruby: 'はい、しました。',
        romaji: 'Hai, shimashita.',
        feedback: 'Bagus! Hari ini kita belajar pola baru.',
        correct: true,
      },
      {
        ruby: 'さようなら。',
        romaji: 'Sayounara.',
        feedback: 'Itu berarti selamat tinggal. Coba balasan sesuai konteks.',
        correct: false,
      },
    ],
  },
  {
    ruby: 'では、<ruby>教室<rt>きょうしつ</rt></ruby>へ<ruby>行<rt>い</rt></ruby>きましょう。',
    romaji: 'Dewa, kyoushitsu e ikimashou.',
    hint: 'Baiklah, mari pergi ke ruang kelas.',
    answers: [
      {
        ruby: 'はい、<ruby>行<rt>い</rt></ruby>きましょう。',
        romaji: 'Hai, ikimashou.',
        feedback: 'Tepat! Ayo pergi bersama.',
        correct: true,
      },
      {
        ruby: 'いいえ、<ruby>食<rt>た</rt></ruby>べます。',
        romaji: 'Iie, tabemasu.',
        feedback: 'Perhatikan bahwa ini berarti “tidak, saya makan”.',
        correct: false,
      },
    ],
  },
  {
    ruby: '<ruby>今日<rt>きょう</rt></ruby>の<ruby>授業<rt>じゅぎょう</rt></ruby>は<ruby>何<rt>なん</rt></ruby>ですか？',
    romaji: 'Kyou no jugyou wa nan desu ka?',
    hint: 'Pelajaran hari ini apa?',
    answers: [
      {
        ruby: '<ruby>日本語<rt>にほんご</rt></ruby>です。',
        romaji: 'Nihongo desu.',
        feedback: 'Benar, hari ini pelajaran bahasa Jepang.',
        correct: true,
      },
      {
        ruby: '<ruby>駅<rt>えき</rt></ruby>へ<ruby>行<rt>い</rt></ruby>きます。',
        romaji: 'Eki e ikimasu.',
        feedback: 'Itu berarti pergi ke stasiun. Jawab dengan nama pelajaran.',
        correct: false,
      },
    ],
  },
  {
    ruby: '<ruby>教科書<rt>きょうかしょ</rt></ruby>を<ruby>持<rt>も</rt></ruby>ってきましたか？',
    romaji: 'Kyoukasho o motte kimashita ka?',
    hint: 'Apakah kamu membawa buku pelajaran?',
    answers: [
      {
        ruby: 'はい、<ruby>持<rt>も</rt></ruby>ってきました。',
        romaji: 'Hai, motte kimashita.',
        feedback: 'Bagus! Kamu siap mengikuti pelajaran.',
        correct: true,
      },
      {
        ruby: 'おいしいです。',
        romaji: 'Oishii desu.',
        feedback: 'Itu berarti enak. Coba jawab tentang membawa buku.',
        correct: false,
      },
    ],
  },
  {
    ruby: '<ruby>休<rt>やす</rt></ruby>み<ruby>時間<rt>じかん</rt></ruby>に<ruby>何<rt>なに</rt></ruby>をしますか？',
    romaji: 'Yasumi jikan ni nani o shimasu ka?',
    hint: 'Apa yang kamu lakukan saat jam istirahat?',
    answers: [
      {
        ruby: '<ruby>友達<rt>ともだち</rt></ruby>と<ruby>話<rt>はな</rt></ruby>します。',
        romaji: 'Tomodachi to hanashimasu.',
        feedback: 'Tepat! Berbicara dengan teman adalah kegiatan yang wajar.',
        correct: true,
      },
      {
        ruby: '<ruby>先生<rt>せんせい</rt></ruby>です。',
        romaji: 'Sensei desu.',
        feedback: 'Itu berarti “adalah guru”. Jawab dengan kegiatan.',
        correct: false,
      },
    ],
  },
  {
    ruby: '<ruby>図書館<rt>としょかん</rt></ruby>で<ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>勉強<rt>べんきょう</rt></ruby>しませんか？',
    romaji: 'Toshokan de issho ni benkyou shimasen ka?',
    hint: 'Maukah belajar bersama di perpustakaan?',
    answers: [
      {
        ruby: 'はい、<ruby>勉強<rt>べんきょう</rt></ruby>しましょう。',
        romaji: 'Hai, benkyou shimashou.',
        feedback: 'Benar! Ini ajakan belajar yang sopan.',
        correct: true,
      },
      {
        ruby: 'さようなら、<ruby>先生<rt>せんせい</rt></ruby>。',
        romaji: 'Sayounara, sensei.',
        feedback: 'Jawaban ini menutup percakapan, bukan menerima ajakan.',
        correct: false,
      },
    ],
  },
  {
    ruby: '<ruby>明日<rt>あした</rt></ruby>のテストは<ruby>何時<rt>なんじ</rt></ruby>からですか？',
    romaji: 'Ashita no tesuto wa nanji kara desu ka?',
    hint: 'Ujian besok mulai dari jam berapa?',
    answers: [
      {
        ruby: '<ruby>九時<rt>くじ</rt></ruby>からです。',
        romaji: 'Kuji kara desu.',
        feedback: 'Tepat! Gunakan から untuk menyebut waktu mulai.',
        correct: true,
      },
      {
        ruby: '<ruby>教室<rt>きょうしつ</rt></ruby>を<ruby>食<rt>た</rt></ruby>べます。',
        romaji: 'Kyoushitsu o tabemasu.',
        feedback: 'Kelas bukan sesuatu yang dimakan. Jawab dengan waktu.',
        correct: false,
      },
    ],
  },
  {
    ruby: '<ruby>授業<rt>じゅぎょう</rt></ruby>が<ruby>終<rt>お</rt></ruby>わりました。<ruby>帰<rt>かえ</rt></ruby>りましょう。',
    romaji: 'Jugyou ga owarimashita. Kaerimashou.',
    hint: 'Pelajaran sudah selesai. Mari pulang.',
    answers: [
      {
        ruby: 'はい、また<ruby>明日<rt>あした</rt></ruby>。',
        romaji: 'Hai, mata ashita.',
        feedback: 'Gunakan salam perpisahan untuk menutup percakapan.',
        correct: true,
      },
      {
        ruby: '<ruby>本<rt>ほん</rt></ruby>をください。',
        romaji: 'Hon o kudasai.',
        feedback: 'Itu berarti meminta buku. Gunakan salam perpisahan.',
        correct: false,
      },
    ],
  },
];

const state = createConversationState(turns.length);
const log = document.querySelector('#chatLog');
const options = document.querySelector('#chatOptions');
const status = document.querySelector('#chatStatus');
const next = document.querySelector('#chatNext');
const restart = document.querySelector('#chatRestart');

function createRubyElement(tag, markup, className = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.lang = 'ja';
  const hidden = document.body.classList.contains('furigana-off');
  const pattern = /<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>/g;
  let lastIndex = 0;
  for (const match of markup.matchAll(pattern)) {
    if (match.index > lastIndex) el.append(markup.slice(lastIndex, match.index));
    const ruby = document.createElement('ruby');
    ruby.append(match[1]);
    const rt = document.createElement('rt');
    rt.textContent = match[2];
    rt.setAttribute('aria-hidden', String(hidden));
    ruby.append(rt);
    el.append(ruby);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < markup.length) el.append(markup.slice(lastIndex));
  return el;
}

function addMessage(speaker, { ruby, romaji, hint }) {
  const isGuru = speaker === 'Guru';
  const message = document.createElement('article');
  message.className = `chat-bubble ${isGuru ? 'chat-bubble--guru self-start' : 'chat-bubble--user self-end'}`;

  const speakerEl = document.createElement('p');
  speakerEl.className = `mb-1 text-xs font-bold ${isGuru ? 'text-slate-600' : 'text-crimson'}`;
  speakerEl.textContent = speaker;

  const jpEl = createRubyElement('p', ruby, 'text-base font-semibold leading-relaxed text-ink');
  jpEl.tabIndex = -1;

  const romajiEl = document.createElement('p');
  romajiEl.className = 'mt-1 font-mono text-xs text-slate-500';
  romajiEl.textContent = romaji;

  message.append(speakerEl, jpEl, romajiEl);
  if (hint) {
    const hintEl = document.createElement('p');
    hintEl.className = 'mt-1 text-xs text-slate-600';
    hintEl.textContent = hint;
    message.append(hintEl);
  }

  log.append(message);
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (typeof log.scrollTo === 'function') {
    log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  } else {
    log.scrollTop = log.scrollHeight;
  }
  return jpEl;
}

function render(moveFocus = false) {
  const current = turns[state.index];
  const question = addMessage('Guru', current);
  document.querySelector('#chatProgress').textContent = `Dialog ${state.index + 1} dari ${turns.length}`;
  status.textContent = 'Pilih balasan yang sesuai dengan pertanyaan guru.';
  status.className = 'text-sm font-medium text-slate-600';
  next.hidden = true;
  options.replaceChildren();

  current.answers.forEach(answer => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-button min-h-[3.25rem] w-full px-4 py-3 text-left';

    const content = document.createElement('span');
    content.className = 'block w-full text-left';
    const jp = createRubyElement('span', answer.ruby, 'block text-base font-bold leading-snug text-ink');
    const romaji = document.createElement('span');
    romaji.className = 'mt-0.5 block font-mono text-xs font-normal text-slate-500';
    romaji.textContent = answer.romaji;
    content.append(jp, romaji);
    button.append(content);

    button.addEventListener('click', () => {
      if (!state.answer(answer.correct)) return;
      status.textContent = answer.feedback;
      status.className = `feedback ${answer.correct ? 'feedback-correct' : 'feedback-incorrect'}`;
      if (answer.correct) {
        recordVisit('conversation');
        addMessage('Jawabanmu', answer);
        options.querySelectorAll('button').forEach(option => { option.disabled = true; });
        next.textContent = state.index === turns.length - 1 ? 'Selesaikan percakapan' : 'Lanjutkan dialog';
        next.hidden = false;
        next.focus();
      }
    });
    options.append(button);
  });

  if (moveFocus) question.focus({ preventScroll: true });
}

next.addEventListener('click', () => {
  if (!state.answered) return;
  if (state.next()) return render(true);
  next.hidden = true;
  options.replaceChildren();
  status.textContent = `Percakapan selesai. Kamu sudah melewati ${turns.length} dialog. Riwayatnya tetap bisa dibaca di atas.`;
  status.className = 'feedback feedback-correct';
  restart.hidden = false;
  restart.focus();
});

restart.addEventListener('click', () => {
  state.reset();
  log.replaceChildren();
  restart.hidden = true;
  render(true);
});

document.addEventListener('hongo-furigana-change', () => {
  const hidden = document.body.classList.contains('furigana-off');
  document.querySelectorAll('#chatLog rt, #chatOptions rt').forEach(rt => {
    rt.setAttribute('aria-hidden', String(hidden));
  });
});

render();
