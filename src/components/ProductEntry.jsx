import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ProductEntry = () => {
  const [entryMode, setEntryMode] = useState('new'); // 'new' বা 'existing'
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);

  // ফর্ম স্টেটস
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hybrid Inverter');
  const [model, setModel] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [availability, setAvailability] = useState('in stock');
  const [imageUrl, setImageUrl] = useState('');
  const [house, setHouse] = useState('Head Office'); // নতুন হাউজ স্টেট

  // সোলার প্যানেলের জন্য স্পেশাল স্টেটস
  const [panelWatt, setPanelWatt] = useState('');
  const [perWattPrice, setPerWattPrice] = useState('');

  const categories = ["Hybrid Inverter", "On-grid Inverter", "Solar Panel", "Lithium Battery", "Accessories"];

  useEffect(() => {
    fetchBrands();
  }, []);

  // ডাটাবেজ থেকে বিদ্যমান ব্র্যান্ডগুলো নিয়ে আসা
  const fetchBrands = async () => {
    const { data } = await supabase.from('products').select('name');
    if (data) {
      const uniqueBrands = [...new Set(data.map(item => item.name))];
      setBrands(uniqueBrands.sort());
    }
  };

  // সোলার প্যানেল হলে অটোমেটিক দাম ক্যালকুলেশন
  useEffect(() => {
    if (category === 'Solar Panel') {
      const total = (parseFloat(panelWatt) || 0) * (parseFloat(perWattPrice) || 0);
      setUnitPrice(total > 0 ? total.toString() : '');
    }
  }, [panelWatt, perWattPrice, category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !model || !unitPrice) return alert('দয়া করে সব প্রয়োজনীয় তথ্য দিন');

    setLoading(true);
    const finalPrice = parseFloat(unitPrice);

    const { error } = await supabase.from('products').insert([
      {
        name: name,
        category: category,
        model: model,
        unit_price: finalPrice,
        stock_quantity: 0, 
        availability: availability,
        image_url: imageUrl,
        house: house // হাউজ ডাটা সেভ হচ্ছে
      }
    ]);

    if (!error) {
      alert('✅ প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!');
      setModel('');
      setUnitPrice('');
      setPanelWatt('');
      setPerWattPrice('');
      setImageUrl('');
      if (entryMode === 'new') fetchBrands();
    } else {
      console.error(error);
      alert('❌ প্রোডাক্ট যুক্ত করতে সমস্যা হয়েছে!');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12" style={{fontFamily: "'Inter', 'Hind Siliguri', sans-serif"}}>
      
      {/* হেডার ও টগল বাটন */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">মডেল এন্ট্রি</h2>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button 
            type="button"
            onClick={() => setEntryMode('new')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${entryMode === 'new' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            নতুন ব্র্যান্ড
          </button>
          <button 
            type="button"
            onClick={() => { setEntryMode('existing'); setName(''); }}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${entryMode === 'existing' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            পুরনো ব্র্যান্ডে যোগ
          </button>
        </div>
      </div>

      {/* মেইন ফর্ম */}
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* বাম দিক (ইনপুট ফিল্ডস) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* ব্র্যান্ড নেম */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">ব্র্যান্ড / কোম্পানি</label>
              {entryMode === 'new' ? (
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ব্র্যান্ডের নাম লিখুন (যেমন: Sunland)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800" />
              ) : (
                <select value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800">
                  <option value="">ব্র্যান্ড সিলেক্ট করুন...</option>
                  {brands.map((b, i) => <option key={i} value={b}>{b}</option>)}
                </select>
              )}
            </div>

            {/* ক্যাটাগরি এবং হাউজ (এক রো-তে) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">প্রোডাক্ট ক্যাটাগরি</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-600">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-2 block">হাউজ (অবস্থান)</label>
                <select value={house} onChange={(e) => setHouse(e.target.value)} className="w-full p-4 bg-orange-50 border border-orange-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-orange-800">
                  <option value="Head Office">Head Office (HO)</option>
                  <option value="Showroom">Showroom</option>
                </select>
              </div>
            </div>

            {/* মডেল নম্বর */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">মডেল নম্বর / ক্যাপাসিটি</label>
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="যেমন: 550W Mono, 2000VA" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800" />
            </div>

            {/* ডাইনামিক প্রাইসিং সেকশন */}
            <div className="grid grid-cols-2 gap-4">
              {category === 'Solar Panel' ? (
                <>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2 block">প্যানেল ওয়াট (W)</label>
                    <input type="number" value={panelWatt} onChange={(e) => setPanelWatt(e.target.value)} placeholder="550" className="w-full p-4 bg-orange-50 border border-orange-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-orange-800" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2 block">প্রতি ওয়াট (৳)</label>
                    <input type="number" value={perWattPrice} onChange={(e) => setPerWattPrice(e.target.value)} placeholder="65" className="w-full p-4 bg-orange-50 border border-orange-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-orange-800" />
                  </div>
                  <div className="col-span-2 bg-orange-100/50 p-4 rounded-2xl flex justify-between items-center border border-orange-100">
                    <span className="text-xs font-black text-orange-600 uppercase tracking-widest">সর্বমোট পিস প্রতি দাম:</span>
                    <span className="text-xl font-black text-orange-700">{unitPrice || '0'} ৳</span>
                  </div>
                </>
              ) : (
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">ইউনিট প্রাইস (BDT)</label>
                  <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800" />
                </div>
              )}

              {/* স্ট্যাটাস */}
              <div className={category === 'Solar Panel' ? 'col-span-2' : 'col-span-1'}>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">অ্যাভেইল্যাবিলিটি</label>
                <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="w-full p-4 border border-slate-200 bg-slate-50 rounded-2xl outline-none font-bold">
                  <option value="in stock">In Stock</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
            </div>
          </div>

          {/* ডান দিক (ইমেজ আপলোড প্রিভিউ) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block text-center">প্রোডাক্ট ইমেজ</label>
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 flex flex-col items-center justify-center p-6 min-h-[250px] relative overflow-hidden group">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" />
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-2 opacity-20">📸</div>
                  <span className="text-slate-400 font-bold text-sm">ইমেজ প্রিভিউ</span>
                </div>
              )}
            </div>

            <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="ইমেজ লিংক (Direct URL)" className="w-full p-4 bg-orange-50 border border-orange-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium text-slate-700" />

            <button type="submit" disabled={loading} className="w-full mt-2 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-600 transition-all shadow-xl active:scale-95">
              {loading ? 'লোড হচ্ছে...' : 'পাবলিশ করুন'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
};

export default ProductEntry;