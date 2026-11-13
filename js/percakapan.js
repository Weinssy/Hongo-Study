import { createConversationState, escapeHtml } from './study-core.js';
import { recordVisit } from './progress.js';

const turns = [
  { text: 'おはようございます。宿題はしましたか？', answers: [['はい、しました。','Bagus! Hari ini kita belajar pola baru.',true],['さようなら。','Itu berarti selamat tinggal. Coba balasan sesuai konteks.',false]] },
  { text: 'では、教室へ行きましょう。', answers: [['はい、行きましょう。','Tepat! Ayo pergi bersama.',true],['いいえ、食べます。','Perhatikan bahwa ini berarti “tidak, saya makan”.',false]] },
  { text: '今日の授業は何ですか？', answers: [['日本語です。','Benar, hari ini pelajaran bahasa Jepang.',true],['駅へ行きます。','Itu berarti pergi ke stasiun. Jawab dengan nama pelajaran.',false]] },
  { text: '教科書を持ってきましたか？', answers: [['はい、持ってきました。','Bagus! Kamu siap mengikuti pelajaran.',true],['おいしいです。','Itu berarti enak. Coba jawab tentang membawa buku.',false]] },
  { text: '休み時間に何をしますか？', answers: [['友達と話します。','Tepat! Berbicara dengan teman adalah kegiatan yang wajar.',true],['先生です。','Itu berarti “adalah guru”. Jawab dengan kegiatan.',false]] },
  { text: '図書館で一緒に勉強しませんか？', answers: [['はい、勉強しましょう。','Benar! Ini ajakan belajar yang sopan.',true],['さようなら、先生。','Jawaban ini menutup percakapan, bukan menerima ajakan.',false]] },
  { text: '明日のテストは何時からですか？', answers: [['九時からです。','Tepat! Gunakan から untuk menyebut waktu mulai.',true],['教室を食べます。','Kelas bukan sesuatu yang dimakan. Jawab dengan waktu.',false]] },
  { text: '授業が終わりました。帰りましょう。', answers: [['はい、また明日。','Gunakan salam perpisahan untuk menutup percakapan.',true],['本をください。','Itu berarti meminta buku. Gunakan salam perpisahan.',false]] },
];
const state = createConversationState(turns.length);
const log = document.querySelector('#chatLog');
const options = document.querySelector('#chatOptions');
const status = document.querySelector('#chatStatus');
const next = document.querySelector('#chatNext');
const restart = document.querySelector('#chatRestart');

function addMessage(speaker, text) {
  const message = document.createElement('article');
  message.className = 'chat-message';
  message.innerHTML = `<p class="mb-1 text-xs font-bold text-slate-600">${speaker}</p><p lang="ja" tabindex="-1">${escapeHtml(text)}</p>`;
  log.append(message);
  return message.querySelector('[lang]');
}
function render(moveFocus = false) {
  const current = turns[state.index];
  const question = addMessage('Guru', current.text);
  document.querySelector('#chatProgress').textContent = `Dialog ${state.index + 1} dari ${turns.length}`;
  status.textContent = 'Pilih balasan yang sesuai dengan pertanyaan guru.';
  status.className = 'mt-4 text-sm';
  next.hidden = true;
  options.replaceChildren();
  current.answers.forEach(answer => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-button justify-start text-left';
    button.lang = 'ja';
    button.textContent = answer[0];
    button.addEventListener('click', () => {
      if (!state.answer(answer[2])) return;
      status.textContent = answer[1];
      status.className = `mt-4 feedback ${answer[2] ? 'feedback-correct' : 'feedback-incorrect'}`;
      if (answer[2]) {
        recordVisit('conversation');
        addMessage('Jawabanmu', answer[0]);
        options.querySelectorAll('button').forEach(option => { option.disabled = true; });
        next.textContent = state.index === turns.length - 1 ? 'Selesaikan percakapan' : 'Lanjutkan dialog';
        next.hidden = false;
        next.focus();
      }
    });
    options.append(button);
  });
  if (moveFocus) question.focus();
}
next.addEventListener('click', () => {
  if (!state.answered) return;
  if (state.next()) return render(true);
  next.hidden = true;
  options.replaceChildren();
  status.textContent = `Percakapan selesai. Kamu sudah melewati ${turns.length} dialog. Riwayatnya tetap bisa dibaca di atas.`;
  restart.hidden = false;
  restart.focus();
});
restart.addEventListener('click', () => {
  state.reset();
  log.replaceChildren();
  restart.hidden = true;
  render(true);
});
render();
