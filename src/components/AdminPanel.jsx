import React, { useState } from 'react';

// আপনার ফোল্ডারের ফাইল অনুযায়ী সঠিক ইম্পোর্ট
import Dashboard from './Dashboard';
import BillingSystem from './BillingSystem';
import ChalanManager from './ChalanManager';
import BillManager from './BillManager';
import FalseBilling from './FalseBilling';
import Reports from './Reports';
import ProductEntry from './ProductEntry';
import StockManagement from './StockManagement';
import FrontEndCustom from './FrontEndCustom'; // PublicPageEdit এর আসল নাম

const AdminPanel = ({ onLogout }) => {
  const [view, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'ড্যাশবোর্ড (Dashboard)' },
    { id: 'product_entry', icon: '📦', label: 'প্রোডাক্ট এন্ট্রি' },
    { id: 'billing', icon: '🛒', label: 'চালান ও বিলিং' },
    { id: 'chalans', icon: '📝', label: 'পেমেন্ট ও চালান' },
    { id: 'bills', icon: '🧾', label: 'বিলের তালিকা (Bills)' },
    { id: 'stock_management', icon: '📈', label: 'স্টক ম্যানেজমেন্ট' },
    { id: 'reports', icon: '📋', label: 'রিপোর্ট (Reports)' },
    { id: 'false_billing', icon: '⚡', label: 'ফলস বিল/চালান' },
    { id: 'frontend_custom', icon: '⚙️', label: 'পাবলিক পেজ এডিট' },
  ];

  const handleMenuClick = (id) => {
    setView(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* ডেস্কটপ সাইডবার */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 h-full text-white shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-orange-500 tracking-tighter">LAMS <span className="text-white">POWER</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Admin Panel</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
          {menuItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setView(item.id)} 
              className={`w-full text-left px-4 py-3.5 rounded-xl font-bold transition-all flex items-center gap-3 ${
                view === item.id 
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          
          {/* লগআউট বাটন */}
          <button 
            onClick={onLogout} 
            className="w-full text-left px-4 py-3.5 rounded-xl font-bold transition-all flex items-center gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 mt-8"
          >
            <span className="text-xl">🚪</span>
            <span>লগআউট</span>
          </button>
        </div>
      </aside>

      {/* মেইন কন্টেন্ট এরিয়া */}
      <main className="flex-1 overflow-y-auto h-full relative">
        
        {/* মোবাইলের জন্য টপবার */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
          <h1 className="text-xl font-black text-orange-500">LAMS <span className="text-white">POWER</span></h1>
          <button onClick={onLogout} className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold">Logout</button>
        </div>

        {/* সিলেক্ট করা কম্পোনেন্টগুলো এখানে লোড হবে */}
        <div className="p-4 md:p-8 pb-28 md:pb-8">
          {view === 'dashboard' && <Dashboard />}
          {view === 'product_entry' && <ProductEntry />}
          {view === 'billing' && <BillingSystem />}
          {view === 'chalans' && <ChalanManager />}
          {view === 'bills' && <BillManager />}
          {view === 'stock_management' && <StockManagement />}
          {view === 'reports' && <Reports />}
          {view === 'false_billing' && <FalseBilling />}
          {view === 'frontend_custom' && <FrontEndCustom />}
        </div>
      </main>

      {/* মোবাইল ফ্লোটিং মেনু (FAB) */}
      <div className="md:hidden">
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {isMobileMenuOpen && (
          <div className="fixed bottom-24 right-6 bg-white p-2 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 min-w-[240px] animate-in slide-in-from-bottom-4 duration-300 border border-slate-100 max-h-[60vh] overflow-y-auto">
            <div className="p-3 border-b border-slate-100 mb-1 sticky top-0 bg-white">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Menu Options</p>
            </div>
            {menuItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
                  view === item.id 
                    ? 'bg-orange-50 text-orange-600' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] z-50 transition-all duration-300 active:scale-90 ${
            isMobileMenuOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          {isMobileMenuOpen ? '✕' : '⋮'}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;