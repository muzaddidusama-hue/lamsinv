import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printBill } from '../utils/printBill';
import { downloadPDF } from '../utils/pdfGenerator';

const BillManager = () => {
  const [searchNo, setSearchNo] = useState('');
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paidBills, setPaidBills] = useState([]);

  useEffect(() => { fetchPaidBills(); }, [bill]);

  const fetchPaidBills = async () => {
    const { data } = await supabase.from('chalans').select('*, customers (name, phone)').eq('status', 'paid').order('created_at', { ascending: false }).limit(30);
    if (data) setPaidBills(data);
  };

  const loadBillDetails = async (bNo) => {
    setLoading(true); setBill(null); setItems([]);
    try {
      const { data: billData, error: billErr } = await supabase.from('chalans').select(`*, customers (*)`).or(`bill_no.eq.${bNo.toUpperCase()},chalan_no.eq.${bNo.toUpperCase()}`).eq('status', 'paid').single();
      if (billErr || !billData) throw billErr;
      setBill(billData);
      const { data: itemData } = await supabase.from('chalan_items').select(`*, products (*)`).eq('chalan_id', billData.id);
      setItems(itemData || []);
      setSearchNo(billData.bill_no); 
    } catch (error) { alert("বিল খুঁজে পাওয়া যায়নি!"); }
    setLoading(false);
  };

  const handleDownload = () => {
    const printItems = items.map(item => ({ ...item.products, quantity: item.quantity, total_price: item.total_price, unit_price: item.unit_price }));
    downloadPDF(bill, bill.customers, printItems, 'Bill');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 p-4" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <form onSubmit={(e) => {e.preventDefault(); loadBillDetails(searchNo);}} className="flex gap-4">
          <input type="text" value={searchNo} onChange={(e) => setSearchNo(e.target.value)} placeholder="BLL-123456" className="flex-1 h-14 px-6 bg-slate-50 border rounded-2xl font-black text-slate-800 uppercase outline-none focus:ring-2 focus:ring-green-500" />
          <button type="submit" className="h-14 px-10 bg-green-600 text-white rounded-2xl font-bold">সার্চ</button>
        </form>
      </div>

      {!bill ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paidBills.map((pb) => (
            <div key={pb.id} onClick={() => loadBillDetails(pb.bill_no)} className="bg-white p-6 rounded-3xl border cursor-pointer hover:border-green-500 transition-all shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black px-2.5 py-1 rounded bg-green-50 text-green-600 uppercase">PAID</span>
                <span className="text-[10px] font-bold text-slate-400">{new Date(pb.created_at).toLocaleDateString()}</span>
              </div>
              <h4 className="font-black text-slate-900 text-xl">{pb.bill_no}</h4>
              <p className="text-sm font-bold text-slate-500 mt-1">{pb.customers?.name || 'Walk-in'}</p>
              <div className="mt-6 pt-4 border-t flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Total</span><span className="font-black text-slate-800 text-lg">{pb.total_amount} ৳</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in zoom-in-95">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase">BILL NO: {bill.bill_no}</h2>
              <p className="text-sm font-bold text-slate-400">Ref Challan: {bill.chalan_no}</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => printBill(bill, bill.customers, items.map(i => ({...i.products, quantity: i.quantity, total_price: i.total_price})))} className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg">🖨️ প্রিন্ট বিল</button>
              <button onClick={handleDownload} className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg">📥 সরাসরি PDF ডাউনলোড</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Customer Info</p>
              <p className="font-bold text-slate-800 text-lg">{bill.customers?.name || 'Walk-in'}</p>
              <p className="text-sm text-slate-400 italic">📍 {bill.customers?.address || 'No Address'}</p>
            </div>
            <div className="md:text-right">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Paid Via</p>
              <p className="font-bold text-slate-800 text-lg">{bill.payment_method}</p>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-3 mb-1">Date</p>
              <p className="font-bold text-slate-600">{new Date(bill.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <table className="w-full text-left mb-6">
            <thead className="text-[10px] uppercase font-black text-slate-400 border-b">
              <tr><th className="pb-4">Product Details</th><th className="pb-4 text-center">Qty</th><th className="pb-4 text-right">Price</th><th className="pb-4 text-right pr-0">Total</th></tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (<tr key={idx} className="border-b last:border-0"><td className="py-4 font-bold">{item.products?.name} <br/><span className="text-xs text-slate-400">{item.products?.model}</span></td><td className="text-center font-black">{item.quantity}</td><td className="text-right font-medium">{item.unit_price} ৳</td><td className="text-right font-black pr-0">{item.total_price} ৳</td></tr>))}
            </tbody>
            <tfoot>
              <tr><td colSpan="3" className="pt-6 text-right font-black text-slate-400 uppercase">Grand Total</td><td className="pt-6 text-right text-3xl font-black text-green-600 pr-0">{bill.total_amount} ৳</td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
export default BillManager;