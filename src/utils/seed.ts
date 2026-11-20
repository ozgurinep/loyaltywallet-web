import type { Customer } from '../interfaces/Customer';
import type { Transaction } from '../interfaces/Transaction';
import type { Category } from '../interfaces/Category';

// ---- Deterministic PRNG (mulberry32) ----
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Helpers ----
function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function padDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function uuid(rng: () => number): string {
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      id += '-';
    } else if (i === 14) {
      id += '4';
    } else {
      id += hex[Math.floor(rng() * 16)];
    }
  }
  return id;
}

// ---- Seed Categories ----
const SEED_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Kahve', color: '#6F4E37' },
  { name: 'Tatlı', color: '#E91E63' },
  { name: 'Yiyecek', color: '#FF9800' },
  { name: 'Aksesuar', color: '#2196F3' },
  { name: 'Hediye Kartı', color: '#4CAF50' },
];

// Amount ranges per category index (min, max TL)
const AMOUNT_RANGES: [number, number][] = [
  [15, 65],    // Kahve
  [25, 80],    // Tatlı
  [40, 150],   // Yiyecek
  [50, 300],   // Aksesuar
  [100, 500],  // Hediye Kartı
];

// ---- Name pools ----
const FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Hasan',
  'İbrahim', 'Yusuf', 'Emre', 'Burak', 'Murat', 'Okan',
  'Fatma', 'Ayşe', 'Emine', 'Hatice', 'Zeynep', 'Elif',
  'Merve', 'Esra', 'Selin', 'Deniz', 'Ceren', 'Gizem',
  'Kaan', 'Cem', 'Tolga', 'Serkan', 'Onur', 'Barış',
];

const LAST_NAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız',
  'Öztürk', 'Aydın', 'Arslan', 'Doğan', 'Kılıç', 'Aslan',
  'Çetin', 'Koç', 'Kurt', 'Polat', 'Erdoğan', 'Acar',
  'Güneş', 'Korkmaz', 'Aktaş', 'Tuna', 'Bal', 'Erdem',
];

const CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya',
  'Adana', 'Konya', 'Gaziantep', 'Eskişehir', 'Kayseri',
];

const DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];

// ---- Archetype definitions for realistic RFM segments ----
interface Archetype {
  label: string;
  share: number;           // fraction of total customers
  txCountRange: [number, number]; // how many transactions
  recencyDaysRange: [number, number]; // last tx within these days ago
  startOffsetDays: [number, number]; // joined how many days ago
}

const ARCHETYPES: Archetype[] = [
  {
    label: 'champion',
    share: 0.12,
    txCountRange: [25, 50],
    recencyDaysRange: [0, 15],
    startOffsetDays: [180, 365],
  },
  {
    label: 'loyal',
    share: 0.18,
    txCountRange: [12, 25],
    recencyDaysRange: [5, 45],
    startOffsetDays: [120, 350],
  },
  {
    label: 'potential',
    share: 0.15,
    txCountRange: [2, 6],
    recencyDaysRange: [0, 20],
    startOffsetDays: [10, 60],
  },
  {
    label: 'needAttention',
    share: 0.15,
    txCountRange: [4, 10],
    recencyDaysRange: [30, 90],
    startOffsetDays: [90, 250],
  },
  {
    label: 'atRisk',
    share: 0.20,
    txCountRange: [10, 20],
    recencyDaysRange: [90, 200],
    startOffsetDays: [200, 365],
  },
  {
    label: 'lost',
    share: 0.20,
    txCountRange: [1, 5],
    recencyDaysRange: [200, 350],
    startOffsetDays: [300, 365],
  },
];

