import React, { useState } from 'react';

// আপনার ফোল্ডারের ফাইল অনুযায়ী সঠিক ইম্পোর্ট
import Dashboard from './Dashboard';
import BillingSystem from './BillingSystem';
import ChalanManager from './ChalanManager';
import BillManager from './BillManager';
import NawabpurBilling from './NawabpurBilling';
import FalseBilling from './FalseBilling';
import Reports from './Reports';
import ProductEntry from './ProductEntry';
import StockManagement from './StockManagement';
import FrontEndCustom from './FrontEndCustom';
import SmartUpload from "./SmartUpload";
import ReturnManager from './ReturnManager';
import ServiceManager from "./ServiceManager"; 
import UserManagement from "./UserManagement";
import LabelPrint from './LabelPrint';

const AdminPanel = ({ onLogout, currentUserRole, currentUserName }) => {
  const [view, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState('');

  // রোল অনুযায়ী মেনু ফিল্টারিং
  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'ড্যাশবোর্ড (Dashboard)' },
    { id: 'smart_scan', icon: '📸', label: 'স্মার্ট স্ক্যানার (AI)' },
    {
      id: 'product_section', 
      icon: '📦', 
      label: 'প্রোডাক্ট',
      isDropdown: true,
      subItems: [
        { id: 'product_entry', label: 'প্রোডাক্ট এন্ট্রি' },
        { id: 'stock_management', label: 'স্টক ম্যানেজমেন্ট' },
        { id: 'label_print', label: 'লেবেল প্রিন্ট' },
      ]
    },
    {
      id: 'bill_section', 
      icon: '🧾', 
      label: 'বিল সেকশন',
      isDropdown: true,
      subItems: [
        { id: 'billing', label: 'চালান ও বিলিং (হেড অফিস)' },
        { id: 'nawabpur_billing', label: 'ডিরেক্ট বিলিং (নওয়াবপুর)' },
        { id: 'chalans', label: 'পেমেন্ট ও চালান' },
        { id: 'bills', label: 'বিল ও চালানের তালিকা (Bills & Chalan)' },
        { id: 'false_billing', label: 'ফলস বিল/চালান' },
        { id: 'return_manager', icon: '↩️', label: 'প্রোডাক্ট রিটার্ন (Return)' },
      ]
    },
    { id: 'service_manager', icon: '🛠️', label: 'ইনভার্টার সার্ভিস (Service)' }, 
    { id: 'reports', icon: '📋', label: 'রিপোর্ট (Reports)' },
    
    ...((currentUserRole === 'Admin' || currentUserRole === 'CEO') ? [
      { id: 'frontend_custom', icon: '⚙️', label: 'পাবলিক পেজ এডিট' },
      { id: 'user_management', icon: '👥', label: 'এমপ্লয়ী এক্সেস কন্ট্রোল' }
    ] : [])
  ];

  const handleMenuClick = (item) => {
    if (item.isDropdown) {
      setOpenSubMenu(openSubMenu === item.id ? '' : item.id);
    } else {
      setView(item.id);
      setOpenSubMenu(''); // Close any open dropdown menu when selecting a main menu
      setIsMobileMenuOpen(false);
    }
  };

  const handleSubMenuClick = (subId) => {
    setView(subId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* ডেস্কটপ সাইডবার */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 h-full text-white shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
          <div>
            <h1 className="text-3xl font-black text-orange-500 tracking-tighter">LAMS <span className="text-white">POWER</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ERP Dashboard</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button 
                onClick={() => handleMenuClick(item)} 
                className={`w-full text-left px-4 py-3.5 rounded-xl font-bold transition-all flex items-center justify-between ${
                  (!item.isDropdown && view === item.id) || (item.isDropdown && openSubMenu === item.id)
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.isDropdown && (
                  <span className={`text-xs transition-transform duration-300 ${openSubMenu === item.id ? 'rotate-180' : ''}`}>▼</span>
                )}
              </button>

              {item.isDropdown && openSubMenu === item.id && (
                <div className="ml-10 mt-2 flex flex-col gap-1 border-l-2 border-slate-800 pl-3 animate-in slide-in-from-top-2 duration-200">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => handleSubMenuClick(subItem.id)}
                      className={`text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        view === subItem.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
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
      <main className="flex-1 overflow-y-auto h-full relative flex flex-col">
        
        {/* টপ মেটা বার */}
        <div className="bg-white border-b border-slate-100 p-4 px-6 md:px-8 flex justify-between items-center z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-800 hidden md:block">👋 {currentUserName}</h1>
            <span className="bg-orange-100 text-orange-700 font-black text-[10px] px-3 py-1 rounded-full uppercase">
              {currentUserRole}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onLogout} className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2">
              লগআউট 🚪
            </button>
          </div>
        </div>

        {/* কন্টেন্ট লোড এরিয়া */}
        <div className="p-4 md:p-8 pb-28 md:pb-8 flex-1">
          {view === 'dashboard' && <Dashboard setView={setView} />}
          {view === 'nawabpur_billing' && <NawabpurBilling />}
          {view === 'smart_scan' && <SmartUpload />} 
          {view === 'product_entry' && <ProductEntry />}
          {view === 'billing' && <BillingSystem />}
          {view === 'chalans' && <ChalanManager />}
          {view === 'bills' && <BillManager />}
          {view === 'stock_management' && <StockManagement />}
          {view === 'service_manager' && <ServiceManager />} 
          {view === 'reports' && <Reports />}
          {view === 'false_billing' && <FalseBilling />}
          {view === 'return_manager' && <ReturnManager />}
          {view === 'label_print' && <LabelPrint />}
          {view === 'frontend_custom' && (currentUserRole === 'Admin' || currentUserRole === 'CEO') && <FrontEndCustom />}
          {view === 'user_management' && (currentUserRole === 'Admin' || currentUserRole === 'CEO') && <UserManagement />}
        </div>
      </main>

      {/* মোবাইল ফ্লোটিং মেনু (FAB) */}
      <div className="md:hidden">
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}
        {isMobileMenuOpen && (
          <div className="fixed bottom-24 right-6 bg-white p-2 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 min-w-[260px] animate-in slide-in-from-bottom-4 duration-300 border border-slate-100 max-h-[70vh] overflow-y-auto">
            <div className="p-3 border-b border-slate-100 mb-1 sticky top-0 bg-white">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Menu Options</p>
            </div>
            {menuItems.map((item) => (
              <div key={item.id}>
                <button 
                  onClick={() => handleMenuClick(item)}
                  className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
                    (!item.isDropdown && view === item.id) || (item.isDropdown && openSubMenu === item.id) ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.isDropdown && (
                    <span className={`text-xs text-slate-400 transition-transform duration-300 ${openSubMenu === item.id ? 'rotate-180' : ''}`}>▼</span>
                  )}
                </button>
                {item.isDropdown && openSubMenu === item.id && (
                  <div className="ml-10 mt-1 flex flex-col gap-1 border-l-2 border-slate-100 pl-2 mb-2 animate-in slide-in-from-top-2 duration-200">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => handleSubMenuClick(subItem.id)}
                        className={`text-left px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                          view === subItem.id ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] z-50 transition-all duration-300 active:scale-90 ${isMobileMenuOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
          {isMobileMenuOpen ? '✕' : '⋮'}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;