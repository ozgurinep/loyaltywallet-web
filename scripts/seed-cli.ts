import { generateSeedData } from '../src/utils/seed';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌱 LoyaltyWallet Lite — Seed Veri Üretici Başlatılıyor...');

const seedData = generateSeedData();

const outDir = path.resolve(__dirname, '../src/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'seed.json');
fs.writeFileSync(outPath, JSON.stringify(seedData, null, 2), 'utf-8');

console.log('✅ Seed verisi başarıyla üretildi!');
console.log(`📁 Kayıt Yeri: ${outPath}`);
console.log(`👥 Müşteri Sayısı: ${seedData.customers.length}`);
console.log(`🧾 İşlem Sayısı: ${seedData.transactions.length}`);
console.log(`🏷️ Kategori Sayısı: ${seedData.categories.length}`);
