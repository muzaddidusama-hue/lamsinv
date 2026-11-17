import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import lamsLogo from '../assets/lams-logo.webp';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false); 
  const [errorMessage, setErrorMessage] = useState('');

  // গুগল লগইন ফাংশন
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      sessionStorage.setItem('lams-google-login-pending', '1');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (error) {
      try {
        sessionStorage.removeItem('lams-google-login-pending');
      } catch {
        // Ignore storage restrictions.
      }
      console.error('Google sign-in failed:', error);
      setErrorMessage(`Google লগইন শুরু করা যায়নি: ${error.message || 'অজানা সমস্যা'}`);
      setLoading(false);
    }
  };

  // OTP পাঠানো
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setErrorMessage("দয়া করে আপনার ইমেইলটি দিন!");

    setLoading(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false }
      });
      if (error) throw error;
      setOtp('');
      setOtpSent(true);
    } catch (error) {
      console.error('OTP request failed:', error);
      setErrorMessage(`OTP পাঠানো যায়নি: ${error.message || 'নেটওয়ার্ক বা ইমেইল কনফিগারেশন সমস্যা'}`);
    } finally {
      setLoading(false);
    }
  };

  // OTP ভেরিফাই
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return setErrorMessage("দয়া করে OTP কোডটি দিন!");

    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'email'
      });
      if (error) throw error;

      if (!data.user) throw new Error('কোড যাচাই হয়েছে, কিন্তু ব্যবহারকারীর সেশন পাওয়া যায়নি। আবার চেষ্টা করুন।');
      const userMeta = data.user.user_metadata || {};
      onLoginSuccess({
        role: userMeta.role || 'Staff',
        name: userMeta.name || 'Employee',
        emp_id: userMeta.emp_id || 'STAFF'
      });
    } catch (error) {
      console.error('OTP verification failed:', error);
      setErrorMessage(error.code === 'otp_expired'
        ? 'এই OTP-টি আগেই ব্যবহার হয়েছে বা মেয়াদ শেষ হয়েছে। নতুন OTP পাঠিয়ে সর্বশেষ ইমেইলের কোডটি ব্যবহার করুন।'
        : `লগইন যাচাই হয়নি: ${error.message || 'কোডটি ভুল অথবা মেয়াদোত্তীর্ণ'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-center space-y-6 px-4 py-6" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <img src={lamsLogo} alt="Lams Logo" className="h-16 mx-auto object-contain" />
      
      <div>
        <h2 className="text-2xl font-black text-slate-800 uppercase">LAMS Power</h2>
        <p className="text-xs text-slate-400 mt-1">{otpSent ? 'সর্বশেষ পাঠানো ইমেইলের কোডটি লিখুন' : 'লগইন করতে আপনার ইমেইল ঠিকানা দিন'}</p>
      </div>

      {errorMessage && <p role="alert" className="rounded-xl bg-red-50 p-3 text-left text-sm font-semibold text-red-700">{errorMessage}</p>}

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
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="ইমেইলের কোড"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\s/g, ''))}
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
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-14 border-2 border-slate-200 hover:border-slate-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all disabled:cursor-wait disabled:opacity-60"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            {loading ? 'Google-এ সংযোগ হচ্ছে…' : 'Continue with Google'}
          </button>
        </>
      )}

      {otpSent && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <button type="button" onClick={handleSendOtp} disabled={loading} className="text-xs font-bold text-orange-700 hover:text-orange-900 underline disabled:opacity-50">
            নতুন OTP পাঠান
          </button>
          <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setErrorMessage(''); }} className="text-xs font-bold text-slate-400 hover:text-slate-800 underline">
            ← অন্য ইমেইল ব্যবহার করুন
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
