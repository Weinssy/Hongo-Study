import { createConversationState } from './study-core.js';
import { recordVisit } from './progress.js';
import { SPEAKER_ICON_SVG, speakJapanese } from './speech.js';

const SCENARIOS = {
  kelas: {
    title: 'Di depan ruang kelas',
    desc: 'Latih sapaan guru, persiapan buku pelajaran, dan rencana belajar bersama di sekolah.',
    partner: 'Guru',
    prompt: 'Pilih balasan yang sesuai dengan pertanyaan guru.',
    turns: [
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
    ],
  },

  perkenalan: {
    title: 'Perkenalan diri dengan teman baru',
    desc: 'Berlatih memperkenalkan nama, asal negara, status pelajar, dan hobi dengan sopan.',
    partner: 'Kenji',
    prompt: 'Pilih balasan perkenalan yang paling alami.',
    turns: [
      {
        ruby: 'はじめまして。<ruby>私<rt>わたし</rt></ruby>は<ruby>健司<rt>けんじ</rt></ruby>です。お<ruby>名前<rt>なまえ</rt></ruby>は？',
        romaji: 'Hajimemashite. Watashi wa Kenji desu. Onamae wa?',
        hint: 'Salam kenal. Saya Kenji. Siapa namamu?',
        answers: [
          {
            ruby: 'はじめまして。リナです。',
            romaji: 'Hajimemashite. Rina desu.',
            feedback: 'Sempurna! Awalan はじめまして sangat sopan saat pertama bertemu.',
            correct: true,
          },
          {
            ruby: 'ありがとうございます。',
            romaji: 'Arigatou gozaimasu.',
            feedback: 'Itu berarti terima kasih. Jawab dengan memperkenalkan nama.',
            correct: false,
          },
        ],
      },
      {
        ruby: 'リナさんは<ruby>出身<rt>しゅっしん</rt></ruby>はどちらですか？',
        romaji: 'Rina-san wa shusshin wa dochira desu ka?',
        hint: 'Rina berasal dari mana?',
        answers: [
          {
            ruby: 'インドネシアから<ruby>来<rt>き</rt></ruby>ました。',
            romaji: 'Indoneshia kara kimashita.',
            feedback: 'Tepat! Pola 〜から来ました menyatakan asal daerah atau negara.',
            correct: true,
          },
          {
            ruby: '<ruby>今<rt>いま</rt></ruby>、<ruby>三時<rt>さんじ</rt></ruby>です。',
            romaji: 'Ima, sanji desu.',
            feedback: 'Itu menyebutkan jam sekarang, bukan asal tempat.',
            correct: false,
          },
        ],
      },
      {
        ruby: 'インドネシアですか！お<ruby>仕事<rt>しごと</rt></ruby>は<ruby>何<rt>なん</rt></ruby>ですか？',
        romaji: 'Indoneshia desu ka! Oshigoto wa nan desu ka?',
        hint: 'Oh Indonesia! Apa pekerjaan atau kesibukanmu?',
        answers: [
          {
            ruby: '<ruby>高校生<rt>こうこうせい</rt></ruby>です。<ruby>日本語<rt>にほんご</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>しています。',
            romaji: 'Koukousei desu. Nihongo o benkyou shite imasu.',
            feedback: 'Bagus! Menyebut status pelajar sekaligus aktivitas membuat obrolan hangat.',
            correct: true,
          },
          {
            ruby: '<ruby>図書館<rt>としょかん</rt></ruby>は<ruby>静<rt>しず</rt></ruby>かです。',
            romaji: 'Toshokan wa shizuka desu.',
            feedback: 'Itu mendeskripsikan perpustakaan, bukan pekerjaan atau statusmu.',
            correct: false,
          },
        ],
      },
      {
        ruby: '<ruby>趣味<rt>しゅみ</rt></ruby>は<ruby>何<rt>なん</rt></ruby>ですか？',
        romaji: 'Shumi wa nan desu ka?',
        hint: 'Apa hobimu?',
        answers: [
          {
            ruby: '<ruby>音楽<rt>おんがく</rt></ruby>を<ruby>聞<rt>き</rt></ruby>くことです。',
            romaji: 'Ongaku o kiku koto desu.',
            feedback: 'Benar! Kata kerja bentuk kamus + ことです dipakai untuk menyebut hobi.',
            correct: true,
          },
          {
            ruby: '<ruby>昨日<rt>きのう</rt></ruby>は<ruby>雨<rt>あめ</rt></ruby>でした。',
            romaji: 'Kinou wa ame deshita.',
            feedback: 'Itu membicarakan cuaca kemarin. Jawab dengan hobi.',
            correct: false,
          },
        ],
      },
      {
        ruby: '<ruby>日本<rt>にほん</rt></ruby>の<ruby>食<rt>た</rt></ruby>べ<ruby>物<rt>もの</rt></ruby>で<ruby>何<rt>なに</rt></ruby>が<ruby>好<rt>す</rt></ruby>きですか？',
        romaji: 'Nihon no tabemono de nani ga suki desu ka?',
        hint: 'Di antara makanan Jepang, apa yang kamu suka?',
        answers: [
          {
            ruby: 'ラーメンが<ruby>大好<rt>だいす</rt></ruby>きです。',
            romaji: 'Raamen ga daisuki desu.',
            feedback: 'Tepat! Gunakan partikel が sebelum 好き atau 大好き.',
            correct: true,
          },
          {
            ruby: '<ruby>鉛筆<rt>えんぴつ</rt></ruby>があります。',
            romaji: 'Enpitsu ga arimasu.',
            feedback: 'Pensil bukan makanan. Jawab dengan nama makanan favorit.',
            correct: false,
          },
        ],
      },
      {
        ruby: 'これからよろしくお<ruby>願<rt>ねが</rt></ruby>いします！',
        romaji: 'Kore kara yoroshiku onegaishimasu!',
        hint: 'Mohon kerja samanya ke depan!',
        answers: [
          {
            ruby: 'こちらこそ、よろしくお<ruby>願<rt>ねが</rt></ruby>いします。',
            romaji: 'Kochira koso, yoroshiku onegaishimasu.',
            feedback: 'Mantap! こちらこそ berarti “saya juga sebaliknya”.',
            correct: true,
          },
          {
            ruby: 'おやすみなさい。',
            romaji: 'Oyasuminasai.',
            feedback: 'Itu ucapan selamat tidur, kurang tepat untuk menutup perkenalan.',
            correct: false,
          },
        ],
      },
    ],
  },

  konbini: {
    title: 'Berbelanja di konbini & kafe',
    desc: 'Praktik memesan minuman, menanyakan harga, dan menjawab pertanyaan kasir Jepang.',
    partner: 'Pelayan',
    prompt: 'Pilih respons yang tepat saat bertransaksi di kasir.',
    turns: [
      {
        ruby: 'いらっしゃいませ！ご<ruby>注文<rt>ちゅうもん</rt></ruby>はお<ruby>決<rt>き</rt></ruby>まりですか？',
        romaji: 'Irasshaimase! Gochuumon wa okimari desu ka?',
        hint: 'Selamat datang! Apakah pesanan Anda sudah siap?',
        answers: [
          {
            ruby: 'はい、コーヒーをひとつください。',
            romaji: 'Hai, koohii o hitotsu kudasai.',
            feedback: 'Tepat! Pola 〜をください sangat penting saat memesan.',
            correct: true,
          },
          {
            ruby: 'ただいま<ruby>帰<rt>かえ</rt></ruby>りました。',
            romaji: 'Tadaima kaerimashita.',
            feedback: 'Itu ucapan saat pulang ke rumah, bukan saat memesan di toko.',
            correct: false,
          },
        ],
      },
      {
        ruby: 'ホットとアイス、どちらになさいますか？',
        romaji: 'Hotto to aisu, dochira ni nasaimasu ka?',
        hint: 'Mau yang panas (hot) atau dingin (iced)?',
        answers: [
          {
            ruby: 'アイスをお<ruby>願<rt>ねが</rt></ruby>いします。',
            romaji: 'Aisu o onegaishimasu.',
            feedback: 'Sopan dan jelas! 〜をお願いします sering dipakai di kafe.',
            correct: true,
          },
          {
            ruby: '<ruby>学校<rt>がっこう</rt></ruby>へ行きます。',
            romaji: 'Gakkou e ikimasu.',
            feedback: 'Pilih antara panas (ホット) atau dingin (アイス).',
            correct: false,
          },
        ],
      },
      {
        ruby: 'ほかに<ruby>何<rt>なに</rt></ruby>かいかがですか？おにぎりもありますよ。',
        romaji: 'Hoka ni nanika ikaga desu ka? Onigiri mo arimasu yo.',
        hint: 'Ada tambahan lain? Ada onigiri juga lho.',
        answers: [
          {
            ruby: 'じゃあ、おにぎりもひとつください。',
            romaji: 'Jaa, onigiri mo hitotsu kudasai.',
            feedback: 'Bagus! Partikel も berarti “juga” untuk menambah pesanan.',
            correct: true,
          },
          {
            ruby: 'お<ruby>元気<rt>げんき</rt></ruby>ですか。',
            romaji: 'Ogenki desu ka.',
            feedback: 'Itu menanyakan kabar, bukan menanggapi tawaran menu.',
            correct: false,
          },
        ],
      },
      {
        ruby: 'レジ<ruby>袋<rt>ぶくろ</rt></ruby>はご<ruby>利用<rt>りよう</rt></ruby>になりますか？',
        romaji: 'Rejibukuro wa goriyou ni narimasu ka?',
        hint: 'Apakah Anda memerlukan kantong belanja?',
        answers: [
          {
            ruby: 'いいえ、<ruby>大丈夫<rt>だいじょうぶ</rt></ruby>です。',
            romaji: 'Iie, daijoubu desu.',
            feedback: 'Alami sekali! Menolak kantong dengan いいえ、大丈夫です sangat umum di Jepang.',
            correct: true,
          },
          {
            ruby: 'はい、<ruby>学生<rt>がくせい</rt></ruby>です。',
            romaji: 'Hai, gakusei desu.',
            feedback: 'Kasir menanyakan kantong belanja, bukan status pelajar.',
            correct: false,
          },
        ],
      },
      {
        ruby: 'お<ruby>会計<rt>かいけい</rt></ruby>は<ruby>全部<rt>ぜんぶ</rt></ruby>で<ruby>四百円<rt>よんひゃくえん</rt></ruby>になります。',
        romaji: 'Okaikei wa zenbu de yonhyaku-en ni narimasu.',
        hint: 'Total pembayarannya semua 400 yen.',
        answers: [
          {
            ruby: 'カードで<ruby>払<rt>はら</rt></ruby>ってもいいですか？',
            romaji: 'Kaado de haratte mo ii desu ka?',
            feedback: 'Keren! Pola 〜てもいいですか digunakan untuk meminta izin membayar dengan kartu.',
            correct: true,
          },
          {
            ruby: '<ruby>今<rt>いま</rt></ruby>、<ruby>寝<rt>ね</rt></ruby>ます。',
            romaji: 'Ima, nemasu.',
            feedback: 'Itu berarti “sekarang tidur”, tidak cocok saat membayar di kasir.',
            correct: false,
          },
        ],
      },
      {
        ruby: 'はい、どうぞ。ありがとうございました！',
        romaji: 'Hai, douzo. Arigatou gozaimashita!',
        hint: 'Silakan, ini pesanannya. Terima kasih banyak!',
        answers: [
          {
            ruby: 'ありがとうございます。',
            romaji: 'Arigatou gozaimasu.',
            feedback: 'Ramah dan tepat untuk menutup transaksi!',
            correct: true,
          },
          {
            ruby: 'はじめまして。',
            romaji: 'Hajimemashite.',
            feedback: 'Itu ucapan perkenalan pertama, bukan ucapan terima kasih.',
            correct: false,
          },
        ],
      },
    ],
  },

  arah: {
    title: 'Menanyakan arah ke stasiun',
    desc: 'Latih cara bertanya jalan dengan santun serta memahami petunjuk arah dan jarak tempuh.',
    partner: 'Warga Lokal',
    prompt: 'Pilih kalimat tanya atau tanggapan arah yang sesuai.',
    turns: [
      {
        ruby: 'はい、どうしましたか？',
        romaji: 'Hai, doushimashita ka?',
        hint: 'Ya, ada yang bisa saya bantu?',
        answers: [
          {
            ruby: 'すみません、<ruby>駅<rt>えき</rt></ruby>はどこですか？',
            romaji: 'Sumimasen, eki wa doko desu ka?',
            feedback: 'Tepat! Memulai dengan すみません membuat pertanyaanmu sangat sopan.',
            correct: true,
          },
          {
            ruby: 'いただきます。',
            romaji: 'Itadakimasu.',
            feedback: 'Itu ucapan sebelum makan, bukan menanyakan arah.',
            correct: false,
          },
        ],
      },
      {
        ruby: 'この<ruby>道<rt>みち</rt></ruby>をまっすぐ<ruby>行<rt>い</rt></ruby>ってください。',
        romaji: 'Kono michi o massugu itte kudasai.',
        hint: 'Silakan jalan lurus mengikuti jalan ini.',
        answers: [
          {
            ruby: 'まっすぐですね。それから？',
            romaji: 'Massugu desu ne. Sorekara?',
            feedback: 'Bagus! Mengulang kata kunci membantu memastikan arah dengan jelas.',
            correct: true,
          },
          {
            ruby: 'おいしいラーメンですね。',
            romaji: 'Oishii raamen desu ne.',
            feedback: 'Fokus pada petunjuk jalan yang sedang dijelaskan.',
            correct: false,
          },
        ],
      },
      {
        ruby: '<ruby>次<rt>つぎ</rt></ruby>の<ruby>角<rt>かど</rt></ruby>を<ruby>右<rt>みぎ</rt></ruby>へ<ruby>曲<rt>ま</rt></ruby>がってください。',
        romaji: 'Tsugi no kado o migi e magatte kudasai.',
        hint: 'Di tikungan berikutnya, silakan belok ke kanan.',
        answers: [
          {
            ruby: 'わかりました。<ruby>右<rt>みぎ</rt></ruby>ですね。',
            romaji: 'Wakarimashita. Migi desu ne.',
            feedback: 'Tepat! わかりました menyatakan bahwa kamu sudah paham.',
            correct: true,
          },
          {
            ruby: '<ruby>水<rt>みず</rt></ruby>を<ruby>飲<rt>の</rt></ruby>みます。',
            romaji: 'Mizu o nomimasu.',
            feedback: 'Itu berarti minum air. Konfirmasi arah beloknya.',
            correct: false,
          },
        ],
      },
      {
        ruby: '<ruby>銀行<rt>ぎんこう</rt></ruby>の<ruby>隣<rt>となり</rt></ruby>に<ruby>駅<rt>えき</rt></ruby>がありますよ。',
        romaji: 'Ginkou no tonari ni eki ga arimasu yo.',
        hint: 'Stasiunnya ada di sebelah bank lho.',
        answers: [
          {
            ruby: 'ここから<ruby>歩<rt>ある</rt></ruby>いて<ruby>何分<rt>なんぷん</rt></ruby>ぐらいですか？',
            romaji: 'Koko kara aruite nanpun gurai desu ka?',
            feedback: 'Pertanyaan lanjutan yang sangat berguna untuk tahu lama jalan kaki!',
            correct: true,
          },
          {
            ruby: '<ruby>明日<rt>あした</rt></ruby>は<ruby>日曜日<rt>にちようび</rt></ruby>です。',
            romaji: 'Ashita wa nichiyoubi desu.',
            feedback: 'Itu menyebut hari besok. Coba tanyakan jarak atau waktunya.',
            correct: false,
          },
        ],
      },
      {
        ruby: '<ruby>五分<rt>ごふん</rt></ruby>ぐらいです。すぐ<ruby>近<rt>ちか</rt></ruby>くですよ。',
        romaji: 'Gofun gurai desu. Sugu chikaku desu yo.',
        hint: 'Sekitar 5 menit. Dekat sekali kok.',
        answers: [
          {
            ruby: 'よかった！<ruby>近<rt>ちか</rt></ruby>くて<ruby>安心<rt>あんしん</rt></ruby>しました。',
            romaji: 'Yokatta! Chikakute anshin shimashita.',
            feedback: 'Respons yang sangat natural untuk menyatakan rasa lega.',
            correct: true,
          },
          {
            ruby: '<ruby>教科書<rt>きょうかしょ</rt></ruby>を<ruby>読<rt>よ</rt></ruby>みます。',
            romaji: 'Kyoukasho o yomimasu.',
            feedback: 'Tidak nyambung dengan informasi jarak 5 menit tadi.',
            correct: false,
          },
        ],
      },
      {
        ruby: 'いいえ、どういたしまして。お<ruby>気<rt>き</rt></ruby>をつけて！',
        romaji: 'Iie, douitashimashite. Oki o tsukete!',
        hint: 'Sama-sama. Hati-hati di jalan!',
        answers: [
          {
            ruby: 'どうもありがとうございました！',
            romaji: 'Doumo arigatou gozaimashita!',
            feedback: 'Sempurna! Ucapan terima kasih lengkap menutup percakapan dengan santun.',
            correct: true,
          },
          {
            ruby: 'お<ruby>名前<rt>なまえ</rt></ruby>は<ruby>何<rt>なん</rt></ruby>ですか？',
            romaji: 'Onamae wa nan desu ka?',
            feedback: 'Percakapan sudah selesai, tutup dengan ucapan terima kasih.',
            correct: false,
          },
        ],
      },
    ],
  },
};

