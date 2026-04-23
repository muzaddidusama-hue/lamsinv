import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const FrontEndCustom = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*').single();
    if (data) setSettings(data);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('site_settings').update(settings).eq('id', 1);
    if (!error) alert("সাইট সেটিংস আপডেট হয়েছে!");
    setLoading(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8" style={{fontFamily: "'Inter', sans-serif"}}>
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Front-end Custom</h1>
          <p className="text-slate-500 text-sm mt-1">পাবলিক পেজের কন্টেন্ট এখান থেকে ম্যানেজ করুন</p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-8">
        {/* হেডার সেটিংস */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Header Name</label>
            <input 
              type="text" 
              value={settings.header_name || ''} 
              onChange={(e) => setSettings({...settings, header_name: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Footer Image URL</label>
            <input 
              type="text" 
              value={settings.footer_image_url || ''} 
              onChange={(e) => setSettings({...settings, footer_image_url: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* কন্টাক্ট ইনফো */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Office Address</label>
            <textarea 
              value={settings.contact_address || ''} 
              onChange={(e) => setSettings({...settings, contact_address: e.target.value})}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 h-24"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Showroom Address</label>
            <textarea 
              value={settings.contact_showroom || ''} 
              onChange={(e) => setSettings({...settings, contact_showroom: e.target.value})}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 h-24"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Contact Numbers</label>
            <input 
              type="text" 
              value={settings.contact_numbers || ''} 
              onChange={(e) => setSettings({...settings, contact_numbers: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Hotline</label>
            <input 
              type="text" 
              value={settings.contact_hotline || ''} 
              onChange={(e) => setSettings({...settings, contact_hotline: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email Address</label>
            <input 
              type="email" 
              value={settings.contact_email || ''} 
              onChange={(e) => setSettings({...settings, contact_email: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full h-14 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
        >
          {loading ? 'আপডেট হচ্ছে...' : 'পরিবর্তন সেভ করুন'}
        </button>
      </form>
    </div>
  );
};

export default FrontEndCustom;