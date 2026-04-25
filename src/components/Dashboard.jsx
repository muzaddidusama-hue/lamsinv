import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';

const Dashboard = () => {
  const [holdChalans, setHoldChalans] = useState([]);
  const [todayChalans, setTodayChalans] = useState([]);
  const [todayBills, setTodayBills] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // মডাল স্টেটস
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalItems, setModalItems] = useState([]);
  const [modalType, setModalType] = useState(''); 
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    try {
      const { data: hold } = await supabase.from('chalans').select('*, customers(*)').eq('status', 'hold').order('created_at', { ascending: false });
      const { data: tChalans } = await supabase.from('chalans').select('*, customers(*)').gte('created_at', todayISO).order('created_at', { ascending: false });
      const { data: tBills } = await supabase.from('chalans').select('*, customers(*)').eq('status', 'paid').gte('created_at', todayISO).order('created_at', { ascending: false });
      const { data: stock } = await supabase.from('products').select('*').lt('stock_quantity', 20).order('stock_quantity', { ascending: true });

      setHoldChalans(hold || []);
      setTodayChalans(tChalans || []);
      setTodayBills(tBills || []);
      setLowStockProducts(stock || []);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleViewDetails = async (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setPaymentMethod('');
    
    if (type === 'product') {
        setModalItems([]);
    } else {
        const { data } = await supabase.from('chalan_items').select('*, products(*)').eq('chalan_id', item.id);
        setModalItems(data || []);
    }
  };

  const handleAction = async (actionType) => {
    setProcessing(true);
    try {
      if (actionType === 'transfer') {
        for (let itm of modalItems) {
          const target = selectedItem.transfer_to;
          const { data: p } = await supabase.from('products').select('id, stock_quantity').eq('name', itm.products.name).eq('model', itm.products.model).eq('house', target).maybeSingle();
          if (p) await supabase.from('products').update({ stock_quantity: p.stock_quantity + itm.quantity }).eq('id', p.id);
          else await supabase.from('products').insert([{ ...itm.products, id: undefined, stock_quantity: itm.quantity, house: target }]);
        }
        await supabase.from('chalans').update({ status: 'completed' }).eq('id', selectedItem.id);
      } else {
        const bNo = `BLL-${Date.now().toString().slice(-6)}`;
        await supabase.from('chalans').update({ status: 'paid', payment_method: paymentMethod, bill_no: bNo }).eq('id', selectedItem.id);
      }
      alert('সফল হয়েছে!'); setSelectedItem(null); fetchDashboardData();
    } catch (e) { alert('ত্রুটি হয়েছে'); }
    setProcessing(false);
  };

  // পপ-আপ থেকে প্রিন্ট করার হ্যান্ডলার
  const handlePrint = () => {
    const printItems = modalItems.map(item => ({
      ...item.products,
      quantity: item.quantity,
      total_price: item.total_price
    }));

    if (selectedItem.status === 'paid') {
      printBill(selectedItem, selectedItem.customers || { name: 'Walk-in' }, printItems);
    } else {
      printChallan(selectedItem, selectedItem.customers || { name: selectedItem.is_in_house ? 'Internal Transfer' : 'Walk-in' }, printItems);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-slate-400 font-black animate-pulse uppercase tracking-widest">Lams Power System Loading...</div>;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 font-['Inter'] pb-20">
      
      {/* স্ট্যাটাস কার্ডস */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Hold', val: holdChalans.length, color: 'bg-orange-500', icon: '⏳' },
          { label: "Today's Chalans", val: todayChalans.length, color: 'bg-blue-600', icon: '📦' },
          { label: "Today's Final Bills", val: todayBills.length, color: 'bg-green-600', icon: '🧾' },
          { label: 'Low Stock Alert', val: lowStockProducts.length, color: 'bg-red-500', icon: '⚠️' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between overflow-hidden relative group">
            <div className={`absolute -right-2 -bottom-2 text-6xl opacity-5 group-hover:scale-125 transition-transform`}>{s.icon}</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{s.val}</h3>
            </div>
            <div className={`w-3 h-3 rounded-full ${s.color}`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* ১. পেন্ডিং হোল্ড (Left) */}
        <div className="xl:col-span-3 space-y-4">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span> Pending Payment/Transfer
          </h2>
          <div className="space-y-3">
            {holdChalans.map(c => (
              <div key={c.id} onClick={() => handleViewDetails(c, 'chalan')} className="bg-white p-5 rounded-3xl border border-slate-100 hover:border-orange-400 hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${c.is_in_house ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{c.is_in_house ? 'Transfer' : 'Sales'}</span>
                  <span className="text-[10px] font-bold text-slate-300">{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <h4 className="font-black text-slate-800 text-lg group-hover:text-orange-600 transition-colors">{c.chalan_no}</h4>
                {/* কার্ডে কাস্টমার/ট্রান্সফার পাথ প্রিভিউ */}
                <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                  {c.customers?.name ? c.customers.name : (c.is_in_house ? `${c.house} ➔ ${c.transfer_to}` : 'Walk-in')}
                </p>
                <div className="mt-4 flex justify-between items-center">
                   <span className="text-lg font-black text-slate-700">{c.total_amount} ৳</span>
                   <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">→</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ২. আজকের ডেটা (Middle & Right) */}
        <div className="xl:col-span-9 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-[650px]">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6 px-2">
               <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Today's Chalans
            </h2>
            <div className="space-y-2 overflow-y-auto pr-2">
               {todayChalans.map(tc => (
                 <div key={tc.id} onClick={() => handleViewDetails(tc, 'bill')} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-slate-800 text-sm">{tc.chalan_no}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                          {tc.customers?.name ? tc.customers.name : (tc.is_in_house ? `${tc.house} ➔ ${tc.transfer_to}` : 'Walk-in')}
                        </p>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${tc.status === 'paid' || tc.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{tc.status}</span>
                    </div>
                    <p className="font-black text-blue-600 text-sm mt-3">{tc.total_amount} ৳</p>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-[650px]">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6 px-2">
               <span className="w-2 h-2 bg-green-500 rounded-full"></span> Today's Final Bills
            </h2>
            <div className="space-y-2 overflow-y-auto pr-2">
               {todayBills.map(tb => (
                 <div key={tb.id} onClick={() => handleViewDetails(tb, 'bill')} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-green-50 hover:border-green-200 cursor-pointer transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-slate-800 text-sm">#{tb.bill_no || 'N/A'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{tb.customers?.name || 'Walk-in'}</p>
                      </div>
                      <span className="text-[8px] font-black bg-green-600 text-white px-2 py-0.5 rounded-full uppercase">{tb.payment_method}</span>
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                       <p className="font-black text-green-700 text-sm">{tb.total_amount} ৳</p>
                       <p className="text-[9px] font-bold text-slate-300 italic">{tb.chalan_no}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-red-50/40 p-6 rounded-[2.5rem] border border-red-100 shadow-sm flex flex-col h-[650px]">
            <h2 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2 mb-6 px-2">
               <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Critical Stock Alert
            </h2>
            <div className="space-y-2 overflow-y-auto pr-2">
              {lowStockProducts.map(p => (
                <div key={p.id} onClick={() => handleViewDetails(p, 'product')} className="bg-white p-4 rounded-2xl border border-red-50 flex items-center justify-between hover:shadow-md cursor-pointer transition-all">
                  <div>
                    <p className="font-black text-slate-800 text-sm">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{p.model} • {p.house}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg font-black text-xs ${p.stock_quantity < 10 ? 'bg-red-500 text-white' : 'bg-orange-100 text-orange-600'}`}>
                    {p.stock_quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* গ্লোবাল ডিটেইলস মডাল */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-slate-50 border-b flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">{modalType} DETAILS</span>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{selectedItem.bill_no || selectedItem.chalan_no || selectedItem.name}</h3>
                <p className="text-sm font-bold text-slate-400 mt-2">
                  {modalType === 'product' ? `Model: ${selectedItem.model}` : 
                  (selectedItem.is_in_house ? `Transfer: ${selectedItem.house} ➔ ${selectedItem.transfer_to}` : `Customer: ${selectedItem.customers?.name || 'Walk-in'}`)}
                </p>
              </div>
              <div className="flex gap-2">
                {/* পপ-আপের ভেতরে প্রিন্ট ও পিডিএফ বাটন */}
                {modalType !== 'product' && (
                  <>
                    <button onClick={handlePrint} className="w-10 h-10 bg-white border border-slate-200 rounded-full hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center justify-center">🖨️</button>
                    <button onClick={handlePrint} className="w-10 h-10 bg-white border border-slate-200 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center">📥</button>
                  </>
                )}
                <button onClick={() => setSelectedItem(null)} className="w-10 h-10 bg-white border border-slate-200 rounded-full hover:bg-red-500 hover:text-white transition-all font-bold shadow-sm flex items-center justify-center">✕</button>
              </div>
            </div>

            <div className="p-8 max-h-[45vh] overflow-y-auto">
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
                    {selectedItem.is_in_house ? (
                      <button onClick={() => handleAction('transfer')} disabled={processing} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition-all uppercase tracking-widest">{processing ? 'Processing...' : 'Confirm Transfer'}</button>
                    ) : (
                      <div className="flex gap-3">
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="flex-1 p-4 bg-white border-2 border-slate-200 rounded-2xl font-black outline-none focus:border-green-500 shadow-sm"><option value="">Method...</option><option value="Cash">Cash (💵)</option><option value="bKash">bKash (📱)</option><option value="Bank">Bank (🏦)</option></select>
                        <button onClick={() => handleAction('payment')} disabled={processing || !paymentMethod} className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-2xl font-black text-lg transition-all shadow-md">{processing ? '...' : 'Receive Payment'}</button>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="mt-4 flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Status</p>
                      <p className="text-xl font-black text-slate-800 mt-1 uppercase">{selectedItem.status} via {selectedItem.payment_method || 'System'}</p>
                    </div>
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