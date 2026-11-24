import { storage } from './storage.js';
import { updateWrongAnswers, validWrongAnswers } from './study-core.js';
import {
  MIN_EF,
  countDueCards,
  emptyStreak,
  getLocalDateKey,
  isValidDateKey,
  reviewCard,
  updateStreak,
} from './srs-core.js';

const KEY = 'hongo-progress-v1';
const WRONG_KEY = 'hongo_wrong_answers';
const SRS_KEY = 'hongo-srs-v1';
const STREAK_KEY = 'hongo-streak-v1';
const MAX_SRS_CARDS = 2000;

const emptyProgress = () => ({ version: 1, answered: 0, correct: 0, last: null, bestDrills: {} });

function validLast(last) {
  if (last === null || last === undefined) return true;
  return typeof last === 'object' && !Array.isArray(last)
    && typeof last.kind === 'string' && last.kind.length <= 40
    && (last.category === undefined || last.category === null || (typeof last.category === 'string' && last.category.length <= 60))
    && (last.at === undefined || (typeof last.at === 'number' && Number.isFinite(last.at)));
}

export function validProgress(value) {
  return Boolean(
    value?.version === 1
    && Number.isSafeInteger(value.answered) && value.answered >= 0
    && Number.isSafeInteger(value.correct) && value.correct >= 0 && value.correct <= value.answered
    && validLast(value.last)
    && value.bestDrills && typeof value.bestDrills === 'object' && !Array.isArray(value.bestDrills)
    && Object.values(value.bestDrills).every(best => Number.isSafeInteger(best?.score)
      && Number.isSafeInteger(best?.total) && best.score >= 0 && best.total > 0 && best.score <= best.total)
  );
}

export function validSrsCard(card) {
  return Boolean(
    card && typeof card === 'object' && !Array.isArray(card)
    && Number.isSafeInteger(card.reps) && card.reps >= 0
    && Number.isSafeInteger(card.interval) && card.interval >= 0
    && typeof card.ef === 'number' && Number.isFinite(card.ef) && card.ef >= MIN_EF && card.ef <= 5
    && (card.lapses === undefined || (Number.isSafeInteger(card.lapses) && card.lapses >= 0))
    && typeof card.dueAt === 'number' && Number.isFinite(card.dueAt)
    && (card.lastReviewedAt === undefined || (typeof card.lastReviewedAt === 'number' && Number.isFinite(card.lastReviewedAt)))
  );
}

export function validSrsMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  if (entries.length > MAX_SRS_CARDS) return false;
  return entries.every(([id, card]) => typeof id === 'string' && id.length > 0 && id.length <= 80 && validSrsCard(card));
}

export function validStreak(value) {
  return Boolean(
    value && typeof value === 'object' && !Array.isArray(value)
    && Number.isSafeInteger(value.current) && value.current >= 0
    && Number.isSafeInteger(value.best) && value.best >= 0 && value.best >= value.current
    && (value.lastActiveDate === null || isValidDateKey(value.lastActiveDate))
    && Number.isSafeInteger(value.todayCount) && value.todayCount >= 0
  );
}

export function getProgress() {
  return storage.read(KEY, emptyProgress(), validProgress);
}

export function getWrongAnswers() {
  return storage.read(WRONG_KEY, [], validWrongAnswers);
}

export function getSrsMap() {
  return storage.read(SRS_KEY, {}, validSrsMap);
}

export function getStreak() {
  return storage.read(STREAK_KEY, emptyStreak(), validStreak);
}

export function getDueSrsCount(nowMs = Date.now()) {
  return countDueCards(getSrsMap(), nowMs);
}

export function touchStreak(nowMs = Date.now()) {
  const next = updateStreak(getStreak(), getLocalDateKey(new Date(nowMs)));
  storage.write(STREAK_KEY, next);
  return next;
}

export function recordAnswer(question, correct, category) {
  storage.write(WRONG_KEY, updateWrongAnswers(getWrongAnswers(), question, correct));
  const progress = getProgress();
  progress.answered++;
  if (correct) progress.correct++;
  progress.last = { kind: 'quiz', category, at: Date.now() };
  storage.write(KEY, progress);
  touchStreak();
}

export function recordDrill(key, score, total) {
  const progress = getProgress();
  const previous = progress.bestDrills[key];
  if (!previous || score > previous.score) progress.bestDrills[key] = { score, total };
  progress.last = { kind: 'drill', at: Date.now() };
  storage.write(KEY, progress);
  touchStreak();
}

export function recordSrsReview(cardId, quality, nowMs = Date.now()) {
  const map = getSrsMap();
  const updated = reviewCard(map[cardId], quality, nowMs);
  map[cardId] = updated;
  storage.write(SRS_KEY, map);
  const progress = getProgress();
  progress.last = { kind: 'flashcard', at: nowMs };
  storage.write(KEY, progress);
  touchStreak(nowMs);
  return updated;
}

export function recordVisit(kind, category) {
  const progress = getProgress();
  progress.last = { kind, category, at: Date.now() };
  storage.write(KEY, progress);
}

export function exportProgress() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    progress: getProgress(),
    wrongAnswers: getWrongAnswers(),
    srs: getSrsMap(),
    streak: getStreak(),
  };
}

export function validateImportedProgress(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'Format file JSON tidak valid.' };
  }
  if (!validProgress(payload.progress)) {
    return { ok: false, error: 'Data ringkasan progres di dalam file tidak valid.' };
  }
  const wrongAnswers = payload.wrongAnswers === undefined ? [] : payload.wrongAnswers;
  if (!validWrongAnswers(wrongAnswers)) {
    return { ok: false, error: 'Daftar kosakata perlu ulang tidak valid.' };
  }
  const srs = payload.srs === undefined ? {} : payload.srs;
  if (!validSrsMap(srs)) {
    return { ok: false, error: 'Data jadwal Flashcard SRS tidak valid.' };
  }
  const streak = payload.streak === undefined ? emptyStreak() : payload.streak;
  if (!validStreak(streak)) {
    return { ok: false, error: 'Data streak harian tidak valid.' };
  }
  return {
    ok: true,
    data: {
      progress: payload.progress,
      wrongAnswers,
      srs,
      streak,
    },
  };
}

export function importProgress(payload) {
  const checked = validateImportedProgress(payload);
  if (!checked.ok) return checked;
  const { progress, wrongAnswers, srs, streak } = checked.data;
  storage.write(KEY, progress);
  storage.write(WRONG_KEY, wrongAnswers);
  storage.write(SRS_KEY, srs);
  storage.write(STREAK_KEY, streak);
  return {
    ok: true,
    summary: {
      answered: progress.answered,
      correct: progress.correct,
      wrongCount: wrongAnswers.length,
      srsCount: Object.keys(srs).length,
      streak: streak.current,
    },
  };
}

export function resetProgress() {
  storage.remove(WRONG_KEY);
  storage.remove(SRS_KEY);
  storage.remove(STREAK_KEY);
  const fresh = emptyProgress();
  storage.write(KEY, fresh);
  return fresh;
}