// ---- Main generator ----
export function generateSeedData(): {
  customers: Customer[];
  transactions: Transaction[];
  categories: Category[];
} {
  const rng = mulberry32(42);
  const TOTAL_CUSTOMERS = 300;

  // Reference date: anchor to October 31, 2026 (giving 12 complete full months: Nov 2025 - Oct 2026)
  const referenceDate = new Date(2026, 9, 31); // Oct 31, 2026

  // Build categories
  const categories: Category[] = SEED_CATEGORIES.map((c) => ({
    ...c,
    id: uuid(rng),
  }));

  const customers: Customer[] = [];
  const transactions: Transaction[] = [];

  // Assign archetypes
  let remaining = TOTAL_CUSTOMERS;
  const archetypeCounts: number[] = ARCHETYPES.map((a, i) => {
    if (i === ARCHETYPES.length - 1) return remaining;
    const count = Math.round(TOTAL_CUSTOMERS * a.share);
    remaining -= count;
    return count;
  });

  let customerIndex = 0;
  for (let ai = 0; ai < ARCHETYPES.length; ai++) {
    const arch = ARCHETYPES[ai];
    const count = archetypeCounts[ai];

    for (let ci = 0; ci < count; ci++) {
      const cId = uuid(rng);
      const firstName = pick(rng, FIRST_NAMES);
      const lastName = pick(rng, LAST_NAMES);
      const domain = pick(rng, DOMAINS);
      const emailPrefix = `${firstName.toLowerCase().replace(/[İıÖöÜüÇçŞşĞğ]/g, (ch) => {
        const map: Record<string, string> = {
          İ: 'i', ı: 'i', Ö: 'o', ö: 'o', Ü: 'u', ü: 'u',
          Ç: 'c', ç: 'c', Ş: 's', ş: 's', Ğ: 'g', ğ: 'g',
        };
        return map[ch] ?? ch;
      })}.${lastName.toLowerCase().replace(/[İıÖöÜüÇçŞşĞğ]/g, (ch) => {
        const map: Record<string, string> = {
          İ: 'i', ı: 'i', Ö: 'o', ö: 'o', Ü: 'u', ü: 'u',
          Ç: 'c', ç: 'c', Ş: 's', ş: 's', Ğ: 'g', ğ: 'g',
        };
        return map[ch] ?? ch;
      })}${customerIndex}`;

      const joinedDaysAgo = randomInt(
        rng,
        arch.startOffsetDays[0],
        arch.startOffsetDays[1],
      );
      const joinedDate = addDays(referenceDate, -joinedDaysAgo);

      customers.push({
        id: cId,
        fullName: `${firstName} ${lastName}`,
        email: `${emailPrefix}@${domain}`,
        phone: `05${randomInt(rng, 30, 59)}${randomInt(rng, 1000000, 9999999)}`,
        city: pick(rng, CITIES),
        joinedAt: padDate(joinedDate),
      });

      // Generate transactions for this customer
      const txCount = randomInt(rng, arch.txCountRange[0], arch.txCountRange[1]);
      const lastTxDaysAgo = randomInt(
        rng,
        arch.recencyDaysRange[0],
        arch.recencyDaysRange[1],
      );

      for (let ti = 0; ti < txCount; ti++) {
        // Spread transactions between joinedDate and lastTx date
        const earliestDay = joinedDaysAgo;
        const latestDay = lastTxDaysAgo;
        const txDaysAgo =
          ti === 0
            ? lastTxDaysAgo // ensure at least one tx at recency boundary
            : randomInt(rng, latestDay, earliestDay);
        const txDate = addDays(referenceDate, -txDaysAgo);

        // Pick category with slight seasonality (winter months favor Kahve)
        const month = txDate.getMonth();
        let catIdx: number;
        if (month >= 10 || month <= 2) {
          // Nov-Feb: more Kahve/Tatlı
          catIdx = rng() < 0.4 ? 0 : rng() < 0.5 ? 1 : randomInt(rng, 0, categories.length - 1);
        } else {
          catIdx = randomInt(rng, 0, categories.length - 1);
        }

        const [minAmt, maxAmt] = AMOUNT_RANGES[catIdx];
        const amount = Math.round(randomInt(rng, minAmt * 100, maxAmt * 100)) / 100;

        transactions.push({
          id: uuid(rng),
          customerId: cId,
          categoryId: categories[catIdx].id,
          date: padDate(txDate),
          amount,
        });
      }

      customerIndex++;
    }
  }

  return { customers, transactions, categories };
}
