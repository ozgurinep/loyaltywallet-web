import { useState, useMemo } from 'react';
import { useLoyalty } from '../hooks/useLoyalty';
import type { Transaction } from '../interfaces/Transaction';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import TransactionForm from '../components/TransactionForm';
import { formatCurrency, formatDate } from '../utils/format';

type SortField = 'date' | 'amount' | 'customer';
type SortOrder = 'asc' | 'desc';

export default function Transactions() {
  const {
    state,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    loadSeed,
  } = useLoyalty();
  const { transactions, customers, categories } = state;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Delete confirm dialog states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Lookup maps for fast access
  const customerMap = useMemo(() => {
    const map = new Map<string, { fullName: string; email: string }>();
    for (const c of customers) {
      map.set(c.id, { fullName: c.fullName, email: c.email });
    }
    return map;
  }, [customers]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const cat of categories) {
      map.set(cat.id, { name: cat.name, color: cat.color });
    }
    return map;
  }, [categories]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const min = minAmount ? parseFloat(minAmount) : null;
    const max = maxAmount ? parseFloat(maxAmount) : null;

    return transactions.filter((t) => {
      // Category filter
      if (selectedCategoryId && t.categoryId !== selectedCategoryId) return false;

      // Date range filter
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      // Amount range filter
      if (min !== null && t.amount < min) return false;
      if (max !== null && t.amount > max) return false;

      // Search customer name/email or transaction ID
      if (query) {
        const cust = customerMap.get(t.customerId);
        const nameMatch = cust?.fullName.toLowerCase().includes(query);
        const emailMatch = cust?.email.toLowerCase().includes(query);
        const idMatch = t.id.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch && !idMatch) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedCategoryId,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    searchTerm,
    customerMap,
  ]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'customer') {
        const nameA = customerMap.get(a.customerId)?.fullName ?? '';
        const nameB = customerMap.get(b.customerId)?.fullName ?? '';
        comparison = nameA.localeCompare(nameB, 'tr');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredTransactions, sortField, sortOrder, customerMap]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (t: Transaction) => {
    if (editingTransaction) {
      updateTransaction(t);
    } else {
      addTransaction(t);
    }
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const handleOpenDelete = (t: Transaction) => {
    setDeletingTransaction(t);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingTransaction) {
      deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
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

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategoryId('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İşlemler</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toplam {transactions.length} işlem kaydı bulunuyor.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          + Yeni İşlem Ekle
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Müşteri veya ID ile ara..."
              className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Başlangıç"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Bitiş"
            />
          </div>
        </div>

        {/* Amount & Reset row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 text-xs font-medium">Tutar Aralığı:</span>
            <input
              type="number"
              placeholder="Min TL"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                setCurrentPage(1);
              }}
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              placeholder="Maks TL"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                setCurrentPage(1);
              }}
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={resetFilters}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            Filtreleri Sıfırla
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => toggleSort('date')}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Tarih {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => toggleSort('customer')}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Müşteri {sortField === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Tutar {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                    {transactions.length === 0 ? (
                      <div className="space-y-3">
                        <p className="font-medium text-gray-700">Henüz işlem kaydı bulunmuyor.</p>
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
                            + İşlem Ekle
                          </button>
                        </div>
                      </div>
                    ) : (
                      'Kriterlere uygun işlem bulunamadı.'
                    )}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const customer = customerMap.get(tx.customerId);
                  const category = categoryMap.get(tx.categoryId);
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {customer?.fullName || 'Bilinmeyen Müşteri'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {customer?.email || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-gray-800"
                          style={{
                            backgroundColor: category ? `${category.color}20` : '#f3f4f6',
                            color: category?.color || '#374151',
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: category?.color || '#9ca3af' }}
                          />
                          {category?.name || 'Kategorisiz'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 text-sm">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleOpenEdit(tx)}
                          className="text-indigo-600 hover:text-indigo-900 px-2 py-1 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleOpenDelete(tx)}
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
        {sortedTransactions.length > 0 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
            <div className="text-xs text-gray-500">
              Gösterilen: <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> -{' '}
              <span className="font-semibold">
                {Math.min(currentPage * pageSize, sortedTransactions.length)}
              </span>{' '}
              / Toplam <span className="font-semibold">{sortedTransactions.length}</span>
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

      {/* Transaction Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}
      >
        <TransactionForm
          initialData={editingTransaction}
          customers={customers}
          categories={categories}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingTransaction(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingTransaction(null);
        }}
        onConfirm={handleConfirmDelete}
        title="İşlemi Sil"
        message={`Bu işlemi silmek istediğinizden emin misiniz?\nTutar: ${
          deletingTransaction ? formatCurrency(deletingTransaction.amount) : ''
        }`}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        isDestructive={true}
      />
    </div>
  );
}
