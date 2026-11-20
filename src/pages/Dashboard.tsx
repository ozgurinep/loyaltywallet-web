import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoyalty } from '../hooks/useLoyalty';
import { formatCurrency } from '../utils/format';
import { computeRfm, SEGMENT_METAS } from '../utils/rfm';
import type { SegmentName } from '../interfaces/Rfm';
import StatCard from '../components/StatCard';
import SegmentBadge from '../components/SegmentBadge';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

function getActiveCustomerCount(
  transactions: { date: string; customerId: string }[],
): number {
  if (transactions.length === 0) return 0;

  // Anchor to the latest transaction date + 1 day to ensure reproducibility
  let latestTime = 0;
  for (const t of transactions) {
    const time = new Date(t.date).getTime();
    if (time > latestTime) latestTime = time;
  }

  const anchorDate = latestTime > 0 ? latestTime + 24 * 60 * 60 * 1000 : Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const ids = new Set(
    transactions
      .filter((t) => anchorDate - new Date(t.date).getTime() <= thirtyDays)
      .map((t) => t.customerId),
  );
  return ids.size;
}

export default function Dashboard() {
  const { state, loadSeed } = useLoyalty();
  const { customers, transactions } = state;
  const navigate = useNavigate();

  const totalRevenue = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const activeCount = useMemo(
    () => getActiveCustomerCount(transactions),
    [transactions],
  );

  // Compute RFM for Segment Distribution on Dashboard
  const rfmResults = useMemo(() => {
    return computeRfm(customers, transactions);
  }, [customers, transactions]);

  // Segment summary counts
  const segmentStats = useMemo(() => {
    const counts: Record<SegmentName, { count: number; revenue: number }> = {
      Champions: { count: 0, revenue: 0 },
      Loyal: { count: 0, revenue: 0 },
      Potential: { count: 0, revenue: 0 },
      NeedAttention: { count: 0, revenue: 0 },
      AtRisk: { count: 0, revenue: 0 },
      Lost: { count: 0, revenue: 0 },
    };

    for (const r of rfmResults) {
      if (counts[r.segment]) {
        counts[r.segment].count += 1;
        counts[r.segment].revenue += r.monetary;
      }
    }
    return counts;
  }, [rfmResults]);

  // Distribution chart data
  const chartData = useMemo(() => {
    return (Object.keys(SEGMENT_METAS) as SegmentName[]).map((seg) => ({
      name: SEGMENT_METAS[seg].labelTr,
      segmentKey: seg,
      count: segmentStats[seg].count,
      revenue: Math.round(segmentStats[seg].revenue),
      color: SEGMENT_METAS[seg].color,
    }));
  }, [segmentStats]);

  // If no data exists, show Onboarding / Empty state
  if (customers.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-8">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-xs">
          💳
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            LoyaltyWallet Lite'a Hoş Geldiniz
          </h1>
          <p className="mt-3 text-base text-gray-500 max-w-xl mx-auto">
            Müşteri sadakat analizi, yüzdelik dilim (percentile) tabanlı RFM segmentasyonu ve işlem yönetimini hemen deneyimleyin.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-xl mx-auto space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Nasıl başlamak istersiniz?
          </h2>
          <p className="text-xs text-gray-500">
            Gerçekçi dağılıma sahip hazır 300 müşteri ve ~3.900 işlemi tek tıkla yükleyebilir veya sıfırdan müşteri ekleyebilirsiniz.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={loadSeed}
              className="px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-200 cursor-pointer flex items-center justify-center gap-2"
            >
              ✨ Örnek Veri Setini Yükle
            </button>
            <button
              onClick={() => navigate('/customers')}
              className="px-5 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              + Sıfırdan Müşteri Ekle
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto pt-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="font-semibold text-gray-900 text-sm">👥 Müşteri & İşlem CRUD</div>
            <div className="text-xs text-gray-500 mt-1">
              Müşteri profilleri, kategori bazlı işlemler ve çoklu filtreler.
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="font-semibold text-gray-900 text-sm">📊 RFM Segmentasyonu</div>
            <div className="text-xs text-gray-500 mt-1">
              Recency, Frequency, Monetary skorlarıyla 6 otomatik müşteri kümesi.
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="font-semibold text-gray-900 text-sm">📈 Zaman Serisi Trendleri</div>
            <div className="text-xs text-gray-500 mt-1">
              Aylık ciro analizi, hareketli ortalamalar ve segment trendleri.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Genel Bakış</h1>
          <p className="text-sm text-gray-500 mt-1">
            Müşteri sadakat sistemi ve RFM segmentlerinin anlık dağılımı.
          </p>
        </div>
        <button
          onClick={() => navigate('/segments')}
          className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          RFM Detaylarına Git →
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Müşteri"
          value={customers.length}
          subtitle="Kayıtlı portföy"
          icon="👥"
        />
        <StatCard
          title="Toplam İşlem"
          value={transactions.length}
          subtitle="Tüm zamanlar"
          icon="🧾"
        />
        <StatCard
          title="Toplam Gelir"
          value={formatCurrency(totalRevenue)}
          subtitle="Kümülatif ciro"
          icon="💳"
        />
        <StatCard
          title="Aktif Müşteri (30 gün)"
          value={activeCount}
          subtitle="Son 30 günde harcama yapan"
          icon="🔥"
        />
      </div>

      {/* Segment Distribution Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs lg:col-span-1">
          <h2 className="text-base font-semibold text-gray-800 mb-1">
            Segment Dağılımı
          </h2>
          <p className="text-xs text-gray-400 mb-2">Müşteri portföyü yüzdelik dilimi</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Müşteri`, 'Adet']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
            {chartData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}: <strong>{d.count}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Bar Chart: Revenue Contribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs lg:col-span-2">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-base font-semibold text-gray-800">
              Segment Gelir Katkısı (TL)
            </h2>
            <span className="text-xs text-gray-400">Kümülatif Ciro</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Her segmentin kasaya sağladığı toplam getiri
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `₺${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Toplam Gelir']} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Segment Action List */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">
            Segment Özetleri & Hızlı Filtreleme
          </h2>
          <span className="text-xs text-gray-400">Tıklayarak müşterileri listeleyin</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(SEGMENT_METAS) as SegmentName[]).map((seg) => {
            const meta = SEGMENT_METAS[seg];
            const stat = segmentStats[seg];
            const pct = rfmResults.length > 0 ? (stat.count / rfmResults.length) * 100 : 0;

            return (
              <div
                key={seg}
                onClick={() => navigate(`/customers?segment=${seg}`)}
                className="p-3.5 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <SegmentBadge segment={seg} />
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{meta.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{stat.count}</div>
                  <div className="text-xs text-gray-400">{pct.toFixed(0)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
