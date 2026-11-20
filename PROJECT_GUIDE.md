# LoyaltyWallet Lite — Proje Rehberi (AI Agent İçin)

> Bu doküman, projeyi geliştirirken AI agent'a yol göstermek için hazırlanmıştır.
> Agent her göreve başlamadan önce bu dosyayı okumalı, kapsam dışına çıkmamalıdır.
> (IDE'nin tanıdığı isimle `CLAUDE.md` veya `AGENTS.md` olarak da kaydedilebilir.)

---

## 1. Proje Özeti

**LoyaltyWallet Lite**, bir müşteri sadakat sisteminin küçültülmüş, tamamen istemci tarafında (frontend-only) çalışan web uygulamasıdır. Mesleki gelişim programının "Web Geliştirme: JavaScript" haftası proje yönergesini karşılamak için geliştirilir.

Uygulama:
- Müşteri ve işlem kayıtlarını yönetir (CRUD)
- İşlemleri kategorilere ayırır, filtreler
- İşlem geçmişinden **yüzdelik dilim (percentile) tabanlı RFM** hesaplayarak müşterileri segmentlere ayırır
- Zaman serisi yöntemleriyle (aylık trend, hareketli ortalama, zaman içinde segment dağılımı) analiz sunar

**Teslim tarihi: 14 Aralık 2026.** Hedef bitiş: 12 Aralık 2026.

### Geliştirici bağlamı
Geliştirici bu alanı daha önce capstone projesinde (RFM + K-Means, churn tahmini) çalışmıştır; alan bilgisi vardır. Bu projede amaç **sade, çalışan, teslim edilebilir** bir uygulama üretmektir. Karmaşık ML'e girilmez.

---

## 2. Zorunlu Yönerge Gereksinimleri (Atlanamaz)

Aşağıdakilerin tamamı karşılanmadan proje tamamlanmış sayılmaz:

- [ ] Modern bir JS kütüphanesi/çerçevesi kullanılmalı → **React (Vite) + TypeScript**
- [ ] Veri saklama için LocalStorage yeterli → **LocalStorage kullanılacak**
- [ ] CSS çözümü: Tailwind CSS, Bootstrap 5 veya saf CSS → **Tailwind CSS**
- [ ] Klasör yapısında `components`, `pages`, `interfaces` bulunmalı
- [ ] **Ekle** işlemi (en az bir adet) → müşteri ekleme, işlem ekleme
- [ ] **Listeleme** işlemi → müşteri listesi, işlem listesi
- [ ] **Güncelleme** işlemi → müşteri düzenleme (işlem düzenleme de eklenir)
- [ ] **Silme** işlemi → müşteri silme (onay modal'ı ile), işlem silme
- [ ] En az 1 adet ekran görüntüsü (README'de)
- [ ] Public GitHub reposu
- [ ] Netlify (veya muadili) ile canlı yayın
- [ ] Teslimde GitHub linki ve canlı link paylaşılacak

---

## 3. Teknoloji Kararları

| Konu | Karar |
|---|---|
| Build aracı | Vite |
| Dil | TypeScript (strict mod açık) |
| UI | React 18+ (fonksiyonel bileşenler, hooks) |
| Yönlendirme | `react-router-dom` |
| Stil | Tailwind CSS (güncel resmi Vite kurulum dokümanını izle) |
| Grafik | `recharts` (tek grafik kütüphanesi, başkası eklenmez) |
| State | React Context + `useReducer` |
| Veri | LocalStorage (`services/storage.ts` üzerinden) |
| Tarih işlemleri | Yerel `Date` + küçük yardımcı fonksiyonlar (ağır tarih kütüphanesi ekleme) |
| Test (opsiyonel) | Vitest — sadece `utils/` için |

### Yasaklar / Sınırlar
- **Backend yazılmayacak.** `server/` klasörü, Express, API çağrısı yok.
- RFM/segmentasyon için hazır ML kütüphanesi **kullanılmayacak**; saf TS fonksiyonları yazılacak.
- Prophet, ARIMA, K-Means, churn tahmini gibi modeller **kapsam dışı**.
- Yukarıdaki tabloda olmayan bağımlılık eklemeden önce gerekçe belirt ve onay iste.
- UI dili **Türkçe**; kod, değişken ve dosya adları **İngilizce**.

---

## 4. Klasör Yapısı

```
loyalty-wallet-lite/
├── public/
│   └── _redirects                # Netlify SPA yönlendirmesi: /*  /index.html  200
├── src/
│   ├── assets/
│   ├── components/               # Ortak bileşenler
│   │   ├── Navbar.tsx
│   │   ├── Modal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── FilterBar.tsx
│   │   ├── StatCard.tsx
│   │   ├── SegmentBadge.tsx
│   │   ├── CustomerForm.tsx
│   │   └── TransactionForm.tsx
│   ├── context/
│   │   └── LoyaltyContext.tsx    # customers, transactions, categories state + actions
│   ├── interfaces/
│   │   ├── Customer.ts
│   │   ├── Transaction.ts
│   │   ├── Category.ts
│   │   └── Rfm.ts
│   ├── pages/
│   │   ├── Dashboard.tsx         # Özet kartlar + segment dağılımı
│   │   ├── Customers.tsx         # CRUD + filtreleme
│   │   ├── Transactions.tsx      # İşlem CRUD + filtreleme
│   │   ├── Segments.tsx          # RFM tablosu ve segment özeti
│   │   └── Trends.tsx            # Zaman serisi grafikleri
│   ├── services/
│   │   └── storage.ts            # LocalStorage okuma/yazma (tek erişim noktası)
│   ├── utils/
│   │   ├── rfm.ts                # Percentile, skor, segment atama
│   │   ├── timeseries.ts         # Aylık toplama, hareketli ortalama, zaman içinde segment
│   │   ├── seed.ts               # Sentetik veri üretici
│   │   └── format.ts             # Tarih / para formatlama
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── docs/
│   └── screenshots/              # README için ekran görüntüleri
├── index.html
├── netlify.toml
├── package.json
├── tsconfig*.json
├── vite.config.ts
└── README.md
```

**Kural:** LocalStorage'a sadece `services/storage.ts` dokunur. Bileşenler ve sayfalar doğrudan `localStorage` kullanmaz. Böylece veri katmanı sonradan API'ye taşınabilir.

---

## 5. Veri Modeli

```ts
// interfaces/Customer.ts
export interface Customer {
  id: string;            // crypto.randomUUID()
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  joinedAt: string;      // ISO tarih (YYYY-MM-DD)
}

// interfaces/Category.ts
export interface Category {
  id: string;
  name: string;          // örn. "Kahve", "Tatlı"
  color: string;         // grafikler için hex
}

// interfaces/Transaction.ts
export interface Transaction {
  id: string;
  customerId: string;
  categoryId: string;
  date: string;          // ISO tarih (YYYY-MM-DD)
  amount: number;        // TL, > 0
}

// interfaces/Rfm.ts
export type SegmentName =
  | 'Champions'
  | 'Loyal'
  | 'Potential'
  | 'NeedAttention'
  | 'AtRisk'
  | 'Lost';

export interface RfmResult {
  customerId: string;
  recencyDays: number;   // Referans tarihe göre son işlemden bu yana gün
  frequency: number;     // Pencere içindeki işlem sayısı
  monetary: number;      // Pencere içindeki toplam harcama
  rScore: 1 | 2 | 3 | 4 | 5;
  fScore: 1 | 2 | 3 | 4 | 5;
  mScore: 1 | 2 | 3 | 4 | 5;
  segment: SegmentName;
}
```

**Önemli:** RFM sonuçları **saklanmaz, hesaplanır.** Müşteri veya işlem değiştiğinde `useMemo` ile yeniden hesaplanır.

**Silme kuralı:** Müşteri silinirse ona ait işlemler de silinir (kullanıcıya onay ekranında bildirilir).

---

## 6. RFM Hesaplama Spesifikasyonu (`utils/rfm.ts`)

Fonksiyonlar saf (pure) olmalı; React'e bağımlı olmamalı.

```ts
computeRfm(
  customers: Customer[],
  transactions: Transaction[],
  options?: { referenceDate?: Date; windowDays?: number }
): RfmResult[]
```

### Adımlar
1. **Referans tarih:** verilmezse `en son işlem tarihi + 1 gün`. (Gerçek "bugün" kullanılmaz; seed verisi eskirse sonuç bozulmasın.)
2. **Pencere:** varsayılan son 365 gün; `windowDays` ile değişir. Sadece pencere içindeki işlemler sayılır.
3. Her müşteri için:
   - `recencyDays` = referans tarih − son işlem tarihi (gün)
   - `frequency` = işlem sayısı
   - `monetary` = toplam tutar
   - İşlemi olmayan müşteriler hesaplamaya **dahil edilmez** (listede "Veri yok" olarak gösterilir).
4. **Yüzdelik skor (1–5):**
   - Her metrik için percentile rank: `p = (kendisinden küçük sayısı + 0.5 × eşit sayısı) / n`
     (eşitlikler ortalama rank ile ele alınır, böylece Frequency'de aynı değerler farklı dilimlere düşmez)
   - `score = clamp(ceil(p × 5), 1, 5)`
   - **Recency ters çevrilir:** gün sayısı ne kadar küçükse skor o kadar yüksek (`rScore = 6 − score`).
5. **Segment ataması** (yukarıdan aşağıya ilk eşleşen kazanır):

| Sıra | Segment | Kural |
|---|---|---|
| 1 | Champions | `r ≥ 4` ve `f ≥ 4` |
| 2 | Loyal | `r ≥ 3` ve `f ≥ 3` |
| 3 | Potential | `r ≥ 4` ve `f ≤ 2` |
| 4 | NeedAttention | `r = 3` ve `f ≤ 2` |
| 5 | AtRisk | `r ≤ 2` ve `f ≥ 3` |
| 6 | Lost | `r ≤ 2` ve `f ≤ 2` |

Monetary skoru segmenti belirlemez; sıralama, "yüksek değerli müşteri" vurgusu ve tablo gösterimi için kullanılır.

UI'da segment adları Türkçe gösterilir: Şampiyonlar, Sadık, Potansiyel, İlgi Bekleyen, Risk Altında, Kayıp.

### Testler (Vitest kuruluysa)
- Eşit değerli müşterilerde skorların tutarlılığı
- Tek müşteri, iki müşteri gibi uç durumlar
- Recency ters çevirmesi
- Her müşteri tam olarak bir segmente düşüyor

---

## 7. Zaman Serisi Spesifikasyonu (`utils/timeseries.ts`)

**Önemli not:** Bu projede "zaman serisi" tahmin modeli anlamına gelmez; zaman bazlı toplama ve trend analizidir.

### Zorunlu
- `aggregateMonthly(transactions)` → ay bazında `{ month, revenue, transactionCount, activeCustomers }`
- `movingAverage(series, window = 3)` → hareketli ortalama (başlangıç aylarında eksik pencere `null`)
- **Trends sayfası:** aylık gelir çizgi grafiği + 3 aylık hareketli ortalama çizgisi, aylık işlem sayısı çubuk grafiği
- **Kategori kırılımı:** aylık gelir, kategoriye göre yığılmış (stacked) çubuk grafik

### Hedef
- `segmentCountsOverTime(customers, transactions)` → her ay sonu için o tarihe kadarki işlemlerle RFM hesaplanır, segment başına müşteri sayısı döner. Çizgi/alan grafiği ile gösterilir.
  (Ay sayısı ≤ 12 ve müşteri sayısı ≤ 500 olduğu için performans sorun olmaz; gerekirse `useMemo`.)

### Olursa güzel (zaman kalırsa)
- Kohort retention tablosu (ilk işlem ayına göre geri dönüş oranı)
- CSV dışa aktarma

---

## 8. Sayfalar ve Davranışlar

### Dashboard
- Kartlar: toplam müşteri, toplam işlem, toplam gelir, aktif müşteri (son 30 gün)
- Segment dağılımı (pasta/donut veya çubuk grafik)

### Customers (CRUD + filtreleme)
- Tablo: ad, e-posta, şehir, kayıt tarihi, segment rozeti, toplam harcama
- **Ekle:** modal içinde form (doğrulama: ad zorunlu, e-posta formatı)
- **Güncelle:** satırdan düzenle (aynı form)
- **Sil:** onay diyaloğu, bağlı işlem sayısını gösterir
- **Filtreler:** metin arama (ad/e-posta), segment, kategori (o kategoride alışveriş yapmış müşteriler), kayıt tarihi aralığı
- Sıralama: ad, toplam harcama, son işlem tarihi

### Transactions
- Tablo: tarih, müşteri, kategori, tutar
- Ekle / düzenle / sil
- Filtreler: kategori, tarih aralığı, müşteri, tutar aralığı

### Segments
- RFM tablosu: müşteri, R/F/M ham değerler, R/F/M skorları, segment
- Segment kartları (kaç müşteri, toplam gelir payı)
- Segmente tıklayınca Customers sayfasına o filtre ile gidilir

### Trends
- Bölüm 7'deki grafikler

### Genel UI
- Responsive (mobilde kullanılabilir)
- Boş durum (empty state) ve yükleniyor mesajları
- "Örnek veriyi yükle / sıfırla" butonu (Navbar veya Dashboard'da)

---

## 9. Seed Veri (`utils/seed.ts`)

Amaç: RFM'in anlamlı segmentler üretmesi için gerçekçi dağılım.

- **Deterministik** üretim: seed'li PRNG (örn. mulberry32), her yüklemede aynı veri çıkar
- ~300 müşteri, son 12 ay, yaklaşık 3.000–5.000 işlem
- 5–6 kategori (örn. Kahve, Tatlı, Yiyecek, Aksesuar, Hediye Kartı)
- Müşterileri **davranış arketiplerine** böl (segmentlerin dolması için):
  - Sık ve yakın zamanda alışveriş yapanlar (Champions)
  - Düzenli ama orta sıklıkta (Loyal)
  - Yeni gelenler, az işlem (Potential)
  - Eskiden aktif, son aylarda sessiz (AtRisk)
  - Uzun süredir hiç gelmeyenler (Lost)
- Tutarlar kategoriye göre farklı aralıklarda; hafif mevsimsellik ekle (trend grafiği ilginç görünsün)
- İlk açılışta LocalStorage boşsa seed otomatik yüklenir

---

## 10. State ve Veri Akışı

- `LoyaltyContext` içinde `customers`, `transactions`, `categories` ve aksiyonlar (`addCustomer`, `updateCustomer`, `deleteCustomer`, `addTransaction`, ...)
- Her state değişiminde `storage.ts` üzerinden LocalStorage'a yazılır
- Türetilmiş veriler (RFM, aylık toplamlar) context'te veya sayfada `useMemo` ile hesaplanır; state'e kopyalanmaz
- LocalStorage anahtar öneki: `lwl:` (örn. `lwl:customers`)
- Bozuk/eksik LocalStorage verisinde uygulama çökmemeli; güvenli varsayılana dönmeli

---

## 11. Kod Kalitesi Kuralları

- TypeScript `strict`; `any` kullanma
- Bileşenler küçük ve tek sorumlu; form mantığı bileşen içinde, hesap mantığı `utils/` içinde
- Hesaplama fonksiyonları saf ve test edilebilir
- Anlamlı isimler; gereksiz yorum yok, ama RFM kuralları ve percentile formülü yorumla açıklanmalı
- Küçük, anlamlı commit'ler (`feat: customer crud`, `feat: rfm scoring` gibi)
- ESLint hatasız; `npm run build` hatasız tamamlanmalı
- Erişilebilirlik temelleri: form etiketleri, buton metinleri, yeterli kontrast

---

## 12. Geliştirme Aşamaları

Her aşama sonunda uygulama **çalışır durumda** olmalı. Bir aşama bitmeden diğerine geçme.

### Aşama 1 — Temel ve CRUD (21–26 Kasım)
1. Vite + React + TS kurulumu, Tailwind kurulumu
2. Klasör yapısı, `interfaces/`, `storage.ts`, `LoyaltyContext`
3. `seed.ts` ve seed yükleme
4. Customers sayfası: ekle / listele / güncelle / sil
5. Transactions sayfası: ekle / listele / güncelle / sil
6. Kategori gösterimi ve temel filtreler
- **Çıkış kriteri:** Yönergedeki CRUD gereksinimi tamamen karşılanıyor.

### Aşama 2 — RFM ve filtreleme (27 Kasım – 3 Aralık)
1. `rfm.ts` + testleri
2. Segments sayfası
3. Customers'a segment rozeti ve segment filtresi
4. Dashboard özet kartları ve segment dağılımı
- **Çıkış kriteri:** Segmentler seed veride mantıklı dağılıyor.

### Aşama 3 — Zaman serisi ve cila (4–9 Aralık)
1. `timeseries.ts`
2. Trends sayfası grafikleri
3. Zaman içinde segment dağılımı
4. Responsive düzenlemeler, boş durumlar, hata durumları
- **Çıkış kriteri:** Tüm sayfalar tutarlı ve kullanılabilir.

### Aşama 4 — Teslim (10–14 Aralık, hedef 12 Aralık)
1. README (bölüm 13), ekran görüntüleri
2. GitHub'a public repo olarak yükleme
3. Netlify deploy (bölüm 14)
4. Canlı linkte tüm akışların elle test edilmesi
5. Teslim formuna GitHub + canlı link

### Kapsam Kuralı (kritik)
Zaman daralırsa **önce "Olursa güzel", sonra "Hedef" maddeleri** kesilir. "Zorunlu" maddeler ve çalışan deploy hiçbir koşulda feda edilmez.

---

## 13. README İçeriği

- Proje adı ve tek paragraf açıklama
- Özellikler listesi
- **Ekran görüntüleri** (en az 1, tercihen Dashboard, Customers, Segments, Trends) — `docs/screenshots/` altından
- Canlı demo linki
- Kullanılan teknolojiler
- Kurulum ve çalıştırma (`npm install`, `npm run dev`, `npm run build`)
- RFM yönteminin kısa açıklaması (percentile skor + segment tablosu)
- Klasör yapısı özeti
- Notlar: veriler LocalStorage'da tutulur, örnek veri sentetiktir

---

## 14. Deploy (Netlify)

- Build komutu: `npm run build`
- Publish dizini: `dist`
- `netlify.toml`:
  ```toml
  [build]
    command = "npm run build"
    publish = "dist"
  ```
- `public/_redirects` içeriği (SPA route'larının 404 vermemesi için):
  ```
  /*    /index.html   200
  ```
- Yayına almadan önce yerelde `npm run build && npm run preview` ile test et
- Canlı linkte: sayfa yenileme, alt sayfaya doğrudan gitme, veri yoksa seed yükleme test edilmeli

---

## 15. Agent İçin Çalışma Talimatları

1. Göreve başlamadan önce bu dosyayı ve mevcut kodu oku.
2. Sadece istenen aşama/görev üzerinde çalış; kapsam dışı özellik ekleme.
3. Belirsizlik varsa varsayım yapıp **hangi varsayımı yaptığını** belirt; büyük mimari karar gerekiyorsa sor.
4. Her görev sonunda kısaca özetle: ne yapıldı, hangi dosyalar değişti, nasıl test edilir.
5. Her aşama sonunda `npm run build` ve lint çalıştır, hata varsa düzelt.
6. Yönergenin zorunlu maddelerini (Bölüm 2) bozacak değişiklik yapma.
7. Geliştirici kısa ve doğrudan yanıt tercih eder; gereksiz açıklama ekleme.


## 16. Teslim Öncesi Kontrol Listesi

- [ ] Müşteri ekleme / listeleme / güncelleme / silme çalışıyor
- [ ] İşlem ekleme / listeleme / güncelleme / silme çalışıyor
- [ ] Kategori ve filtreler çalışıyor
- [ ] RFM skorları ve segmentler doğru hesaplanıyor
- [ ] Trends grafikleri veriyle uyumlu
- [ ] LocalStorage kalıcılığı: sayfa yenilenince veri kaybolmuyor
- [ ] `npm run build` ve lint hatasız
- [ ] README tamam, en az 1 ekran görüntüsü var
- [ ] GitHub reposu public ve güncel
- [ ] Netlify canlı linki çalışıyor, alt sayfa yenilemesi 404 vermiyor
- [ ] Teslim formuna GitHub ve canlı link girildi
