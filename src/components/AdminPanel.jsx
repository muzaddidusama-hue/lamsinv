import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import emailjs from '@emailjs/browser'; // ✉️ EmailJS লাইব্রেরি যুক্ত করা হলো

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
import ServiceManager from "./ServiceManager"; 
import UserManagement from "./UserManagement";

const AdminPanel = ({ onLogout, currentUserRole, currentUserName }) => {
  const [view, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState('');

  // 🔑 ৩-স্টেপ ওটিপি পাসওয়ার্ড চেঞ্জের স্টেট মডিউল
  const [showPassModal, setShowPassModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [step, setStep] = useState(1); // ১ = পুরাতন পাসওয়ার্ড, ২ = ওটিপি কোড, ৩ = নতুন পাসওয়ার্ড
  const [passLoading, setPassLoading] = useState(false);

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
      ]
    },
{
      id: 'bill_section', 
      icon: '🧾', 
      label: 'বিল সেকশন',
      isDropdown: true,
      subItems: [
        { id: 'billing', label: 'চালান ও বিলিং (হেড অফিস)' }, // নাম আপডেট করতে পারেন
        { id: 'nawabpur_billing', label: 'ডিরেক্ট বিলিং (নওয়াবপুর)' }, // 🔴 এটি যুক্ত করুন
        { id: 'chalans', label: 'পেমেন্ট ও চালান' },
        { id: 'bills', label: 'বিলের তালিকা (Bills)' },
        { id: 'false_billing', label: 'ফলস বিল/চালান' },
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
      setIsMobileMenuOpen(false);
    }
  };

  const handleSubMenuClick = (subId) => {
    setView(subId);
    setIsMobileMenuOpen(false);
  };

  // ✉️ স্টেপ ১: পুরাতন পাসওয়ার্ড চেক করা এবং ইমেইলে ওটিপি পাঠানো
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const activeEmpId = localStorage.getItem('user_emp_id');
    if (!oldPassword.trim()) return alert("দয়া করে বর্তমান পাসওয়ার্ডটি দিন!");

    setPassLoading(true);
    try {
      // ১. ডাটাবেজ থেকে ইউজারের বর্তমান পাসওয়ার্ড এবং ইমেইল তুলে আনা
      const { data: user, error: fetchErr } = await supabase
        .from('users')
        .select('password, email, name')
        .eq('emp_id', activeEmpId)
        .single();

      if (fetchErr) throw fetchErr;

      // ২. ওল্ড পাসওয়ার্ড ভ্যালিডেশন
      if (user.password !== oldPassword.trim()) {
        alert("❌ আপনার বর্তমান (পুরাতন) পাসওয়ার্ডটি ভুল! আবার চেষ্টা করুন।");
        setPassLoading(false);
        return;
      }

      if (!user.email) {
        alert("⚠️ আপনার অ্যাকাউন্টে কোনো ইমেইল যুক্ত করা নেই! এডমিনের সাথে যোগাযোগ করুন।");
        setPassLoading(false);
        return;
      }

      // ৩. ৪ ডিজিটের সিকিউরড র‍্যান্ডম ওটিপি জেনারেশন
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(otp);

      // ৪. আপনার প্রোভাইড করা ক্রেডেনশিয়ালস দিয়ে EmailJS এর মাধ্যমে মেইল পাঠানো
      const templateParams = {
        to_name: user.name,
        to_email: user.email,
        otp_code: otp,
      };

      await emailjs.send(
        'service_ohv3i8b',      // Your Service ID
        'template_qqu787o',     // Your Template ID
        templateParams, 
        'BYD2vaVEFWA15jwUu'     // Your Public Key
      );

      alert(`📩 একটি ওটিপি কোড আপনার রেজিস্টার্ড ইমেইলে (${user.email}) পাঠানো হয়েছে!`);
      setStep(2); // ওটিপি কোড ইনপুট স্ক্রিনে মুভ করা
    } catch (err) {
      alert("ওটিপি পাঠাতে সমস্যা হয়েছে: " + err.message);
    }
    setPassLoading(false);
  };

  // 🔢 স্টেপ ২: ইনপুট করা ওটিপি যাচাই করা
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (inputOtp.trim() === generatedOtp) {
      alert("✅ ওটিপি মিলেছে! এবার আপনার নতুন পাসওয়ার্ডটি দিন।");
      setStep(3); // নতুন পাসওয়ার্ড সেট করার স্ক্রিনে মুভ করা
    } else {
      alert("❌ ভুল ওটিপি কোড! আবার চেষ্টা করুন।");
    }
  };

  // 💾 স্টেপ ৩: নতুন পাসওয়ার্ড ডাটাবেজে ফাইনাল সেভ করা
  const handleFinalPasswordSave = async (e) => {
    e.preventDefault();
    const activeEmpId = localStorage.getItem('user_emp_id');
    
    if (!newPassword.trim()) return alert("দয়া করে নতুন পাসওয়ার্ডটি লিখুন!");
    if (newPassword.trim().length < 6) {
      return alert("নতুন পাসওয়ার্ডটি কমপক্ষে ৬ ডিজিটের হতে হবে!");
    }

    setPassLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('users')
        .update({ password: newPassword.trim() })
        .eq('emp_id', activeEmpId);

      if (updateErr) throw updateErr;

      alert("🎉 আপনার পাসওয়ার্ডটি সফলভাবে পরিবর্তন করা হয়েছে!");
      
      // স্টেট এবং ফর্ম ডাটা রিসেট
      setOldPassword('');
      setNewPassword('');
      setInputOtp('');
      setGeneratedOtp('');
      setStep(1);
      setShowPassModal(false);
    } catch (err) {
      alert("পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে: " + err.message);
    }
    setPassLoading(false);
  };

  // মডাল ক্লোজ ও রিসেট হেল্পার
  const closePassModal = () => {
    setShowPassModal(false);
    setOldPassword('');
    setNewPassword('');
    setInputOtp('');
    setGeneratedOtp('');
    setStep(1);
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
            <button 
              onClick={() => setShowPassModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1"
            >
              🔒 পাসওয়ার্ড পরিবর্তন
            </button>
            <button onClick={onLogout} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-black transition-all hidden md:block">
              লগআউট 🚪
            </button>
          </div>
        </div>

        {/* কন্টেন্ট লোড এরিয়া */}
        <div className="p-4 md:p-8 pb-28 md:pb-8 flex-1">
          {view === 'dashboard' && <Dashboard />}
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
          {view === 'frontend_custom' && (currentUserRole === 'Admin' || currentUserRole === 'CEO') && <FrontEndCustom />}
          {view === 'user_management' && (currentUserRole === 'Admin' || currentUserRole === 'CEO') && <UserManagement />}
        </div>
      </main>

      {/* 🎯 কাস্টম পাসওয়ার্ড পরিবর্তনকারী পপ-আপ মডাল (৩-স্টেপ ওটিপি ইমপ্লিমেন্টেশন) */}
      {showPassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[150] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border relative animate-in zoom-in-95 duration-200">
            
            <h3 className="text-xl font-black text-slate-800 border-b pb-3 mb-5 flex items-center gap-2">
              🔑 {step === 1 ? 'পাসওয়ার্ড পরিবর্তন' : step === 2 ? 'ইমেইল ওটিপি যাচাই' : 'নতুন পাসওয়ার্ড'}
            </h3>

            {/* ➡️ স্টেপ ১: বর্তমান পাসওয়ার্ড যাচাই */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Current Password (পুরাতন পাসওয়ার্ড)</label>
                  <input 
                    type="password" 
                    placeholder="বর্তমান পাসওয়ার্ড দিন"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={closePassModal} className="px-4 py-2 text-xs font-bold text-slate-400">Cancel</button>
                  <button type="submit" disabled={passLoading} className="px-5 py-3 bg-slate-900 hover:bg-orange-600 text-white font-black text-xs rounded-xl shadow-md transition-colors">
                    {passLoading ? 'যাচাই হচ্ছে...' : 'ওটিপি পাঠান ✉️'}
                  </button>
                </div>
              </form>
            )}

            {/* ➡️ স্টেপ ২: ওটিপি কোড ইনপুট */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Enter 4-Digit OTP</label>
                  <input 
                    type="text" 
                    maxLength="4"
                    placeholder="••••"
                    value={inputOtp}
                    onChange={e => setInputOtp(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-black text-center text-xl tracking-[0.5em]"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-xs font-bold text-slate-400">পিছনে যান</button>
                  <button type="submit" className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md transition-colors">
                    কোড যাচাই করুন ✓
                  </button>
                </div>
              </form>
            )}

            {/* ➡️ স্টেপ ৩: নতুন পাসওয়ার্ড সেট (সিকিউরড করার জন্য টাইপ password করা হয়েছে) */}
            {step === 3 && (
              <form onSubmit={handleFinalPasswordSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">New Password</label>
                  <input 
                    type="password" 
                    placeholder="কমপক্ষে ৬ ডিজিটের নতুন পাসওয়ার্ড"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="submit" disabled={passLoading} className="w-full py-4 bg-slate-900 hover:bg-green-600 text-white font-black text-sm rounded-2xl shadow-lg transition-colors">
                    {passLoading ? 'সেভ হচ্ছে...' : 'পাসওয়ার্ড নিশ্চিত করুন 💾'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* মোবাইল ফ্লোটিং মেনু (FAB) কোড অপরিবর্তিত */}
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