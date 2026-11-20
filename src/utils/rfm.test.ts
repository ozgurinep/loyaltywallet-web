import { describe, it, expect } from 'vitest';
import {
  computeRfm,
  computePercentileScores,
  assignSegment,
} from './rfm';
import type { Customer } from '../interfaces/Customer';
import type { Transaction } from '../interfaces/Transaction';

describe('RFM Algorithm & Scoring', () => {
  describe('computePercentileScores', () => {
    it('handles empty and single element edge cases', () => {
      expect(computePercentileScores([])).toEqual([]);
      expect(computePercentileScores([100])).toEqual([5]);
    });

    it('assigns identical scores to tied values', () => {
      // Ties should receive identical percentile scores
      const values = [10, 10, 10, 10];
      const scores = computePercentileScores(values);
      expect(scores[0]).toBe(scores[1]);
      expect(scores[1]).toBe(scores[2]);
      expect(scores[2]).toBe(scores[3]);
    });

    it('ranks distinct ascending values correctly between 1 and 5', () => {
      const values = [10, 20, 30, 40, 50];
      const scores = computePercentileScores(values);
      expect(scores).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('assignSegment Rules', () => {
    it('assigns Champions for r >= 4 and f >= 4', () => {
      expect(assignSegment(4, 4)).toBe('Champions');
      expect(assignSegment(5, 5)).toBe('Champions');
      expect(assignSegment(5, 4)).toBe('Champions');
    });

    it('assigns Loyal for r >= 3 and f >= 3 (except Champions)', () => {
      expect(assignSegment(3, 3)).toBe('Loyal');
      expect(assignSegment(3, 4)).toBe('Loyal');
      expect(assignSegment(4, 3)).toBe('Loyal');
    });

    it('assigns Potential for r >= 4 and f <= 2', () => {
      expect(assignSegment(4, 1)).toBe('Potential');
      expect(assignSegment(5, 2)).toBe('Potential');
    });

    it('assigns NeedAttention for r = 3 and f <= 2', () => {
      expect(assignSegment(3, 1)).toBe('NeedAttention');
      expect(assignSegment(3, 2)).toBe('NeedAttention');
    });

    it('assigns AtRisk for r <= 2 and f >= 3', () => {
      expect(assignSegment(2, 3)).toBe('AtRisk');
      expect(assignSegment(1, 5)).toBe('AtRisk');
    });

    it('assigns Lost for r <= 2 and f <= 2', () => {
      expect(assignSegment(2, 2)).toBe('Lost');
      expect(assignSegment(1, 1)).toBe('Lost');
    });

    it('ensures every (R, F) combination maps to a valid segment', () => {
      const segments = new Set<string>();
      const validScores: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
      for (const r of validScores) {
        for (const f of validScores) {
          const seg = assignSegment(r, f);
          expect(seg).toBeDefined();
          segments.add(seg);
        }
      }
      expect(segments.size).toBe(6);
    });
  });

  describe('computeRfm end-to-end', () => {
    const mockCustomers: Customer[] = [
      { id: 'c1', fullName: 'Şampiyon Can', email: 'c1@test.com', joinedAt: '2026-01-01' },
      { id: 'c2', fullName: 'Sadık Berk', email: 'c2@test.com', joinedAt: '2026-01-01' },
      { id: 'c3', fullName: 'Kayıp Deniz', email: 'c3@test.com', joinedAt: '2026-01-01' },
    ];

    const refDate = new Date('2026-11-01');

    const mockTransactions: Transaction[] = [
      // c1: Very recent (yesterday) and many transactions (10 tx)
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `t1_${i}`,
        customerId: 'c1',
        categoryId: 'cat1',
        date: '2026-10-31',
        amount: 100,
      })),
      // c2: Moderately recent (20 days ago) and 4 tx
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `t2_${i}`,
        customerId: 'c2',
        categoryId: 'cat1',
        date: '2026-10-10',
        amount: 50,
      })),
      // c3: Long time ago (300 days ago) and 1 tx
      {
        id: 't3_1',
        customerId: 'c3',
        categoryId: 'cat1',
        date: '2026-01-05',
        amount: 20,
      },
    ];

    it('calculates recency inversion properly (lower days = higher rScore)', () => {
      const results = computeRfm(mockCustomers, mockTransactions, { referenceDate: refDate });
      const c1 = results.find((r) => r.customerId === 'c1');
      const c3 = results.find((r) => r.customerId === 'c3');

      expect(c1).toBeDefined();
      expect(c3).toBeDefined();
      expect(c1!.recencyDays).toBeLessThan(c3!.recencyDays);
      expect(c1!.rScore).toBeGreaterThan(c3!.rScore);
    });

    it('correctly segments customers based on their archetypes', () => {
      const results = computeRfm(mockCustomers, mockTransactions, { referenceDate: refDate });
      const c1 = results.find((r) => r.customerId === 'c1');
      const c3 = results.find((r) => r.customerId === 'c3');

      expect(c1?.segment).toBe('Champions');
      expect(c3?.segment).toBe('Lost');
    });

    it('excludes customers without any transactions in window', () => {
      const emptyCust: Customer = {
        id: 'c_empty',
        fullName: 'Boş Müşteri',
        email: 'empty@test.com',
        joinedAt: '2026-01-01',
      };
      const results = computeRfm([...mockCustomers, emptyCust], mockTransactions, { referenceDate: refDate });
      expect(results.find((r) => r.customerId === 'c_empty')).toBeUndefined();
    });
  });
});
