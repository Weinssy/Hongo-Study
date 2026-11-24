export const DAY_MS = 86_400_000;
export const MIN_EF = 1.3;
export const DEFAULT_EF = 2.5;

export const SRS_QUALITIES = Object.freeze({
  AGAIN: 1,
  HARD: 3,
  GOOD: 4,
  EASY: 5,
});

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateKey(value) {
  return typeof value === 'string' && DATE_KEY_RE.test(value);
}

export function getLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function diffCalendarDays(fromKey, toKey) {
  const fromMatch = DATE_KEY_RE.exec(String(fromKey || ''));
  const toMatch = DATE_KEY_RE.exec(String(toKey || ''));
  if (!fromMatch || !toMatch) return NaN;
  const fromUtc = Date.UTC(Number(fromMatch[1]), Number(fromMatch[2]) - 1, Number(fromMatch[3]));
  const toUtc = Date.UTC(Number(toMatch[1]), Number(toMatch[2]) - 1, Number(toMatch[3]));
  return Math.round((toUtc - fromUtc) / DAY_MS);
}

export function reviewCard(card, quality, nowMs = Date.now()) {
  const q = Number(quality);
  if (![1, 3, 4, 5].includes(q)) {
    throw new RangeError(`Invalid SRS quality: ${quality}`);
  }

  const prevReps = Number.isInteger(card?.reps) && card.reps >= 0 ? card.reps : 0;
  const prevInterval = Number.isInteger(card?.interval) && card.interval >= 0 ? card.interval : 0;
  const prevEf = typeof card?.ef === 'number' && Number.isFinite(card.ef)
    ? Math.max(MIN_EF, card.ef)
    : DEFAULT_EF;
  const prevLapses = Number.isInteger(card?.lapses) && card.lapses >= 0 ? card.lapses : 0;

  const rawEf = prevEf + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const ef = Math.round(Math.max(MIN_EF, rawEf) * 100) / 100;

  let reps;
  let interval;
  let lapses = prevLapses;

  if (q < 3) {
    reps = 0;
    interval = 1;
    lapses = prevLapses + 1;
  } else {
    reps = prevReps + 1;
    if (prevReps === 0) {
      interval = 1;
    } else if (prevReps === 1) {
      interval = 6;
    } else {
      interval = Math.max(1, Math.round(prevInterval * ef));
    }
  }

  return {
    reps,
    interval,
    ef,
    lapses,
    dueAt: nowMs + interval * DAY_MS,
    lastReviewedAt: nowMs,
  };
}

export function emptyStreak() {
  return { current: 0, best: 0, lastActiveDate: null, todayCount: 0 };
}

export function updateStreak(streak, dateKey = getLocalDateKey()) {
  const base = {
    current: Number.isSafeInteger(streak?.current) && streak.current >= 0 ? streak.current : 0,
    best: Number.isSafeInteger(streak?.best) && streak.best >= 0 ? streak.best : 0,
    lastActiveDate: isValidDateKey(streak?.lastActiveDate) ? streak.lastActiveDate : null,
    todayCount: Number.isSafeInteger(streak?.todayCount) && streak.todayCount >= 0 ? streak.todayCount : 0,
  };

  if (!isValidDateKey(dateKey)) return base;

  if (base.lastActiveDate === dateKey) {
    return {
      ...base,
      current: Math.max(1, base.current),
      best: Math.max(base.best, Math.max(1, base.current)),
      todayCount: base.todayCount + 1,
    };
  }

  if (base.lastActiveDate) {
    const gap = diffCalendarDays(base.lastActiveDate, dateKey);
    if (gap === 1) {
      const nextCurrent = base.current + 1;
      return {
        current: nextCurrent,
        best: Math.max(base.best, nextCurrent),
        lastActiveDate: dateKey,
        todayCount: 1,
      };
    }
    if (gap < 0) {
      return { ...base, todayCount: base.todayCount + 1 };
    }
  }

  return {
    current: 1,
    best: Math.max(base.best, 1),
    lastActiveDate: dateKey,
    todayCount: 1,
  };
}

export function getEffectiveStreak(streak, dateKey = getLocalDateKey()) {
  if (!streak || !isValidDateKey(streak.lastActiveDate)) return 0;
  const gap = diffCalendarDays(streak.lastActiveDate, dateKey);
  if (gap === 0 || gap === 1) return Math.max(0, streak.current || 0);
  return 0;
}

export function countDueCards(srsMap, nowMs = Date.now()) {
  if (!srsMap || typeof srsMap !== 'object') return 0;
  let due = 0;
  for (const card of Object.values(srsMap)) {
    if (card && typeof card.dueAt === 'number' && card.dueAt <= nowMs) due++;
  }
  return due;
}

export function buildSrsQueue(allItems, srsMap, { nowMs = Date.now(), dailyNewLimit = 10, category = 'all' } = {}) {
  const filtered = category === 'all'
    ? allItems
    : allItems.filter((item) => item.categoryKey === category);

  const due = [];
  const unseen = [];
  let masteredCount = 0;

  for (const item of filtered) {
    const card = srsMap?.[item.id];
    if (!card) {
      unseen.push(item);
    } else {
      if (card.reps >= 2) masteredCount++;
      if (card.dueAt <= nowMs) {
        due.push({ item, dueAt: card.dueAt });
      }
    }
  }

  due.sort((a, b) => a.dueAt - b.dueAt);
  const dueItems = due.map((entry) => entry.item);
  const newItems = unseen.slice(0, Math.max(0, dailyNewLimit));

  return {
    queue: [...dueItems, ...newItems],
    dueCount: dueItems.length,
    newCount: newItems.length,
    totalInFilter: filtered.length,
    masteredCount,
  };
}

export function formatIntervalLabel(days) {
  const n = Math.max(1, Math.round(Number(days) || 1));
  if (n < 30) return `${n} hari`;
  if (n < 365) return `${Math.round(n / 30)} bln`;
  return `${Math.round(n / 365)} thn`;
}
