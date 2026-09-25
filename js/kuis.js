(() => {
  const quizData = window.HONGO_QUIZ_DATA;
  if (!quizData) return;

  // DOM Elements
  const categorySelector = document.querySelector("#categorySelector");
  const quizCard = document.querySelector("#quizCard");
  const quizSummary = document.querySelector("#quizSummary");
  const questionNumber = document.querySelector("#questionNumber");
  const progressBar = document.querySelector("#progressBar");
  const quizCategoryBadge = document.querySelector("#quizCategoryBadge");
  const questionJapanese = document.querySelector("#questionJapanese");
  const questionRomaji = document.querySelector("#questionRomaji");
  const optionsGrid = document.querySelector("#optionsGrid");
  const nextButton = document.querySelector("#nextButton");
  const feedbackBox = document.querySelector("#feedbackBox");

  // Summary Elements
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
    waktu: { url: "kosakata-waktu.html", label: "Materi Waktu" },
    sekolah: { url: "kosakata-sekolah.html", label: "Materi Sekolah" },
    "mata-pelajaran": {
      url: "kosakata-mata-pelajaran.html",
      label: "Materi Mata Pelajaran",
    },
    pekerjaan: { url: "kosakata-pekerjaan.html", label: "Materi Pekerjaan" },
    campuran: { url: "index.html#materi", label: "Semua Materi" },
  };

  // Helper: Shuffle array
  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

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

    // Shuffle and pick 10 items
    const shuffledPool = shuffle(pool);
    const selected = shuffledPool.slice(0, Math.min(10, shuffledPool.length));

    return selected.map((item) => {
      // Find 3 distractors with different answers
      const otherAnswers = pool
        .filter((other) => other.a !== item.a)
        .map((other) => other.a);
      const shuffledOthers = shuffle([...new Set(otherAnswers)]);
      const distractors = shuffledOthers.slice(0, 3);

      const allChoices = shuffle([item.a, ...distractors]);

      return {
        question: item.q,
        romaji: item.r,
        answer: item.a,
        choices: allChoices,
      };
    });
  }

  // Render question at currentIndex
  function renderQuestion() {
    answered = false;
    feedbackBox.classList.add("hidden");
    nextButton.classList.add("hidden");

    const total = questions.length;
    const current = questions[currentIndex];

    // Update Progress & Badges
    questionNumber.textContent = `Soal ${currentIndex + 1} dari ${total}`;
    const percent = (currentIndex / total) * 100;
    progressBar.style.width = `${percent}%`;

    const catBadge =
      currentCategory === "campuran"
        ? "Mode Campuran 🔀"
        : `${quizData[currentCategory]?.badge || ""} ${quizData[currentCategory]?.title || ""}`;
    quizCategoryBadge.textContent = catBadge;

    // Question content
    questionJapanese.textContent = current.question;
    questionRomaji.textContent = current.romaji;

    // Render Choices
    optionsGrid.innerHTML = "";
    current.choices.forEach((choice, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "choice-btn text-left p-4 rounded-xl border-2 border-slate-200 bg-white font-bold text-ink transition hover:border-crimson hover:bg-slate-50 focus:outline-none flex items-center justify-between gap-3";
      btn.innerHTML = `
        <span class="flex items-center gap-3">
          <span class="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">${String.fromCharCode(65 + idx)}</span>
          <span class="text-sm md:text-base">${choice}</span>
        </span>
        <span class="choice-icon text-lg"></span>
      `;

      btn.addEventListener("click", () => handleChoice(choice, btn));
      optionsGrid.appendChild(btn);
    });
  }

  // Handle user answer
  function handleChoice(selectedChoice, selectedBtn) {
    if (answered) return;
    answered = true;

    const current = questions[currentIndex];
    const isCorrect = selectedChoice === current.answer;
    const allButtons = optionsGrid.querySelectorAll(".choice-btn");

    allButtons.forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("cursor-default");
    });

    if (isCorrect) {
      score++;
      selectedBtn.classList.remove(
        "border-slate-200",
        "bg-white",
        "hover:border-crimson",
      );
      selectedBtn.classList.add(
        "border-emerald-500",
        "bg-emerald-50",
        "text-emerald-900",
      );
      selectedBtn.querySelector(".choice-icon").textContent = "✓";
      feedbackBox.className =
        "mt-4 p-3 rounded-xl bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center gap-2";
      feedbackBox.innerHTML = `<span>✓ Benar sekali!</span>`;
    } else {
      selectedBtn.classList.remove(
        "border-slate-200",
        "bg-white",
        "hover:border-crimson",
      );
      selectedBtn.classList.add(
        "border-rose-500",
        "bg-rose-50",
        "text-rose-900",
      );
      selectedBtn.querySelector(".choice-icon").textContent = "✕";

      // Highlight the correct answer
      allButtons.forEach((btn) => {
        if (btn.textContent.includes(current.answer)) {
          btn.classList.remove("border-slate-200");
          btn.classList.add(
            "border-emerald-500",
            "bg-emerald-50",
            "text-emerald-900",
          );
          btn.querySelector(".choice-icon").textContent = "✓";
        }
      });

      feedbackBox.className =
        "mt-4 p-3 rounded-xl bg-rose-100 text-rose-800 text-sm font-bold flex items-center gap-2";
      feedbackBox.innerHTML = `<span>✕ Kurang tepat. Jawaban yang benar adalah: <u>${current.answer}</u></span>`;
    }

    feedbackBox.classList.remove("hidden");
    nextButton.classList.remove("hidden");
    nextButton.textContent =
      currentIndex + 1 < questions.length
        ? "Soal Berikutnya →"
        : "Lihat Hasil Kuis ✨";
    nextButton.focus();
  }

  // Show summary at the end
  function showSummary() {
    quizCard.classList.add("hidden");
    quizSummary.classList.remove("hidden");
    progressBar.style.width = "100%";

    const total = questions.length;
    finalScoreText.textContent = `${score} / ${total}`;
    const percent = Math.round((score / total) * 100);
    finalScorePercent.textContent = `${percent}%`;

    let msg = "";
    if (percent === 100) {
      msg =
        "🎉 Luar Biasa! (完璧 - Kanpeki!) Kamu berhasil menjawab seluruh soal dengan benar!";
    } else if (percent >= 70) {
      msg =
        "👏 Hebat! (よくできました - Yoku dekimashita!) Pemahamanmu terhadap materi ini sudah sangat kuat!";
    } else if (percent >= 50) {
      msg =
        "👍 Bagus! (がんばりました - Gambarimashita!) Kamu sudah cukup paham, ulangi lagi agar semakin mahir!";
    } else {
      msg =
        "💪 Terus Semangat! (あきらめないで - Akiramenaide!) Buka kembali materi kosakata dan coba lagi ya!";
    }
    finalFeedbackMessage.textContent = msg;

    // Setup back to material button
    const matInfo = materialLinks[currentCategory] || materialLinks.campuran;
    backToMaterialBtn.href = matInfo.url;
    backToMaterialBtn.textContent = `Buka ${matInfo.label} →`;
  }

  // Start / Restart Quiz
  function startQuiz(catKey) {
    currentCategory = catKey;
    questions = prepareQuestions(catKey);
    currentIndex = 0;
    score = 0;

    // Update active tab button
    if (categorySelector) {
      categorySelector.querySelectorAll("[data-category]").forEach((btn) => {
        const isCurrent = btn.dataset.category === catKey;
        btn.classList.toggle("bg-crimson", isCurrent);
        btn.classList.toggle("text-white", isCurrent);
        btn.classList.toggle("bg-white", !isCurrent);
        btn.classList.toggle("text-ink", !isCurrent);
      });
    }

    quizSummary.classList.add("hidden");
    quizCard.classList.remove("hidden");

    if (questions.length === 0) {
      questionJapanese.textContent = "Data belum tersedia";
      questionRomaji.textContent = "";
      optionsGrid.innerHTML =
        "<p class='text-sm text-slate-500'>Soal untuk kategori ini belum tersedia.</p>";
      return;
    }

    renderQuestion();
  }

  // Event Listeners
  nextButton.addEventListener("click", () => {
    if (currentIndex + 1 < questions.length) {
      currentIndex++;
      renderQuestion();
    } else {
      showSummary();
    }
  });

  restartQuizBtn.addEventListener("click", () => {
    startQuiz(currentCategory);
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

      startQuiz(cat);
    });
  }

  // Initial Launch
  startQuiz(currentCategory);
})();
