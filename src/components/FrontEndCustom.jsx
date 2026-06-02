import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const FrontEndCustom = () => {
  const [activeTab, setActiveTab] = useState('site_info'); // site_info অথবা product_details
  const [loading, setLoading] = useState(false);

  // সাব-সেকশন ১: সাইট সেটিংস স্টেট
  const [siteSettings, setSiteSettings] = useState({
    header_name: '', footer_image_url: '', contact_address: '',
    contact_showroom: '', contact_numbers: '', contact_hotline: '', contact_email: ''
  });

  // সাব-সেকশন ২: প্রোডাক্ট লিস্ট ও সিলেক্টেড প্রোডাক্ট স্টেট
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productForm, setProductForm] = useState({
    volt: '', watt: '', description: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    // সাইট সেটিংস লোড
    const { data: settings } = await supabase.from('site_settings').select('*').single();
    if (settings) setSiteSettings(settings);

    // প্রোডাক্টস লোড (ইউনিক নাম ও মডেল আইডেন্টিফাই করার জন্য)
    const { data: prods } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (prods) setAllProducts(prods);
    setLoading(false);
  };

  // নির্দিষ্ট প্রোডাক্ট সিলেক্ট করলে তার এক্সিস্টিং ডাটা ফর্মে লোড করা
  const handleProductSelectChange = (e) => {
    const pId = e.target.value;
    setSelectedProductId(pId);
    if (!pId) {
      setProductForm({ volt: '', watt: '', description: '' });
      return;
    }
    const targetProd = allProducts.find(p => p.id === parseInt(pId));
    if (targetProd) {
      setProductForm({
        volt: targetProd.volt || '',
        watt: targetProd.watt || '',
        description: targetProd.description || ''
      });
    }
  };

  // সাইট ইনফো সেভ লজিক
  const handleSaveSiteSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('site_settings').upsert([siteSettings]);
      if (error) throw error;
      alert("✅ সাইটের সাধারণ তথ্য সফলভাবে আপডেট হয়েছে!");
    } catch (err) {
      alert("ত্রুটি হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  // প্রোডাক্ট স্পেসিফিকেশন সেভ লজিক
  const handleSaveProductSpecs = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return alert("দয়া করে একটি প্রোডাক্ট সিলেক্ট করুন!");
    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          volt: productForm.volt,
          watt: productForm.watt,
          description: productForm.description
        })
        .eq('id', selectedProductId);

      if (error) throw error;
      alert("🎉 প্রোডাক্টের অতিরিক্ত বিবরণ সফলভাবে ক্যাটালগে যুক্ত হয়েছে!");
      
      // লোকাল স্টেট রি-সিঙ্ক
      setAllProducts(prev => prev.map(p => p.id === parseInt(selectedProductId) ? { ...p, ...productForm } : p));
    } catch (err) {
      alert("ত্রুটি হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* সাব-সেকশন নেভিগেশন ট্যাব */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('site_info')}
          className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'site_info' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          ⚙️ ফ্রন্ট এন্ড কাস্টম (Site Info)
        </button>
        <button 
          onClick={() => setActiveTab('product_details')}
          className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'product_details' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          📦 প্রোডাক্ট বিবরণী এডিটর
        </button>
      </div>

      {/* ---------------- সাব-সেকশন ১: সাইট ইনফো কাস্টমাইজেশন ---------------- */}
      {activeTab === 'site_info' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-200">
          <h2 className="text-xl font-black text-slate-800 mb-6">পাবলিক পেজের কন্টেন্ট ম্যানেজমেন্ট</h2>
          <form onSubmit={handleSaveSiteSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Header Name</label>
                <input type="text" value={siteSettings.header_name || ''} onChange={e => setSiteSettings({...siteSettings, header_name: e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Footer Image URL</label>
                <input type="text" value={siteSettings.footer_image_url || ''} onChange={e => setSiteSettings({...siteSettings, footer_image_url: e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Office Address</label>
              <textarea value={siteSettings.contact_address || ''} onChange={e => setSiteSettings({...siteSettings, contact_address: e.target.value})} rows="2" className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Showroom Address</label>
              <textarea value={siteSettings.contact_showroom || ''} onChange={e => setSiteSettings({...siteSettings, contact_showroom: e.target.value})} rows="2" className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contact Numbers</label>
                <input type="text" value={siteSettings.contact_numbers || ''} onChange={e => setSiteSettings({...siteSettings, contact_numbers: e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hotline</label>
                <input type="text" value={siteSettings.contact_hotline || ''} onChange={e => setSiteSettings({...siteSettings, contact_hotline: e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">E-mail</label>
                <input type="email" value={siteSettings.contact_email || ''} onChange={e => setSiteSettings({...siteSettings, contact_email: e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-md hover:bg-orange-600 transition-colors shadow-lg shadow-slate-900/10">
              {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'পাবলিশ করুন'}
            </button>
          </form>
        </div>
      )}

      {/* ---------------- সাব-সেকশন ২: প্রোডাক্ট বিবরণী এডিটর ---------------- */}
      {activeTab === 'product_details' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-200">
          <h2 className="text-xl font-black text-slate-800 mb-2">প্রোডাক্ট ডেসক্রিপশন ও ক্যাপাসিটি প্যারামিটার এন্ট্রি</h2>
          <p className="text-xs text-slate-400 mb-6">ড্রপডাউন থেকে নির্দিষ্ট মডেল বেছে নিয়ে তার ভোল্টেজ, ওয়াট এবং ক্যাটালগ বিবরণ সেট করুন।</p>
          
          <form onSubmit={handleSaveProductSpecs} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">১. প্রোডাক্ট এবং মডেল সিলেক্ট করুন</label>
              <select 
                value={selectedProductId} 
                onChange={handleProductSelectChange}
                className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">প্রোডাক্ট বেছে নিন...</option>
                {allProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] — {p.name} — {p.model}
                  </option>
                ))}
              </select>
            </div>

            {selectedProductId && (
              <div className="space-y-5 animate-in slide-in-from-top-3 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">লোড ভোল্টেজ (Volt)</label>
                    <input 
                      type="text" 
                      name="volt"
                      value={productForm.volt}
                      onChange={e => setProductForm({...productForm, volt: e.target.value})}
                      placeholder="উদা: 12V / 24V / 230V" 
                      className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-950" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">লোড ওয়াট (Watt / Capacity)</label>
                    <input 
                      type="text" 
                      name="watt"
                      value={productForm.watt}
                      onChange={e => setProductForm({...productForm, watt: e.target.value})}
                      placeholder="উদা: 50W / 200W / 3KW" 
                      className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-950" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">বিস্তারিত বিবরণ (Description)</label>
                  <textarea 
                    name="description"
                    value={productForm.description}
                    onChange={e => setProductForm({...productForm, description: e.target.value})}
                    placeholder="পাবলিক পেজে দেখানোর জন্য প্রোডাক্টের বিস্তারিত টেকনিক্যাল ডেটা বা রিভিউ এখানে লিখুন..."
                    rows="4" 
                    className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-950" 
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full h-14 bg-orange-600 text-white rounded-2xl font-black text-md hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20">
                  {loading ? 'আপডেট হচ্ছে...' : '💾 এই মডেলের বিবরণ ক্যাটালগে সেভ করুন'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default FrontEndCustom;