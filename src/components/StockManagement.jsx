import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // হাউজ ফিল্টার স্টেট
  const [activeHouse, setActiveHouse] = useState('Head Office'); 
  
  const [updateModal, setUpdateModal] = useState(false);
  const [modalType, setModalType] = useState('stock'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [purchaseSource, setPurchaseSource] = useState('Import');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  // 🔴 নতুন টগল ফাংশন: পাবলিক অ্যাভেইল্যাবিলিটি পরিবর্তন করার জন্য
  const toggleAvailability = async (product) => {
    const newStatus = product.availability === 'in stock' ? 'out of stock' : 'in stock';
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ availability: newStatus })
        .eq('id', product.id);

      if (error) throw error;

      // লোকাল স্টেট আপডেট যাতে সাথে সাথে বাটনের রঙ পরিবর্তন হয়
      setProducts(products.map(p => p.id === product.id ? { ...p, availability: newStatus } : p));
    } catch (error) {
      alert('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে!');
    }
  };

  const handleDataSave = async () => {
    if (!selectedProduct || !newValue || newValue < 0) return alert('সঠিক তথ্য দিন!');
    
    let updateData = {};
    if (modalType === 'stock') {
      updateData = { stock_quantity: selectedProduct.stock_quantity + parseInt(newValue) };
    } else {
      updateData = { unit_price: parseFloat(newValue) };
    }
    
    try {
      const { error } = await supabase.from('products').update(updateData).eq('id', selectedProduct.id);
      if (error) throw error;

      alert(`✅ ${modalType === 'stock' ? 'স্টক' : 'দাম'} সফলভাবে আপডেট হয়েছে!`);
      setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, ...updateData } : p));
      closeModal();
    } catch (error) {
      alert('আপডেট করতে সমস্যা হয়েছে!');
    }
  };

  const closeModal = () => {
    setUpdateModal(false);
    setSelectedProduct(null);
    setNewValue('');
  };

  const filteredProducts = products.filter(p => 
    (p.house === activeHouse) && 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.model.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-20 px-2 md:px-0" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* টপ সেকশন */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800">📊 স্টক ম্যানেজমেন্ট</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Management</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-2xl self-stretch md:self-auto">
            <button 
              onClick={() => setActiveHouse('Head Office')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black text-xs transition-all ${activeHouse === 'Head Office' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              🏢 HEAD OFFICE
            </button>
            <button 
              onClick={() => setActiveHouse('Showroom')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black text-xs transition-all ${activeHouse === 'Showroom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              🏪 SHOWROOM
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            placeholder={`🔍 সার্চ করুন (${activeHouse}-এ)...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all" 
          />
          <div className="flex gap-2">
             <button onClick={() => { setModalType('price'); setUpdateModal(true); }} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all">💰 আপডেট প্রাইস</button>
             <button onClick={() => { setModalType('stock'); setUpdateModal(true); }} className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all">➕ নতুন স্টক</button>
          </div>
        </div>
      </div>

      {/* টেবিল */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[10px] uppercase font-black text-slate-400">
                <th className="p-5">প্রোডাক্ট ইনফো</th>
                <th className="p-5 text-right">দাম</th>
                <th className="p-5 text-center">স্টক ({activeHouse})</th>
                <th className="p-5 text-center">পাবলিক পেজ স্ট্যাটাস</th> {/* 🔴 নতুন কলাম */}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-300 italic">লোড হচ্ছে...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-300 italic">কোনো প্রোডাক্ট পাওয়া যায়নি</td></tr>
              ) : filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="p-5">
                    <div className="font-black text-slate-900">{p.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{p.model}</div>
                  </td>
                  <td className="p-5 text-right font-black">{p.unit_price} ৳</td>
                  <td className="p-5 text-center font-black">
                    <span className={`px-3 py-1 rounded-lg ${p.stock_quantity <= 10 ? 'bg-red-50 text-red-600' : 'bg-slate-100'}`}>
                      {p.stock_quantity} PCS
                    </span>
                  </td>
                  {/* 🔴 পাবলিক স্ট্যাটাস টগল সুইচ */}
                  <td className="p-5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button 
                        onClick={() => toggleAvailability(p)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${p.availability === 'in stock' ? 'bg-green-500' : 'bg-red-500'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.availability === 'in stock' ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <span className={`text-[8px] font-black uppercase ${p.availability === 'in stock' ? 'text-green-600' : 'text-red-500'}`}>
                        {p.availability === 'in stock' ? 'Public: In Stock' : 'Public: Out Stock'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* মডাল কোড */}
      {updateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6">
                <h3 className="text-2xl font-black text-slate-900">{modalType === 'stock' ? '➕ ইনভেন্টরি আপডেট' : '💰 প্রাইস আপডেট'}</h3>
                <p className="text-sm font-bold text-slate-400">প্রোডাক্ট সিলেক্ট করে নতুন ডাটা দিন</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">প্রোডাক্ট নির্বাচন করুন</label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)))}
                >
                  <option value="">সিলেক্ট করুন...</option>
                  {products.filter(p => p.house === activeHouse).map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.model} (বর্তমান: {modalType === 'stock' ? p.stock_quantity : p.unit_price})</option>
                  ))}
                </select>
              </div>

              {modalType === 'stock' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">মাল আসার সোর্স (Source)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Import', 'Out Purchase'].map(s => (
                      <button key={s} onClick={() => setPurchaseSource(s)} className={`p-4 rounded-2xl font-black text-xs md:text-sm border-2 transition-all ${purchaseSource === s ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-100 text-slate-400'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  {modalType === 'stock' ? 'কত পিস নতুন যোগ হবে? (Qty)' : 'নতুন ইউনিট প্রাইস কত হবে? (৳)'}
                </label>
                <input 
                  type="number" 
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="সংখ্যা লিখুন..."
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-2xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={closeModal} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600">বাতিল</button>
                <button onClick={handleDataSave} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-600 transition-all shadow-lg active:scale-95">
                  কনফার্ম করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;