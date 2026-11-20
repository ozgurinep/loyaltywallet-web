import { describe, it, expect } from 'vitest';
import {
  aggregateMonthly,
  segmentCountsOverTime,
  formatMonthLabel,
} from './timeseries';
import type { Transaction } from '../interfaces/Transaction';
import type { Customer } from '../interfaces/Customer';

describe('Timeseries Utils', () => {
  it('formats month labels in Turkish', () => {
    expect(formatMonthLabel('2026-01')).toBe('Oca 2026');
    expect(formatMonthLabel('2026-11')).toBe('Kas 2026');
  });

  describe('aggregateMonthly & movingAverage', () => {
    const mockTx: Transaction[] = [
      { id: '1', customerId: 'c1', categoryId: 'cat1', date: '2026-01-10', amount: 100 },
      { id: '2', customerId: 'c2', categoryId: 'cat2', date: '2026-01-20', amount: 200 },
      { id: '3', customerId: 'c1', categoryId: 'cat1', date: '2026-02-05', amount: 300 },
      { id: '4', customerId: 'c1', categoryId: 'cat1', date: '2026-03-15', amount: 400 },
      { id: '5', customerId: 'c3', categoryId: 'cat2', date: '2026-04-10', amount: 500 },
    ];

    it('correctly aggregates monthly totals and unique customers', () => {
      const agg = aggregateMonthly(mockTx);
      expect(agg.length).toBe(4);

      // January
      expect(agg[0].month).toBe('2026-01');
      expect(agg[0].revenue).toBe(300);
      expect(agg[0].transactionCount).toBe(2);
      expect(agg[0].activeCustomers).toBe(2);
      expect(agg[0].categoryRevenue['cat1']).toBe(100);
      expect(agg[0].categoryRevenue['cat2']).toBe(200);

      // February
      expect(agg[1].month).toBe('2026-02');
      expect(agg[1].revenue).toBe(300);
      expect(agg[1].transactionCount).toBe(1);
      expect(agg[1].activeCustomers).toBe(1);
    });

    it('computes 3-month moving average with null for initial 2 months', () => {
      const agg = aggregateMonthly(mockTx);
      // Month 1 (Jan: 300) -> null
      expect(agg[0].movingAverage3M).toBeNull();
      // Month 2 (Feb: 300) -> null
      expect(agg[1].movingAverage3M).toBeNull();
      // Month 3 (Mar: 400) -> avg(300, 300, 400) = 333.33
      expect(agg[2].movingAverage3M).toBe(333.33);
      // Month 4 (Apr: 500) -> avg(300, 400, 500) = 400
      expect(agg[3].movingAverage3M).toBe(400);
    });
  });

  describe('segmentCountsOverTime', () => {
    const mockCustomers: Customer[] = [
      { id: 'c1', fullName: 'User 1', email: 'u1@test.com', joinedAt: '2026-01-01' },
      { id: 'c2', fullName: 'User 2', email: 'u2@test.com', joinedAt: '2026-01-01' },
    ];

    const mockTx: Transaction[] = [
      { id: '1', customerId: 'c1', categoryId: 'cat1', date: '2026-01-15', amount: 100 },
      { id: '2', customerId: 'c2', categoryId: 'cat1', date: '2026-02-15', amount: 150 },
    ];

    it('tracks segments across distinct months', () => {
      const timeline = segmentCountsOverTime(mockCustomers, mockTx);
      expect(timeline.length).toBe(2);
      expect(timeline[0].month).toBe('2026-01');
      expect(timeline[1].month).toBe('2026-02');
      expect(timeline[1].total).toBe(2);
    });
  });
});
