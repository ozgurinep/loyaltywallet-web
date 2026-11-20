import { generateSeedData } from '../src/utils/seed';
import { computeRfm } from '../src/utils/rfm';
import { aggregateMonthly } from '../src/utils/timeseries';

const { customers, transactions, categories } = generateSeedData();

console.log('=== 1. TEMEL VARLIK SAYILARI ===');
console.log('Müşteri sayısı:', customers.length);
console.log('İşlem sayısı:', transactions.length);
console.log('Kategori sayısı:', categories.length);

console.log('\n=== 2. İLİŞKİSEL BÜTÜNLÜK ===');
const customerIds = new Set(customers.map((c) => c.id));
const categoryIds = new Set(categories.map((c) => c.id));

const orphanTxCustomer = transactions.filter((t) => !customerIds.has(t.customerId));
const orphanTxCategory = transactions.filter((t) => !categoryIds.has(t.categoryId));

console.log('Geçersiz müşteriye bağlı işlem:', orphanTxCustomer.length);
console.log('Geçersiz kategoriye bağlı işlem:', orphanTxCategory.length);

console.log('\n=== 3. RFM TUTARLILIĞI ===');
const rfm = computeRfm(customers, transactions);
console.log('RFM hesaplanan müşteri sayısı:', rfm.length);
console.log('Her RFM kaydı müşteri tablosunda var mı?:', rfm.every((r) => customerIds.has(r.customerId)));

const segmentCounts: Record<string, number> = {};
for (const r of rfm) {
  segmentCounts[r.segment] = (segmentCounts[r.segment] || 0) + 1;
}
console.log('Segment dağılımı:', segmentCounts);

console.log('\n=== 4. FİNANSAL TOPLAM FARKLARI ===');
const monthly = aggregateMonthly(transactions);
const totalTxAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
const totalMonthlyAmount = monthly.reduce((sum, m) => sum + m.revenue, 0);
const totalRfmAmount = rfm.reduce((sum, r) => sum + r.monetary, 0);

console.log('Ham İşlemler Toplamı   :', totalTxAmount.toFixed(2), 'TL');
console.log('Aylık Seriler Toplamı  :', totalMonthlyAmount.toFixed(2), 'TL');
console.log('İşlem vs Aylık Farkı   :', Math.abs(totalTxAmount - totalMonthlyAmount).toFixed(4), 'TL');
console.log('RFM Pencere İçi Toplam :', totalRfmAmount.toFixed(2), 'TL');
console.log('Pencere Dışı Fark      :', (totalTxAmount - totalRfmAmount).toFixed(2), 'TL');

console.log('\n=== 5. TARİH VE AYLIK DAĞILIM ===');
const dateList = transactions.map((t) => t.date).sort();
console.log('En eski işlem tarihi:', dateList[0]);
console.log('En yeni işlem tarihi:', dateList[dateList.length - 1]);
console.log('Toplam ay sayısı    :', monthly.length);
console.log('Aylık döküm:');
for (const m of monthly) {
  console.log(`  ${m.month} -> ${m.transactionCount.toString().padStart(4, ' ')} işlem, ${m.activeCustomers.toString().padStart(3, ' ')} müşteri, ${m.revenue.toFixed(2).padStart(10, ' ')} TL`);
}
