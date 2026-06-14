import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false); // 🔴 ইমার্জেন্সি সেটআপ মোড

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
        name: userMeta.name || 'Master Admin',
        emp_id: userMeta.emp_id || 'ADMIN100'
      });
      
    } catch (err) {
      console.error(err);
      alert("❌ লগইন করতে সমস্যা হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  // 🔴 ইমার্জেন্সি মাস্টার অ্যাকাউন্ট তৈরির ফাংশন
  const handleMasterSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ১. সুপাবেজ Auth এ মাস্টার একাউন্ট তৈরি
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: { name: 'Master Admin', role: 'CEO', emp_id: 'ADMIN100' }
        }
      });
      if (authErr) throw authErr;

      // ২. কাস্টম users টেবিলে এন্ট্রি (UI এর লিস্ট ঠিক রাখার জন্য)
      const { error: dbErr } = await supabase.from('users').upsert([{
        emp_id: 'ADMIN100',
        name: 'Master Admin',
        email: email.trim(),
        password: password.trim(),
        role: 'CEO',
        is_active: true
      }]);
      
      alert("✅ মাস্টার এডমিন তৈরি হয়েছে! এবার 'লগইন করুন' বাটনে চাপ দিয়ে লগইন করুন।");
      setIsSetupMode(false); // সেটআপ শেষ, এবার লগইন মোডে ফেরত যাবে
    } catch (err) {
      alert("সেটআপ এরর: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="w-full text-center space-y-6 px-4 py-6" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <img src="https://i.postimg.cc/2S35fVxS/Lams-Logo.png" alt="Lams Logo" className="h-16 mx-auto object-contain" />
      
      <div>
        <h2 className="text-2xl font-black text-slate-800 uppercase">LAMS Power</h2>
        <p className="text-xs text-slate-400 mt-1">
          {isSetupMode ? 'প্রথমবার মাস্টার অ্যাকাউন্ট সেটআপ করুন' : 'আপনার ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন'}
        </p>
      </div>

      <form onSubmit={isSetupMode ? handleMasterSetup : handleLogin} className="space-y-4 text-left mt-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Email Address</label>
          <input 
            type="email" 
            placeholder="admin@lamspower.com" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all" 
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

        <button type="submit" disabled={loading} className={`w-full h-14 mt-2 text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 ${isSetupMode ? 'bg-orange-600' : 'bg-slate-900 hover:bg-orange-600'}`}>
          {loading ? 'প্রসেসিং...' : isSetupMode ? 'মাস্টার অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন'}
        </button>
      </form>

      {/* 🔴 ইমার্জেন্সি সেটআপ বাটন */}
      <button onClick={() => setIsSetupMode(!isSetupMode)} className="text-xs font-bold text-slate-400 hover:text-slate-800 underline">
        {isSetupMode ? '← ফিরে যান' : 'লগইন হচ্ছে না? মাস্টার অ্যাকাউন্ট সেটআপ করুন'}
      </button>
    </div>
  );
};

export default Login;