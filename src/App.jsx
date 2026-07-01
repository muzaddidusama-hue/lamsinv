import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import PublicCatalog from './components/PublicCatalog';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [userRole, setUserRole] = useState('Staff');
  const [userName, setUserName] = useState('');

  // 🔴 পাসওয়ার্ড রিকভারি স্টেট
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    // কারেন্ট সেশন চেক
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAdmin(true);
        setUserRole(session.user.user_metadata?.role || 'Staff');
        setUserName(session.user.user_metadata?.name || 'Employee');
      }
    });

    // লাইভ ইভেন্ট ট্র্যাকার
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      // পাসওয়ার্ড রিকভারি ইভেন্ট ধরা
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }

      if (session) {
        setIsAdmin(true);
        setUserRole(session.user.user_metadata?.role || 'Staff');
        setUserName(session.user.user_metadata?.name || 'Employee');
      } else {
        setIsAdmin(false);
        setUserRole('Staff');
        setUserName('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (user) => {
    setIsAdmin(true);
    setUserRole(user.role);
    setUserName(user.name);
    setShowLogin(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert("সফলভাবে লগআউট হয়েছে!");
  };

  // 🔴 নতুন পাসওয়ার্ড সেভ করার ফাংশন (লিংকে ক্লিক করে আসার পর)
  const handleUpdateRecoveryPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!");

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      alert("✅ সফলভাবে নতুন পাসওয়ার্ড সেট করা হয়েছে!");
      setRecoveryMode(false); // মডাল বন্ধ
      setNewPassword(''); // ফিল্ড রিসেট
    } catch (err) {
      alert("পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে: " + err.message);
    }
    setUpdatingPassword(false);
  };

  // 🔴 লগইন থাকা অবস্থায় ইমেইলে রিসেট লিংক পাঠানোর ফাংশন
  const handleSendPasswordReset = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.email) {
      return alert("আপনার ইমেইল ঠিকানা খুঁজে পাওয়া যায়নি!");
    }

    const confirmMsg = `আমরা কি আপনার ${user.email} ঠিকানায় পাসওয়ার্ড পরিবর্তনের লিংক পাঠাবো?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin,
      });
      
      if (error) throw error;
      
      alert("✅ আপনার ইমেইলে পাসওয়ার্ড পরিবর্তনের লিংক পাঠানো হয়েছে! ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।");
    } catch (err) {
      alert("লিংক পাঠাতে সমস্যা হয়েছে: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* পাসওয়ার্ড রিকভারি মডাল (সবার উপরে দেখাবে) */}
      {recoveryMode && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🔒
            </div>
            <h2 className="text-2xl font-black text-center text-slate-800 mb-2">নতুন পাসওয়ার্ড সেট করুন</h2>
            <p className="text-xs text-center text-slate-500 mb-6 font-bold">আপনার অ্যাকাউন্টের জন্য একটি নতুন এবং শক্তিশালী পাসওয়ার্ড দিন।</p>
            
            <form onSubmit={handleUpdateRecoveryPassword} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
                <input 
                  type="password" 
                  placeholder="নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর)" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-slate-800" 
                  required
                />
              </div>
              <button type="submit" disabled={updatingPassword} className="w-full py-4 bg-slate-900 hover:bg-orange-600 text-white rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-wider text-sm mt-2">
                {updatingPassword ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ইউজার লগইন অবস্থায় থাকলে এডমিন প্যানেল দেখাবে */}
      {isAdmin ? (
        <div className="min-h-screen flex flex-col">
          <div className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center text-xs font-bold shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-slate-400">Current User:</span>
              <span className="text-white font-black">{userName}</span>
              <span className="bg-orange-600 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase ml-1">
                {userRole}
              </span>
            </div>
            
            {/* 🔴 ডানদিকের কন্ট্রোল প্যানেল */}
            <div className="flex items-center gap-4">
              <p className="text-slate-400 font-medium hidden md:block">LAMS Power ERP Panel</p>
            </div>
          </div>

          <div className="flex-1">
            <AdminPanel onLogout={handleLogout} currentUserRole={userRole} currentUserName={userName} />
          </div>
        </div>
      ) : (
        <>
          <PublicCatalog onAdminClick={() => setShowLogin(true)} />
          
          {showLogin && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
              <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-2 animate-in zoom-in-95 duration-300">
                <button 
                  onClick={() => setShowLogin(false)} 
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 font-bold text-sm p-2 z-50"
                >
                  ✕ বাতিল
                </button>
                <Login onLoginSuccess={handleLoginSuccess} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;