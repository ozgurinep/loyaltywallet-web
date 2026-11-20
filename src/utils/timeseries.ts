import type { Transaction } from '../interfaces/Transaction';
import type { Customer } from '../interfaces/Customer';
import type { SegmentName } from '../interfaces/Rfm';
import { computeRfm } from './rfm';

export interface MonthlyAggregate {
  month: string; // "YYYY-MM"
  monthLabel: string; // e.g. "Kas 2026"
  revenue: number;
  transactionCount: number;
  activeCustomers: number;
  movingAverage3M: number | null;
  categoryRevenue: Record<string, number>; // categoryId -> revenue
}

export interface SegmentTimePoint {
  month: string;
  monthLabel: string;
  Champions: number;
  Loyal: number;
  Potential: number;
  NeedAttention: number;
  AtRisk: number;
  Lost: number;
  total: number;
}

const MONTH_NAMES_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

export function formatMonthLabel(yyyyMm: string): string {
  const [yearStr, monthStr] = yyyyMm.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const name = MONTH_NAMES_TR[monthIdx] || monthStr;
  return `${name} ${yearStr}`;
}

/**
 * Groups transactions by month (YYYY-MM), sorted in chronological order.
 */
export function aggregateMonthly(transactions: Transaction[]): MonthlyAggregate[] {
  if (transactions.length === 0) return [];

  // Group by YYYY-MM
  const groups = new Map<
    string,
    {
      revenue: number;
      txCount: number;
      customers: Set<string>;
      categoryRevenue: Record<string, number>;
    }
  >();

  for (const t of transactions) {
    const month = t.date.slice(0, 7); // "YYYY-MM"
    let g = groups.get(month);
    if (!g) {
      g = {
        revenue: 0,
        txCount: 0,
        customers: new Set<string>(),
        categoryRevenue: {},
      };
      groups.set(month, g);
    }

    g.revenue += t.amount;
    g.txCount += 1;
    g.customers.add(t.customerId);
    g.categoryRevenue[t.categoryId] =
      (g.categoryRevenue[t.categoryId] || 0) + t.amount;
  }

  // Sort chronologically
  const sortedMonths = Array.from(groups.keys()).sort();

  // First pass: build base list
  const baseList = sortedMonths.map((month) => {
    const g = groups.get(month)!;
    // Round category revenues
    const roundedCatRev: Record<string, number> = {};
    for (const [catId, amt] of Object.entries(g.categoryRevenue)) {
      roundedCatRev[catId] = Math.round(amt * 100) / 100;
    }

    return {
      month,
      monthLabel: formatMonthLabel(month),
      revenue: Math.round(g.revenue * 100) / 100,
      transactionCount: g.txCount,
      activeCustomers: g.customers.size,
      movingAverage3M: null as number | null,
      categoryRevenue: roundedCatRev,
    };
  });

  // Calculate moving average (window = 3)
  return calculateMovingAverage(baseList, 3);
}

/**
 * Calculates moving average on a series of MonthlyAggregate items.
 * If index < window - 1, returns null.
 */
export function calculateMovingAverage(
  series: MonthlyAggregate[],
  window = 3,
): MonthlyAggregate[] {
  return series.map((item, idx) => {
    if (idx < window - 1) {
      return { ...item, movingAverage3M: null };
    }
    let sum = 0;
    for (let i = idx - window + 1; i <= idx; i++) {
      sum += series[i].revenue;
    }
    const avg = Math.round((sum / window) * 100) / 100;
    return { ...item, movingAverage3M: avg };
  });
}

/**
 * Computes segment counts over time by taking each month's end date as a reference
 * point, computing RFM using transactions up to that date.
 */
export function segmentCountsOverTime(
  customers: Customer[],
  transactions: Transaction[],
): SegmentTimePoint[] {
  if (customers.length === 0 || transactions.length === 0) return [];

  // Find all distinct months in transactions
  const monthSet = new Set<string>();
  for (const t of transactions) {
    monthSet.add(t.date.slice(0, 7));
  }

  const sortedMonths = Array.from(monthSet).sort();

  return sortedMonths.map((month) => {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);

    // End of this month date: new Date(year, m, 0) gives last day of month m
    const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);
    const endOfMonthIso = `${month}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

    // Filter transactions up to end of this month
    const txUpToMonth = transactions.filter((t) => t.date <= endOfMonthIso);

    // Compute RFM as of endOfMonth
    const rfmResults = computeRfm(customers, txUpToMonth, {
      referenceDate: endOfMonth,
      windowDays: 365,
    });

    const counts: Record<SegmentName, number> = {
      Champions: 0,
      Loyal: 0,
      Potential: 0,
      NeedAttention: 0,
      AtRisk: 0,
      Lost: 0,
    };

    for (const r of rfmResults) {
      if (counts[r.segment] !== undefined) {
        counts[r.segment] += 1;
      }
    }

    return {
      month,
      monthLabel: formatMonthLabel(month),
      Champions: counts.Champions,
      Loyal: counts.Loyal,
      Potential: counts.Potential,
      NeedAttention: counts.NeedAttention,
      AtRisk: counts.AtRisk,
      Lost: counts.Lost,
      total: rfmResults.length,
    };
  });
}
