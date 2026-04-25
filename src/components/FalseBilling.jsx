import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';

const FalseBilling = () => {
  const [docType, setDocType] = useState('bill'); 
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('');
  const [cart, setCart] = useState([]);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (data) setProducts(data);
  };

  const handleCustomerSearch = async (e) => {
    const val = e.target.value;
    setCustomerSearchText(val);
    if (val.length >= 2) {
      const { data } = await supabase.from('customers').select('*').or(`name.ilike.%${val}%,phone.ilike.%${val}%`).limit(10);
      setCustomerSuggestions(data || []);
      setShowSuggestions(true);
    } else { setShowSuggestions(false); }
  };

  const selectCustomer = (cust) => {
    setPhone(cust.phone || ''); setName(cust.name || ''); setAddress(cust.address || '');
    setCustomerSearchText(''); setShowSuggestions(false);
  };

  const addToCart = () => {
    if (!selectedProduct || !qty || qty <= 0) return alert('প্রোডাক্ট এবং সঠিক পরিমাণ দিন');
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setCart([...cart, { 
      category: product.category, name: product.name, model: product.model,
      unit_price: product.unit_price, qty: parseInt(qty), total: product.unit_price * parseInt(qty)
    }]);
    setSelectedProduct(''); setQty('');
  };

  const handlePriceChange = (idx, val) => {
    const updated = [...cart];
    updated[idx].unit_price = parseFloat(val) || 0;
    updated[idx].total = updated[idx].unit_price * updated[idx].qty;
    setCart(updated);
  };

  // প্রিন্ট এবং পিডিএফ ডাউনলোড লজিক (একই ফাংশন ব্যবহার করে যা ব্রাউজার ডায়ালগ ওপেন করবে)
  const handleAction = () => {
    if (!name) return alert('কাস্টমারের নাম দিন!');
    if (cart.length === 0) return alert('কার্ট খালি!');

    const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
    const customerData = { name, phone: phone || '', address: address || '' };
    const printItems = cart.map(item => ({
      category: item.category, model: item.model, name: item.name, 
      quantity: item.qty, unit_price: item.unit_price, total_price: item.total
    }));

    if (docType === 'bill') {
      const fakeBill = { bill_no: `BLL-F-${Date.now().toString().slice(-4)}`, created_at: new Date().toISOString(), total_amount: grandTotal };
      printBill(fakeBill, customerData, printItems);
    } else {
      const fakeChalan = { chalan_no: `CHL-F-${Date.now().toString().slice(-4)}`, created_at: new Date().toISOString(), total_amount: grandTotal };
      printChallan(fakeChalan, customerData, printItems);
    }
  };

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-10 px-4" style={{fontFamily: "'Inter', 'Hind Siliguri', sans-serif"}}>
      
      <div className="bg-slate-900 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 text-white shadow-xl">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">⚡ False Billing System</h1>
          <p className="text-slate-400 text-xs">অফলাইন এন্ট্রি (ডাটাবেজে সেভ হবে না)</p>
        </div>
        <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button onClick={() => setDocType('bill')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${docType === 'bill' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}>🧾 BILL</button>
          <button onClick={() => setDocType('challan')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${docType === 'challan' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}>📦 CHALLAN</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">১. কাস্টমার তথ্য</h3>
            <div className="relative">
              <input type="text" value={customerSearchText} onChange={handleCustomerSearch} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="নিবন্ধিত কাস্টমার খুঁজুন..." className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              {showSuggestions && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border rounded-2xl shadow-2xl z-[100] max-h-48 overflow-y-auto">
                  {customerSuggestions.map(c => <div key={c.id} onClick={() => selectCustomer(c)} className="p-4 border-b hover:bg-slate-50 cursor-pointer font-bold text-sm">{c.name} - {c.phone}</div>)}
                </div>
              )}
            </div>
            <input type="text" placeholder="মোবাইল" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
            <input type="text" placeholder="নাম" value={name} onChange={e=>setName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
            <textarea placeholder="ঠিকানা" value={address} onChange={e=>setAddress(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold h-20" />
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">২. প্রোডাক্ট নির্বাচন</h3>
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none">
              <option value="">সিলেক্ট করুন...</option>
              {products.map(p => (<option key={p.id} value={p.id}>{p.name} - {p.model}</option>))}
            </select>
            <div className="flex gap-3">
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold" />
              <button onClick={addToCart} className="bg-slate-900 text-white px-8 rounded-2xl font-black">Add +</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full min-h-[500px]">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4">৩. ইনভয়েস প্রিভিউ</h3>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="text-[10px] uppercase font-black text-slate-400 border-b"><th className="pb-4">Item</th><th className="pb-4 text-center">Qty</th><th className="pb-4 text-right">Price</th><th className="pb-4 text-right pr-4">Total</th><th></th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {cart.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="py-4 font-bold text-slate-800">{item.name} <br/><span className="text-xs text-slate-400 font-medium">{item.model}</span></td>
                      <td className="py-4 text-center font-black">{item.qty}</td>
                      <td className="py-4 text-right"><input type="number" value={item.unit_price} onChange={(e) => handlePriceChange(idx, e.target.value)} className="w-24 text-right p-2 border-2 border-slate-100 rounded-lg font-bold outline-none focus:border-orange-500" /></td>
                      <td className="py-4 text-right font-black text-slate-900 pr-4">{item.total} ৳</td>
                      <td className="py-4 text-right"><button onClick={() => {const nc = [...cart]; nc.splice(idx, 1); setCart(nc);}} className="text-red-300 hover:text-red-500 font-bold">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
              <div className="flex justify-between items-center px-2">
                <span className="font-black text-slate-400 uppercase">Grand Total:</span>
                <span className="text-4xl font-black text-slate-900">{grandTotal} ৳</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleAction} 
                  disabled={cart.length === 0} 
                  className="bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-xl hover:bg-orange-600 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  🖨️ প্রিন্ট বিল/চালান
                </button>
                <button 
                  onClick={handleAction} 
                  disabled={cart.length === 0} 
                  className="bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-xl hover:bg-blue-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  📥 PDF ডাউনলোড
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FalseBilling;