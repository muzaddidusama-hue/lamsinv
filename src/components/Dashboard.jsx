import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';
import { downloadPDF } from '../utils/pdfGenerator';

const Dashboard = ({ setView }) => {
  const [holdChalans, setHoldChalans] = useState([]);
  const [todayChalans, setTodayChalans] = useState([]);
  const [todayBills, setTodayBills] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalItems, setModalItems] = useState([]);
  const [modalType, setModalType] = useState(''); 
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [billNo, setBillNo] = useState('');

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthISO = startOfMonth.toISOString();
    try {
      const { data: hold } = await supabase.from('chalans').select('*, customers(*)').eq('status', 'hold').order('created_at', { ascending: false });
      const { data: tChalans } = await supabase.from('chalans').select('*, customers(*)').gte('created_at', startOfMonthISO).order('created_at', { ascending: false });
      const { data: tBills } = await supabase.from('chalans').select('*, customers(*)').eq('status', 'paid').gte('created_at', startOfMonthISO).order('created_at', { ascending: false });
      const { data: stock } = await supabase.from('products').select('*').lt('stock_quantity', 20).order('stock_quantity', { ascending: true });
      
      setHoldChalans(hold || []);
      setTodayChalans(tChalans || []);
      setTodayBills(tBills || []);
      setLowStockProducts(stock || []);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleViewDetails = async (item, type) => {
    setSelectedItem(item); setModalType(type); setPaymentMethod(''); setBillNo('');
    if (type !== 'product') {
        const { data } = await supabase.from('chalan_items').select('*, products(*)').eq('chalan_id', item.id);
        setModalItems(data || []);
    }
  };

  const checkIsTransfer = (val) => {
    return val === true || String(val).toLowerCase() === 'true';
  };

  // ইন-হাউজ স্টক ট্রান্সফারের ডাটাবেজ কনফ্লিক্ট ঠিক করা হয়েছে
  const handleAction = async (actionType) => {
    setProcessing(true);
    try {
      const isTransferMode = checkIsTransfer(selectedItem.is_in_house);

      if (actionType === 'transfer') {
        if (!isTransferMode) throw new Error("অবৈধ রিকোয়েস্ট!");
        
        for (let itm of modalItems) {
          // ১. সোর্স হাউজ থেকে কমানো
          const { data: sourceP } = await supabase.from('products').select('id, stock_quantity').eq('id', itm.product_id).single();
          if (sourceP) {
            await supabase.from('products').update({ stock_quantity: sourceP.stock_quantity - itm.quantity }).eq('id', sourceP.id);
          }
          
          // ২. টার্গেট হাউজে বাড়ানো বা নতুন তৈরি করা
          const { data: targetP } = await supabase.from('products').select('id, stock_quantity').eq('name', itm.products.name).eq('model', itm.products.model).eq('house', selectedItem.transfer_to).maybeSingle();
          
          if (targetP) {
            // যদি ঐ হাউজে আগে থেকেই এই প্রোডাক্ট থাকে, তাহলে স্টক যোগ হবে
            await supabase.from('products').update({ stock_quantity: targetP.stock_quantity + itm.quantity }).eq('id', targetP.id);
          } else {
            // যদি ঐ হাউজে প্রোডাক্টটি না থাকে, তবে নতুন করে এন্ট্রি হবে (আগের ID বাদ দিয়ে)
            const { id, created_at, stock_quantity, house, ...cleanProductData } = itm.products;
            
            await supabase.from('products').insert([{ 
              ...cleanProductData, 
              stock_quantity: itm.quantity, 
              house: selectedItem.transfer_to 
            }]);
          }
        }
        // ৩. চালানের স্ট্যাটাস কমপ্লিট করে দেওয়া
        await supabase.from('chalans').update({ status: 'completed' }).eq('id', selectedItem.id);
      } 
      
      else if (actionType === 'payment') {
        if (isTransferMode) throw new Error("ইন-হাউজ ট্রান্সফারে পেমেন্ট প্রযোজ্য নয়!");
        if (!paymentMethod) throw new Error('পেমেন্ট মেথড সিলেক্ট করুন!');
        
        const finalBillNo = billNo.trim() !== '' ? billNo.trim() : `BLL-${Date.now().toString().slice(-6)}`;

        for (let itm of modalItems) {
          const { data: p } = await supabase.from('products').select('id, stock_quantity').eq('id', itm.product_id).single();
          if (p) await supabase.from('products').update({ stock_quantity: p.stock_quantity - itm.quantity }).eq('id', p.id);
        }
        await supabase.from('chalans').update({ status: 'paid', payment_method: paymentMethod, bill_no: finalBillNo }).eq('id', selectedItem.id);
      }
      
      alert('✅ সফল হয়েছে!'); 
      setSelectedItem(null); 
      fetchDashboardData();
    } catch (e) { 
      alert(e.message || 'ত্রুটি হয়েছে'); 
      console.error(e); 
    }
    setProcessing(false);
  };

  const getCustomerData = (item) => {
    const isTransferMode = checkIsTransfer(item.is_in_house);
    return {
      name: item.customer_name || item.customers?.name || (isTransferMode ? 'Transfer' : 'Walk-in'),
      phone: item.phone || item.customers?.phone || '',
      address: item.address || item.customers?.address || ''
    };
  };

  const handlePrint = () => {
    const printItems = modalItems.map(item => ({ ...item.products, quantity: item.quantity, total_price: item.total_price, unit_price: item.unit_price }));
    const customerData = getCustomerData(selectedItem); 
    if (modalType === 'bill') printBill(selectedItem, customerData, printItems);
    else printChallan(selectedItem, customerData, printItems);
  };

  const handleDownload = () => {
    const printItems = modalItems.map(item => ({ ...item.products, quantity: item.quantity, total_price: item.total_price, unit_price: item.unit_price }));
    const customerData = getCustomerData(selectedItem); 
    downloadPDF(selectedItem, customerData, printItems, modalType === 'bill' ? 'Bill' : 'Challan');
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-slate-400 font-black animate-pulse uppercase tracking-widest text-xs">Loading LAMS System...</div>;

  const cardIcons = [
    // Clock Icon (Pending)
    <svg key="pending" className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>,
    // Box Icon (Today's Chalans)
    <svg key="chalans" className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>,
    // Receipt Icon (Today's Sales)
    <svg key="sales" className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>,
    // Warning Icon (Low Stock Alert)
    <svg key="warning" className="w-6 h-6 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 font-['Inter'] pb-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: 'Pending Action', val: holdChalans.length, bg: 'bg-orange-50/80 border-orange-100/50', icon: cardIcons[0] },
          { label: "This Month's Chalans", val: todayChalans.length, bg: 'bg-blue-50/80 border-blue-100/50', icon: cardIcons[1] },
          { label: "This Month's Sales", val: todayBills.length, bg: 'bg-emerald-50/80 border-emerald-100/50', icon: cardIcons[2] },
          { label: 'Low Stock Alert', val: lowStockProducts.length, bg: 'bg-red-50/80 border-red-100/50', icon: cardIcons[3] }
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover-scale flex items-center justify-between relative overflow-hidden group">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1.5">{s.val}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${s.bg}`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-3 space-y-4">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Pending Action</h2>
          <div className="space-y-3">
            {holdChalans.map(c => (
              <div key={c.id} onClick={() => handleViewDetails(c, 'chalan')} className="bg-white p-5 rounded-3xl border border-slate-100 hover-scale hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-3"><span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${checkIsTransfer(c.is_in_house) ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{checkIsTransfer(c.is_in_house) ? 'Transfer' : 'Sales'}</span><span className="text-[10px] font-bold text-slate-300">{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                <h4 className="font-black text-slate-800 text-lg">{c.chalan_no}</h4>
                <p className="text-xs font-bold text-slate-400 mt-1 truncate">{c.customer_name || c.customers?.name || (checkIsTransfer(c.is_in_house) ? `${c.house} ➔ ${c.transfer_to}` : 'Walk-in')}</p>
                <div className="mt-4 flex justify-between items-center"><span className="text-lg font-black text-slate-700">{c.total_amount} ৳</span><div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center transition-colors">→</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-9 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-[600px]">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 px-2">This Month's Chalans</h2>
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
               {todayChalans.map(tc => (
                 <div key={tc.id} onClick={() => handleViewDetails(tc, 'chalan')} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover-scale hover:bg-blue-50/30 cursor-pointer transition-all">
                    <div className="flex justify-between items-start">
                      <div><p className="font-black text-slate-800 text-sm">{tc.chalan_no}</p><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{tc.customer_name || tc.customers?.name || (checkIsTransfer(tc.is_in_house) ? `${tc.house} ➔ ${tc.transfer_to}` : 'Walk-in')}</p></div>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${tc.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{tc.status}</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-[600px]">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 px-2">This Month's Bills</h2>
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
               {todayBills.map(tb => (
                 <div key={tb.id} onClick={() => handleViewDetails(tb, 'bill')} className="bg-slate-50 p-4 rounded-2xl border hover:bg-green-50 cursor-pointer transition-all">
                    <div className="flex justify-between items-start">
                      <div><p className="font-black text-slate-800 text-sm">#{tb.bill_no || 'N/A'}</p><p className="text-[10px] font-bold text-slate-400 mt-1">{tb.customer_name || tb.customers?.name || 'Walk-in'}</p></div>
                      <span className="text-[8px] font-black bg-green-600 text-white px-2 py-0.5 rounded-full uppercase">{tb.payment_method}</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
          <div className="bg-red-50/40 p-6 rounded-[2.5rem] border border-red-100 flex flex-col h-[600px]">
            <h2 className="text-xs font-black text-red-500 uppercase tracking-widest mb-6 px-2">Critical Stock</h2>
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
              {lowStockProducts.map(p => (
                <div key={p.id} onClick={() => handleViewDetails(p, 'product')} className="bg-white p-4 rounded-2xl border border-red-50 flex items-center justify-between hover:shadow-md cursor-pointer transition-all">
                  <div>
                    <p className="font-black text-slate-800 text-sm">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{p.model}</p>
                      {/* 🔴 আপডেট: হাউজের নাম দেখানোর জন্য ব্যাজ যুক্ত করা হয়েছে */}
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${p.house === 'Showroom' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {p.house === 'Showroom' ? 'Showroom' : 'HO'}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg font-black text-xs ${p.stock_quantity < 10 ? 'bg-red-500 text-white' : 'bg-orange-100 text-orange-600'}`}>{p.stock_quantity}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-slate-50 border-b flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{modalType} DETAILS</span>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{selectedItem.bill_no || selectedItem.chalan_no || selectedItem.name}</h3>
                <p className="text-sm font-bold text-slate-400 mt-2">
                  {modalType === 'product' ? `Model: ${selectedItem.model}` : (checkIsTransfer(selectedItem.is_in_house) ? `Transfer: ${selectedItem.house} ➔ ${selectedItem.transfer_to}` : `Customer: ${selectedItem.customer_name || selectedItem.customers?.name || 'Walk-in'}`)}
                </p>
              </div>
              <div className="flex gap-2">
                {modalType !== 'product' && (
                  <>
                    <button onClick={handlePrint} className="w-10 h-10 bg-white border rounded-full hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center justify-center">🖨️</button>
                    <button onClick={handleDownload} className="w-10 h-10 bg-white border rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center">📥</button>
                  </>
                )}
                <button onClick={() => setSelectedItem(null)} className="w-10 h-10 bg-white border rounded-full hover:bg-red-500 hover:text-white transition-all font-bold flex items-center justify-center">✕</button>
              </div>
            </div>
            <div className="p-8 max-h-[45vh] overflow-y-auto custom-scrollbar">
              {modalType === 'product' ? (
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div className="bg-slate-50 p-6 rounded-3xl"><p className="text-xs font-bold text-slate-400 uppercase mb-2">In Stock</p><p className="text-4xl font-black text-slate-800">{selectedItem.stock_quantity}</p></div>
                  <div className="bg-slate-50 p-6 rounded-3xl"><p className="text-xs font-bold text-slate-400 uppercase mb-2">Price</p><p className="text-4xl font-black text-slate-800">{selectedItem.unit_price}৳</p></div>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead><tr className="text-[10px] font-black text-slate-400 uppercase border-b pb-2"><th className="pb-4">Product</th><th className="pb-4 text-center">Qty</th><th className="pb-4 text-right">Total</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalItems.map((itm, i) => (
                      <tr key={i} className="group"><td className="py-4 font-bold text-slate-700">{itm.products?.name} <span className="text-xs text-slate-400 block">{itm.products?.model}</span></td><td className="py-4 text-center font-black">{itm.quantity}</td><td className="py-4 text-right font-black text-slate-900">{itm.total_price} ৳</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-8 bg-slate-50 border-t">
               {selectedItem.status === 'hold' ? (
                 <div className="space-y-4">
                    {checkIsTransfer(selectedItem.is_in_house) ? (
                      <button onClick={() => handleAction('transfer')} disabled={processing} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg active:scale-95 uppercase tracking-widest">{processing ? 'Processing...' : 'Confirm Transfer'}</button>
                    ) : (
                      <div className="space-y-3">
                        <input type="text" placeholder="ম্যানুয়াল বিল নাম্বার (খালি রাখলে অটোমেটিক হবে)" value={billNo} onChange={(e) => setBillNo(e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black outline-none focus:border-green-500 shadow-sm" />
                        <div className="flex flex-col md:flex-row gap-3">
                          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="flex-1 p-4 bg-white border-2 border-slate-200 rounded-2xl font-black outline-none focus:border-green-500 shadow-sm">
                            <option value="">Method...</option><option value="Cash">Cash (💵)</option><option value="bKash">bKash (📱)</option><option value="Bank">Bank (🏦)</option>
                          </select>
                          <button onClick={() => handleAction('payment')} disabled={processing || !paymentMethod} className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-md whitespace-nowrap">{processing ? '...' : 'Receive Payment'}</button>
                        </div>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="mt-4 flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Status</p><p className="text-xl font-black text-slate-800 mt-1 uppercase">{selectedItem.status} via {selectedItem.payment_method || 'System'}</p></div>
                    <p className="text-3xl font-black text-green-600">{selectedItem.total_amount} ৳</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;