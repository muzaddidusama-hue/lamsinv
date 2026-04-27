import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';
import { downloadPDF } from '../utils/pdfGenerator';

const BillingSystem = () => {
  const [house, setHouse] = useState('Head Office'); 
  const [isInHouse, setIsInHouse] = useState(false); 
  const [transferTo, setTransferTo] = useState('Showroom');
  const [isManualChalan, setIsManualChalan] = useState(false);
  const [manualChalanNo, setManualChalanNo] = useState('');

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
  const [loading, setLoading] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [quickBillMode, setQuickBillMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isManualBill, setIsManualBill] = useState(false);
  const [manualBillNo, setManualBillNo] = useState('');

  useEffect(() => { fetchAvailableProducts(); }, [house]);

  const fetchAvailableProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('house', house).gt('stock_quantity', 0).order('name');
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
    if (!selectedProduct || !qty || qty <= 0) return alert('সঠিক তথ্য দিন');
    const product = products.find(p => p.id === parseInt(selectedProduct));
    if (parseInt(qty) > product.stock_quantity) return alert(`স্টকে মাত্র ${product.stock_quantity} পিস আছে!`);
    setCart([...cart, { 
        product_id: product.id, 
        name: product.name, 
        model: product.model, 
        category: product.category, 
        unit_price: product.unit_price, 
        qty: parseInt(qty), 
        total: product.unit_price * parseInt(qty) 
    }]);
    setSelectedProduct(''); setQty('');
  };

  const handleGenerateChallan = async () => {
    if (!isInHouse && (!phone || !name)) return alert('কাস্টমারের তথ্য দিন!');
    if (cart.length === 0) return alert('কার্টে মাল যোগ করুন!');
    if (isManualChalan && !manualChalanNo) return alert('ম্যানুয়াল চালান নম্বর দিন!');

    setLoading(true);
    try {
      let customerId = null;
      let customerData = { name, phone, address };

      if (!isInHouse) {
        const { data: existingCust } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle();
        if (existingCust) {
          customerId = existingCust.id;
          await supabase.from('customers').update({ name, address }).eq('id', customerId);
        } else {
          const { data: newCust } = await supabase.from('customers').insert([{ phone, name, address }]).select().single();
          customerId = newCust.id;
        }
      } else {
        customerData = { name: `Transfer: ${house} to ${transferTo}`, phone: '-', address: '-' };
      }

      const chalanNo = isManualChalan ? manualChalanNo : `CHL-${Date.now().toString().slice(-6)}`;
      const { data: chalanData, error: chalanErr } = await supabase.from('chalans').insert([{
        chalan_no: chalanNo, status: 'hold', total_amount: cart.reduce((acc, item) => acc + item.total, 0),
        house, customer_id: customerId, is_in_house: isInHouse, transfer_to: isInHouse ? transferTo : null
      }]).select().single();

      if (chalanErr) throw chalanErr;

      const itemsForPrint = [];
      for (let item of cart) {
        await supabase.from('chalan_items').insert([{ chalan_id: chalanData.id, product_id: item.product_id, quantity: item.qty, unit_price: item.unit_price, total_price: item.total }]);
        await supabase.from('products').update({ stock_quantity: products.find(p => p.id === item.product_id).stock_quantity - item.qty }).eq('id', item.product_id);
        itemsForPrint.push({ ...item, quantity: item.qty, total_price: item.total });
      }

      setGeneratedData({ chalan: chalanData, customer: customerData, items: itemsForPrint });
      setShowSuccessModal(true);
      setCart([]); setPhone(''); setName(''); setAddress(''); setIsManualChalan(false); setManualChalanNo('');
      fetchAvailableProducts();
    } catch (e) { alert("ত্রুটি হয়েছে!"); }
    setLoading(false);
  };

  const handleQuickBillConfirm = async () => {
    if (!paymentMethod) return alert('পেমেন্ট মেথড সিলেক্ট করুন!');
    setLoading(true);
    try {
      const billNo = isManualBill ? manualBillNo : `BLL-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from('chalans').update({ status: 'paid', payment_method: paymentMethod, bill_no: billNo }).eq('id', generatedData.chalan.id);
      if (error) throw error;
      alert(`✅ বিল তৈরি হয়েছে! নং: ${billNo}`);
      
      const billToPrint = { ...generatedData.chalan, bill_no: billNo, payment_method: paymentMethod };
      printBill(billToPrint, generatedData.customer, generatedData.items);
      
      setShowSuccessModal(false);
      setQuickBillMode(false);
    } catch (e) { alert("সমস্যা হয়েছে!"); }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 p-4" style={{fontFamily: "'Hind Siliguri', sans-serif"}}>
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">🧾 চালান ও বিলিং</h1>
        <button onClick={() => { setIsInHouse(!isInHouse); setCart([]); }} className={`px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${isInHouse ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
          {isInHouse ? '🏠 ইন-হাউজ মোড: ON' : '🛒 রেগুলার মোড: ON'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
             <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={isManualChalan} onChange={(e) => setIsManualChalan(e.target.checked)} className="accent-orange-600" />
                  <span className="text-[10px] font-black text-orange-700 uppercase">ম্যানুয়াল চালান নম্বর?</span>
                </label>
                {isManualChalan && <input type="text" value={manualChalanNo} onChange={(e) => setManualChalanNo(e.target.value)} placeholder="CHL-2025" className="w-full p-3 bg-white border border-orange-200 rounded-xl font-bold uppercase outline-none" />}
             </div>

             <div className="bg-slate-50 p-4 rounded-2xl border">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">১. সোর্স হাউজ</label>
                <div className="flex gap-6">
                   <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={house==='Head Office'} onChange={()=>setHouse('Head Office')} /> HO</label>
                   <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={house==='Showroom'} onChange={()=>setHouse('Showroom')} /> Showroom</label>
                </div>
             </div>

             {isInHouse ? (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-bold text-blue-400 uppercase block mb-2">গন্তব্য হাউজ (Transfer To)</label>
                  <select value={transferTo} onChange={(e)=>setTransferTo(e.target.value)} className="w-full p-3 bg-white border rounded-xl font-bold outline-none">
                    <option value="Head Office">Head Office</option><option value="Showroom">Showroom</option>
                  </select>
                </div>
             ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <input type="text" value={customerSearchText} onChange={handleCustomerSearch} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="স্মার্ট সার্চ (নাম/মোবাইল)..." className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none" />
                    {showSuggestions && <div className="absolute top-full left-0 w-full z-50 bg-white border rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">{customerSuggestions.map(c => <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border-b hover:bg-blue-50 cursor-pointer font-bold">{c.name} - {c.phone}</div>)}</div>}
                  </div>
                  <input type="text" placeholder="মোবাইল" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
                  <input type="text" placeholder="নাম" value={name} onChange={e=>setName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
                  <input type="text" placeholder="ঠিকানা" value={address} onChange={e=>setAddress(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
                </div>
             )}
          </div>
          
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">২. প্রোডাক্ট নির্বাচন</h2>
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900">
              <option value="">প্রোডাক্ট সিলেক্ট করুন...</option>
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
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="text-[10px] font-black text-slate-400 uppercase border-b pb-2"><th className="pb-4">Item</th><th className="pb-4 text-center">Qty</th><th className="pb-4 text-right">Price</th><th className="pb-4 text-right">Total</th><th className="pb-4"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 font-bold text-slate-800">{item.name} <span className="text-xs text-slate-400 block font-medium">{item.model}</span></td>
                      <td className="py-4 text-center font-black">{item.qty}</td>
                      <td className="py-4 text-right font-medium text-slate-500">{item.unit_price} ৳</td>
                      <td className="py-4 text-right font-black text-slate-900">{item.total} ৳</td>
                      <td className="py-4 text-right"><button onClick={() => {const nc = [...cart]; nc.splice(idx, 1); setCart(nc);}} className="text-red-400 font-bold text-xl">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-6 border-t flex justify-between items-center">
              <div className="text-2xl font-black text-slate-900">{cart.reduce((acc, item) => acc + item.total, 0)} ৳</div>
              <button onClick={handleGenerateChallan} disabled={loading || cart.length === 0} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black shadow-lg hover:bg-orange-600 transition-all uppercase tracking-tighter">Generate Challan</button>
            </div>
          </div>
        </div>
      </div>

      {showSuccessModal && generatedData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            {!quickBillMode ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                <h2 className="text-2xl font-black mb-2">চালান তৈরি হয়েছে!</h2>
                <p className="font-bold text-slate-400 mb-6 uppercase">নং: {generatedData.chalan.chalan_no}</p>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => printChallan(generatedData.chalan, generatedData.customer, generatedData.items)} className="bg-slate-900 text-white py-4 rounded-xl font-bold uppercase text-xs">🖨️ প্রিন্ট চালান</button>
                     <button onClick={() => downloadPDF(generatedData.chalan, generatedData.customer, generatedData.items, 'Challan')} className="bg-blue-600 text-white py-4 rounded-xl font-bold uppercase text-xs">📥 ডাউনলোড PDF</button>
                  </div>
                  {!isInHouse && <button onClick={() => setQuickBillMode(true)} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg uppercase tracking-widest">💰 সরাসরি বিল তৈরি করুন</button>}
                  <button onClick={() => setShowSuccessModal(false)} className="mt-2 text-slate-400 font-bold">পরে করবো / বন্ধ করুন</button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <h2 className="text-xl font-black border-b pb-3">বিল কনফার্মেশন</h2>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={isManualBill} onChange={(e) => setIsManualBill(e.target.checked)} />
                    <span className="text-xs font-black text-orange-700 uppercase">ম্যানুয়াল বিল নম্বর?</span>
                  </label>
                  {isManualBill && <input type="text" value={manualBillNo} onChange={(e) => setManualBillNo(e.target.value)} placeholder="BLL-OFF-101" className="w-full p-3 bg-white border border-orange-200 rounded-xl font-bold uppercase outline-none" />}
                </div>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black outline-none focus:border-green-500 shadow-sm">
                  <option value="">পেমেন্ট মেথড...</option><option value="Cash">Cash (💵)</option><option value="bKash">bKash (📱)</option><option value="Bank">Bank (🏦)</option>
                </select>
                <button onClick={handleQuickBillConfirm} disabled={loading || !paymentMethod} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest active:scale-95 transition-all">কনফার্ম ও বিল প্রিন্ট</button>
                
                <div className="flex justify-center">
                    <button onClick={() => downloadPDF(generatedData.chalan, generatedData.customer, generatedData.items, 'Challan')} className="text-blue-600 font-bold text-sm underline">📥 আপাতত চালানটি PDF ডাউনলোড করুন</button>
                </div>

                <button onClick={() => setQuickBillMode(false)} className="w-full text-slate-400 font-bold text-center">পিছনে যান</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSystem;