import { useState, type FormEvent } from 'react';
import type { Customer } from '../interfaces/Customer';

interface CustomerFormProps {
  initialData?: Customer | null;
  onSubmit: (customer: Customer) => void;
  onCancel: () => void;
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CustomerForm({
  initialData,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const [fullName, setFullName] = useState(initialData?.fullName ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [joinedAt, setJoinedAt] = useState(
    () => initialData?.joinedAt ?? getTodayDateString(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) {
      errs.fullName = 'Ad Soyad alanı zorunludur.';
    }
    if (!email.trim()) {
      errs.email = 'E-posta alanı zorunludur.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Geçerli bir e-posta adresi giriniz.';
    }
    if (!joinedAt) {
      errs.joinedAt = 'Kayıt tarihi zorunludur.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const customer: Customer = {
      id: initialData?.id ?? crypto.randomUUID(),
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      city: city.trim() || undefined,
      joinedAt,
    };

    onSubmit(customer);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ad Soyad <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="örn. Ali Yılmaz"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.fullName ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-posta <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ali.yilmaz@example.com"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05xxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Şehir
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="İstanbul"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kayıt Tarihi <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={joinedAt}
          onChange={(e) => setJoinedAt(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.joinedAt ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.joinedAt && (
          <p className="mt-1 text-xs text-red-500">{errors.joinedAt}</p>
        )}
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
