import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const ReturnManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [processing, setProcessing] = useState(false);

  // 🔍 সার্চ লজিক (বিল, চালান, নাম, মোবাইল বা সিরিয়াল নম্বর দিয়ে)
  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return alert('অনুগ্রহ করে সার্চ করার জন্য কিছু লিখুন!');

    setLoading(true);
    setSearchResults([]);
    setSelectedInvoice(null);

    try {
      // প্রথমে চেক করব এটা কোনো ইনভার্টারের সিরিয়াল নম্বর কিনা
      const { data: slData } = await supabase
        .from('inv_sl')
        .select('chalan_no, bill_no')
        .eq('sl_no', query.toUpperCase())
        .maybeSingle();

      let targetChalan = query;
      let targetBill = query;

      if (slData) {
        targetChalan = slData.chalan_no !== 'N/A' ? slData.chalan_no : query;
        targetBill = slData.bill_no !== 'N/A' ? slData.bill_no : query;
      }

      // এবার মেইন চালান/বিল টেবিল থেকে ডাটা ফেচ করব
      const { data, error } = await supabase
        .from('chalans')
        .select(`
          *,
          customers(name, phone),
          chalan_items(*, products(*))
        `)
        .or(`chalan_no.ilike.%${targetChalan}%,bill_no.ilike.%${targetBill}%,customer_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        alert('দুঃখিত! এই তথ্যের কোনো রেকর্ড পাওয়া যায়নি।');
      }
    } catch (error) {
      console.error(error);
      alert('সার্চ করতে সমস্যা হয়েছে!');
    }
    setLoading(false);
  };

  // ♻️ রিটার্ন প্রসেস করার মেইন লজিক
  const handleConfirmReturn = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত? এই বিল/চালানের সব তথ্য মুছে যাবে এবং স্টক আবার হাউজে ফেরত আসবে।')) return;

    setProcessing(true);
    try {
      // ১. স্টক রিস্টোর করা (যে প্রোডাক্ট যে হাউজ থেকে সেল হয়েছিল, তার ID ধরেই প্লাস হবে)
      for (let item of selectedInvoice.chalan_items) {
        const { data: prodData } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (prodData) {
          await supabase
            .from('products')
            .update({ stock_quantity: prodData.stock_quantity + item.quantity })
            .eq('id', item.product_id);
        }
      }

      // ২. ইনভার্টার সিরিয়াল (inv_sl) টেবিল থেকে ডাটা ডিলিট করা
      if (selectedInvoice.chalan_no && selectedInvoice.chalan_no !== 'N/A') {
        await supabase.from('inv_sl').delete().eq('chalan_no', selectedInvoice.chalan_no);
      } 
      if (selectedInvoice.bill_no && selectedInvoice.bill_no !== 'N/A') {
        await supabase.from('inv_sl').delete().eq('bill_no', selectedInvoice.bill_no);
      }

      // ৩. Chalan Items এবং মেইন Chalan ডিলিট করা
      await supabase.from('chalan_items').delete().eq('chalan_id', selectedInvoice.id);
      await supabase.from('chalans').delete().eq('id', selectedInvoice.id);

      alert('✅ সফলভাবে রিটার্ন সম্পন্ন হয়েছে এবং স্টক আপডেট হয়েছে!');
      
      // UI আপডেট করা
      setSearchResults(searchResults.filter(r => r.id !== selectedInvoice.id));
      setSelectedInvoice(null);
      setSearchQuery('');

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
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl mb-2">
          ↩️
        </div>
        <h2 className="text-2xl font-black text-slate-800">প্রোডাক্ট রিটার্ন ম্যানেজমেন্ট</h2>
        <p className="text-sm font-bold text-slate-400">বিল, চালান, কাস্টমারের নাম বা ইনভার্টারের সিরিয়াল নম্বর দিয়ে সার্চ করুন</p>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex flex-col md:flex-row gap-3 pt-4">
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="সার্চ করুন..." 
            className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-red-400 transition-colors"
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-red-500 transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? 'খোঁজা হচ্ছে...' : 'সার্চ রেকর্ড'}
          </button>
        </form>
      </div>

      {/* 📋 সার্চ রেজাল্ট টেবিল */}
      {searchResults.length > 0 && (
        <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="bg-slate-50 p-4 border-b">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">সার্চ রেজাল্ট ({searchResults.length})</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b text-[10px] font-black tracking-wider uppercase text-slate-400">
                <tr>
                  <th className="p-4 pl-6">তারিখ ও হাউজ</th>
                  <th className="p-4">ইনভয়েস নম্বর</th>
                  <th className="p-4">কাস্টমার</th>
                  <th className="p-4 text-right">মোট টাকা</th>
                  <th className="p-4 text-center pr-6">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {searchResults.map((record) => (
                  <tr key={record.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800">{new Date(record.created_at).toLocaleDateString('en-GB')}</p>
                      <span className={`inline-block mt-1 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${record.house === 'Showroom' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {record.house}
                      </span>
                    </td>
                    <td className="p-4 font-black text-slate-900">
                      {record.bill_no !== 'N/A' && record.bill_no ? record.bill_no : record.chalan_no}
                      {record.status === 'hold' && <span className="ml-2 text-[8px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase">Hold</span>}
                    </td>
                    <td className="p-4 font-bold">
                      {record.customer_name || record.customers?.name || 'Walk-in'}
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{record.phone || record.customers?.phone}</span>
                    </td>
                    <td className="p-4 text-right font-black text-red-600">
                      {record.total_amount} ৳
                    </td>
                    <td className="p-4 text-center pr-6">
                      <button 
                        onClick={() => setSelectedInvoice(record)} 
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-colors"
                      >
                        রিটার্ন করুন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ⚠️ রিটার্ন কনফার্মেশন মডাল */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 w-full max-w-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-md">Return Processing</span>
                <h3 className="text-2xl font-black text-slate-800 mt-2">{selectedInvoice.bill_no || selectedInvoice.chalan_no}</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">Customer: {selectedInvoice.customer_name || 'Walk-in'}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="w-10 h-10 bg-slate-100 rounded-full hover:bg-slate-900 hover:text-white font-bold flex items-center justify-center transition-colors">✕</button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
              <p className="text-xs font-black text-slate-400 uppercase mb-3">যে প্রোডাক্টগুলো স্টকে ফেরত যাবে:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {selectedInvoice.chalan_items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border shadow-sm">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{item.products?.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.products?.model}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-green-600">+{item.quantity}</span> <span className="text-xs font-bold text-slate-400">Pcs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-6">
              <p className="text-xs font-bold text-red-800 text-center">
                ⚠️ <strong className="font-black">সতর্কতা:</strong> কনফার্ম করার পর এই ইনভয়েস এবং এর সাথে যুক্ত সকল সিরিয়াল নম্বর ডাটাবেজ থেকে চিরতরে মুছে যাবে।
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setSelectedInvoice(null)} 
                className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                বাতিল করুন
              </button>
              <button 
                onClick={handleConfirmReturn} 
                disabled={processing}
                className="flex-1 py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
              >
                {processing ? 'প্রসেসিং হচ্ছে...' : 'কনফার্ম রিটার্ন'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ReturnManager;