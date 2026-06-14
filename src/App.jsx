import React, { useState, useEffect } from 'react';
import PublicCatalog from './components/PublicCatalog';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login'; // 📥 নতুন তৈরি করা Login কম্পোনেন্টটি ইম্পোর্ট করা হলো

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  // এমপ্লয়ীর অতিরিক্ত মেটাডাটা ট্র্যাকিং স্টেট
  const [userRole, setUserRole] = useState('Staff');
  const [userName, setUserName] = useState('');

  // 🔄 অটো-লগইন সিঙ্ক: পেজ রিলোড দিলেও যেন লগইন সেশন গায়েব না হয়
useEffect(() => {
    // ১. পেজ লোড হওয়ার সাথে সাথে কারেন্ট সেশন চেক করা
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAdmin(true);
        setUserRole(session.user.user_metadata.role);
        setUserName(session.user.user_metadata.name);
      }
    });

    // ২. লাইভ লগইন/লগআউট স্ট্যাটাস ট্র্যাক করা
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAdmin(true);
        setUserRole(session.user.user_metadata.role);
        setUserName(session.user.user_metadata.name);
      } else {
        // সেশন না থাকলে (লগআউট করলে) সব রিসেট
        setIsAdmin(false);
        setUserRole('Staff');
        setUserName('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔒 লগআউট মেকানিজম আপডেট
  const handleLogout = async () => {
    await supabase.auth.signOut(); // সুপাবেজ থেকে লগআউট
    alert("সফলভাবে লগআউট হয়েছে!");
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* ইউজার লগইন অবস্থায় থাকলে এডমিন প্যানেল দেখাবে */}
      {isAdmin ? (
        <div className="min-h-screen flex flex-col">
          {/* 🔝 টপ ইউজার স্ট্যাটাস বার */}
          <div className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center text-xs font-bold shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-slate-400">Current User:</span>
              <span className="text-white font-black">{userName}</span>
              <span className="bg-orange-600 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase ml-1">
                {userRole}
              </span>
            </div>
            <p className="text-slate-400 font-medium">LAMS Power ERP Panel</p>
          </div>

          {/* আপনার মূল এডমিন প্যানেল এবং কাস্টম লগআউট অ্যাকশন */}
          <div className="flex-1">
            <AdminPanel onLogout={handleLogout} currentUserRole={userRole} currentUserName={userName} />
          </div>
        </div>
      ) : (
        // লগইন না থাকলে সাধারণ ক্যাটালগ ভিউ
        <>
          <PublicCatalog onAdminClick={() => setShowLogin(true)} />
          
          {/* 🎯 স্টাফ এক্সেস বাটনে চাপ দিলে নতুন মডার্ন লগইন উইন্ডোটি ওপেন হবে */}
          {showLogin}
          {showLogin && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
              <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-2 animate-in zoom-in-95 duration-300">
                
                {/* ক্যানসেল বাটন */}
                <button 
                  onClick={() => setShowLogin(false)} 
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 font-bold text-sm p-2 z-50"
                >
                  ✕ বাতিল
                </button>

                {/* লগইন কম্পোনেন্ট কানেক্টেড */}
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