import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false); 

  // গুগল লগইন ফাংশন
  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) alert("গুগল লগইনে সমস্যা: " + error.message);
    setLoading(false);
  };

  // OTP পাঠানো
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("দয়া করে আপনার ইমেইলটি দিন!");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: null }
      });
      if (error) throw error;
      alert("✅ আপনার ইমেইলে সিকিউরিটি কোড (OTP) পাঠানো হয়েছে!");
      setOtpSent(true);
    } catch (err) {
      alert("ত্রুটি: " + err.message);
    }
    setLoading(false);
  };

  // OTP ভেরিফাই
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return alert("দয়া করে OTP কোডটি দিন!");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email'
      });
      if (error) throw error;

      const userMeta = data.user.user_metadata;
      onLoginSuccess({
        role: userMeta.role || 'Admin',
        name: userMeta.name || 'Admin',
        emp_id: userMeta.emp_id || 'ADMIN'
      });
    } catch (err) {
      alert("❌ কোডটি ভুল অথবা মেয়াদোত্তীর্ণ!");
    }
    setLoading(false);
  };

  return (
    <div className="w-full text-center space-y-6 px-4 py-6" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <img src="https://i.postimg.cc/2S35fVxS/Lams-Logo.png" alt="Lams Logo" className="h-16 mx-auto object-contain" />
      
      <div>
        <h2 className="text-2xl font-black text-slate-800 uppercase">LAMS Power</h2>
        <p className="text-xs text-slate-400 mt-1">{otpSent ? 'আপনার ইমেইলে পাঠানো কোডটি লিখুন' : 'লগইন করতে আপনার ইমেইল ঠিকানা দিন'}</p>
      </div>

      <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4 text-left mt-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Email Address</label>
          <input 
            type="email" 
            placeholder="example@lamspower.com" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={otpSent}
            className={`w-full p-4 border rounded-xl font-bold outline-none transition-all ${otpSent ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 focus:ring-2 focus:ring-slate-900'}`} 
            required
          />
        </div>
        
        {otpSent && (
          <div className="space-y-1 animate-in slide-in-from-bottom-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Security Code (OTP)</label>
            <input 
              type="text" 
              placeholder="00000000" 
              value={otp}
              onChange={e => setOtp(e.target.value)}
              className="w-full p-4 bg-orange-50 border border-orange-200 rounded-xl font-black text-center tracking-[0.5em] text-lg outline-none focus:ring-2 focus:ring-orange-500 transition-all text-slate-800" 
              required
            />
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full h-14 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95">
          {loading ? 'প্রসেসিং...' : (otpSent ? 'লগইন করুন 🚀' : 'OTP পাঠান ✉️')}
        </button>
      </form>

      {/* 🔴 গুগল লগইন সেপারেটর */}
      {!otpSent && (
        <>
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">অথবা</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>
          
          <button 
            onClick={handleGoogleLogin}
            className="w-full h-14 border-2 border-slate-200 hover:border-slate-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
        </>
      )}

      {otpSent && (
        <button onClick={() => { setOtpSent(false); setOtp(''); }} className="text-xs font-bold text-slate-400 hover:text-slate-800 underline mt-4 block mx-auto">
          ← অন্য ইমেইল ব্যবহার করুন
        </button>
      )}
    </div>
  );
};

export default Login;