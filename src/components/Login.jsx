import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login = ({ onLoginSuccess }) => {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

const handleLogin = async (e) => {
    e.preventDefault();
    if (!empId.trim() || !password.trim()) return alert("ইমেইল এবং পাসওয়ার্ড দুটিই দিন!");

    setLoading(true);
    try {
      // 🔴 সুপাবেজের অফিশিয়াল সাইন-ইন মেথড
      const { data, error } = await supabase.auth.signInWithPassword({
        email: empId.trim(), // empId স্টেটেই আমরা ইমেইল নিচ্ছি
        password: password.trim(),
      });

      if (error) throw error;

      // লগইন সফল হলে ইউজারের মেটাডাটা থেকে রোল ও নাম বের করা
      const userMeta = data.user.user_metadata;
      
      alert(`🎉 স্বাগতম, ${userMeta.name}!`);
      
      // App.jsx কে জানিয়ে দেওয়া যে লগইন সফল
      onLoginSuccess({
        role: userMeta.role,
        name: userMeta.name,
        emp_id: userMeta.emp_id
      });
      
    } catch (err) {
      console.error(err);
      alert("❌ লগইন করতে সমস্যা হয়েছে: " + err.message);
    }
    setLoading(false);
  };
  return (
    // 🔴 ফুল-স্ক্রিন এবং ডাবল বক্স বাদ দিয়ে শুধু ফর্মের অংশটুকু রাখা হয়েছে
    <div className="w-full text-center space-y-6 px-4 py-6" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      <img src="https://i.postimg.cc/2S35fVxS/Lams-Logo.png" alt="Lams Logo" className="h-16 mx-auto object-contain" />
      
      <div>
        <h2 className="text-2xl font-black text-slate-800 uppercase">LAMS Power</h2>
        <p className="text-xs text-slate-400 mt-1">আপনার এমপ্লয়ী আইডি ও পাসওয়ার্ড দিয়ে লগইন করুন</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4 text-left mt-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Employee ID</label>
          <input 
            type="email" 
            placeholder="যেমন: example@lams.com" 
            value={empId}
            onChange={e => setEmpId(e.target.value)}
            className="w-full p-4 bg-slate-50 border rounded-xl font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900 transition-all" 
            required
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all" 
            required
          />
        </div>

        <button type="submit" disabled={loading} className="w-full h-14 mt-2 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95">
          {loading ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}
        </button>
      </form>
    </div>
  );
};

export default Login;