import type { Customer } from '../interfaces/Customer';
import type { Transaction } from '../interfaces/Transaction';
import type { RfmResult, SegmentName } from '../interfaces/Rfm';

export interface RfmOptions {
  referenceDate?: Date;
  windowDays?: number; // default: 365
}

export interface SegmentMeta {
  name: SegmentName;
  labelTr: string;
  description: string;
  color: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
}

export const SEGMENT_METAS: Record<SegmentName, SegmentMeta> = {
  Champions: {
    name: 'Champions',
    labelTr: 'Şampiyonlar',
    description: 'En son ve en sık alışveriş yapan, en değerli müşteriler.',
    color: '#10B981', // emerald-500
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  Loyal: {
    name: 'Loyal',
    labelTr: 'Sadık',
    description: 'Düzenli alışveriş yapan, markaya bağlı müşteri kitlesi.',
    color: '#3B82F6', // blue-500
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  Potential: {
    name: 'Potential',
    labelTr: 'Potansiyel',
    description: 'Son zamanlarda gelmiş ancak henüz işlem sıklığı düşük olanlar.',
    color: '#F59E0B', // amber-500
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  NeedAttention: {
    name: 'NeedAttention',
    labelTr: 'İlgi Bekleyen',
    description: 'Orta vadede gelmiş, sıklığı düşük, yeniden kazanım hamlesi bekleyenler.',
    color: '#EC4899', // pink-500
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
  },
  AtRisk: {
    name: 'AtRisk',
    labelTr: 'Risk Altında',
    description: 'Eskiden sık gelen ancak son dönemde alışveriş yapmamış müşteriler.',
    color: '#EF4444', // red-500
    bgLight: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  Lost: {
    name: 'Lost',
    labelTr: 'Kayıp',
    description: 'Uzun süredir gelmeyen ve seyrek işlem yapmış terk edilmiş müşteriler.',
    color: '#6B7280', // gray-500
    bgLight: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
  },
};

/**
 * Clamp helper: keeps a number between min and max
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Assign segment based on R and F scores according to Project Guide Section 6:
 * 1. Champions: r >= 4 and f >= 4
 * 2. Loyal: r >= 3 and f >= 3
 * 3. Potential: r >= 4 and f <= 2
 * 4. NeedAttention: r = 3 and f <= 2
 * 5. AtRisk: r <= 2 and f >= 3
 * 6. Lost: r <= 2 and f <= 2
 */
export function assignSegment(
  r: 1 | 2 | 3 | 4 | 5,
  f: 1 | 2 | 3 | 4 | 5,
): SegmentName {
  if (r >= 4 && f >= 4) return 'Champions';
  if (r >= 3 && f >= 3) return 'Loyal';
  if (r >= 4 && f <= 2) return 'Potential';
  if (r === 3 && f <= 2) return 'NeedAttention';
  if (r <= 2 && f >= 3) return 'AtRisk';
  return 'Lost';
}

/**
 * Computes percentile-based 1-5 score for a list of values:
 * Formula: p = (count_strictly_less + 0.5 * count_equal) / n
 * score = clamp(ceil(p * 5), 1, 5)
 */
export function computePercentileScores(values: number[]): (1 | 2 | 3 | 4 | 5)[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [5]; // Single customer receives top rank

  return values.map((val) => {
    let lessCount = 0;
    let equalCount = 0;
    for (let i = 0; i < n; i++) {
      if (values[i] < val) {
        lessCount++;
      } else if (values[i] === val) {
        equalCount++;
      }
    }
    const p = (lessCount + 0.5 * equalCount) / n;
    const score = clamp(Math.ceil(p * 5), 1, 5) as 1 | 2 | 3 | 4 | 5;
    return score;
  });
}

/**
 * Main pure RFM computation function
 */
export function computeRfm(
  customers: Customer[],
  transactions: Transaction[],
  options?: RfmOptions,
): RfmResult[] {
  if (customers.length === 0 || transactions.length === 0) {
    return [];
  }

  // 1. Determine reference date (defaults to latest transaction date + 1 day)
  let refDate: Date;
  if (options?.referenceDate) {
    refDate = new Date(options.referenceDate);
  } else {
    let latestTxTime = 0;
    for (const t of transactions) {
      const time = new Date(t.date).getTime();
      if (time > latestTxTime) latestTxTime = time;
    }
    refDate = new Date(latestTxTime);
    refDate.setDate(refDate.getDate() + 1);
  }

  // 2. Window calculation (default 365 days)
  const windowDays = options?.windowDays ?? 365;
  const windowStartTime = refDate.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const refTime = refDate.getTime();

  // 3. Aggregate customer transactions within window
  interface RawCustMetric {
    customerId: string;
    lastTxTime: number;
    frequency: number;
    monetary: number;
  }

  const customerMap = new Map<string, RawCustMetric>();

  for (const t of transactions) {
    const txTime = new Date(t.date).getTime();
    // Only count transactions within window and before reference date
    if (txTime >= windowStartTime && txTime <= refTime) {
      const existing = customerMap.get(t.customerId);
      if (!existing) {
        customerMap.set(t.customerId, {
          customerId: t.customerId,
          lastTxTime: txTime,
          frequency: 1,
          monetary: t.amount,
        });
      } else {
        existing.frequency += 1;
        existing.monetary += t.amount;
        if (txTime > existing.lastTxTime) {
          existing.lastTxTime = txTime;
        }
      }
    }
  }

  // Customers without transactions within the window are excluded from RFM
  const rawList: {
    customerId: string;
    recencyDays: number;
    frequency: number;
    monetary: number;
  }[] = [];

  const msPerDay = 24 * 60 * 60 * 1000;

  for (const metric of customerMap.values()) {
    const recencyDays = Math.max(
      0,
      Math.floor((refTime - metric.lastTxTime) / msPerDay),
    );
    rawList.push({
      customerId: metric.customerId,
      recencyDays,
      frequency: metric.frequency,
      monetary: Math.round(metric.monetary * 100) / 100,
    });
  }

  if (rawList.length === 0) {
    return [];
  }

  // 4. Compute percentile scores
  // For Frequency and Monetary: higher is better
  const fScores = computePercentileScores(rawList.map((r) => r.frequency));
  const mScores = computePercentileScores(rawList.map((r) => r.monetary));

  // For Recency: lower days is better, so invert: rScore = 6 - score
  const rRawScores = computePercentileScores(rawList.map((r) => r.recencyDays));
  const rScores = rRawScores.map(
    (score) => (6 - score) as 1 | 2 | 3 | 4 | 5,
  );

  // 5. Construct results and assign segments
  return rawList.map((item, idx) => {
    const rScore = rScores[idx];
    const fScore = fScores[idx];
    const mScore = mScores[idx];
    const segment = assignSegment(rScore, fScore);

    return {
      customerId: item.customerId,
      recencyDays: item.recencyDays,
      frequency: item.frequency,
      monetary: item.monetary,
      rScore,
      fScore,
      mScore,
      segment,
    };
  });
}
