import { quizData } from './quiz-data.js';
import { escapeHtml, isCorrectChoice, shuffle } from './study-core.js';
import { getWrongAnswers, recordAnswer, recordVisit } from './progress.js';

(() => {

  // DOM Elements
  const categorySelector = document.querySelector("#categorySelector");
  const quizCard = document.querySelector("#quizCard");
  const quizSummary = document.querySelector("#quizSummary");
  const questionNumber = document.querySelector("#questionNumber");
  const progressBar = document.querySelector("#progressBar");
  const quizCategoryBadge = document.querySelector("#quizCategoryBadge");
  const quizLiveScore = document.querySelector("#quizLiveScore");
  const toggleRomajiHint = document.querySelector("#toggleRomajiHint");
  const questionJapanese = document.querySelector("#questionJapanese");
  const questionRomaji = document.querySelector("#questionRomaji");
  const optionsGrid = document.querySelector("#optionsGrid");
  const nextButton = document.querySelector("#nextButton");
  const feedbackBox = document.querySelector("#feedbackBox");

  // Summary Elements
  const quizReviewList = document.querySelector("#quizReviewList");
  const finalScoreText = document.querySelector("#finalScoreText");
  const finalScorePercent = document.querySelector("#finalScorePercent");
  const finalFeedbackMessage = document.querySelector("#finalFeedbackMessage");
  const restartQuizBtn = document.querySelector("#restartQuizBtn");
  const backToMaterialBtn = document.querySelector("#backToMaterialBtn");

  // State
  let currentCategory = "waktu";
  let questions = [];
  let currentIndex = 0;
  let score = 0;
  let answered = false;
  let userAnswers = [];

  // URL Parameter Handling
  const urlParams = new URLSearchParams(window.location.search);
  const paramCategory = urlParams.get("kategori");
  if (
    paramCategory &&
    (quizData[paramCategory] || paramCategory === "campuran")
  ) {
    currentCategory = paramCategory;
  }

  // Map category to material page link
  const materialLinks = {
    waktu: { url: "kosakata/waktu.html", label: "Materi Waktu" },
    sekolah: { url: "kosakata/sekolah.html", label: "Materi Sekolah" },
    "mata-pelajaran": {
      url: "kosakata/mata-pelajaran.html",
      label: "Materi Mata Pelajaran",
    },
    pekerjaan: { url: "kosakata/pekerjaan.html", label: "Materi Pekerjaan" },
    orang: { url: "kosakata/orang.html", label: "Materi Kosakata Orang" },
    keluarga: { url: "kosakata/keluarga.html", label: "Materi Keluarga" },
    campuran: { url: "kosakata.html", label: "Semua Materi Kosakata" },
  };

  // Prepare questions for category
  function prepareQuestions(catKey) {
    let pool = [];
    if (catKey === "campuran") {
      Object.keys(quizData).forEach((key) => {
        pool = pool.concat(quizData[key].items);
      });
    } else if (quizData[catKey]) {
      pool = [...quizData[catKey].items];
    }

    if (pool.length < 4) return [];

    // Load wrong answers
    const wrongHistory = getWrongAnswers();
    const wrongPool = pool.filter((item) => wrongHistory.includes(item.q));
    const normalPool = pool.filter((item) => !wrongHistory.includes(item.q));

    // Shuffle and prioritize wrong answers
    let selected = [];
    const shuffledWrong = shuffle(wrongPool);
    const shuffledNormal = shuffle(normalPool);

    selected = shuffledWrong.slice(0, 10);
    if (selected.length < 10) {
      selected = selected.concat(shuffledNormal.slice(0, 10 - selected.length));
    }

    selected = shuffle(selected); // shuffle the selected 10 items

    return selected.map((item) => {
      // Find 3 distractors with different answers
      const otherAnswers = pool
        .filter((other) => other.a !== item.a)
        .map((other) => other.a);
      const shuffledOthers = shuffle([...new Set(otherAnswers)]);
      const distractors = shuffledOthers.slice(0, 3);

      const allChoices = shuffle([item.a, ...distractors]);

      return {
        id: item.id,
        question: item.q,
        romaji: item.r,
        furigana: item.f,
        answer: item.a,
        choices: allChoices,
      };
    });
  }

  function updateLiveScore(total = questions.length) {
    if (quizLiveScore) quizLiveScore.textContent = `Skor: ${score}/${total}`;
  }

  function setRomajiHintVisible(visible) {
    questionRomaji.hidden = !visible;
    if (!toggleRomajiHint) return;
    toggleRomajiHint.setAttribute("aria-pressed", String(visible));
    toggleRomajiHint.textContent = visible ? "Sembunyikan" : "Lihat Romaji";
    toggleRomajiHint.classList.toggle("bg-sakura/30", visible);
    toggleRomajiHint.classList.toggle("text-crimson", visible);
    toggleRomajiHint.classList.toggle("border-crimson", visible);
    toggleRomajiHint.classList.toggle("bg-white", !visible);
    toggleRomajiHint.classList.toggle("text-ink", !visible);
    toggleRomajiHint.classList.toggle("border-slate-200", !visible);
  }

  function applyFurigana() {
    const hidden = document.body.classList.contains("furigana-off");
    questionJapanese.querySelectorAll("rt").forEach((rt) => {
      rt.setAttribute("aria-hidden", String(hidden));
    });
  }

  // Render question at currentIndex
  function renderQuestion(moveFocus = false) {
    answered = false;
    feedbackBox.replaceChildren();
    feedbackBox.className = 'mt-4';
    nextButton.classList.add("hidden");

    const total = questions.length;
    const current = questions[currentIndex];
    questionJapanese.lang = 'ja';

    // Update Progress & Badges
    questionNumber.textContent = `Soal ${currentIndex + 1} dari ${total}`;
    updateLiveScore(total);
    progressBar.max = total;
    progressBar.value = currentIndex;

    const catBadge =
      currentCategory === "campuran"
        ? "Mode Campuran"
        : `${quizData[currentCategory]?.badge || ""} ${quizData[currentCategory]?.title || ""}`;
    quizCategoryBadge.textContent = catBadge;

    // Question content
    if (current.furigana) {
      questionJapanese.innerHTML = `<ruby lang="ja">${escapeHtml(current.question)}<rt>${escapeHtml(current.furigana)}</rt></ruby>`;
    } else {
      questionJapanese.textContent = current.question;
    }
    applyFurigana();
    questionRomaji.textContent = current.romaji;
    if (toggleRomajiHint) toggleRomajiHint.hidden = false;
    setRomajiHintVisible(false);

    // Render Choices
    optionsGrid.innerHTML = "";
    current.choices.forEach((choice, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.choice = choice;
      btn.className =
        "choice-btn text-left p-4 rounded-xl border-2 border-slate-200 bg-white font-bold text-ink transition hover:border-crimson hover:bg-slate-50 focus:outline-none flex items-center justify-between gap-3";
      btn.innerHTML = `
        <span class="flex items-center gap-3">
          <span class="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">${String.fromCharCode(65 + idx)}</span>
          <span class="text-sm md:text-base">${escapeHtml(choice)}</span>
        </span>
        <span class="choice-icon text-lg" aria-hidden="true"></span>
      `;

      btn.addEventListener("click", () => handleChoice(choice, btn));
      optionsGrid.appendChild(btn);
    });
    if (moveFocus) questionJapanese.focus();
  }

  // Handle user answer
  function handleChoice(selectedChoice, selectedBtn) {
    if (answered) return;
    answered = true;

    const current = questions[currentIndex];
    const isCorrect = isCorrectChoice(selectedChoice, current.answer);
    recordAnswer(current.question, isCorrect, currentCategory);

    // Save answer history
    userAnswers.push({
      question: current.question,
      romaji: current.romaji,
      correctAnswer: current.answer,
      userAnswer: selectedChoice,
      isCorrect: isCorrect,
    });
    const allButtons = optionsGrid.querySelectorAll(".choice-btn");

    allButtons.forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("cursor-not-allowed");
    });

    if (isCorrect) {
      score++;
      selectedBtn.classList.remove(
        "border-slate-200",
        "bg-white",
        "hover:border-crimson",
      );
      selectedBtn.classList.add('answer-correct');
      selectedBtn.querySelector(".choice-icon").textContent = "✓";
      feedbackBox.className = 'mt-4 feedback feedback-correct';
      feedbackBox.textContent = 'Benar. Jawabanmu tepat.';
    } else {
      selectedBtn.classList.remove(
        "border-slate-200",
        "bg-white",
        "hover:border-crimson",
      );
      selectedBtn.classList.add('answer-incorrect');
      selectedBtn.querySelector(".choice-icon").textContent = "✕";

      // Highlight the correct answer
      allButtons.forEach((btn) => {
        if (isCorrectChoice(btn.dataset.choice, current.answer)) {
          btn.classList.remove("border-slate-200");
          btn.classList.add('answer-correct');
          btn.querySelector(".choice-icon").textContent = "✓";
        }
      });

      feedbackBox.className = 'mt-4 feedback feedback-incorrect';
      feedbackBox.textContent = `Belum tepat. Jawaban yang benar: ${current.answer}.`;
    }

    feedbackBox.classList.remove("hidden");
    updateLiveScore(questions.length);
    progressBar.value = currentIndex + 1;
    setRomajiHintVisible(true);
    nextButton.classList.remove("hidden");
    nextButton.textContent =
      currentIndex + 1 < questions.length
        ? "Soal Berikutnya →"
        : "Lihat Hasil Kuis";
    nextButton.focus();
  }

  // Show summary at the end
  function showSummary() {
    quizCard.classList.add("hidden");
    quizSummary.classList.remove("hidden");
    progressBar.value = questions.length;
    document.querySelector('#summaryHeading').focus();

    const total = questions.length;
    questionNumber.textContent = `Sesi selesai · ${total} soal`;
    updateLiveScore(total);
    finalScoreText.textContent = `${score} / ${total}`;
    const percent = Math.round((score / total) * 100);
    finalScorePercent.textContent = `${percent}%`;

    let msg = "";
    if (percent === 100) {
      msg =
        "Seluruh jawabanmu benar. Coba kategori lain untuk melanjutkan latihan.";
    } else if (percent >= 70) {
      msg =
        "Sebagian besar jawabanmu benar. Tinjau kembali kosakata yang masih keliru.";
    } else if (percent >= 50) {
      msg =
        "Kamu sudah mengenali sebagian kosakata. Baca rekap lalu coba kembali.";
    } else {
      msg =
        "Buka materi kosakata, pelajari beberapa kata, lalu ulangi latihan ini.";
    }
    finalFeedbackMessage.textContent = msg;

    if (quizReviewList) {
      quizReviewList.innerHTML = userAnswers
        .map((ans) => {
          return `
          <div class="rounded-xl border ${ans.isCorrect ? 'answer-correct' : 'answer-incorrect'} p-4 flex gap-4 items-start">
            <div class="mt-1 flex-shrink-0 grid h-6 w-6 place-items-center rounded-full ${ans.isCorrect ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"} font-bold text-xs">
              ${ans.isCorrect ? "✓" : "✕"}
            </div>
            <div>
              <p class="font-bold"><span lang="ja">${escapeHtml(ans.question)}</span> <span class="text-xs font-normal">(${escapeHtml(ans.romaji)})</span></p>
              ${
                !ans.isCorrect
                  ? `<p class="text-sm text-rose-700 mt-1">Jawabanmu: <span class="line-through">${escapeHtml(ans.userAnswer)}</span></p>
                   <p class="text-sm text-emerald-700 mt-1 font-bold">Benar: ${escapeHtml(ans.correctAnswer)}</p>`
                  : `<p class="text-sm text-emerald-700 mt-1">Jawaban: ${escapeHtml(ans.userAnswer)}</p>`
              }
            </div>
          </div>
        `;
        })
        .join("");
    }

    // Setup back to material button
    const matInfo = materialLinks[currentCategory] || materialLinks.campuran;
    backToMaterialBtn.href = matInfo.url;
    backToMaterialBtn.textContent = `Buka ${matInfo.label} →`;
  }

  // Start / Restart Quiz
  function startQuiz(catKey, moveFocus = false) {
    currentCategory = catKey;
    questions = prepareQuestions(catKey);
    currentIndex = 0;
    score = 0;
    userAnswers = [];
    recordVisit('quiz', catKey);

    // Update active tab button
    if (categorySelector) {
      categorySelector.querySelectorAll("[data-category]").forEach((btn) => {
        const isCurrent = btn.dataset.category === catKey;
        btn.setAttribute('aria-pressed', String(isCurrent));
        btn.classList.toggle("bg-crimson", isCurrent);
        btn.classList.toggle("text-white", isCurrent);
        btn.classList.toggle("bg-white", !isCurrent);
        btn.classList.toggle("text-ink", !isCurrent);
        if (isCurrent && categorySelector.scrollWidth > categorySelector.clientWidth) {
          const left = btn.offsetLeft - categorySelector.offsetLeft;
          const right = left + btn.offsetWidth;
          const viewLeft = categorySelector.scrollLeft;
          const viewRight = viewLeft + categorySelector.clientWidth;
          if (left < viewLeft || right > viewRight) {
            categorySelector.scrollTo({
              left: Math.max(0, left - 16),
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            });
          }
        }
      });
    }

    quizSummary.classList.add("hidden");
    quizCard.classList.remove("hidden");

    if (questions.length === 0) {
      nextButton.classList.add('hidden');
      feedbackBox.replaceChildren();
      progressBar.max = 1;
      progressBar.value = 0;
      questionNumber.textContent = 'Belum ada soal';
      updateLiveScore(0);
      questionJapanese.lang = 'id';
      questionJapanese.textContent = "Data belum tersedia";
      questionRomaji.textContent = "";
      if (toggleRomajiHint) toggleRomajiHint.hidden = true;
      setRomajiHintVisible(false);
      optionsGrid.innerHTML =
        "<p class='text-sm text-slate-500'>Soal untuk kategori ini belum tersedia. Pilih kategori lain untuk melanjutkan latihan.</p>";
      if (moveFocus) questionJapanese.focus();
      return;
    }

    renderQuestion(moveFocus);
  }

  // Event Listeners
  toggleRomajiHint?.addEventListener("click", () => {
    if (!questions.length) return;
    setRomajiHintVisible(questionRomaji.hidden);
  });

  document.addEventListener("hongo-furigana-change", applyFurigana);

  nextButton.addEventListener("click", () => {
    if (!answered) return;
    if (currentIndex + 1 < questions.length) {
      currentIndex++;
      renderQuestion(true);
    } else {
      showSummary();
    }
  });

  restartQuizBtn.addEventListener("click", () => {
    startQuiz(currentCategory, true);
  });

  if (categorySelector) {
    categorySelector.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-category]");
      if (!btn) return;
      const cat = btn.dataset.category;
      // Update URL without page reload
      const newUrl = new URL(window.location);
      newUrl.searchParams.set("kategori", cat);
      window.history.replaceState({}, "", newUrl);

      startQuiz(cat, true);
    });
  }

  // Initial Launch
  startQuiz(currentCategory);
})();
