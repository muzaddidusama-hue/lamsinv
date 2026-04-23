import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printBill } from '../utils/printBill';

const BillManager = () => {
  const [searchNo, setSearchNo] = useState('');
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paidBills, setPaidBills] = useState([]);

  useEffect(() => {
    fetchPaidBills();
  }, [bill]);

  const fetchPaidBills = async () => {
    const { data } = await supabase
      .from('chalans')
      .select('*, customers (name, phone)')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (data) setPaidBills(data);
  };

  const loadBillDetails = async (bNo) => {
    setLoading(true);
    setBill(null);
    setItems([]);

    try {
      const { data: billData, error: billErr } = await supabase
        .from('chalans')
        .select('*, customers (name, phone, address)')
        .or(`bill_no.eq.${bNo},chalan_no.eq.${bNo}`)
        .eq('status', 'paid')
        .single();

      if (billErr || !billData) throw billErr;

      setBill(billData);

      const { data: itemData, error: itemErr } = await supabase
        .from('chalan_items')
        .select('*, products (name, model, category)')
        .eq('chalan_id', billData.id);

      if (itemErr) throw itemErr;
      setItems(itemData || []);
      setSearchNo(billData.bill_no); 

    } catch (error) {
      alert("ভুল বিল/চালান নাম্বার অথবা বিলটি এখনো ক্লিয়ার হয়নি!");
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchNo) loadBillDetails(searchNo);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">বিল অথবা চালান নাম্বার দিয়ে সার্চ দিন</label>
            <input type="text" value={searchNo} onChange={(e) => setSearchNo(e.target.value)} placeholder="যেমন: BLL-123456" className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-green-500 text-lg uppercase" />
          </div>
          <button type="submit" disabled={loading} className="h-14 px-10 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg active:scale-95">🔍 সার্চ</button>
          {bill && (
            <button type="button" onClick={() => { setBill(null); setSearchNo(''); fetchPaidBills(); }} className="h-14 px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Clear</button>
          )}
        </form>
      </div>

      {!bill && !loading && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
            <div className="h-4 w-1.5 bg-green-500 rounded-full"></div>
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Completed Bills (Paid)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidBills.map((pb) => (
              <div key={pb.id} onClick={() => loadBillDetails(pb.bill_no || pb.chalan_no)} className="bg-white p-5 rounded-2xl border border-slate-200 cursor-pointer hover:border-green-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-green-50 text-green-600 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">PAID</span>
                  <span className="text-[10px] font-bold text-slate-400">{new Date(pb.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-black text-slate-900 text-lg group-hover:text-green-600 transition-colors">{pb.bill_no || pb.chalan_no}</h4>
                <p className="text-sm font-bold text-slate-500 mt-1">{pb.customers?.name}</p>
                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Amount</span>
                  <span className="font-black text-slate-800">{pb.total_amount} ৳</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bill && (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 mb-6 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-black text-slate-900">BILL NO: {bill.bill_no}</h2>
                <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-black uppercase">PAID</span>
              </div>
              <p className="text-sm font-bold text-slate-400">Ref Challan: {bill.chalan_no}</p>
            </div>
            <button onClick={() => printBill(bill, bill.customers, items)} className="bg-green-600 text-white px-8 py-4 rounded-xl font-black text-lg hover:bg-green-700 shadow-xl active:scale-95 flex items-center gap-2">
              🧾 Print Final Bill
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Customer Info</p>
              <p className="font-bold text-slate-800 text-lg">{bill.customers?.name}</p>
              <p className="font-bold text-slate-500">{bill.customers?.phone}</p>
              <p className="text-sm text-slate-500 mt-1">{bill.customers?.address}</p>
            </div>
            <div className="md:text-right">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Payment Method</p>
              <p className="font-bold text-slate-800 text-lg">{bill.payment_method}</p>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-3 mb-1">Date</p>
              <p className="font-bold text-slate-600">{new Date(bill.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase font-black text-slate-400 border-b-2 border-slate-100">
                  <th className="p-4 pl-0">Item Description</th>
                  <th className="p-4 text-center">Qty</th>
                  <th className="p-4 text-right">Unit Price</th>
                  <th className="p-4 pr-0 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item, idx) => {
                  const desc = `${item.products?.category || ''} ${item.products?.model || ''} ${item.products?.name || ''}`.trim();
                  return (
                    <tr key={idx}>
                      <td className="p-4 pl-0 font-bold text-slate-800">{desc}</td>
                      <td className="p-4 text-center font-black">{item.quantity}</td>
                      <td className="p-4 text-right font-medium text-slate-500">{item.unit_price} ৳</td>
                      <td className="p-4 pr-0 text-right font-black text-slate-900">{item.total_price} ৳</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan="3" className="p-4 pr-6 text-right font-black text-slate-400 uppercase tracking-widest">Grand Total</td>
                  <td className="p-4 pr-0 text-right text-2xl font-black text-green-600">{bill.total_amount} ৳</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillManager;