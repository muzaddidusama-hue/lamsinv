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
    setInvoiceSerials([]);
    setReturnQtys({});
    setSelectedSerialsToReturn([]);

    // এই ইনভয়েসের আন্ডারে থাকা সিরিয়ালগুলো খুঁজে বের করা
    let orQuery = [];
    if (record.chalan_no && record.chalan_no !== 'N/A') orQuery.push(`chalan_no.eq.${record.chalan_no}`);
    if (record.bill_no && record.bill_no !== 'N/A') orQuery.push(`bill_no.eq.${record.bill_no}`);
    
    if (orQuery.length > 0) {
      const { data } = await supabase.from('inv_sl').select('*').or(orQuery.join(','));
      if (data) setInvoiceSerials(data);
    }
  };

  // 🔄 রিটার্ন পরিমাণ আপডেট করার ফাংশন
  const handleUpdateReturnQty = (itemId, val) => {
    const item = selectedInvoice.chalan_items.find(i => i.id === itemId);
    if (!item) return;

    let parsedVal = Math.max(0, Math.min(item.quantity, val));
    setReturnQtys(prev => ({
      ...prev,
      [itemId]: parsedVal
    }));
  };

  // 📌 সিরিয়াল সিলেক্ট টগল করার ফাংশন
  const toggleSerialSelection = (slNo) => {
    setSelectedSerialsToReturn(prev => 
      prev.includes(slNo) ? prev.filter(s => s !== slNo) : [...prev, slNo]
    );
  };

  // ♻️ বিল/চালান বাতিল ও স্টক ফেরত দেওয়ার মেইন লজিক
  const handleConfirmReturn = async (isFullCancellation = false) => {
    let qtysToReturn = {};
    let serialsToDelete = [];

    if (isFullCancellation) {
      // সম্পূর্ণ বাতিল: ইনভয়েসের সকল আইটেম পুরো পরিমাণে ফেরত যাবে
      selectedInvoice.chalan_items.forEach(item => {
        qtysToReturn[item.id] = item.quantity;
      });
      serialsToDelete = invoiceSerials.map(s => s.sl_no);
    } else {
      // আংশিক/সিঙ্গেল প্রোডাক্ট রিটার্ন: ইউজারের ইনপুট ব্যবহার করা হবে
      qtysToReturn = { ...returnQtys };
      serialsToDelete = [ ...selectedSerialsToReturn ];

      // অন্তত একটি প্রোডাক্টের রিটার্ন পরিমাণ > 0 হতে হবে
      const hasReturnedItems = Object.values(qtysToReturn).some(q => q > 0);
      if (!hasReturnedItems) {
        return alert('অনুগ্রহ করে অন্তত একটি প্রোডাক্টের রিটার্ন পরিমাণ নির্ধারণ করুন!');
      }

      // ইনভার্টার সিরিয়াল নম্বরগুলোর সঠিকতা যাচাই (যদি থাকে)
      const errors = [];
      for (let item of selectedInvoice.chalan_items) {
        const rq = qtysToReturn[item.id] || 0;
        if (rq > 0) {
          const modelSerials = invoiceSerials.filter(
            s => s.inv_model && item.products?.model && s.inv_model.trim().toLowerCase() === item.products.model.trim().toLowerCase()
          );

          if (modelSerials.length > 0) {
            const selectedForThisModel = serialsToDelete.filter(slNo => 
              modelSerials.some(s => s.sl_no === slNo)
            );
            if (selectedForThisModel.length !== rq) {
              errors.push(`মডেল "${item.products.model}"-এর জন্য ${rq} টি সিরিয়াল নম্বর সিলেক্ট করা প্রয়োজন, কিন্তু আপনি সিলেক্ট করেছেন ${selectedForThisModel.length} টি।`);
            }
          }
        }
      }

      if (errors.length > 0) {
        return alert(errors.join('\n'));
      }
    }

    const msg = isFullCancellation
      ? 'আপনি কি নিশ্চিতভাবে এই বিল/চালানটি সম্পূর্ণ বাতিল করতে চান? এর ফলে সকল আইটেম সেলার হাউজের স্টকে ফেরত যাবে এবং এটি বাতিল (Cancelled) হিসেবে চিহ্নিত হবে।'
      : 'আপনি কি নিশ্চিতভাবে নির্বাচিত আইটেম ও পরিমাণসমূহ রিটার্ন করতে চান? এর ফলে সংশ্লিষ্ট প্রোডাক্টসমূহ স্টকে যোগ হবে এবং ইনভয়েসের মূল্য ও পরিমাণ হ্রাস পাবে।';

    if (!window.confirm(msg)) return;

    setProcessing(true);
    try {
      const invoiceRef = selectedInvoice.bill_no !== 'N/A' && selectedInvoice.bill_no ? selectedInvoice.bill_no : selectedInvoice.chalan_no;
      
      let totalReturnedValue = 0;
      let isActuallyFullReturn = true;

      // রিটার্ন ভ্যালু এবং সব আইটেম পূর্ণ পরিমাণে ফেরত যাচ্ছে কিনা তা হিসাব করা
      for (let item of selectedInvoice.chalan_items) {
        const rq = qtysToReturn[item.id] || 0;
        totalReturnedValue += rq * item.unit_price;
        if (rq < item.quantity) {
          isActuallyFullReturn = false;
        }
      }

      // ১. প্রোডাক্ট স্টক বাড়ানো, লেজার এন্ট্রি এবং chalan_items আপডেট/ডিলিট করা
      for (let item of selectedInvoice.chalan_items) {
        const rq = qtysToReturn[item.id] || 0;
        if (rq > 0) {
          // স্টক আপডেট
          const { data: prodData } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
          if (prodData) {
            await supabase.from('products').update({ stock_quantity: prodData.stock_quantity + rq }).eq('id', item.product_id);
          }

          // লেজার এন্ট্রি (যাতে রিটার্ন হওয়া মাল লেজারে Stock In হিসেবে দেখায়)
          await supabase.from('ledger').insert([{
            product: `${item.products?.name} - ${item.products?.model}`,
            quantity: rq,
            source: `Return from Inv: #${invoiceRef} (To: ${selectedInvoice.house === 'Showroom' ? 'Nawabpur' : 'Head Office'})`,
            date: new Date().toISOString().split('T')[0],
            in: new Date().toISOString()
          }]);

          // chalan_items আপডেট বা ডিলিট
          const newQty = item.quantity - rq;
          if (newQty <= 0) {
            await supabase.from('chalan_items').delete().eq('id', item.id);
          } else {
            const newTotal = newQty * item.unit_price;
            await supabase.from('chalan_items').update({ quantity: newQty, total: newTotal }).eq('id', item.id);
          }
        }
      }

      // ২. সিলেক্টেড সিরিয়ালগুলো ডিলিট করা
      if (serialsToDelete.length > 0) {
        await supabase.from('inv_sl').delete().in('sl_no', serialsToDelete);
      }

      // ৩. চালানের মোট ভ্যালু বা স্ট্যাটাস আপডেট করা
      if (isFullCancellation || isActuallyFullReturn) {
        // সম্পূর্ণ বাতিল / সম্পূর্ণ রিটার্ন
        await supabase.from('chalans').update({ status: 'cancelled', total_amount: 0 }).eq('id', selectedInvoice.id);
        alert('✅ সফলভাবে বিল/চালান বাতিল করা হয়েছে এবং সকল স্টক ফেরত নেওয়া হয়েছে!');
      } else {
        // আংশিক রিটার্ন
        const newTotalAmount = Math.max(0, selectedInvoice.total_amount - totalReturnedValue);
        await supabase.from('chalans').update({ total_amount: newTotalAmount }).eq('id', selectedInvoice.id);
        alert(`✅ সফলভাবে আংশিক রিটার্ন সম্পন্ন হয়েছে! স্টক ও বিলের মূল্য (${newTotalAmount} ৳) আপডেট করা হয়েছে।`);
      }

      // UI আপডেট করা
      setSelectedInvoice(null);
      setReturnQtys({});
      setSelectedSerialsToReturn([]);
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
        <h2 className="text-2xl font-black text-slate-800">বিল/চালান বাতিল ও প্রোডাক্ট রিটার্ন</h2>
        <p className="text-sm font-bold text-slate-400">ইনভয়েস বের করে সম্পূর্ণ বিল/চালান বাতিল এবং স্টক ফেরত নিন</p>
        
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
                    <td className="p-4 font-black text-slate-900">
                      {record.bill_no !== 'N/A' && record.bill_no ? record.bill_no : record.chalan_no}
                      {record.status === 'hold' && <span className="ml-2 text-[8px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase">Hold</span>}
                      {record.status === 'cancelled' && <span className="ml-2 text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">Cancelled</span>}
                    </td>
                    <td className="p-4 font-bold">{record.customer_name || record.customers?.name || 'Walk-in'}<span className="block text-[10px] text-slate-400 font-mono mt-0.5">{record.phone || record.customers?.phone}</span></td>
                    <td className="p-4 text-right font-black text-red-600">{record.total_amount} ৳</td>
                    <td className="p-4 text-center pr-6">
                      {record.status === 'cancelled' ? (
                        <span className="text-xs text-red-500 font-black">বাতিলকৃত (Cancelled)</span>
                      ) : (
                        <button onClick={() => handleSelectInvoice(record)} className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-colors">রিটার্ন ম্যানেজ</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ⚠️ বাতিল/রিটার্ন মডাল */}
      {selectedInvoice && (
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 w-full border shadow-sm flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          
          <div className="flex justify-between items-start border-b pb-4 mb-6">
            <div>
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-md">Cancel / Return Items</span>
              <h3 className="text-2xl font-black text-slate-800 mt-2">{selectedInvoice.bill_no !== 'N/A' && selectedInvoice.bill_no ? selectedInvoice.bill_no : selectedInvoice.chalan_no}</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">Customer: {selectedInvoice.customer_name || 'Walk-in'}</p>
            </div>
            <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 text-xs">← পেছনে যান</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* ১. রিটার্ন করা প্রোডাক্টের তালিকা */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-2">১. রিটার্ন করা প্রোডাক্টের তালিকা (রিটার্ন কোয়ান্টিটি সিলেক্ট করুন)</h4>
              <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {selectedInvoice.chalan_items?.map((item) => {
                  const rq = returnQtys[item.id] || 0;
                  return (
                    <div key={item.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${rq > 0 ? 'bg-red-50/70 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex-1 mr-4">
                        <p className="font-bold text-sm text-slate-800">{item.products?.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.products?.model}</p>
                        <div className="flex gap-2 text-[10px] font-bold text-slate-400 mt-1">
                          <span>মূল পরিমাণ: {item.quantity} পিস</span>
                          <span>•</span>
                          <span>ইউনিট প্রাইস: {item.unit_price} ৳</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex-shrink-0">
                        <button 
                          onClick={() => handleUpdateReturnQty(item.id, rq - 1)}
                          disabled={rq <= 0}
                          type="button"
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={rq}
                          onChange={(e) => handleUpdateReturnQty(item.id, parseInt(e.target.value) || 0)}
                          className="w-10 text-center font-black text-sm text-slate-800 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                          onClick={() => handleUpdateReturnQty(item.id, rq + 1)}
                          disabled={rq >= item.quantity}
                          type="button"
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ২. রিটার্ন করা ইনভার্টার সিরিয়াল */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-2">২. রিটার্ন করা ইনভার্টার সিরিয়াল (রিটার্নকৃত আইটেমের সিরিয়াল সিলেক্ট করুন)</h4>
              {invoiceSerials.length > 0 ? (
                <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {invoiceSerials.map((serial) => {
                    const isSelected = selectedSerialsToReturn.includes(serial.sl_no);
                    return (
                      <div 
                        key={serial.id} 
                        onClick={() => toggleSerialSelection(serial.sl_no)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-red-50 border-red-300 shadow-sm' 
                            : 'bg-slate-50 border-slate-100 hover:bg-red-50/30'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => {}} // Handled by parent div onClick
                          className="accent-red-600 w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <p className="font-black text-slate-800 font-mono text-sm">{serial.sl_no}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{serial.inv_type} {serial.inv_model}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed rounded-2xl bg-slate-50">
                  <p className="text-slate-400 font-bold text-xs">এই ইনভয়েসে কোনো সিরিয়াল নম্বর ট্যাগ করা নেই।</p>
                </div>
              )}
            </div>

          </div>

          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mb-6 text-sm text-slate-600 space-y-2">
            <p className="font-bold flex items-center gap-2">
              <span className="text-orange-500">⚠️</span> 
              <span><strong className="font-black">আংশিক রিটার্ন:</strong> নির্বাচিত প্রোডাক্টের পরিমাণ সেলার হাউজে ({selectedInvoice.house === 'Showroom' ? 'Nawabpur' : 'Head Office'}) ফেরত যাবে এবং বিলের মোট মূল্য আপডেট হবে।</span>
            </p>
            <p className="font-bold flex items-center gap-2">
              <span className="text-red-500">🚨</span> 
              <span><strong className="font-black">সম্পূর্ণ বাতিল:</strong> কনফার্ম করলে পুরো বিল/চালান বাতিল (Cancelled) হয়ে যাবে, সব প্রোডাক্টের সম্পূর্ণ স্টক ফেরত যাবে এবং সব সিরিয়াল মুছে যাবে।</span>
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => handleConfirmReturn(false)} 
              disabled={processing || !Object.values(returnQtys).some(q => q > 0)}
              className="flex-1 py-5 bg-orange-600 text-white font-black rounded-2xl text-base hover:bg-orange-700 shadow-xl shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 tracking-wide"
            >
              {processing ? 'প্রসেসিং হচ্ছে...' : '↩️ নির্বাচিত প্রোডাক্ট রিটার্ন করুন'}
            </button>
            <button 
              onClick={() => handleConfirmReturn(true)} 
              disabled={processing}
              className="flex-1 py-5 bg-red-600 text-white font-black rounded-2xl text-base hover:bg-red-700 shadow-xl shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50 tracking-wide"
            >
              {processing ? 'প্রসেসিং হচ্ছে...' : '❌ সম্পূর্ণ বিল/চালান বাতিল করুন'}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default ReturnManager;