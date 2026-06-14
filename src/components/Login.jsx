import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🔴 OTP পাঠানো হয়েছে কিনা তা ট্র্যাক করার স্টেট
  const [otpSent, setOtpSent] = useState(false); 

  // ১. OTP পাঠানোর ফাংশন
const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("দয়া করে আপনার ইমেইলটি দিন!");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          // 🔴 এই লাইনটি যোগ করুন: এটি সুপাবেজকে বলবে যেন লিংকের বদলে শুধু কোড পাঠায়
          emailRedirectTo: undefined, 
        }
      });

      if (error) {
        if (error.message.includes('Signups not allowed')) {
            throw new Error("এই ইমেইলটি আমাদের সিস্টেমে রেজিস্টার করা নেই। এডমিনের সাথে যোগাযোগ করুন।");
        }
        throw error;
      }

      alert("✅ আপনার ইমেইলে সিকিউরিটি কোড (OTP) পাঠানো হয়েছে! ইনবক্স বা স্প্যাম চেক করুন।");
      setOtpSent(true); // OTP ইনপুট বক্স ওপেন করবে
    } catch (err) {
      alert("ত্রুটি: " + err.message);
    }
    setLoading(false);
  };

  // ২. OTP ভেরিফাই করে লগইন করার ফাংশন
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return alert("দয়া করে OTP কোডটি দিন!");

    setLoading(true);
    try {
      // 🔴 OTP মিলিয়ে দেখা
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email'
      });

      if (error) throw error;

      // লগইন সফল!
      const userMeta = data.user.user_metadata;
      alert(`🎉 স্বাগতম, ${userMeta.name || 'Admin'}!`);
      
      onLoginSuccess({
        role: userMeta.role || 'Admin',
        name: userMeta.name || 'Admin',
        emp_id: userMeta.emp_id || 'ADMIN'
      });
      
    } catch (err) {
      console.error(err);
      alert("❌ কোডটি ভুল অথবা মেয়াদোত্তীর্ণ হয়েছে! আবার চেষ্টা করুন।");
    }
    setLoading(false);
  };

  return (
    <div className="w-full text-center space-y-6 px-4 py-6" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <img src="https://i.postimg.cc/2S35fVxS/Lams-Logo.png" alt="Lams Logo" className="h-16 mx-auto object-contain" />
      
      <div>
        <h2 className="text-2xl font-black text-slate-800 uppercase">LAMS Power</h2>
        <p className="text-xs text-slate-400 mt-1">
          {otpSent ? 'আপনার ইমেইলে পাঠানো কোডটি লিখুন' : 'লগইন করতে আপনার ইমেইল ঠিকানা দিন'}
        </p>
      </div>

      <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4 text-left mt-4">
        
        {/* ইমেইল ইনপুট (OTP পাঠানোর আগে দেখাবে, অথবা OTP পাঠানোর পর Readonly হয়ে যাবে) */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Email Address</label>
          <input 
            type="email" 
            placeholder="example@lamspower.com" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={otpSent} // OTP পাঠানোর পর ইমেইল এডিট করা যাবে না
            className={`w-full p-4 border rounded-xl font-bold outline-none transition-all ${otpSent ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 focus:ring-2 focus:ring-slate-900'}`} 
            required
          />
        </div>
        
        {/* OTP ইনপুট বক্স (শুধুমাত্র OTP পাঠানোর পর দেখাবে) */}
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

        <button type="submit" disabled={loading} className="w-full h-14 mt-2 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95">
          {loading ? 'প্রসেসিং...' : (otpSent ? 'লগইন করুন 🚀' : 'OTP পাঠান ✉️')}
        </button>
      </form>

      {/* ইমেইল ভুল হলে ব্যাকে যাওয়ার অপশন */}
      {otpSent && (
        <button 
          onClick={() => { setOtpSent(false); setOtp(''); }} 
          className="text-xs font-bold text-slate-400 hover:text-slate-800 underline mt-4 block mx-auto"
        >
          ← অন্য ইমেইল ব্যবহার করুন
        </button>
      )}
    </div>
  );
};

export default Login;