const scenarioSelector = document.querySelector('#scenarioSelector');
const scenarioTitle = document.querySelector('#scenarioTitle');
const scenarioDesc = document.querySelector('#scenarioDesc');
const log = document.querySelector('#chatLog');
const options = document.querySelector('#chatOptions');
const status = document.querySelector('#chatStatus');
const next = document.querySelector('#chatNext');
const restart = document.querySelector('#chatRestart');

let currentScenarioKey = 'kelas';
let state = createConversationState(SCENARIOS.kelas.turns.length);

function rubyToSpokenText(markup) {
  return String(markup || '')
    .replace(/<ruby>[^<]*<rt>([^<]+)<\/rt><\/ruby>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

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

function addMessage(speaker, { ruby, romaji, hint }, isUser = false) {
  const message = document.createElement('article');
  message.className = `chat-bubble ${isUser ? 'chat-bubble--user self-end' : 'chat-bubble--guru self-start'}`;

  const headerRow = document.createElement('div');
  headerRow.className = 'mb-1.5 flex items-center justify-between gap-3';

  const speakerEl = document.createElement('p');
  speakerEl.className = `text-xs font-bold ${isUser ? 'text-crimson' : 'text-slate-600'}`;
  speakerEl.textContent = speaker;

  const speakBtn = document.createElement('button');
  speakBtn.type = 'button';
  speakBtn.className = 'tts-btn';
  speakBtn.dataset.speak = rubyToSpokenText(ruby);
  speakBtn.setAttribute('aria-label', `Dengarkan dialog ${speaker}`);
  speakBtn.innerHTML = `${SPEAKER_ICON_SVG}<span>Dengar</span>`;

  headerRow.append(speakerEl, speakBtn);

  const jpEl = createRubyElement('p', ruby, 'text-base font-semibold leading-relaxed text-ink');
  jpEl.tabIndex = -1;

  const romajiEl = document.createElement('p');
  romajiEl.className = 'mt-1 font-mono text-xs text-slate-500';
  romajiEl.textContent = romaji;

  message.append(headerRow, jpEl, romajiEl);
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
  const scenario = SCENARIOS[currentScenarioKey];
  const turns = scenario.turns;
  const current = turns[state.index];
  const question = addMessage(scenario.partner, current, false);
  document.querySelector('#chatProgress').textContent = `Dialog ${state.index + 1} dari ${turns.length}`;
  status.textContent = scenario.prompt;
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
        recordVisit('conversation', currentScenarioKey);
        addMessage('Jawabanmu', answer, true);
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

function selectScenario(key, moveFocus = false) {
  if (!Object.hasOwn(SCENARIOS, key)) return;
  currentScenarioKey = key;
  const scenario = SCENARIOS[key];
  state = createConversationState(scenario.turns.length);
  if (scenarioTitle) scenarioTitle.textContent = scenario.title;
  if (scenarioDesc) scenarioDesc.textContent = scenario.desc;
  log.replaceChildren();
  restart.hidden = true;
  next.hidden = true;

  scenarioSelector?.querySelectorAll('[data-scenario]').forEach((chip) => {
    const active = chip.dataset.scenario === key;
    chip.setAttribute('aria-pressed', String(active));
    chip.classList.toggle('bg-crimson', active);
    chip.classList.toggle('text-white', active);
    chip.classList.toggle('border-crimson', active);
    chip.classList.toggle('bg-white', !active);
    chip.classList.toggle('text-slate-700', !active);
    chip.classList.toggle('border-slate-200', !active);
  });

  render(moveFocus);
}

log?.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-speak]');
  if (!btn) return;
  speakJapanese(btn.dataset.speak, { button: btn });
});

scenarioSelector?.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-scenario]');
  if (!btn) return;
  selectScenario(btn.dataset.scenario, true);
});

next.addEventListener('click', () => {
  if (!state.answered) return;
  const turns = SCENARIOS[currentScenarioKey].turns;
  if (state.next()) return render(true);
  next.hidden = true;
  options.replaceChildren();
  status.textContent = `Percakapan selesai. Kamu sudah melewati ${turns.length} dialog. Pilih skenario lain di atas atau ulangi percakapan ini.`;
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

selectScenario('kelas', false);
