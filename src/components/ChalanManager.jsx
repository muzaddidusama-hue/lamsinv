import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan'; // আপনার ফাইলের নাম অনুযায়ী
import { printBill } from '../utils/printBill';

const ChalanManager = () => {
  const [searchNo, setSearchNo] = useState('');
  const [chalan, setChalan] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingChalans, setPendingChalans] = useState([]);
  const [listTitle, setListTitle] = useState('Pending Tasks');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchPendingChalans();
  }, []); 

  const fetchPendingChalans = async () => {
    const { data } = await supabase
      .from('chalans')
      .select(`*, customers (name, phone)`)
      .or('status.eq.hold,status.eq.transferred') 
      .order('created_at', { ascending: false });
    
    if (data) {
      setPendingChalans(data);
      setListTitle('Pending Challans & Transfers');
    }
  };

  const loadChalanDetails = async (cNo) => {
    setLoading(true);
    setChalan(null);
    setItems([]);
    try {
      const { data: chalanData, error: chalanErr } = await supabase
        .from('chalans')
        .select(`*, customers (name, phone, address)`) // অ্যাড্রেস সহ ডাটা আনা হচ্ছে
        .eq('chalan_no', cNo.toUpperCase())
        .single();

      if (chalanErr || !chalanData) throw chalanErr;
      setChalan(chalanData);

      const { data: itemData, error: itemErr } = await supabase
        .from('chalan_items')
        .select(`*, products (name, model, category, stock_quantity, unit_price)`)
        .eq('chalan_id', chalanData.id);

      if (itemErr) throw itemErr;
      setItems(itemData || []);
    } catch (error) {
      alert("চালান খুঁজে পাওয়া যায়নি!");
    }
    setLoading(false);
  };

  const handleInHouseTransfer = async () => {
    if (!window.confirm(`আপনি কি এই মালগুলো ${chalan.transfer_to} হাউজে পাঠাতে চান?`)) return;
    setProcessingPayment(true);
    try {
      for (let item of items) {
        const targetHouse = chalan.transfer_to; 
        
        // টার্গেট হাউজে ওই একই নামের এবং মডেলের প্রোডাক্ট আছে কি না দেখা
        const { data: targetProd } = await supabase
          .from('products')
          .select('id, stock_quantity')
          .eq('name', item.products.name)
          .eq('model', item.products.model)
          .eq('house', targetHouse)
          .maybeSingle();

        if (targetProd) {
          // যদি থাকে, তবে বর্তমান স্টকের সাথে যোগ হবে
          await supabase.from('products')
            .update({ stock_quantity: targetProd.stock_quantity + item.quantity })
            .eq('id', targetProd.id);
        } else {
          // যদি না থাকে, নতুন একটি রো তৈরি হবে ওই হাউজের জন্য
          await supabase.from('products').insert([{
            name: item.products.name,
            model: item.products.model,
            category: item.products.category,
            stock_quantity: item.quantity,
            house: targetHouse,
            unit_price: item.products.unit_price || 0
          }]);
        }
      }
      // চালানের স্ট্যাটাস 'completed' বা 'transferred' আপডেট করা
      await supabase.from('chalans').update({ status: 'completed' }).eq('id', chalan.id);
      
      alert('✅ ইন-হাউজ ট্রান্সফার সফলভাবে সম্পন্ন হয়েছে!');
      setChalan(null);
      fetchPendingChalans();
    } catch (error) { 
      console.error(error);
      alert('ক্রুটি হয়েছে! ডাটাবেজ টেবিল চেক করুন।'); 
    }
    setProcessingPayment(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      <form onSubmit={(e) => { e.preventDefault(); loadChalanDetails(searchNo); }} className="bg-white p-6 rounded-3xl border shadow-sm flex gap-4">
        <input type="text" value={searchNo} onChange={(e) => setSearchNo(e.target.value)} placeholder="CHL-123456" className="flex-1 h-14 px-6 bg-slate-50 border rounded-2xl font-black text-lg uppercase outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="px-10 bg-slate-900 text-white rounded-2xl font-bold">সার্চ</button>
      </form>

      {chalan && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-md animate-in zoom-in-95">
          <div className="flex flex-col md:flex-row justify-between items-start border-b pb-6 mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-black">{chalan.is_in_house ? "🏠 ইন-হাউজ স্থানান্তর" : "📦 কাস্টমার চালান"}</h2>
              <p className="text-slate-500 font-bold">চালান নং: {chalan.chalan_no}</p>
            </div>
            
            {/* কাস্টমার অ্যাড্রেস সেকশন */}
            {!chalan.is_in_house && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[280px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Info</p>
                <p className="font-black text-slate-800">{chalan.customers?.name}</p>
                <p className="text-sm font-bold text-slate-500">{chalan.customers?.phone}</p>
                {/* ঠিকানা এখানে দেখাবে */}
                {chalan.customers?.address && (
                  <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200">
                    <span className="font-bold">📍 ঠিকানা:</span> {chalan.customers.address}
                  </p>
                )}
              </div>
            )}

            {chalan.is_in_house && (
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-right">
                <span className="block text-[10px] font-black text-blue-400 uppercase mb-1">Transfer Path</span>
                <span className="text-blue-700 font-black">
                  {chalan.house} ➔ {chalan.transfer_to}
                </span>
              </div>
            )}
          </div>

          <table className="w-full text-left mb-8">
            <thead>
              <tr className="text-[11px] font-black text-slate-400 uppercase border-b">
                <th className="pb-4">Product Details</th>
                <th className="pb-4 text-center">Quantity</th>
                {!chalan.is_in_house && <th className="pb-4 text-right">Price</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b last:border-0 text-slate-700">
                  <td className="py-4">
                    <div className="font-bold">{item.products?.name}</div>
                    <div className="text-xs text-slate-400">{item.products?.model}</div>
                  </td>
                  <td className="py-4 text-center font-black">{item.quantity} পিস</td>
                  {!chalan.is_in_house && <td className="py-4 text-right font-bold">{item.total_price} ৳</td>}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 pt-6 border-t border-slate-100">
            {chalan.status === 'hold' || chalan.status === 'transferred' ? (
              chalan.is_in_house ? (
                <button 
                  onClick={handleInHouseTransfer} 
                  disabled={processingPayment} 
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                >
                  {processingPayment ? 'প্রসেসিং...' : 'কনফার্ম ইন-হাউজ ট্রান্সফার'}
                </button>
              ) : (
                 <div className="p-4 bg-orange-50 rounded-2xl text-center font-bold text-orange-600 border border-orange-100">
                   এটি কাস্টমার চালান। পেমেন্ট সেকশন ব্যবহার করুন।
                 </div>
              )
            ) : (
              <div className="p-6 bg-green-50 text-green-700 rounded-2xl text-center font-black border border-green-100">
                ✅ এই চালানের কাজ সম্পন্ন হয়েছে ({chalan.status})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChalanManager;