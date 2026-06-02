import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // নতুন ইউজার তৈরির ফরম স্টেট
  const [newUser, setNewUser] = useState({ emp_id: '', name: '', password: '', role: 'Staff' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('id', { ascending: true });
    if (data) setUsers(data);
  };

  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  // ১. নতুন এমপ্লয়ী যুক্ত করার ফাংশন (অ্যাক্সেস দেওয়া)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.emp_id || !newUser.name || !newUser.password) return alert("সবগুলো ঘর পূরণ করুন!");

    setLoading(true);
    try {
      const payload = {
        emp_id: newUser.emp_id.trim().toUpperCase(),
        name: newUser.name.trim(),
        password: newUser.password.trim(),
        role: newUser.role,
        is_active: true
      };

      const { error } = await supabase.from('users').insert([payload]);
      if (error) throw error;

      alert(`🎉 এমপ্লয়ী ${payload.name} সফলভাবে যুক্ত হয়েছেন!`);
      setNewUser({ emp_id: '', name: '', password: '', role: 'Staff' });
      fetchUsers(); // লিস্ট রিফ্রেশ
    } catch (err) {
      alert("ত্রুটি: আইডিটি ইতিমধ্যে ব্যবহৃত হতে পারে। " + err.message);
    }
    setLoading(false);
  };

  // ২. এক্সেস রিমুভ / ব্লক / অ্যাক্টিভেট করার ডাইনামিক সুইচ ফাংশন
  const toggleUserAccess = async (userId, currentStatus, empName) => {
    const msg = currentStatus 
      ? `আপনি কি নিশ্চিতভাবে ${empName}-এর এক্সেস রিমুভ/ব্লক করতে চান?` 
      : `আপনি কি ${empName}-এর এক্সেস পুনরায় চালু করতে চান?`;
      
    if (!window.confirm(msg)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      alert("✅ এক্সেস স্ট্যাটাস সফলভাবে পরিবর্তন হয়েছে!");
      fetchUsers();
    } catch (err) {
      alert("ত্রুটি: " + err.message);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* বামপাশ: নতুন ইউজার তৈরি করার ফর্ম */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border shadow-sm space-y-4 h-fit">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-2">📥 নতুন এমপ্লয়ী এক্সেস দিন</h3>
          <form onSubmit={handleCreateUser} className="space-y-3 text-xs font-bold">
            <div>
              <label className="text-slate-400 block mb-1">Employee ID (ইউনিক হতে হবে)</label>
              <input type="text" name="emp_id" value={newUser.emp_id} onChange={handleInputChange} placeholder="যেমন: EMP102" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold uppercase" required />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">এমপ্লয়ীর নাম</label>
              <input type="text" name="name" value={newUser.name} onChange={handleInputChange} placeholder="নাম লিখুন" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold" required />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">লগইন পাসওয়ার্ড</label>
              <input type="text" name="password" value={newUser.password} onChange={handleInputChange} placeholder="পাসওয়ার্ড সেট করুন" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold" required />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">অ্যাকাউন্ট রোল (Role)</label>
              <select name="role" value={newUser.role} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-slate-800">
                <option value="Staff">Staff (সাধারণ এমপ্লয়ী)</option>
                <option value="Admin">Admin (এডমিন)</option>
                <option value="CEO">CEO (প্রধান নির্বাহী)</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full h-11 bg-slate-900 text-white font-black rounded-xl text-xs hover:bg-orange-600 transition-colors mt-2">
              {loading ? 'তৈরি হচ্ছে...' : '➕ এক্সেস চালু করুন'}
            </button>
          </form>
        </div>

        {/* ডানপাশ: সমস্ত এমপ্লয়ী এক্সেস কন্ট্রোল টেবিল */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-2">👥 এমপ্লয়ী এক্সেস কন্ট্রোল লিস্ট</h3>
          <div className="overflow-x-auto border rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-wider border-b">
                  <th className="p-3">ID</th>
                  <th className="p-3">নাম</th>
                  <th className="p-3">পাসওয়ার্ড</th>
                  <th className="p-3">রোল</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-3 font-black text-slate-900 uppercase">{user.emp_id}</td>
                    <td className="p-3 font-bold">{user.name}</td>
                    <td className="p-3 font-mono font-bold text-slate-400 tracking-widest select-none">
  ••••••
</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${user.role === 'Admin' || user.role === 'CEO' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {/* ADMIN100 এর নিজের এক্সেস নিজে যেন ব্লক না করতে পারে তার প্রোটেকশন */}
                      {user.emp_id === 'ADMIN100' ? (
                        <span className="text-[10px] italic text-slate-400">মাস্টার ওনার</span>
                      ) : (
                        <button
                          onClick={() => toggleUserAccess(user.id, user.is_active, user.name)}
                          className={`px-3 py-1.5 rounded-lg font-black text-[10px] text-white transition-all ${user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                          {user.is_active ? '⛔ রিমুভ এক্সেস' : '⚡ এক্সেস দিন'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserManagement;