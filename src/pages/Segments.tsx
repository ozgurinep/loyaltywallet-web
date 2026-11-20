import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoyalty } from '../hooks/useLoyalty';
import { computeRfm, SEGMENT_METAS } from '../utils/rfm';
import type { SegmentName, RfmResult } from '../interfaces/Rfm';
import SegmentBadge from '../components/SegmentBadge';
import { formatCurrency } from '../utils/format';
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

type SortField = 'customer' | 'recency' | 'frequency' | 'monetary' | 'rScore' | 'fScore' | 'mScore' | 'segment';
type SortOrder = 'asc' | 'desc';

export default function Segments() {
  const { state, loadSeed } = useLoyalty();
  const { customers, transactions } = state;
  const navigate = useNavigate();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('monetary');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Customers lookup map
  const customerMap = useMemo(() => {
    const map = new Map<string, { fullName: string; email: string; city?: string }>();
    for (const c of customers) {
      map.set(c.id, { fullName: c.fullName, email: c.email, city: c.city });
    }
    return map;
  }, [customers]);

  // Pure RFM calculation
  const rfmResults = useMemo(() => {
    return computeRfm(customers, transactions);
  }, [customers, transactions]);

  // Overall totals
  const totalRevenue = useMemo(
    () => rfmResults.reduce((sum, r) => sum + r.monetary, 0),
    [rfmResults],
  );

  // Segment metrics summary
  const segmentStats = useMemo(() => {
    const stats: Record<
      SegmentName,
      { count: number; revenue: number; avgMonetary: number; avgFrequency: number }
    > = {
      Champions: { count: 0, revenue: 0, avgMonetary: 0, avgFrequency: 0 },
      Loyal: { count: 0, revenue: 0, avgMonetary: 0, avgFrequency: 0 },
      Potential: { count: 0, revenue: 0, avgMonetary: 0, avgFrequency: 0 },
      NeedAttention: { count: 0, revenue: 0, avgMonetary: 0, avgFrequency: 0 },
      AtRisk: { count: 0, revenue: 0, avgMonetary: 0, avgFrequency: 0 },
      Lost: { count: 0, revenue: 0, avgMonetary: 0, avgFrequency: 0 },
    };

    for (const r of rfmResults) {
      const s = stats[r.segment];
      if (s) {
        s.count += 1;
        s.revenue += r.monetary;
        s.avgFrequency += r.frequency;
      }
    }

    for (const seg of Object.keys(stats) as SegmentName[]) {
      const s = stats[seg];
      if (s.count > 0) {
        s.avgMonetary = s.revenue / s.count;
        s.avgFrequency = s.avgFrequency / s.count;
      }
    }

    return stats;
  }, [rfmResults]);

  // Filtered RFM list
  const filteredResults = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return rfmResults.filter((r) => {
      if (selectedSegment !== 'all' && r.segment !== selectedSegment) return false;
      if (query) {
        const cust = customerMap.get(r.customerId);
        const nameMatch = cust?.fullName.toLowerCase().includes(query);
        const emailMatch = cust?.email.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [rfmResults, selectedSegment, searchTerm, customerMap]);

  // Sorted RFM list
  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'customer') {
        const nameA = customerMap.get(a.customerId)?.fullName ?? '';
        const nameB = customerMap.get(b.customerId)?.fullName ?? '';
        comparison = nameA.localeCompare(nameB, 'tr');
      } else if (sortField === 'recency') {
        comparison = a.recencyDays - b.recencyDays;
      } else if (sortField === 'frequency') {
        comparison = a.frequency - b.frequency;
      } else if (sortField === 'monetary') {
        comparison = a.monetary - b.monetary;
      } else if (sortField === 'rScore') {
        comparison = a.rScore - b.rScore;
      } else if (sortField === 'fScore') {
        comparison = a.fScore - b.fScore;
      } else if (sortField === 'mScore') {
        comparison = a.mScore - b.mScore;
      } else if (sortField === 'segment') {
        comparison = a.segment.localeCompare(b.segment);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredResults, sortField, sortOrder, customerMap]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedResults.slice(start, start + pageSize);
  }, [sortedResults, currentPage, pageSize]);

  // Toggle sorting
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Chart data
  const chartData = useMemo(() => {
    return (Object.keys(SEGMENT_METAS) as SegmentName[]).map((seg) => ({
      name: SEGMENT_METAS[seg].labelTr,
      segmentKey: seg,
      count: segmentStats[seg].count,
      revenue: Math.round(segmentStats[seg].revenue),
      color: SEGMENT_METAS[seg].color,
    }));
  }, [segmentStats]);

  const handleCardClick = (seg: SegmentName) => {
    // Navigate to customers page with this segment filter
    navigate(`/customers?segment=${seg}`);
  };

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="text-4xl">📊</div>
        <h2 className="text-xl font-bold text-gray-900">RFM Analizi İçin Veri Bekleniyor</h2>
        <p className="text-sm text-gray-500">
          Segmentlerin hesaplanabilmesi için sistemde müşteri ve işlem kayıtlarının bulunması gerekir.
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
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RFM Müşteri Segmentasyonu</h1>
        <p className="text-sm text-gray-500 mt-1">
          Müşteriler son işlem güncelliği (Recency), sıklığı (Frequency) ve parasal değeri (Monetary) üzerinden dilimlenerek 6 temel segmente ayrılmıştır.
        </p>
      </div>

      {/* Segment Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(SEGMENT_METAS) as SegmentName[]).map((seg) => {
          const meta = SEGMENT_METAS[seg];
          const stat = segmentStats[seg];
          const pctRevenue = totalRevenue > 0 ? (stat.revenue / totalRevenue) * 100 : 0;
          const pctCount = rfmResults.length > 0 ? (stat.count / rfmResults.length) * 100 : 0;

          return (
            <div
              key={seg}
              onClick={() => handleCardClick(seg)}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SegmentBadge segment={seg} />
                  <span className="text-xs text-indigo-600 font-medium group-hover:underline">
                    Müşterileri Gör →
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{meta.description}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block">Müşteri Sayısı</span>
                  <span className="text-sm font-bold text-gray-900">
                    {stat.count}{' '}
                    <span className="text-xs font-normal text-gray-400">
                      ({pctCount.toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Ciro Payı</span>
                  <span className="text-sm font-bold text-gray-900">
                    {pctRevenue.toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 pt-1 text-gray-500 flex justify-between">
                  <span>Ort. Harcama:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(stat.avgMonetary)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart: Customer Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <h2 className="text-base font-semibold text-gray-800 mb-1">
            Segment Başına Müşteri Dağılımı
          </h2>
          <p className="text-xs text-gray-400 mb-4">Portföyün segment dağılım yüzdeleri</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} Müşteri`, 'Adet']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {chartData.map((d) => (
              <span key={d.name} className="flex items-center gap-1 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.count})
              </span>
            ))}
          </div>
        </div>

        {/* Bar Chart: Revenue by Segment */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <h2 className="text-base font-semibold text-gray-800 mb-1">
            Segment Bazlı Toplam Gelir (TL)
          </h2>
          <p className="text-xs text-gray-400 mb-4">Her segmentin sağladığı kümülatif ciro</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `₺${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Gelir']}
                />
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

      {/* RFM Customer Details Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Müşteri RFM Detay Tablosu</h2>
            <p className="text-xs text-gray-500">
              Her müşterinin R, F, M ham değerleri ve 1-5 yüzdelik dilim skorları.
            </p>
          </div>

          {/* Filter / Search controls */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Müşteri ara..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={selectedSegment}
              onChange={(e) => {
                setSelectedSegment(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Tüm Segmentler</option>
              {(Object.keys(SEGMENT_METAS) as SegmentName[]).map((seg) => (
                <option key={seg} value={seg}>
                  {SEGMENT_METAS[seg].labelTr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th
                    onClick={() => toggleSort('customer')}
                    className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100"
                  >
                    Müşteri {sortField === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => toggleSort('recency')}
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                    title="Son işlemden bu yana geçen gün sayısı"
                  >
                    Recency (Gün) {sortField === 'recency' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => toggleSort('frequency')}
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                    title="Toplam işlem sayısı"
                  >
                    Frequency {sortField === 'frequency' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => toggleSort('monetary')}
                    className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                    title="Toplam harcama tutarı"
                  >
                    Monetary {sortField === 'monetary' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => toggleSort('rScore')}
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                    title="Recency Skoru (1-5, 5 en iyi)"
                  >
                    R Skoru {sortField === 'rScore' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => toggleSort('fScore')}
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                    title="Frequency Skoru (1-5, 5 en iyi)"
                  >
                    F Skoru {sortField === 'fScore' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => toggleSort('mScore')}
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                    title="Monetary Skoru (1-5, 5 en iyi)"
                  >
                    M Skoru {sortField === 'mScore' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => toggleSort('segment')}
                    className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100"
                  >
                    Segment {sortField === 'segment' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {paginatedResults.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400 text-xs">
                      Kriterlere uygun kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  paginatedResults.map((r: RfmResult) => {
                    const cust = customerMap.get(r.customerId);
                    return (
                      <tr key={r.customerId} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{cust?.fullName}</div>
                          <div className="text-xs text-gray-400">{cust?.email}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700">
                          {r.recencyDays} gün
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center font-medium text-gray-900">
                          {r.frequency}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-900">
                          {formatCurrency(r.monetary)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="inline-block w-6 h-6 leading-6 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700">
                            {r.rScore}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="inline-block w-6 h-6 leading-6 text-xs font-bold rounded-full bg-blue-50 text-blue-700">
                            {r.fScore}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="inline-block w-6 h-6 leading-6 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700">
                            {r.mScore}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <SegmentBadge
                            segment={r.segment}
                            onClick={() => handleCardClick(r.segment)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {sortedResults.length > 0 && (
            <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
              <div className="text-xs text-gray-500">
                Gösterilen: <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> -{' '}
                <span className="font-semibold">
                  {Math.min(currentPage * pageSize, sortedResults.length)}
                </span>{' '}
                / Toplam <span className="font-semibold">{sortedResults.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Önceki
                </button>
                <span className="text-xs text-gray-600 px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
