import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DAILY_NEW_LIMIT,
  resolveDailyNewLimit,
  selectNewWordsForToday,
} from './quota.service.js';

describe('daily new-word limit', () => {
  it('allows zero and clamps limits to the supported range', () => {
    expect(resolveDailyNewLimit(0)).toBe(0);
    expect(resolveDailyNewLimit(101)).toBe(100);
    expect(resolveDailyNewLimit(-1)).toBe(0);
    expect(resolveDailyNewLimit(null)).toBe(DEFAULT_DAILY_NEW_LIMIT);
  });

  it('returns no new words at zero while preserving selectable words for positive limits', () => {
    const words = [{ id: 'one' }, { id: 'two' }];

    expect(selectNewWordsForToday(words, 0)).toEqual([]);
    expect(selectNewWordsForToday(words, 1)).toEqual([{ id: 'one' }]);
  });
});
