import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';

const ServiceManager = () => {
  const [searchNo, setSearchNo] = useState('');
  const [record, setRecord] = useState(null); // চালান বা বিলের মূল ডাটা
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchNo.trim()) return alert("চালান বা বিল নম্বর দিন!");

    setLoading(true);
    setRecord(null);
    setItems([]);

    const queryText = searchNo.trim().toUpperCase();

    try {
      // চালানের টেবিলে বিল নম্বর অথবা চালান নম্বর যেকোনো একটি মিললেই ডাটা নিয়ে আসবে
      const { data: mainData, error: mainErr } = await supabase
        .from('chalans')
        .select(`*, customers (*)`)
        .or(`chalan_no.eq.${queryText},bill_no.eq.${queryText}`)
        .maybeSingle();

      if (mainErr) throw mainErr;
      if (!mainData) {
        alert("কোনো চালান বা বিল খুঁজে পাওয়া যায়নি!");
        setLoading(false);
        return;
      }

      setRecord(mainData);

      // আইটেম বা প্রোডাক্ট লিস্ট নিয়ে আসা
      const { data: itemData, error: itemErr } = await supabase
        .from('chalan_items')
        .select(`*, products (*)`)
        .eq('chalan_id', mainData.id);

      if (itemErr) throw itemErr;
      setItems(itemData || []);

    } catch (error) {
      console.error(error);
      alert("তথ্য লোড করতে সমস্যা হয়েছে!");
    }
    setLoading(false);
  };

  // আপনার বাকি ৩টি কম্পোনেন্টের সাথে মিল রেখে কাস্টমার ডাটা বের করার স্ট্যান্ডার্ড ফাংশন
  const getCustomerData = (rec) => {
    if (!rec) return { name: 'Walk-in', phone: '', address: '' };
    return {
      name: rec.customer_name || rec.customers?.name || (rec.is_in_house ? `Transfer (${rec.house} → ${rec.transfer_to})` : 'Walk-in'),
      phone: rec.phone || rec.customers?.phone || '-',
      address: rec.address || rec.customers?.address || ''
    };
  };

  // প্রিন্ট হ্যান্ডলার
  const handlePrint = () => {
    const printItems = items.map(item => ({
      ...item.products,
      quantity: item.quantity,
      total_price: item.total_price,
      unit_price: item.unit_price
    }));

    if (record.status === 'paid') {
      printBill(record, getCustomerData(record), printItems);
    } else {
      printChallan(record, getCustomerData(record), printItems);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 p-4" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* সার্চ বার */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input 
            type="text" 
            value={searchNo} 
            onChange={(e) => setSearchNo(e.target.value)} 
            placeholder="চালান বা বিল নম্বর দিন (যেমন: CHL-123456 বা BLL-123456)" 
            className="flex-1 h-14 px-6 bg-slate-50 border rounded-2xl font-black text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-600" 
          />
          <button type="submit" disabled={loading} className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors">
            {loading ? 'খোঁজা হচ্ছে...' : 'সার্চ'}
          </button>
        </form>
      </div>

      {record && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in-95">
          
          {/* 📋 সেকশন ১: বেসিক এবং কাস্টমার ইনফরমেশন */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">১. চালানের বিবরণ</h3>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${record.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                  {record.status}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-bold">চালান নম্বর</p>
                <p className="text-lg font-black text-slate-800 uppercase">{record.chalan_no}</p>
              </div>

              {record.bill_no && (
                <div className="space-y-1 pt-2 border-t border-dashed">
                  <p className="text-xs text-slate-400 font-bold">বিল নম্বর</p>
                  <p className="text-lg font-black text-green-600 uppercase">{record.bill_no}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed">
                <div>
                  <p className="text-xs text-slate-400 font-bold">সোর্স হাউজ</p>
                  <p className="text-sm font-black text-slate-700">{record.house || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold">তারিখ</p>
                  <p className="text-sm font-bold text-slate-600">{new Date(record.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* কাস্টমার কার্ড */}
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider border-b pb-2">👤 কাস্টমারের তথ্য</h3>
              <div>
                <p className="text-xs text-slate-400 font-bold">নাম</p>
                <p className="font-black text-slate-800 text-base">{getCustomerData(record).name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">মোবাইল</p>
                <p className="font-bold text-slate-700">{getCustomerData(record).phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">ঠিকানা</p>
                <p className="text-sm text-slate-500 italic">📍 {getCustomerData(record).address || 'ঠিকানা পাওয়া যায়নি'}</p>
              </div>
            </div>
          </div>

          {/* 🛒 সেকশন ২: প্রোডাক্ট লিস্ট ও পেমেন্ট সামারি */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">২. মালের বিবরণ (Product List)</h3>
                  <button onClick={handlePrint} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
                    🖨️ প্রিন্ট {record.status === 'paid' ? 'বিল' : 'চালান'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-[10px] uppercase font-black text-slate-400 border-b">
                      <tr>
                        <th className="pb-4">Product</th>
                        <th className="pb-4 text-center">Qty</th>
                        <th className="pb-4 text-right">Price</th>
                        <th className="pb-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-bold text-slate-800">
                            {item.products?.name} <br/>
                            <span className="text-xs text-slate-400 font-medium">{item.products?.model}</span>
                          </td>
                          <td className="text-center font-black text-slate-800">{item.quantity}</td>
                          <td className="text-right font-medium text-slate-500">{item.unit_price} ৳</td>
                          <td className="text-right font-black text-slate-900">{item.total_price} ৳</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* পেমেন্ট মেথড ও গ্র্যান্ড টোটাল সামারি */}
              <div className="flex justify-between items-center border-t pt-6 mt-6 bg-slate-50 p-6 rounded-2xl">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">পেমেন্ট মেথড</p>
                  <p className="font-black text-slate-800 text-lg">
                    {record.payment_method ? `💳 ${record.payment_method}` : '❌ Unpaid / Hold'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-black uppercase">Grand Total</p>
                  <p className="text-3xl font-black text-slate-900">{record.total_amount} ৳</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ইনিশিয়াল স্টেট মেসেজ */}
      {!record && !loading && (
        <div className="py-20 text-center font-bold text-slate-300 italic border border-dashed rounded-3xl bg-white">
          চালান বা বিল নম্বর ইনপুট দিয়ে সার্চ করুন। যাবতীয় তথ্য এখানে চলে আসবে।
        </div>
      )}
    </div>
  );
};

export default ServiceManager;