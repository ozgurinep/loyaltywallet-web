import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLoyalty } from '../hooks/useLoyalty';
import type { Customer } from '../interfaces/Customer';
import type { SegmentName } from '../interfaces/Rfm';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomerForm from '../components/CustomerForm';
import SegmentBadge from '../components/SegmentBadge';
import { computeRfm, SEGMENT_METAS } from '../utils/rfm';
import { formatCurrency, formatDate } from '../utils/format';

type SortField = 'fullName' | 'joinedAt' | 'totalSpent' | 'txCount' | 'segment';
type SortOrder = 'asc' | 'desc';

export default function Customers() {
  const { state, addCustomer, updateCustomer, deleteCustomer, loadSeed } = useLoyalty();
  const { customers, transactions, categories } = state;
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('totalSpent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Segment filter is derived directly from URL search params (no redundant effect)
  const paramSeg = searchParams.get('segment');
  const selectedSegment =
    paramSeg && (Object.keys(SEGMENT_METAS) as string[]).includes(paramSeg)
      ? paramSeg
      : paramSeg === 'none'
      ? 'none'
      : 'all';

  const handleSelectSegment = (seg: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (seg === 'all') {
        next.delete('segment');
      } else {
        next.set('segment', seg);
      }
      return next;
    });
    setCurrentPage(1);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Delete confirm dialog states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Calculate RFM mapping: customerId -> RfmResult
  const rfmMap = useMemo(() => {
    const results = computeRfm(customers, transactions);
    const map = new Map<string, (typeof results)[0]>();
    for (const r of results) {
      map.set(r.customerId, r);
    }
    return map;
  }, [customers, transactions]);

  // Pre-calculate per-customer metrics and category sets
  const customerStats = useMemo(() => {
    const stats: Record<
      string,
      { totalSpent: number; txCount: number; categories: Set<string> }
    > = {};
    for (const t of transactions) {
      if (!stats[t.customerId]) {
        stats[t.customerId] = {
          totalSpent: 0,
          txCount: 0,
          categories: new Set<string>(),
        };
      }
      stats[t.customerId].totalSpent += t.amount;
      stats[t.customerId].txCount += 1;
      stats[t.customerId].categories.add(t.categoryId);
    }
    return stats;
  }, [transactions]);

  // Unique cities list for filter dropdown
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      if (c.city) set.add(c.city);
    }
    return Array.from(set).sort();
  }, [customers]);

  // Filter & Search
  const filteredCustomers = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return customers.filter((c) => {
      // Text search
      const matchesSearch =
        !query ||
        c.fullName.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query)) ||
        (c.city && c.city.toLowerCase().includes(query));

      // City filter
      const matchesCity = !selectedCity || c.city === selectedCity;

      // Segment filter
      const custRfm = rfmMap.get(c.id);
      const matchesSegment =
        selectedSegment === 'all' ||
        (selectedSegment === 'none' && !custRfm) ||
        custRfm?.segment === selectedSegment;

      // Category filter (customers who made at least 1 purchase in this category)
      const matchesCategory =
        selectedCategory === 'all' ||
        (customerStats[c.id]?.categories.has(selectedCategory) ?? false);

      return matchesSearch && matchesCity && matchesSegment && matchesCategory;
    });
  }, [
    customers,
    searchTerm,
    selectedCity,
    selectedSegment,
    selectedCategory,
    rfmMap,
    customerStats,
  ]);

  // Sorting
  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'fullName') {
        comparison = a.fullName.localeCompare(b.fullName, 'tr');
      } else if (sortField === 'joinedAt') {
        comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      } else if (sortField === 'totalSpent') {
        const spentA = customerStats[a.id]?.totalSpent ?? 0;
        const spentB = customerStats[b.id]?.totalSpent ?? 0;
        comparison = spentA - spentB;
      } else if (sortField === 'txCount') {
        const countA = customerStats[a.id]?.txCount ?? 0;
        const countB = customerStats[b.id]?.txCount ?? 0;
        comparison = countA - countB;
      } else if (sortField === 'segment') {
        const segA = rfmMap.get(a.id)?.segment ?? '';
        const segB = rfmMap.get(b.id)?.segment ?? '';
        comparison = segA.localeCompare(segB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredCustomers, sortField, sortOrder, customerStats, rfmMap]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCustomers.slice(start, start + pageSize);
  }, [sortedCustomers, currentPage, pageSize]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (customer: Customer) => {
    if (editingCustomer) {
      updateCustomer(customer);
    } else {
      addCustomer(customer);
    }
    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  const handleOpenDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingCustomer) {
      deleteCustomer(deletingCustomer.id);
      setDeletingCustomer(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedCity('');
    setSelectedCategory('all');
    setSearchParams({});
    setCurrentPage(1);
  };

  const deletingTxCount = deletingCustomer
    ? customerStats[deletingCustomer.id]?.txCount ?? 0
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toplam {customers.length} kayıtlı müşteri bulunuyor.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          + Yeni Müşteri Ekle
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Text Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Ad, e-posta veya telefon ile ara..."
              className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>

          {/* Segment Filter */}
          <div>
            <select
              value={selectedSegment}
              onChange={(e) => handleSelectSegment(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Tüm Segmentler</option>
              {(Object.keys(SEGMENT_METAS) as SegmentName[]).map((seg) => (
                <option key={seg} value={seg}>
                  {SEGMENT_METAS[seg].labelTr}
                </option>
              ))}
              <option value="none">Segment Yok (İşlemsiz)</option>
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Tüm Şehirler</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Tüm Kategoriler (Alışveriş Yapanlar)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} Alanlar
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter reset button */}
        {(searchTerm || selectedCity || selectedSegment !== 'all' || selectedCategory !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">
              Filtrelenen: <strong className="text-gray-800">{filteredCustomers.length}</strong> / {customers.length} müşteri
            </span>
            <button
              onClick={resetAllFilters}
              className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => toggleSort('fullName')}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Müşteri {sortField === 'fullName' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => toggleSort('segment')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Segment {sortField === 'segment' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Şehir / Telefon
                </th>
                <th
                  onClick={() => toggleSort('joinedAt')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Kayıt Tarihi {sortField === 'joinedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => toggleSort('txCount')}
                  className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  İşlem {sortField === 'txCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => toggleSort('totalSpent')}
                  className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Toplam Harcama {sortField === 'totalSpent' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                    {customers.length === 0 ? (
                      <div className="space-y-3">
                        <p className="font-medium text-gray-700">Henüz kayıtlı müşteri bulunmuyor.</p>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={loadSeed}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                          >
                            ✨ Örnek Veriyi Yükle
                          </button>
                          <button
                            onClick={handleOpenAdd}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
                          >
                            + Müşteri Ekle
                          </button>
                        </div>
                      </div>
                    ) : (
                      'Arama kriterlerine uygun müşteri bulunamadı.'
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const stats = customerStats[customer.id] || { totalSpent: 0, txCount: 0 };
                  const rfm = rfmMap.get(customer.id);

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{customer.fullName}</div>
                        <div className="text-xs text-gray-500">{customer.email}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {rfm ? (
                          <SegmentBadge
                            segment={rfm.segment}
                            onClick={() => handleSelectSegment(rfm.segment)}
                          />
                        ) : (
                          <span className="text-xs text-gray-400 italic">Veri yok</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-800">{customer.city || '—'}</div>
                        <div className="text-xs text-gray-400">{customer.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(customer.joinedAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {stats.txCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 text-sm">
                        {formatCurrency(stats.totalSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="text-indigo-600 hover:text-indigo-900 px-2 py-1 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleOpenDelete(customer)}
                          className="text-red-600 hover:text-red-900 px-2 py-1 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {sortedCustomers.length > 0 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
            <div className="text-xs text-gray-500">
              Gösterilen: <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> -{' '}
              <span className="font-semibold">
                {Math.min(currentPage * pageSize, sortedCustomers.length)}
              </span>{' '}
              / Toplam <span className="font-semibold">{sortedCustomers.length}</span>
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

      {/* Customer Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
      >
        <CustomerForm
          initialData={editingCustomer}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingCustomer(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingCustomer(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Müşteriyi Sil"
        message={`"${deletingCustomer?.fullName}" isimli müşteriyi silmek istediğinizden emin misiniz?\n\n⚠️ Bu müşteriye ait ${deletingTxCount} adet işlem de kalıcı olarak silinecektir.`}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        isDestructive={true}
      />
    </div>
  );
}
