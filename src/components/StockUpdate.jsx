import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [updateQty, setUpdateQty] = useState('');
  const [newPrice, setNewPrice] = useState(''); // প্রাইস আপডেট করার জন্য স্টেট
  const [type, setType] = useState('in');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name', { ascending: true });
    setProducts(data || []);
    setLoading(false);
  };

  const handleProductChange = (id) => {
    setSelectedProduct(id);
    const product = products.find(p => p.id === parseInt(id));
    if (product) {
      setNewPrice(product.unit_price); // প্রোডাক্ট সিলেক্ট করলে বর্তমান দাম বক্সে চলে আসবে
    } else {
      setNewPrice('');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return alert("প্রোডাক্ট সিলেক্ট করুন");

    setLoading(true);
    const product = products.find(p => p.id === parseInt(selectedProduct));
    
    let updatedStock = product.stock_quantity || 0;
    if (updateQty) {
      updatedStock = type === 'in' 
        ? updatedStock + parseInt(updateQty) 
        : updatedStock - parseInt(updateQty);
    }

    if (updatedStock < 0) {
      alert("স্টক মাইনাস হতে পারবে না!");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ 
        stock_quantity: updatedStock,
        unit_price: parseFloat(newPrice) || product.unit_price 
      })
      .eq('id', selectedProduct);

    if (!error) {
      alert("সফলভাবে আপডেট করা হয়েছে!");
      setUpdateQty('');
      fetchProducts();
    } else {
      alert("আপডেট ব্যর্থ হয়েছে!");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10" style={{fontFamily: "'Hind Siliguri', sans-serif"}}>
      
      {/* আপডেট ফর্ম */}
      <div className="bg-white p-8 lg:p-12 rounded-[3rem] shadow-xl border-4 border-orange-100">
        <h2 className="text-3xl font-black text-slate-800 mb-8 border-b pb-4">🔄 স্টক ও প্রাইস ম্যানেজমেন্ট</h2>
        
        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          
          {/* প্রোডাক্ট সিলেকশন */}
          <div className="md:col-span-4">
            <label className="block text-sm font-bold text-slate-500 mb-2">প্রোডাক্ট সিলেক্ট করুন</label>
            <select 
              value={selectedProduct} 
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold"
            >
              <option value="">বাছাই করুন...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.model}</option>
              ))}
            </select>
          </div>

          {/* প্রাইস ইনপুট - এটিই আপনার নতুন ঘর */}
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-orange-600 mb-2">নতুন ইউনিট প্রাইস (BDT)</label>
            <input 
              type="number" 
              value={newPrice} 
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="দাম লিখুন"
              className="w-full p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl outline-none focus:border-orange-500 font-black text-xl text-orange-700"
            />
          </div>

          {/* স্টক আপডেট */}
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-slate-500 mb-2">স্টক ইন/আউট</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={updateQty} 
                onChange={(e) => setUpdateQty(e.target.value)}
                placeholder="0"
                className="w-1/2 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
              />
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="w-1/2 p-2 bg-slate-200 rounded-2xl font-black text-xs"
              >
                <option value="in">যোগ (+)</option>
                <option value="out">বিয়োগ (-)</option>
              </select>
            </div>
          </div>

          {/* সাবমিট বাটন */}
          <div className="md:col-span-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95"
            >
              {loading ? '...' : 'সেভ'}
            </button>
          </div>
        </form>
      </div>

      {/* নিচের টেবিল */}
      <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr className="text-slate-400 uppercase text-xs font-black">
              <th className="px-8 py-5">মডেল</th>
              <th className="px-8 py-5 text-orange-600">বর্তমান দাম</th>
              <th className="px-8 py-5 text-center">স্টক</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-6 font-bold text-slate-800">
                  {p.name} <span className="block text-xs font-medium text-slate-400">{p.model}</span>
                </td>
                <td className="px-8 py-6 font-black text-slate-700">{p.unit_price} BDT</td>
                <td className="px-8 py-6 text-center font-black">{p.stock_quantity || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockManagement;