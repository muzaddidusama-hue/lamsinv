import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { adminApiFetch } from '../utils/adminApi';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔴 পাসওয়ার্ড ফিল্ড স্টেট থেকে রিমুভ করা হয়েছে
  const [newUser, setNewUser] = useState({ emp_id: '', name: '', email: '', role: 'Staff' });
  const [editingUserId, setEditingUserId] = useState(null);
  
  // 🔴 এডিটের সময় অরিজিনাল ইমেইল ট্র্যাকিংয়ের জন্য 'originalEmail' যোগ করা হয়েছে
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', originalEmail: '' });

  useEffect(() => {
    fetchUsers();

    const usersChannel = supabase
      .channel('user-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, []);

  async function fetchUsers() {
    try {
      const { users: data } = await adminApiFetch('/users');
      setUsers(data || []);
    } catch (error) {
      console.error('User list request failed:', error);
      alert(error.message);
    }
  }

  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  // 🔴 ১. সাইন-আপ মেথড (পাসওয়ার্ড ছাড়া)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.emp_id || !newUser.name || !newUser.email) {
      return alert("সবগুলো ঘর পূরণ করুন!");
    }

    setLoading(true);
    try {
      const payload = {
        emp_id: newUser.emp_id.trim().toUpperCase(),
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        role: newUser.role,
        is_active: true
      };

      await adminApiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert(`🎉 এমপ্লয়ী ${payload.name} সফলভাবে যুক্ত হয়েছেন!`);
      setNewUser({ emp_id: '', name: '', email: '', role: 'Staff' });
      fetchUsers();
    } catch (err) {
      alert("ত্রুটি হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  // 🔴 ২. ইউজার এডিট শুরু করা
  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditForm({ 
      name: user.name, 
      email: user.email || '', 
      role: user.role,
      originalEmail: user.email // Auth এ খোঁজার জন্য অরিজিনাল ইমেইলটি সেভ করে রাখছি
    });
  };

  // 🔴 ৩. ইউজার এডিট আপডেট করা (Auth এবং Database সিঙ্ক)
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.email.trim()) return alert("নাম এবং ইমেইল অবশ্যই দিতে হবে!");

    setLoading(true);
    try {
      // ক. প্রথমে ডাটাবেজ আপডেট করুন
      await adminApiFetch(`/users/${encodeURIComponent(editingUserId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editForm.name.trim(), email: editForm.email.trim(), role: editForm.role })
      });

      alert("✅ এমপ্লয়ী প্রোফাইল সফলভাবে আপডেট করা হয়েছে!");
      setEditingUserId(null); 
      fetchUsers();
    } catch (err) {
      alert("আপডেট করতে সমস্যা হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  const deleteUser = async (userId, userEmail, empName) => {
    if (!window.confirm(`সতর্কতা! আপনি কি নিশ্চিতভাবে ${empName}-এর একাউন্টটি মুছে ফেলতে চান?`)) return;
    setLoading(true);
    try {
      await adminApiFetch(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      
      alert("✅ এমপ্লয়ী মুছে ফেলা হয়েছে!");
      fetchUsers();
    } catch (err) {
      alert("❌ ডিলিট বাতিল হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  const toggleUserAccess = async (userId, currentStatus, empName) => {
    const msg = currentStatus ? `নিশ্চিতভাবে ${empName}-এর এক্সেস ব্লক করতে চান?` : `${empName}-এর এক্সেস পুনরায় চালু করতে চান?`;
    if (!window.confirm(msg)) return;

    try {
      await adminApiFetch(`/users/${encodeURIComponent(userId)}/access`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      alert("✅ স্ট্যাটাস আপডেট হয়েছে!");
      fetchUsers();
    } catch (err) {
      alert("ত্রুটি: " + err.message);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* বামপাশ: ফর্ম */}
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
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500" required />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">লগইন ইমেইল</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500" required />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">অ্যাকাউন্ট রোল (Role)</label>
                  <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none">
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
                  <input type="text" name="emp_id" value={newUser.emp_id} onChange={handleInputChange} placeholder="যেমন: EMP102" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900" required />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">এমপ্লয়ীর নাম</label>
                  <input type="text" name="name" value={newUser.name} onChange={handleInputChange} placeholder="নাম লিখুন" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900" required />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">লগইন ইমেইল</label>
                  <input type="email" name="email" value={newUser.email} onChange={handleInputChange} placeholder="example@lams.com" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900" required />
                </div>
                
                {/* 🔴 পাসওয়ার্ড ফিল্ড মুছে ফেলা হয়েছে */}

                <div>
                  <label className="text-slate-400 block mb-1">অ্যাকাউন্ট রোল (Role)</label>
                  <select name="role" value={newUser.role} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900">
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

        {/* ডানপাশ: টেবিল */}
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
                      <p className="text-[10px] font-medium text-slate-400 select-all">{user.email}</p>
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
                      
                      {/* 🔴 এডিট বাটন */}
                      <button 
                        onClick={() => startEdit(user)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-colors"
                      >
                        ✏️ এডিট
                      </button>

                      {user.emp_id === 'ADMIN100' ? (
                        <span className="text-[10px] italic text-slate-400 min-w-[75px]">মাস্টার ওনার</span>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleUserAccess(user.id, user.is_active, user.name)}
                            className={`px-3 py-1.5 rounded-lg font-black text-[10px] text-white transition-all min-w-[85px] ${user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                          >
                            {user.is_active ? '⛔ ব্লক' : '⚡ আনব্লক'}
                          </button>

                          <button 
                            onClick={() => deleteUser(user.id, user.email, user.name)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-colors"
                            title="ইউজার ডিলিট করুন"
                          >
                            🗑️
                          </button>
                        </>
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
