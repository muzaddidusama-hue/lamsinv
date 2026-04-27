import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';
import { downloadPDF } from '../utils/pdfGenerator';

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
    setCart([...cart, { category: product.category, name: product.name, model: product.model, unit_price: product.unit_price, qty: parseInt(qty), total: product.unit_price * parseInt(qty) }]);
    setSelectedProduct(''); setQty('');
  };

  const handlePriceChange = (idx, val) => {
    const updated = [...cart];
    updated[idx].unit_price = parseFloat(val) || 0;
    updated[idx].total = updated[idx].unit_price * updated[idx].qty;
    setCart(updated);
  };

  const handlePrint = () => {
    if (!name) return alert('কাস্টমারের নাম দিন!');
    if (cart.length === 0) return alert('কার্ট খালি!');
    const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
    const printItems = cart.map(item => ({ ...item, quantity: item.qty, total_price: item.total }));
    if (docType === 'bill') printBill({ bill_no: `BILL-${Date.now().toString().slice(-4)}`, total_amount: grandTotal, created_at: new Date().toISOString() }, { name, phone, address }, printItems);
    else printChallan({ chalan_no: `F-CHL-${Date.now().toString().slice(-4)}`, total_amount: grandTotal, created_at: new Date().toISOString() }, { name, phone, address }, printItems);
  };

  const handleDownload = () => {
    if (!name) return alert('কাস্টমারের নাম দিন!');
    if (cart.length === 0) return alert('কার্ট খালি!');
    const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
    const docData = { bill_no: `F-BILL-${Date.now().toString().slice(-4)}`, chalan_no: `F-CHL-${Date.now().toString().slice(-4)}`, created_at: new Date().toISOString(), total_amount: grandTotal };
    downloadPDF(docData, { name, phone, address }, cart, docType === 'bill' ? 'Bill' : 'Challan');
  };

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-10 px-4" style={{fontFamily: "'Hind Siliguri', sans-serif"}}>
      <div className="bg-slate-900 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 text-white shadow-xl">
        <div><h1 className="text-2xl font-black">⚡ False Billing</h1><p className="text-slate-400 text-xs">ডাটাবেজে সেভ হবে না</p></div>
        <div className="flex bg-slate-800 p-1.5 rounded-2xl"><button onClick={() => setDocType('bill')} className={`px-6 py-2 rounded-xl font-bold text-sm ${docType === 'bill' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>🧾 BILL</button><button onClick={() => setDocType('challan')} className={`px-6 py-2 rounded-xl font-bold text-sm ${docType === 'challan' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>📦 CHALLAN</button></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
            <input type="text" value={customerSearchText} onChange={handleCustomerSearch} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="স্মার্ট সার্চ..." className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none" />
            {showSuggestions && <div className="bg-white border rounded-xl shadow-xl max-h-40 overflow-y-auto">{customerSuggestions.map(c => <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border-b hover:bg-blue-50 cursor-pointer font-bold">{c.name}</div>)}</div>}
            <input type="text" placeholder="মোবাইল" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" /><input type="text" placeholder="নাম" value={name} onChange={e=>setName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" /><textarea placeholder="ঠিকানা" value={address} onChange={e=>setAddress(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold h-20" />
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4"><select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none">{products.map(p => (<option key={p.id} value={p.id}>{p.name} - {p.model}</option>))}</select><div className="flex gap-3"><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold" /><button onClick={addToCart} className="bg-slate-900 text-white px-8 rounded-2xl font-black">Add +</button></div></div>
        </div>
        <div className="lg:col-span-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full min-h-[500px]">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4">৩. ইনভয়েস প্রিভিউ</h3>
            <div className="flex-1 overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[10px] uppercase font-black text-slate-400 border-b"><th className="pb-4">Item</th><th className="pb-4 text-center">Qty</th><th className="pb-4 text-right">Price</th><th className="pb-4 text-right pr-4">Total</th><th></th></tr></thead><tbody className="divide-y divide-slate-50">{cart.map((item, idx) => (<tr key={idx}><td className="py-4 font-bold">{item.name} <br/><span className="text-xs text-slate-400">{item.model}</span></td><td className="py-4 text-center font-black">{item.qty}</td><td className="py-4 text-right"><input type="number" value={item.unit_price} onChange={(e) => handlePriceChange(idx, e.target.value)} className="w-24 text-right p-2 border border-slate-200 rounded-lg font-bold" /></td><td className="py-4 text-right font-black pr-4">{item.total} ৳</td><td className="py-4 text-right"><button onClick={() => {const nc = [...cart]; nc.splice(idx, 1); setCart(nc);}} className="text-red-300 font-bold">×</button></td></tr>))}</tbody></table></div>
            <div className="mt-8 pt-8 border-t border-slate-100 space-y-6"><div className="flex justify-between items-center"><span className="font-black text-slate-400 uppercase">Grand Total:</span><span className="text-4xl font-black text-slate-900">{grandTotal} ৳</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><button onClick={handlePrint} disabled={cart.length === 0} className="bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl active:scale-95 flex items-center justify-center gap-3">🖨️ প্রিন্ট</button><button onClick={handleDownload} disabled={cart.length === 0} className="bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl active:scale-95 flex items-center justify-center gap-3">📥 ডাউনলোড PDF</button></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FalseBilling;