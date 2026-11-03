import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeSrsPayload, RATING } from './srs.service.js';

describe('auto-evaluation SRS intervals', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses 1h, 4h, 24h, then rounded 1.2x intervals', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    let progress = { state: 'new' };
    const expectedIntervals = [1, 4, 24, 29, 35];

    for (const expectedInterval of expectedIntervals) {
      const { progress: nextProgress } = computeSrsPayload(progress, RATING.AUTO_GOOD);
      expect(nextProgress.interval_hours).toBe(expectedInterval);
      expect(Number.isInteger(nextProgress.interval_hours)).toBe(true);

      const dueAt = new Date(nextProgress.review_due_at).getTime();
      expect(dueAt - Date.now()).toBe(expectedInterval * 60 * 60 * 1000);
      progress = nextProgress;
    }
  });

  it('keeps Again at 10 minutes and starts relearning', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const { progress } = computeSrsPayload(
      { state: 'review', repetitions: 4, interval_hours: 35 },
      RATING.AGAIN
    );

    expect(progress.state).toBe('relearning');
    expect(new Date(progress.review_due_at).getTime() - Date.now()).toBe(10 * 60 * 1000);
  });
});
