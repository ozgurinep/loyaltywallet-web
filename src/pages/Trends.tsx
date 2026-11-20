import { useMemo, useState } from 'react';
import { useLoyalty } from '../hooks/useLoyalty';
import {
  aggregateMonthly,
  segmentCountsOverTime,
  type MonthlyAggregate,
} from '../utils/timeseries';
import { SEGMENT_METAS } from '../utils/rfm';
import type { SegmentName } from '../interfaces/Rfm';
import { formatCurrency } from '../utils/format';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function Trends() {
  const { state, loadSeed } = useLoyalty();
  const { customers, transactions, categories } = state;

  const [activeTab, setActiveTab] = useState<'revenue' | 'categories' | 'segments' | 'volume'>('revenue');

  // Monthly aggregated series
  const monthlyData = useMemo(() => {
    return aggregateMonthly(transactions);
  }, [transactions]);

  // Segment timeline series
  const segmentTimeline = useMemo(() => {
    return segmentCountsOverTime(customers, transactions);
  }, [customers, transactions]);

  // Overall statistics
  const trendStats = useMemo(() => {
    if (monthlyData.length === 0) return null;

    const totalRev = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const avgMonthlyRev = totalRev / monthlyData.length;
    const peakMonth = [...monthlyData].sort((a, b) => b.revenue - a.revenue)[0];
    const latestMonth = monthlyData[monthlyData.length - 1];
    const prevMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;

    const growthRate =
      prevMonth && prevMonth.revenue > 0
        ? ((latestMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
        : null;

    return {
      totalRev,
      avgMonthlyRev,
      peakMonth,
      latestMonth,
      growthRate,
    };
  }, [monthlyData]);

  // Flattened data for category stacked chart
  const categoryStackedData = useMemo(() => {
    return monthlyData.map((m) => {
      const row: Record<string, string | number> = {
        month: m.month,
        monthLabel: m.monthLabel,
      };
      for (const cat of categories) {
        row[cat.name] = m.categoryRevenue[cat.id] || 0;
      }
      return row;
    });
  }, [monthlyData, categories]);

  // CSV Export helper
  const handleExportCsv = () => {
    if (monthlyData.length === 0) return;

    const headers = [
      'Ay (Kod)',
      'Ay',
      'Toplam Gelir (TL)',
      '3 Aylik Hareketli Ort. (TL)',
      'Islem Sayisi',
      'Aktif Musteri',
      'Ortalama Sepet Tutari (TL)',
    ];

    const rows = monthlyData.map((m) => {
      const avgBasket = m.transactionCount > 0 ? (m.revenue / m.transactionCount).toFixed(2) : '0';
      return [
        m.month,
        m.monthLabel,
        m.revenue.toFixed(2),
        m.movingAverage3M !== null ? m.movingAverage3M.toFixed(2) : '',
        m.transactionCount,
        m.activeCustomers,
        avgBasket,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `loyaltywallet_aylik_trendler_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="text-4xl">📈</div>
        <h2 className="text-xl font-bold text-gray-900">Zaman Serisi İçin Veri Bekleniyor</h2>
        <p className="text-sm text-gray-500">
          Aylık trendleri, hareketli ortalamaları ve segment zaman çizelgesini görebilmek için işlem verisi gereklidir.
        </p>
        <button
          onClick={loadSeed}
          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
        >
          ✨ Örnek Veri Setini Yükle
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zaman Serisi & Trend Analizleri</h1>
          <p className="text-sm text-gray-500 mt-1">
            Aylık ciro performansı, 3 aylık hareketli ortalamalar ve segmentlerin zaman içindeki değişimi.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
        >
          📥 Aylık Verileri CSV Olarak İndir
        </button>
      </div>

      {/* Summary KPI Cards */}
      {trendStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
            <span className="text-xs text-gray-400 font-medium">Ortalama Aylık Ciro</span>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(trendStats.avgMonthlyRev)}
            </div>
            <span className="text-xs text-gray-400 mt-1 block">
              {monthlyData.length} aylık dönem
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
            <span className="text-xs text-gray-400 font-medium">Zirve Ay (En Yüksek Ciro)</span>
            <div className="text-xl font-bold text-emerald-600 mt-1">
              {formatCurrency(trendStats.peakMonth.revenue)}
            </div>
            <span className="text-xs text-gray-500 mt-1 block">
              {trendStats.peakMonth.monthLabel} ({trendStats.peakMonth.transactionCount} işlem)
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
            <span className="text-xs text-gray-400 font-medium">Son Ay Cirosu</span>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(trendStats.latestMonth.revenue)}
            </div>
            <span className="text-xs text-gray-500 mt-1 block">
              {trendStats.latestMonth.monthLabel}
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
            <span className="text-xs text-gray-400 font-medium">Aylık Büyüme (MoM)</span>
            <div
              className={`text-xl font-bold mt-1 ${
                trendStats.growthRate !== null && trendStats.growthRate >= 0
                  ? 'text-emerald-600'
                  : 'text-red-600'
              }`}
            >
              {trendStats.growthRate !== null
                ? `${trendStats.growthRate >= 0 ? '+' : ''}${trendStats.growthRate.toFixed(1)}%`
                : '—'}
            </div>
            <span className="text-xs text-gray-400 mt-1 block">Önceki aya göre değişim</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-4">
        <button
          onClick={() => setActiveTab('revenue')}
          className={`py-2 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'revenue'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📈 Gelir & Hareketli Ortalama
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-2 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🏷️ Kategori Kırılımı
        </button>
        <button
          onClick={() => setActiveTab('segments')}
          className={`py-2 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'segments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          👥 Zaman İçinde Segment Dağılımı
        </button>
        <button
          onClick={() => setActiveTab('volume')}
          className={`py-2 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'volume'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 İşlem & Müşteri Hacmi
        </button>
      </div>

      {/* Tab 1: Monthly Revenue & Moving Average */}
      {activeTab === 'revenue' && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Aylık Gelir ve 3 Aylık Hareketli Ortalama (3M MA)
            </h2>
            <p className="text-xs text-gray-500">
              Aylık toplam ciro ve dalgalanmaları yumuşatarak trendi gösteren 3 aylık hareketli ortalama çizgisi.
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `₺${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val, name) => [
                    val !== null ? formatCurrency(Number(val)) : 'Yetersiz Pencere',
                    name === 'revenue'
                      ? 'Aylık Gelir'
                      : '3 Aylık Hareketli Ortalama',
                  ]}
                />
                <Legend
                  formatter={(val) =>
                    val === 'revenue' ? 'Aylık Gelir (TL)' : '3 Aylık Hareketli Ort. (TL)'
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#4F46E5' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="movingAverage3M"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 2: Category Breakdown (Stacked Bar Chart) */}
      {activeTab === 'categories' && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Kategori Bazlı Aylık Gelir Kırılımı (Yığılmış)
            </h2>
            <p className="text-xs text-gray-500">
              Her ayın cirosunun kategorilere göre dağılımı (Stacked Bar Chart).
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryStackedData}
                margin={{ top: 20, right: 30, left: 15, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `₺${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val, name) => [formatCurrency(Number(val)), String(name)]}
                />
                <Legend />
                {categories.map((cat) => (
                  <Bar
                    key={cat.id}
                    dataKey={cat.name}
                    stackId="catStack"
                    fill={cat.color}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 3: Segment Counts Over Time (Area Chart) */}
      {activeTab === 'segments' && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Zaman İçinde Segment Dağılımı ve Geçişleri
            </h2>
            <p className="text-xs text-gray-500">
              Her ay sonu itibarıyla portföydeki müşterilerin 6 segment arasındaki dağılımı (yığılmış alan grafiği).
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={segmentTimeline}
                margin={{ top: 20, right: 30, left: 15, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name) => [
                    `${val} Müşteri`,
                    SEGMENT_METAS[name as SegmentName]?.labelTr || String(name),
                  ]}
                />
                <Legend
                  formatter={(val) =>
                    SEGMENT_METAS[val as SegmentName]?.labelTr || String(val)
                  }
                />
                {(Object.keys(SEGMENT_METAS) as SegmentName[]).map((seg) => (
                  <Area
                    key={seg}
                    type="monotone"
                    dataKey={seg}
                    stackId="segStack"
                    stroke={SEGMENT_METAS[seg].color}
                    fill={SEGMENT_METAS[seg].color}
                    fillOpacity={0.65}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 4: Transaction & Customer Volume */}
      {activeTab === 'volume' && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Aylık İşlem Sayısı ve Aktif Müşteri Hacmi
            </h2>
            <p className="text-xs text-gray-500">
              Her ay gerçekleştirilen toplam sipariş adedi ve alışveriş yapan tekil müşteri sayısı.
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 15, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend
                  formatter={(val) =>
                    val === 'transactionCount' ? 'İşlem Adedi' : 'Aktif Müşteri Sayısı'
                  }
                />
                <Bar
                  dataKey="transactionCount"
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="activeCustomers"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Aggregate Detailed Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Aylık Özet Tablosu</h2>
          <p className="text-xs text-gray-500">
            Ay bazında gelir, ortalama ve hacim metriklerinin dökümü.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Dönem</th>
                <th className="px-6 py-3 text-right">Aylık Gelir</th>
                <th className="px-6 py-3 text-right">3A Hareketli Ort.</th>
                <th className="px-6 py-3 text-center">İşlem Sayısı</th>
                <th className="px-6 py-3 text-center">Aktif Müşteri</th>
                <th className="px-6 py-3 text-right">Ortalama Sepet</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 text-sm">
              {monthlyData.map((m: MonthlyAggregate) => {
                const avgBasket = m.transactionCount > 0 ? m.revenue / m.transactionCount : 0;
                return (
                  <tr key={m.month} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap font-medium text-gray-900">
                      {m.monthLabel}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-semibold text-gray-900">
                      {formatCurrency(m.revenue)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-gray-600">
                      {m.movingAverage3M !== null
                        ? formatCurrency(m.movingAverage3M)
                        : <span className="text-xs text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center text-gray-700">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100">
                        {m.transactionCount}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center text-gray-700 font-medium">
                      {m.activeCustomers}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-gray-700">
                      {formatCurrency(avgBasket)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
