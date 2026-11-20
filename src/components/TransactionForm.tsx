import { useState, type FormEvent } from 'react';
import type { Transaction } from '../interfaces/Transaction';
import type { Customer } from '../interfaces/Customer';
import type { Category } from '../interfaces/Category';

interface TransactionFormProps {
  initialData?: Transaction | null;
  customers: Customer[];
  categories: Category[];
  onSubmit: (transaction: Transaction) => void;
  onCancel: () => void;
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TransactionForm({
  initialData,
  customers,
  categories,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [customerId, setCustomerId] = useState(
    initialData?.customerId ?? (customers[0]?.id || ''),
  );
  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId ?? (categories[0]?.id || ''),
  );
  const [amount, setAmount] = useState<string>(
    initialData ? String(initialData.amount) : '',
  );
  const [date, setDate] = useState(
    () => initialData?.date ?? getTodayDateString(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!customerId) {
      errs.customerId = 'Lütfen bir müşteri seçiniz.';
    }
    if (!categoryId) {
      errs.categoryId = 'Lütfen bir kategori seçiniz.';
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errs.amount = 'Tutar 0\'dan büyük geçerli bir sayı olmalıdır.';
    }
    if (!date) {
      errs.date = 'İşlem tarihi zorunludur.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const transaction: Transaction = {
      id: initialData?.id ?? crypto.randomUUID(),
      customerId,
      categoryId,
      amount: Math.round(parseFloat(amount) * 100) / 100,
      date,
    };

    onSubmit(transaction);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Müşteri <span className="text-red-500">*</span>
        </label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
            errors.customerId ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="" disabled>
            Müşteri seçin
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName} ({c.email})
            </option>
          ))}
        </select>
        {errors.customerId && (
          <p className="mt-1 text-xs text-red-500">{errors.customerId}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kategori <span className="text-red-500">*</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
            errors.categoryId ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="" disabled>
            Kategori seçin
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-xs text-red-500">{errors.categoryId}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tutar (TL) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            İşlem Tarihi <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.date && (
            <p className="mt-1 text-xs text-red-500">{errors.date}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
        >
          İptal
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
        >
          {initialData ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
