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
  const [listTitle, setListTitle] = useState('পেন্ডিং পেমেন্ট তালিকা (Hold Chalans)');
  
  const [paymentMethod, setPaymentMethod] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchPendingChalans();
  }, [chalan]); 

  // ডাটাবেজ থেকে শুধুমাত্র 'hold' স্ট্যাটাসের চালানগুলো আনবে
  const fetchPendingChalans = async () => {
    const { data, error } = await supabase
      .from('chalans')
      .select(`*, customers (name, phone, address)`)
      .eq('status', 'hold')
      .order('created_at', { ascending: false });
    
    if (data) {
      setPendingChalans(data);
    }
  };

  // নির্দিষ্ট চালানের বিস্তারিত লোড করা
  const loadChalanDetails = async (cNo) => {
    setLoading(true);
    setChalan(null);
    setItems([]);
    setPaymentMethod(''); 

    try {
      const { data: chalanData, error: chalanErr } = await supabase
        .from('chalans')
        .select(`*, customers (name, phone, address)`)
        .eq('chalan_no', cNo.toUpperCase())
        .single();

      if (chalanErr || !chalanData) throw chalanErr;

      setChalan(chalanData);

      const { data: itemData, error: itemErr } = await supabase
        .from('chalan_items')
        .select(`*, products (name, model, category)`)
        .eq('chalan_id', chalanData.id);

      if (itemErr) throw itemErr;
      setItems(itemData || []);
      setSearchNo(cNo); 

    } catch (error) {
      alert("সঠিক চালান নাম্বার দিন অথবা ডাটাবেজ চেক করুন!");
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchNo) return;
    loadChalanDetails(searchNo);
  };

  // পেমেন্ট কনফার্ম করার মেইন লজিক
  const handlePaymentConfirm = async () => {
    if (!paymentMethod) return alert('দয়া করে পেমেন্ট মেথড সিলেক্ট করুন!');
    
    setProcessingPayment(true);
    try {
      const billNo = `BLL-${Date.now().toString().slice(-6)}`; // অটো বিল নাম্বার জেনারেশন
      
      const { error } = await supabase
        .from('chalans')
        .update({ 
          status: 'paid', 
          payment_method: paymentMethod, 
          bill_no: billNo 
        })
        .eq('id', chalan.id);

      if (error) throw error;

      alert(`✅ পেমেন্ট সফলভাবে রিসিভ হয়েছে! বিল নাম্বার: ${billNo}`);
      setChalan(null);
      setSearchNo('');
      fetchPendingChalans();
    } catch (error) {
      alert('পেমেন্ট আপডেট করতে সমস্যা হয়েছে!');
    }
    setProcessingPayment(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 px-4" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* সার্চ এরিয়া */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input 
            type="text" 
            value={searchNo} 
            onChange={(e) => setSearchNo(e.target.value)} 
            placeholder="চালান নাম্বার দিন (যেমন: CHL-123456)" 
            className="flex-1 h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 text-lg uppercase" 
          />
          <button type="submit" className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all">সার্চ</button>
        </form>
      </div>

      {!chalan ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
            <div className="h-5 w-1.5 bg-orange-500 rounded-full"></div>
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">{listTitle}</h3>
          </div>
          
          {pendingChalans.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
              <p className="text-slate-400 font-bold italic">বর্তমানে কোনো পেন্ডিং চালান নেই</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingChalans.map((pc) => (
                <div key={pc.id} onClick={() => loadChalanDetails(pc.chalan_no)} className="bg-white p-6 rounded-3xl border border-slate-200 cursor-pointer hover:border-orange-500 hover:shadow-xl transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black px-3 py-1 rounded-full bg-orange-50 text-orange-600 uppercase">Hold</span>
                    <span className="text-[10px] font-bold text-slate-400">{new Date(pc.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-xl group-hover:text-orange-600">{pc.chalan_no}</h4>
                  <p className="text-sm font-bold text-slate-500 mt-1">{pc.customers?.name}</p>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Amount</span>
                    <span className="font-black text-slate-800 text-lg">{pc.total_amount} ৳</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-300">
          {/* চালানের বিস্তারিত তথ্য */}
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center border-b pb-6 mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">চালান বিস্তারিত</h3>
                <h2 className="text-2xl font-black text-slate-900">{chalan.chalan_no}</h2>
              </div>
              <button onClick={() => printChallan(chalan, chalan.customers, items)} className="bg-slate-100 text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">🖨️ প্রিন্ট চালান</button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase font-black text-slate-400 border-b">
                    <th className="pb-4">Product Details</th>
                    <th className="pb-4 text-center">Qty</th>
                    <th className="pb-4 text-right">Unit Price</th>
                    <th className="pb-4 text-right font-black">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-4">
                        <div className="font-bold text-slate-800">{item.products?.name}</div>
                        <div className="text-xs text-slate-400">{item.products?.model} • {item.products?.category}</div>
                      </td>
                      <td className="py-4 text-center font-black">{item.quantity}</td>
                      <td className="py-4 text-right font-bold text-slate-500">{item.unit_price} ৳</td>
                      <td className="py-4 text-right font-black text-slate-900">{item.total_price} ৳</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Customer</p>
                <p className="font-black text-slate-800">{chalan.customers?.name}</p>
                <p className="text-sm font-bold text-slate-400">{chalan.customers?.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</p>
                <p className="text-4xl font-black text-slate-900">{chalan.total_amount} ৳</p>
              </div>
            </div>
          </div>

          {/* পেমেন্ট সেকশন */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">💰 পেমেন্ট কনফার্মেশন</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">পেমেন্ট মেথড নির্বাচন করুন</label>
                  <div className="grid grid-cols-1 gap-3">
                    {['Cash', 'bKash', 'Bank Transfer'].map((m) => (
                      <button 
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`w-full p-4 rounded-2xl font-bold text-left transition-all border-2 ${paymentMethod === m ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                      >
                        {m === 'Cash' && '💵 '}
                        {m === 'bKash' && '📱 '}
                        {m === 'Bank Transfer' && '🏦 '}
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handlePaymentConfirm}
                  disabled={processingPayment || !paymentMethod}
                  className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black text-lg hover:bg-orange-500 hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {processingPayment ? 'লোড হচ্ছে...' : 'পেমেন্ট কনফার্ম করুন'}
                </button>
                
                <button 
                  onClick={() => setChalan(null)} 
                  className="w-full text-slate-500 font-bold text-sm hover:text-white transition-colors"
                >
                  পিছনে যান
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChalanManager;