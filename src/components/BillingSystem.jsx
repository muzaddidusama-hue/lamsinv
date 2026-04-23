import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';

const BillingSystem = () => {
  const [house, setHouse] = useState('Head Office'); 
  const [isInHouse, setIsInHouse] = useState(false); 
  const [transferTo, setTransferTo] = useState('Showroom');

  // কাস্টমার স্টেটস
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  
  // স্মার্ট সার্চ স্টেটস
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAvailableProducts(); }, [house]);

  const fetchAvailableProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('house', house).gt('stock_quantity', 0).order('name');
    if (data) setProducts(data);
  };

  // অরিজিনাল স্মার্ট কাস্টমার সার্চ সাজেশন লজিক
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
    setPhone(cust.phone || ''); 
    setName(cust.name || ''); 
    setAddress(cust.address || ''); // কাস্টমার সিলেক্ট করলে অ্যাড্রেস অটো বসবে
    setCustomerSearchText(''); 
    setShowSuggestions(false);
  };

  const addToCart = () => {
    if (!selectedProduct || !qty || qty <= 0) return alert('সঠিক তথ্য দিন');
    const product = products.find(p => p.id === parseInt(selectedProduct));
    if (parseInt(qty) > product.stock_quantity) return alert(`স্টকে মাত্র ${product.stock_quantity} পিস আছে!`);

    const item = {
      product_id: product.id, name: product.name, model: product.model,
      unit_price: product.unit_price, qty: parseInt(qty), total: product.unit_price * parseInt(qty)
    };
    setCart([...cart, item]);
    setSelectedProduct(''); setQty('');
  };

  const handleGenerateChallan = async () => {
    if (!isInHouse && (!phone || !name)) return alert('কাস্টমারের তথ্য দিন!');
    if (cart.length === 0) return alert('কার্টে মাল যোগ করুন!');

    setLoading(true);
    try {
      let customerId = null;
      if (!isInHouse) {
        // কাস্টমার চেক/আপডেট
        const { data: existingCust } = await supabase.from('customers').select('id').eq('phone', phone).single();
        if (existingCust) {
          customerId = existingCust.id;
          await supabase.from('customers').update({ name, address }).eq('id', customerId);
        } else {
          const { data: newCust } = await supabase.from('customers').insert([{ phone, name, address }]).select().single();
          customerId = newCust.id;
        }
      }

      const chalanNo = `CHL-${Date.now().toString().slice(-6)}`;
      
      // চালান ডাটা অবজেক্ট
      const insertData = {
        chalan_no: chalanNo,
        status: 'hold',
        total_amount: cart.reduce((acc, item) => acc + item.total, 0),
        house: house,
        customer_id: customerId, // কাস্টমার আইডি এখানে সেভ হবে
        is_in_house: isInHouse,
        transfer_to: isInHouse ? transferTo : null
      };

      const { data: chalanData, error: chalanErr } = await supabase.from('chalans').insert([insertData]).select().single();

      if (chalanErr) {
        console.error(chalanErr);
        throw new Error("চালান সেভ করতে সমস্যা হয়েছে। ডাটাবেজ কলাম চেক করুন।");
      }

      for (let item of cart) {
        await supabase.from('chalan_items').insert([{
          chalan_id: chalanData.id, product_id: item.product_id, quantity: item.qty, unit_price: item.unit_price, total_price: item.total
        }]);
        const prod = products.find(p => p.id === item.product_id);
        await supabase.from('products').update({ stock_quantity: prod.stock_quantity - item.qty }).eq('id', prod.id);
      }

      alert('✅ সফলভাবে তৈরি হয়েছে!');
      setCart([]); setPhone(''); setName(''); setAddress('');
    } catch (e) { 
      alert(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 p-4">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">🧾 চালান ও বিলিং</h1>
        <button onClick={() => { setIsInHouse(!isInHouse); setCart([]); }} className={`px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${isInHouse ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
          {isInHouse ? '🏠 ইন-হাউজ মোড: ON' : '🛒 রেগুলার মোড: ON'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">১. সোর্স হাউজ</label>
                <div className="flex gap-6">
                   <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={house==='Head Office'} onChange={()=>setHouse('Head Office')} /> HO</label>
                   <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={house==='Showroom'} onChange={()=>setHouse('Showroom')} /> Showroom</label>
                </div>
             </div>

             {isInHouse ? (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-blue-400 uppercase block mb-2">গন্তব্য হাউজ (Transfer To)</label>
                  <select value={transferTo} onChange={(e)=>setTransferTo(e.target.value)} className="w-full p-3 bg-white border rounded-xl font-bold outline-none">
                    <option value="Head Office">Head Office</option>
                    <option value="Showroom">Showroom</option>
                  </select>
                </div>
             ) : (
                <div className="space-y-4 animate-in fade-in">
                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">কাস্টমার খুঁজুন (স্মার্ট সার্চ)</label>
                    <input type="text" value={customerSearchText} onChange={handleCustomerSearch} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="নাম বা মোবাইল টাইপ করুন..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                    {showSuggestions && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto overflow-x-hidden">
                        {customerSuggestions.map(c => <div key={c.id} onClick={() => selectCustomer(c)} className="p-4 border-b hover:bg-blue-50 cursor-pointer font-bold text-slate-700">{c.name} - {c.phone}</div>)}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <input type="text" placeholder="মোবাইল নম্বর" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold" />
                    <input type="text" placeholder="কাস্টমার/কোম্পানির নাম" value={name} onChange={e=>setName(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold" />
                    <textarea placeholder="বিস্তারিত ঠিকানা" value={address} onChange={e=>setAddress(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold h-20" />
                  </div>
                </div>
             )}
          </div>
          
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase block">২. প্রোডাক্ট নির্বাচন</label>
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900">
              <option value="">সিলেক্ট করুন...</option>
              {products.map(p => (<option key={p.id} value={p.id}>{p.name} - {p.model} [স্টক: {p.stock_quantity}]</option>))}
            </select>
            <div className="flex gap-3">
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="পরিমাণ" className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold outline-none" />
              <button onClick={addToCart} className="bg-slate-900 text-white px-8 rounded-2xl font-bold hover:bg-orange-600 transition-all">Add</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col h-full min-h-[500px]">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4">৩. বর্তমান কার্ট</h3>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="text-[10px] uppercase font-black text-slate-400"><th className="p-4">Item</th><th className="p-4 text-center">Qty</th>{!isInHouse && <th className="p-4 text-right">Price</th>}{!isInHouse && <th className="p-4 text-right">Total</th>}<th className="p-4"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.length === 0 ? <tr><td colSpan="5" className="p-10 text-center font-bold text-slate-300 italic">কার্ট খালি আছে</td></tr> : cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{item.name} <span className="text-xs text-slate-400 block font-medium">{item.model}</span></td>
                      <td className="p-4 text-center font-black">{item.qty}</td>
                      {!isInHouse && <td className="p-4 text-right">{item.unit_price} ৳</td>}
                      {!isInHouse && <td className="p-4 text-right font-black text-slate-900">{item.total} ৳</td>}
                      <td className="p-4 text-right"><button onClick={() => {const nc = [...cart]; nc.splice(idx, 1); setCart(nc);}} className="text-red-400 text-xl font-bold hover:text-red-600">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</p>
                <p className="text-3xl font-black text-slate-900">{cart.reduce((acc, item) => acc + item.total, 0)} ৳</p>
              </div>
              <button onClick={handleGenerateChallan} disabled={loading || cart.length === 0} className={`px-12 py-5 rounded-2xl font-black text-lg text-white shadow-xl transition-all active:scale-95 ${isInHouse ? 'bg-blue-600' : 'bg-slate-900'}`}>
                {loading ? 'প্রসেসিং...' : (isInHouse ? `Confirm Transfer to ${transferTo}` : 'Generate & Hold Stock')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BillingSystem;