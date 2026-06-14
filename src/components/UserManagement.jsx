import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

// 🔴 স্পেশাল ক্লায়েন্ট: এটি অ্যাডমিনকে লগআউট না করেই নতুন ইউজার তৈরি করবে
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const authAdminClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // ব্রাউজারে সেশন সেভ করবে না
    autoRefreshToken: false,
  }
});

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState({ emp_id: '', name: '', email: '', password: '', role: 'Staff' });
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

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

  // 🔴 আপডেট করা সাইন-আপ মেথড
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.emp_id || !newUser.name || !newUser.email || !newUser.password) {
      return alert("সবগুলো ঘর পূরণ করুন!");
    }

    setLoading(true);
    try {
      // ১. স্পেশাল ক্লায়েন্ট দিয়ে একাউন্ট তৈরি (এতে আপনার এডমিন সেশন ঠিক থাকবে)
      const { data: authData, error: authError } = await authAdminClient.auth.signUp({
        email: newUser.email.trim(),
        password: newUser.password.trim(),
        options: {
          data: {
            name: newUser.name.trim(),
            role: newUser.role,
            emp_id: newUser.emp_id.trim().toUpperCase()
          }
        }
      });

      if (authError) throw authError;

      // ২. মেইন সুপাবেজ ক্লায়েন্ট দিয়ে ডাটাবেজে এন্ট্রি (যেহেতু আপনি এডমিন, এটি RLS পাস করবে)
      const payload = {
        emp_id: newUser.emp_id.trim().toUpperCase(),
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password.trim(), 
        role: newUser.role,
        is_active: true
      };

      const { error: dbError } = await supabase.from('users').insert([payload]);
      if (dbError) throw dbError;

      alert(`🎉 এমপ্লয়ী ${payload.name} সফলভাবে যুক্ত হয়েছেন!`);
      setNewUser({ emp_id: '', name: '', email: '', password: '', role: 'Staff' });
      fetchUsers();
    } catch (err) {
      alert("ত্রুটি হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditForm({ name: user.name, email: user.email || '', role: user.role });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.email.trim()) return alert("নাম এবং ইমেইল অবশ্যই দিতে হবে!");

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          role: editForm.role
        })
        .eq('id', editingUserId);

      if (error) throw error;

      alert("✅ এমপ্লয়ী প্রোফাইল সফলভাবে আপডেট করা হয়েছে!");
      setEditingUserId(null); 
      fetchUsers();
    } catch (err) {
      alert("আপডেট করতে সমস্যা হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  const toggleUserAccess = async (userId, currentStatus, empName) => {

    const deleteUser = async (userId, userEmail, empName) => {
    if (!window.confirm(`সতর্কতা! আপনি কি নিশ্চিতভাবে ${empName}-এর একাউন্টটি ডাটাবেজ থেকে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।`)) return;

    setLoading(true);
    try {
      // ১. ডাটাবেজের 'users' টেবিল থেকে মুছুন
      const { error: dbError } = await supabase.from('users').delete().eq('id', userId);
      if (dbError) throw dbError;

      // ২. সুপাবেজ Auth থেকে মুছুন (এডমিন ক্লায়েন্ট ব্যবহার করে)
      // নোট: ক্লায়েন্ট সাইড থেকে ডিলিট ইউজার করতে হলে সুপাবেজ Edge Functions ব্যবহার করা ভালো। 
      // আপাতত, আপনি যদি সুপাবেজ ড্যাশবোর্ড থেকে মুছতে না চান, তবে শুধু ডাটাবেজ থেকে মুছুন।
      
      alert("✅ এমপ্লয়ী সফলভাবে সিস্টেম থেকে মুছে ফেলা হয়েছে!");
      fetchUsers();
    } catch (err) {
      alert("ডিলিট করতে সমস্যা হয়েছে: " + err.message);
    }
    setLoading(false);
  };

    const msg = currentStatus 
      ? `আপনি কি নিশ্চিতভাবে ${empName}-এর এক্সেস রিমুভ/ব্লক করতে চান?` 
      : `আপনি কি ${empName}-এর এক্সেস পুনরায় চালু করতে চান?`;
      
    if (!window.confirm(msg)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      alert("✅ এক্সেস স্ট্যাটাস সফলভাবে পরিবর্তন হয়েছে!");
      fetchUsers();
    } catch (err) {
      alert("ত্রুটি: " + err.message);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* বামপাশ: নতুন ইউজার তৈরি অথবা পুরাতন ইউজার এডিট করার ডাইনামিক ফর্ম */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border shadow-sm space-y-4 h-fit">
          {editingUserId ? (
            <>
              <h3 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                <span>📝 এমপ্লয়ী প্রোফাইল এডিট</span>
                <button onClick={() => setEditingUserId(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">বাতিল</button>
              </h3>
              <form onSubmit={handleUpdateUser} className="space-y-3 text-xs font-bold">
                <div>
                  <label className="text-slate-400 block mb-1">এমপ্লয়ীর নাম</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold" required />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">লগইন ইমেইল</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold" required />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">অ্যাকাউন্ট রোল (Role)</label>
                  <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-slate-800">
                    <option value="Staff">Staff (সাধারণ এমপ্লয়ী)</option>
                    <option value="Admin">Admin (এডমিন)</option>
                    <option value="CEO">CEO (প্রধান নির্বাহী)</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className="w-full h-11 bg-orange-600 text-white font-black rounded-xl text-xs hover:bg-orange-700 transition-colors mt-2">
                  {loading ? 'আপডেট হচ্ছে...' : '💾 পরিবর্তন সংরক্ষণ করুন'}
                </button>
              </form>
            </>
          ) : (
            <>
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
                  <label className="text-slate-400 block mb-1">লগইন ইমেইল</label>
                  <input type="email" name="email" value={newUser.email} onChange={handleInputChange} placeholder="example@lams.com" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold" required />
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
            </>
          )}
        </div>

        {/* ডানপাশ: সমস্ত এমপ্লয়ী এক্সেস কন্ট্রোল টেবিল */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-2">👥 এমপ্লয়ী এক্সেস কন্ট্রোল লিস্ট</h3>
          <div className="overflow-x-auto border rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-wider border-b">
                  <th className="p-3">ID</th>
                  <th className="p-3">নাম / ইমেইল</th>
                  <th className="p-3">রোল</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-3 font-black text-slate-900 uppercase">{user.emp_id}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-[10px] font-medium text-slate-400 select-all">{user.email || '⚠️ ইমেইল নেই'}</p>
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
                    <td className="p-3 text-center flex items-center justify-center gap-2 pt-4">
                      <button 
                        onClick={() => startEdit(user)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-colors"
                      >
                        ✏️ এডিট
                      </button>

                      {user.emp_id === 'ADMIN100' ? (
                        <span className="text-[10px] italic text-slate-400 min-w-[75px]">মাস্টার ওনার</span>
                      ) : (
                        <button
                          onClick={() => toggleUserAccess(user.id, user.is_active, user.name)}
                          className={`px-3 py-1.5 rounded-lg font-black text-[10px] text-white transition-all min-w-[85px] ${user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                          {user.is_active ? '⛔ ব্লক' : '⚡ আনব্লক'}
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