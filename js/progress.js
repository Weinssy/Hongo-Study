import { storage } from './storage.js';
import { updateWrongAnswers, validWrongAnswers } from './study-core.js';

const KEY = 'hongo-progress-v1';
const emptyProgress = () => ({ version: 1, answered: 0, correct: 0, last: null, bestDrills: {} });

function validProgress(value) {
  return value?.version === 1 && Number.isSafeInteger(value.answered) && value.answered >= 0
    && Number.isSafeInteger(value.correct) && value.correct >= 0 && value.correct <= value.answered
    && value.bestDrills && typeof value.bestDrills === 'object' && !Array.isArray(value.bestDrills)
    && Object.values(value.bestDrills).every(best => Number.isSafeInteger(best?.score)
      && Number.isSafeInteger(best?.total) && best.score >= 0 && best.total > 0 && best.score <= best.total);
}

export function getProgress() {
  return storage.read(KEY, emptyProgress(), validProgress);
}

export function getWrongAnswers() {
  return storage.read('hongo_wrong_answers', [], validWrongAnswers);
}

export function recordAnswer(question, correct, category) {
  storage.write('hongo_wrong_answers', updateWrongAnswers(getWrongAnswers(), question, correct));
  const progress = getProgress();
  progress.answered++;
  if (correct) progress.correct++;
  progress.last = { kind: 'quiz', category, at: Date.now() };
  storage.write(KEY, progress);
}

export function recordDrill(key, score, total) {
  const progress = getProgress();
  const previous = progress.bestDrills[key];
  if (!previous || score > previous.score) progress.bestDrills[key] = { score, total };
  progress.last = { kind: 'drill', at: Date.now() };
  storage.write(KEY, progress);
}

export function recordVisit(kind, category) {
  const progress = getProgress();
  progress.last = { kind, category, at: Date.now() };
  storage.write(KEY, progress);
}

export function exportProgress() {
  return { exportedAt: new Date().toISOString(), progress: getProgress(), wrongAnswers: getWrongAnswers() };
}
