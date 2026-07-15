import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const ReturnManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [processing, setProcessing] = useState(false);

  // 🔴 নতুন: আংশিক রিটার্নের স্টেট
  const [returnQtys, setReturnQtys] = useState({});
  const [invoiceSerials, setInvoiceSerials] = useState([]);
  const [selectedSerialsToReturn, setSelectedSerialsToReturn] = useState([]);

  // 🔍 সার্চ লজিক
  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return alert('অনুগ্রহ করে সার্চ করার জন্য কিছু লিখুন!');

    setLoading(true);
    setSearchResults([]);
    setSelectedInvoice(null);

    try {
      const { data: slData } = await supabase.from('inv_sl').select('chalan_no, bill_no').eq('sl_no', query.toUpperCase()).maybeSingle();

      let targetChalan = query;
      let targetBill = query;

      if (slData) {
        targetChalan = slData.chalan_no !== 'N/A' ? slData.chalan_no : query;
        targetBill = slData.bill_no !== 'N/A' ? slData.bill_no : query;
      }

      const { data, error } = await supabase
        .from('chalans')
        .select(`*, customers(name, phone), chalan_items(*, products(*))`)
        .or(`chalan_no.ilike.%${targetChalan}%,bill_no.ilike.%${targetBill}%,customer_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) setSearchResults(data);
      else alert('দুঃখিত! এই তথ্যের কোনো রেকর্ড পাওয়া যায়নি।');
      
    } catch (error) {
      console.error(error);
      alert('সার্চ করতে সমস্যা হয়েছে!');
    }
    setLoading(false);
  };

  // 📋 ইনভয়েস সিলেক্ট করার পর তার সিরিয়ালগুলো ফেচ করা
  const handleSelectInvoice = async (record) => {
    setSelectedInvoice(record);
    setReturnQtys({});
    setSelectedSerialsToReturn([]);
    setInvoiceSerials([]);

    // ডিফল্ট রিটার্ন কোয়ান্টিটি 0 সেট করা
    const initialQtys = {};
    record.chalan_items.forEach(item => { initialQtys[item.id] = 0; });
    setReturnQtys(initialQtys);

    // এই ইনভয়েসের আন্ডারে থাকা সিরিয়ালগুলো খুঁজে বের করা
    let orQuery = [];
    if (record.chalan_no && record.chalan_no !== 'N/A') orQuery.push(`chalan_no.eq.${record.chalan_no}`);
    if (record.bill_no && record.bill_no !== 'N/A') orQuery.push(`bill_no.eq.${record.bill_no}`);
    
    if (orQuery.length > 0) {
      const { data } = await supabase.from('inv_sl').select('*').or(orQuery.join(','));
      if (data) setInvoiceSerials(data);
    }
  };

  const handleReturnQtyChange = (itemId, val, maxQty) => {
    let qty = parseInt(val) || 0;
    if (qty > maxQty) qty = maxQty;
    if (qty < 0) qty = 0;
    setReturnQtys({ ...returnQtys, [itemId]: qty });
  };

  const toggleSerialSelection = (sl_no) => {
    if (selectedSerialsToReturn.includes(sl_no)) {
      setSelectedSerialsToReturn(selectedSerialsToReturn.filter(s => s !== sl_no));
    } else {
      setSelectedSerialsToReturn([...selectedSerialsToReturn, sl_no]);
    }
  };

  // ♻️ আংশিক ও সম্পূর্ণ রিটার্ন প্রসেস করার মেইন লজিক
  const handleConfirmReturn = async () => {
    const totalReturnItems = Object.values(returnQtys).reduce((a, b) => a + b, 0);
    if (totalReturnItems === 0 && selectedSerialsToReturn.length === 0) {
      return alert("রিটার্ন করার জন্য অন্তত একটি প্রোডাক্টের পরিমাণ অথবা সিরিয়াল নম্বর সিলেক্ট করুন!");
    }

    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই আইটেমগুলো রিটার্ন নিতে চান? ডাটাবেজ এবং স্টক আপডেট হয়ে যাবে।')) return;

    setProcessing(true);
    try {
      let totalRefundAmount = 0;
      const invoiceRef = selectedInvoice.bill_no !== 'N/A' && selectedInvoice.bill_no ? selectedInvoice.bill_no : selectedInvoice.chalan_no;

      // ১. প্রোডাক্ট স্টক বাড়ানো এবং লেজার এন্ট্রি
      for (let item of selectedInvoice.chalan_items) {
        const rq = returnQtys[item.id];
        if (rq > 0) {
          totalRefundAmount += (rq * item.unit_price);

          // স্টক আপডেট
          const { data: prodData } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
          if (prodData) {
            await supabase.from('products').update({ stock_quantity: prodData.stock_quantity + rq }).eq('id', item.product_id);
          }
          // লেজার এন্ট্রি (যাতে রিটার্ন হওয়া মাল লেজারে Stock In হিসেবে দেখায়)
          await supabase.from('ledger').insert([{
            product: `${item.products?.name} - ${item.products?.model}`,
            quantity: rq,
            source: `Return from Inv: #${invoiceRef}`,
            date: new Date().toISOString().split('T')[0],
            in: new Date().toISOString()
          }]);

          // Chalan Items আপডেট বা ডিলিট
          if (rq === item.quantity) {
            await supabase.from('chalan_items').delete().eq('id', item.id); // পুরোটা ফেরত দিলে আইটেম ডিলিট
          } else {
            await supabase.from('chalan_items')
              .update({ 
                quantity: item.quantity - rq, 
                total_price: (item.quantity - rq) * item.unit_price 
              })
              .eq('id', item.id);
          }
        }
      }

      // ২. শুধুমাত্র সিলেক্ট করা ইনভার্টার সিরিয়াল (inv_sl) ডিলিট করা
      for (let sl of selectedSerialsToReturn) {
        await supabase.from('inv_sl').delete().eq('sl_no', sl);
      }

      // ৩. মেইন চালানের টোটাল অ্যামাউন্ট আপডেট করা
      const newTotalAmount = selectedInvoice.total_amount - totalRefundAmount;
      if (newTotalAmount <= 0) {
        // যদি সব আইটেম রিটার্ন হয়ে যায়, তাহলে চালানটিই ডিলিট করে দাও
        await supabase.from('chalans').delete().eq('id', selectedInvoice.id);
      } else {
        await supabase.from('chalans').update({ total_amount: newTotalAmount }).eq('id', selectedInvoice.id);
      }

      alert('✅ সফলভাবে আংশিক/সম্পূর্ণ রিটার্ন সম্পন্ন হয়েছে এবং স্টক আপডেট হয়েছে!');
      
      // UI আপডেট করা
      handleSearch({ preventDefault: () => {} }); // রিফ্রেশ
    } catch (error) {
      console.error(error);
      alert('রিটার্ন প্রসেস করতে সমস্যা হয়েছে! কনসোল চেক করুন।');
    }
    setProcessing(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 p-4" style={{ fontFamily: "'Hind Siliguri', 'Inter', sans-serif" }}>
      
      {/* 🔍 সার্চ সেকশন */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl mb-2">↩️</div>
        <h2 className="text-2xl font-black text-slate-800">অ্যাডভান্সড প্রোডাক্ট রিটার্ন</h2>
        <p className="text-sm font-bold text-slate-400">ইনভয়েস বের করে নির্দিষ্ট পরিমাণ বা সিরিয়াল রিটার্ন করুন</p>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex flex-col md:flex-row gap-3 pt-4">
          <input 
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="বিল, চালান বা সিরিয়াল নম্বর..." 
            className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-red-400 transition-colors"
          />
          <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-red-500 transition-colors shadow-lg disabled:opacity-50">
            {loading ? 'খোঁজা হচ্ছে...' : 'সার্চ রেকর্ড'}
          </button>
        </form>
      </div>

      {/* 📋 সার্চ রেজাল্ট টেবিল */}
      {searchResults.length > 0 && !selectedInvoice && (
        <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="bg-slate-50 p-4 border-b">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">সার্চ রেজাল্ট ({searchResults.length})</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b text-[10px] font-black tracking-wider uppercase text-slate-400">
                <tr><th className="p-4 pl-6">তারিখ ও হাউজ</th><th className="p-4">ইনভয়েস নম্বর</th><th className="p-4">কাস্টমার</th><th className="p-4 text-right">মোট টাকা</th><th className="p-4 text-center pr-6">অ্যাকশন</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {searchResults.map((record) => (
                  <tr key={record.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="p-4 pl-6"><p className="font-bold text-slate-800">{new Date(record.created_at).toLocaleDateString('en-GB')}</p><span className={`inline-block mt-1 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${record.house === 'Showroom' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{record.house}</span></td>
                    <td className="p-4 font-black text-slate-900">{record.bill_no !== 'N/A' && record.bill_no ? record.bill_no : record.chalan_no}{record.status === 'hold' && <span className="ml-2 text-[8px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase">Hold</span>}</td>
                    <td className="p-4 font-bold">{record.customer_name || record.customers?.name || 'Walk-in'}<span className="block text-[10px] text-slate-400 font-mono mt-0.5">{record.phone || record.customers?.phone}</span></td>
                    <td className="p-4 text-right font-black text-red-600">{record.total_amount} ৳</td>
                    <td className="p-4 text-center pr-6"><button onClick={() => handleSelectInvoice(record)} className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-colors">রিটার্ন ম্যানেজ</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ⚠️ আংশিক/সম্পূর্ণ রিটার্ন মডাল */}
      {selectedInvoice && (
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 w-full border shadow-sm flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          
          <div className="flex justify-between items-start border-b pb-4 mb-6">
            <div>
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-md">Return Details Selection</span>
              <h3 className="text-2xl font-black text-slate-800 mt-2">{selectedInvoice.bill_no !== 'N/A' && selectedInvoice.bill_no ? selectedInvoice.bill_no : selectedInvoice.chalan_no}</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">Customer: {selectedInvoice.customer_name || 'Walk-in'}</p>
            </div>
            <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 text-xs">← পেছনে যান</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* ১. কোয়ান্টিটি সিলেকশন */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-2">১. রিটার্ন কোয়ান্টিটি সিলেক্ট করুন</h4>
              <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {selectedInvoice.chalan_items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-800">{item.products?.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.products?.model}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 mb-1">কেনা: {item.quantity} পিস</p>
                        <input 
                          type="number" 
                          min="0" max={item.quantity}
                          value={returnQtys[item.id] || ''}
                          onChange={(e) => handleReturnQtyChange(item.id, e.target.value, item.quantity)}
                          className="w-20 p-2 text-center border-2 border-red-200 rounded-xl font-black outline-none focus:border-red-500 text-red-600"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ২. সিরিয়াল সিলেকশন */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-2">২. ইনভার্টার সিরিয়াল সিলেক্ট করুন (যদি থাকে)</h4>
              {invoiceSerials.length > 0 ? (
                <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {invoiceSerials.map((serial) => (
                    <label key={serial.id} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${selectedSerialsToReturn.includes(serial.sl_no) ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedSerialsToReturn.includes(serial.sl_no)}
                        onChange={() => toggleSerialSelection(serial.sl_no)}
                        className="w-5 h-5 accent-red-500 cursor-pointer"
                      />
                      <div>
                        <p className="font-black text-slate-800 font-mono text-sm">{serial.sl_no}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{serial.inv_type} {serial.inv_model}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed rounded-2xl bg-slate-50">
                  <p className="text-slate-400 font-bold text-xs">এই ইনভয়েসে কোনো সিরিয়াল নম্বর ট্যাগ করা নেই।</p>
                </div>
              )}
            </div>

          </div>

          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-6">
            <p className="text-xs font-bold text-red-800 text-center">
              ⚠️ <strong className="font-black">সতর্কতা:</strong> আপনি যতটুকু কোয়ান্টিটি এবং যেই সিরিয়ালগুলোতে টিক দেবেন, শুধুমাত্র সেগুলোই ডাটাবেজ থেকে মুছে লেজারে ফেরত যাবে।
            </p>
          </div>

          <button 
            onClick={handleConfirmReturn} 
            disabled={processing}
            className="w-full py-5 bg-red-600 text-white font-black rounded-2xl text-lg hover:bg-red-700 shadow-xl shadow-red-500/30 transition-all active:scale-95 disabled:opacity-50 tracking-widest"
          >
            {processing ? 'প্রসেসিং হচ্ছে...' : '✅ কনফার্ম রিটার্ন ও লেজার আপডেট'}
          </button>

        </div>
      )}

    </div>
  );
};

export default ReturnManager;