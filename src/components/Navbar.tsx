import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLoyalty } from '../hooks/useLoyalty';
import ConfirmDialog from './ConfirmDialog';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/customers', label: 'Müşteriler' },
  { to: '/transactions', label: 'İşlemler' },
  { to: '/segments', label: 'Segmentler' },
  { to: '/trends', label: 'Trendler' },
];

export default function Navbar() {
  const { state, loadSeed, clearData } = useLoyalty();
  const hasData = state.customers.length > 0;
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  return (
    <>
      <nav className="bg-indigo-700 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">
                💳 LoyaltyWallet
              </span>
              <span className="text-xs bg-indigo-500/50 text-indigo-100 px-2 py-0.5 rounded-full font-medium">
                Lite
              </span>
            </div>

            {/* Links */}
            <div className="hidden md:flex space-x-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-900 text-white'
                        : 'text-indigo-100 hover:bg-indigo-600'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </div>

            {/* Seed & Data Actions */}
            <div className="flex items-center gap-2">
              {hasData ? (
                <>
                  <button
                    onClick={loadSeed}
                    title="Örnek veriyi sıfırdan yeniden yükler"
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors cursor-pointer text-indigo-100"
                  >
                    Örnek Veriyi Yenile
                  </button>
                  <button
                    onClick={() => setIsClearConfirmOpen(true)}
                    title="Tüm müşteri ve işlem verilerini siler"
                    className="px-2.5 py-1.5 text-xs bg-indigo-800/80 hover:bg-red-600 rounded-md transition-colors cursor-pointer text-indigo-200 hover:text-white"
                  >
                    Temizle
                  </button>
                </>
              ) : (
                <button
                  onClick={loadSeed}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white rounded-md transition-all shadow-sm flex items-center gap-1 cursor-pointer animate-pulse"
                >
                  ✨ Örnek Veri Yükle
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Clear Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={clearData}
        title="Tüm Verileri Temizle"
        message="Mevcut tüm müşteriler, kategoriler ve işlemler silinecektir. Sistem boş duruma dönecektir. Devam etmek istiyor musunuz?"
        confirmText="Evet, Tümünü Temizle"
        cancelText="Vazgeç"
        isDestructive={true}
      />
    </>
  );
}
