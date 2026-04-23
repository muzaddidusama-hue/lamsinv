import React, { useState, useEffect } from 'react';
import PublicCatalog from './components/PublicCatalog';
import AdminPanel from './components/AdminPanel';

const MASTER_PASSWORD = "lams2026";

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === MASTER_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
    } else {
      alert("ভুল পাসওয়ার্ড!");
    }
  };

return (
  <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
    {isAdmin ? (
      <AdminPanel onLogout={() => setIsAdmin(false)} />
    ) : (
      <>
        <PublicCatalog onAdminClick={() => setShowLogin(true)} />
        {showLogin && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 lg:p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border border-white/20">
              <h3 className="text-xl lg:text-2xl font-black mb-6 text-center text-slate-800">অ্যাডমিন লগইন</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <input 
                  type="password" 
                  value={passwordInput} 
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="মাস্টার পাসওয়ার্ড" 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowLogin(false)} className="flex-1 py-4 font-bold text-slate-400">বাতিল</button>
                  <button type="submit" className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg">প্রবেশ</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    )}
  </div>
);
}

export default App;