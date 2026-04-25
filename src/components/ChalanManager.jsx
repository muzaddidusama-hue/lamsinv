import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';

const ChalanManager = () => {
  const [searchNo, setSearchNo] = useState('');
  const [chalan, setChalan] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingChalans, setPendingChalans] = useState([]);
  
  const [paymentMethod, setPaymentMethod] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isManualBill, setIsManualBill] = useState(false);
  const [manualBillNo, setManualBillNo] = useState('');

  useEffect(() => { fetchPendingChalans(); }, [chalan]); 

  const fetchPendingChalans = async () => {
    const { data } = await supabase
      .from('chalans')
      .select(`*, customers (name, phone, address)`)
      .eq('status', 'hold')
      .order('created_at', { ascending: false });
    if (data) setPendingChalans(data);
  };

  const loadChalanDetails = async (cNo) => {
    setLoading(true); setChalan(null); setItems([]);
    try {
      const { data: chalanData, error: chalanErr } = await supabase
        .from('chalans')
        .select(`*, customers (name, phone, address)`)
        .eq('chalan_no', cNo.toUpperCase())
        .single();
      
      if (chalanErr || !chalanData) throw chalanErr;
      setChalan(chalanData);

      const { data: itemData } = await supabase
        .from('chalan_items')
        .select(`*, products (*)`)
        .eq('chalan_id', chalanData.id);
      
      setItems(itemData || []);
      setSearchNo(cNo); 
    } catch (error) { alert("চালান খুঁজে পাওয়া যায়নি!"); }
    setLoading(false);
  };

  const handlePaymentConfirm = async () => {
    if (!paymentMethod) return alert('পেমেন্ট মেথড দিন!');
    if (isManualBill && !manualBillNo) return alert('ম্যানুয়াল বিল নম্বর দিন!');
    
    setProcessingPayment(true);
    try {
      // ১. বিল নম্বর নির্ধারণ (ম্যানুয়াল বা অটো)
      const billNo = isManualBill ? manualBillNo : `BLL-${Date.now().toString().slice(-6)}`;
      
      // ২. ডাটাবেজ আপডেট (স্ট্যাটাস 'paid' করা)
      const { error } = await supabase
        .from('chalans')
        .update({ 
          status: 'paid', 
          payment_method: paymentMethod, 
          bill_no: billNo 
        })
        .eq('id', chalan.id);

      if (error) throw error;

      // ৩. প্রিন্ট এর জন্য ডাটা প্রিপেয়ার করা
      const billData = { 
        ...chalan, 
        bill_no: billNo, 
        payment_method: paymentMethod,
        created_at: new Date().toISOString() // কারেন্ট টাইম
      };

      const printItems = items.map(item => ({
        ...item.products,
        quantity: item.quantity,
        total_price: item.total_price,
        unit_price: item.unit_price
      }));

      alert(`✅ পেমেন্ট সফল! বিল নং: ${billNo}`);

      // ৪. অটোমেটিক বিল প্রিন্টিং উইন্ডো ওপেন হবে
      printBill(billData, chalan.customers, printItems);

      // ৫. স্টেট রিসেট
      setChalan(null); 
      setIsManualBill(false); 
      setManualBillNo(''); 
      fetchPendingChalans();
    } catch (error) { 
      alert('পেমেন্ট আপডেট করতে সমস্যা হয়েছে!'); 
      console.error(error);
    }
    setProcessingPayment(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 p-4" style={{fontFamily: "'Inter', 'Hind Siliguri', sans-serif"}}>
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <form onSubmit={(e) => {e.preventDefault(); loadChalanDetails(searchNo);}} className="flex gap-4">
          <input type="text" value={searchNo} onChange={(e) => setSearchNo(e.target.value)} placeholder="CHL-123456" className="flex-1 h-14 px-6 bg-slate-50 border rounded-2xl font-black text-slate-800 uppercase outline-none focus:ring-2 focus:ring-slate-900" />
          <button type="submit" className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-bold">সার্চ</button>
        </form>
      </div>

      {!chalan ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pendingChalans.map((pc) => (
            <div key={pc.id} onClick={() => loadChalanDetails(pc.chalan_no)} className="bg-white p-6 rounded-3xl border cursor-pointer hover:border-orange-500 transition-all group shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black px-3 py-1 rounded-full bg-orange-50 text-orange-600 uppercase">Hold</span>
                <span className="text-[10px] font-bold text-slate-400">{new Date(pc.created_at).toLocaleDateString()}</span>
              </div>
              <h4 className="font-black text-slate-900 text-xl group-hover:text-orange-600">{pc.chalan_no}</h4>
              <p className="text-sm font-bold text-slate-500 mt-1">{pc.customers?.name || 'Unknown Customer'}</p>
              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Amount</span>
                <span className="font-black text-slate-800 text-lg">{pc.total_amount} ৳</span>
              </div>
            </div>
          ))}
          {pendingChalans.length === 0 && <p className="col-span-full py-10 text-center font-bold text-slate-300 italic">কোনো পেন্ডিং চালান নেই</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in-95">
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className="flex justify-between items-center border-b pb-6 mb-6">
              <div>
                <h2 className="text-2xl font-black">{chalan.chalan_no}</h2>
                <p className="text-xs text-slate-400">Date: {new Date(chalan.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => printChallan(chalan, chalan.customers, items.map(i => ({...i.products, quantity: i.quantity, total_price: i.total_price})))} className="bg-slate-100 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200">🖨️ প্রিন্ট চালান</button>
            </div>
            <table className="w-full text-left mb-6">
              <thead className="text-[10px] uppercase font-black text-slate-400 border-b"><tr><th className="pb-4">Product</th><th className="pb-4 text-center">Qty</th><th className="pb-4 text-right">Price</th><th className="pb-4 text-right">Total</th></tr></thead>
              <tbody>{items.map((item, idx) => (<tr key={idx} className="border-b last:border-0"><td className="py-4 font-bold">{item.products?.name} <br/><span className="text-xs text-slate-400">{item.products?.model}</span></td><td className="text-center font-black">{item.quantity}</td><td className="text-right font-medium">{item.unit_price} ৳</td><td className="text-right font-black">{item.total_price} ৳</td></tr>))}</tbody>
            </table>
            <div className="flex justify-between items-end border-t pt-6"><div><p className="font-black text-slate-800">{chalan.customers?.name}</p><p className="text-xs text-slate-400 italic">📍 {chalan.customers?.address || 'No Address'}</p></div><p className="text-4xl font-black text-slate-900">{chalan.total_amount} ৳</p></div>
          </div>

          <div className="lg:col-span-4 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-xl font-black mb-6">💰 পেমেন্ট কনফার্মেশন</h3>
              <div className="p-4 bg-slate-800 rounded-2xl mb-4 border border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" checked={isManualBill} onChange={(e) => setIsManualBill(e.target.checked)} className="accent-orange-500 w-4 h-4" /><span className="text-[10px] font-black text-slate-300 uppercase">ম্যানুয়াল বিল নম্বর?</span></label>
                {isManualBill && <input type="text" value={manualBillNo} onChange={(e) => setManualBillNo(e.target.value)} placeholder="যেমন: BLL-OFF-101" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl font-bold text-white uppercase outline-none focus:border-orange-500" />}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1">পেমেন্ট মেথড</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-2xl font-black outline-none focus:border-orange-500">
                  <option value="">সিলেক্ট করুন...</option>
                  <option value="Cash">Cash (💵)</option>
                  <option value="bKash">bKash (📱)</option>
                  <option value="Bank">Bank Transfer (🏦)</option>
                </select>
              </div>
              <button onClick={handlePaymentConfirm} disabled={processingPayment || !paymentMethod} className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black text-lg hover:bg-orange-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 shadow-xl disabled:bg-slate-700">
                {processingPayment ? 'প্রসেসিং...' : 'পেমেন্ট ও বিল কনফার্ম'}
              </button>
            </div>
            <button onClick={() => setChalan(null)} className="mt-6 text-slate-500 font-bold text-sm hover:text-white transition-colors">← পিছনে যান</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ChalanManager;