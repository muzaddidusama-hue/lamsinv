import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false); // 🔴 ফরগেট পাসওয়ার্ড মোড ট্র্যাক করার স্টেট

  // রেগুলার লগইন ফাংশন
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return alert("ইমেইল এবং পাসওয়ার্ড দুটিই দিন!");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      const userMeta = data.user.user_metadata;
      alert(`🎉 স্বাগতম, ${userMeta.name || 'Admin'}!`);
      
      onLoginSuccess({
        role: userMeta.role || 'Admin',
        name: userMeta.name || 'Admin',
        emp_id: userMeta.emp_id || 'ADMIN'
      });
      
    } catch (err) {
      console.error(err);
      alert("❌ লগইন করতে সমস্যা হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  // 🔴 পাসওয়ার্ড রিসেট লিংক পাঠানোর ফাংশন
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("দয়া করে আপনার ইমেইলটি দিন!");
    
    setLoading(true);
    try {
      // সুপাবেজের বিল্ট-ইন পাসওয়ার্ড রিসেট রিকোয়েস্ট
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin, // ইউজারের ইমেইলে ক্লিক করলে এই সাইটেই ফিরে আসবে
      });
      
      if (error) throw error;
      
      alert("✅ আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে! ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।");
      setIsResetMode(false); // লিংক পাঠানোর পর আবার লগইন পেজে নিয়ে যাবে
      setPassword(''); // পাসওয়ার্ড ফিল্ড ক্লিয়ার করে দেওয়া হলো
    } catch (err) {
      alert("ত্রুটি: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="w-full text-center space-y-6 px-4 py-6" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <img src="https://i.postimg.cc/2S35fVxS/Lams-Logo.png" alt="Lams Logo" className="h-16 mx-auto object-contain" />
      
      <div>
        <h2 className="text-2xl font-black text-slate-800 uppercase">LAMS Power</h2>
        <p className="text-xs text-slate-400 mt-1">
          {isResetMode ? 'আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হবে' : 'আপনার ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন'}
        </p>
      </div>

      <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-4 text-left mt-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Email Address</label>
          <input 
            type="email" 
            placeholder="example@lamspower.com" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all" 
            required
          />
        </div>
        
        {/* যদি রিসেট মোডে না থাকে, তবেই পাসওয়ার্ড ফিল্ড দেখাবে */}
        {!isResetMode && (
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Password</label>
              {/* 🔴 ফরগেট পাসওয়ার্ড বাটন */}
              <button type="button" onClick={() => setIsResetMode(true)} className="text-[10px] font-black text-orange-600 hover:text-orange-700 hover:underline">
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all" 
              required={!isResetMode}
            />
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full h-14 mt-2 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95">
          {loading ? (isResetMode ? 'পাঠানো হচ্ছে...' : 'লগইন হচ্ছে...') : (isResetMode ? 'রিসেট লিংক পাঠান ✉️' : 'লগইন করুন')}
        </button>
      </form>

      {/* 🔴 ব্যাক টু লগইন বাটন (শুধু রিসেট মোডে দেখাবে) */}
      {isResetMode && (
        <button onClick={() => setIsResetMode(false)} className="text-xs font-bold text-slate-400 hover:text-slate-800 underline mt-4 block mx-auto">
          ← লগইন পেজে ফিরে যান
        </button>
      )}
    </div>
  );
};

export default Login;