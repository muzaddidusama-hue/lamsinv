import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';

const FalseBilling = () => {
  const [docType, setDocType] = useState('bill'); 
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  
  // স্মার্ট সার্চের জন্য নতুন স্টেটস
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

  // স্মার্ট কাস্টমার সার্চ হ্যান্ডলার
  const handleCustomerSearch = async (e) => {
    const val = e.target.value;
    setCustomerSearchText(val);
    
    if (val.length >= 2) {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${val}%,phone.ilike.%${val}%`)
        .limit(15);
      
      setCustomerSuggestions(data || []);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (cust) => {
    setPhone(cust.phone || '');
    setName(cust.name || '');
    setAddress(cust.address || '');
    setCustomerSearchText('');
    setShowSuggestions(false);
  };

  const addToCart = () => {
    if (!selectedProduct || !qty || qty <= 0) return alert('প্রোডাক্ট এবং সঠিক পরিমাণ দিন');
    const product = products.find(p => p.id === parseInt(selectedProduct));

    const item = {
      category: product.category, name: product.name, model: product.model,
      unit_price: product.unit_price, qty: parseInt(qty), total: product.unit_price * parseInt(qty)
    };
    setCart([...cart, item]);
    setSelectedProduct(''); setQty('');
  };

  const removeFromCart = (index) => {
    const newCart = [...cart]; newCart.splice(index, 1); setCart(newCart);
  };

  const handlePriceChange = (idx, val) => {
    const updated = [...cart];
    updated[idx].unit_price = val;
    const priceNum = parseFloat(val) || 0;
    updated[idx].total = priceNum * updated[idx].qty;
    setCart(updated);
  };

  const handlePrint = () => {
    if (!name) return alert('কাস্টমারের নাম দিন!');
    if (cart.length === 0) return alert('কার্ট খালি!');

    const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
    const customerData = { name, phone: phone || '', address: address || '' };
    
    const printItems = cart.map(item => ({
      category: item.category, model: item.model, name: item.name, 
      quantity: item.qty, unit_price: item.unit_price, total_price: item.total
    }));

    if (docType === 'bill') {
      const fakeBill = { bill_no: `BLL-${Date.now().toString().slice(-6)}`, created_at: new Date().toISOString(), total_amount: grandTotal };
      printBill(fakeBill, customerData, printItems);
    } else {
      const fakeChalan = { chalan_no: `CHL-${Date.now().toString().slice(-6)}`, created_at: new Date().toISOString(), total_amount: grandTotal };
      printChallan(fakeChalan, customerData, printItems);
    }
  };

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-10" style={{fontFamily: "'Inter', 'Hind Siliguri', sans-serif"}}>
      
      <div className="bg-slate-900 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 text-white shadow-lg">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="text-red-400">⚡</span> One-Time Print (False System)
          </h1>
          <p className="text-slate-400 text-sm mt-1">এটি ডাটাবেজে সেভ হবে না এবং স্টক কমবে না।</p>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-xl">
          <button onClick={() => setDocType('bill')} className={`px-8 py-2 rounded-lg font-bold text-sm transition-all ${docType === 'bill' ? 'bg-orange-600 shadow-md text-white' : 'text-slate-400 hover:text-white'}`}>
            🧾 False Bill
          </button>
          <button onClick={() => setDocType('challan')} className={`px-8 py-2 rounded-lg font-bold text-sm transition-all ${docType === 'challan' ? 'bg-orange-600 shadow-md text-white' : 'text-slate-400 hover:text-white'}`}>
            📦 False Challan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-red-400 uppercase border-b border-red-50 pb-2">১. কাস্টমার ইনফো</h3>
            
            {/* স্মার্ট সার্চ বক্স */}
            <div className="relative z-50 mb-6 bg-red-50/50 p-4 rounded-xl border border-red-100">
              <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2 block">🔍 নিবন্ধিত কাস্টমার খুঁজুন</label>
              <input
                type="text"
                value={customerSearchText}
                onChange={handleCustomerSearch}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="নাম বা মোবাইল টাইপ করুন..."
                className="w-full p-3 bg-white border border-red-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-400"
              />
              {showSuggestions && customerSearchText.length >= 2 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {customerSuggestions.length > 0 ? (
                    customerSuggestions.map(cust => (
                      <div key={cust.id} onClick={() => selectCustomer(cust)} className="p-4 border-b border-slate-50 hover:bg-red-50 cursor-pointer transition-colors">
                        <p className="font-black text-slate-800">{cust.name}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">{cust.phone} {cust.address ? `• ${cust.address}` : ''}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 font-bold text-sm">কোনো কাস্টমার পাওয়া যায়নি</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="মোবাইল: 017..." className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none" /></div>
              <div><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম লিখুন" className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none" /></div>
            </div>
            <div><textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ঠিকানা" className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none h-20" /></div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-red-400 uppercase border-b border-red-50 pb-2">২. প্রোডাক্ট নির্বাচন</h3>
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none">
              <option value="">সিলেক্ট করুন...</option>
              {products.map(p => (<option key={p.id} value={p.id}>{p.name} - {p.model} ({p.unit_price}৳)</option>))}
            </select>
            <div className="flex gap-3">
              <div className="flex-1"><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none" /></div>
              <button onClick={addToCart} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700">Add +</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex flex-col h-full">
            <h3 className="text-sm font-black text-red-400 uppercase border-b border-red-50 pb-3 mb-4">৩. বর্তমান কার্ট {docType === 'bill' && <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">(Price Editable)</span>}</h3>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="text-[10px] uppercase font-black text-slate-400 bg-slate-50"><th className="p-3">Item</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Total</th><th className="p-3 text-right"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-bold">কার্ট খালি আছে</td></tr>}
                  {cart.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3"><div className="font-bold text-slate-900">{item.name}</div><div className="text-xs text-slate-500">{item.model}</div></td>
                      <td className="p-3 font-black text-center">{item.qty}</td>
                      <td className="p-3 text-right">
                        {docType === 'bill' ? (
                          <input type="number" value={item.unit_price} onChange={(e) => handlePriceChange(idx, e.target.value)} className="w-24 text-right p-2 font-bold border-2 border-red-200 rounded-lg outline-none focus:border-red-500" />
                        ) : (
                          <span className="font-medium text-slate-400 line-through">{item.unit_price}</span>
                        )}
                      </td>
                      <td className="p-3 font-black text-slate-900 text-right">{item.total} ৳</td>
                      <td className="p-3 text-right"><button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-700 font-bold text-xl">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="font-black text-slate-800 uppercase">Grand Total:</span><span className="text-2xl font-black text-red-600">{grandTotal} ৳</span>
              </div>
              
              <button onClick={handlePrint} disabled={cart.length === 0} className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-lg hover:bg-red-700 shadow-lg disabled:bg-slate-300">
                🖨️ Print False {docType === 'bill' ? 'Bill' : 'Challan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FalseBilling;