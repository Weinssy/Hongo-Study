export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createRound(items, count = 10, random = Math.random) {
  return shuffle(items, random).slice(0, Math.min(items.length, Math.max(1, count)));
}

export function isCorrectChoice(value, answer) {
  return value === answer;
}

export function validWrongAnswers(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function updateWrongAnswers(history, question, correct) {
  const next = new Set(validWrongAnswers(history) ? history : []);
  if (correct) next.delete(question);
  else next.add(question);
  return [...next];
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function createConversationState(length) {
  let index = 0;
  let answered = false;
  return {
    get index() { return index; },
    get answered() { return answered; },
    answer(correct) {
      if (answered) return false;
      if (correct) answered = true;
      return true;
    },
    next() {
      if (!answered || index >= length - 1) return false;
      index++;
      answered = false;
      return true;
    },
    reset() { index = 0; answered = false; },
  };
}
