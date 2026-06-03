import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChallan';
import { printBill } from '../utils/printBill';
import { downloadPDF } from '../utils/pdfGenerator';

const Dashboard = () => {
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
    setSelectedItem(item); setModalType(type); setPaymentMethod(''); setBillNo('');
    if (type !== 'product') {
        const { data } = await supabase.from('chalan_items').select('*, products(*)').eq('chalan_id', item.id);
        setModalItems(data || []);
    }
  };

  const handleAction = async () => {
    if (!selectedItem.is_in_house && (!paymentMethod || !billNo)) return alert('বিল নম্বর ও পেমেন্ট মেথড জরুরি!');
    
    setProcessing(true);
    try {
      if (selectedItem.is_in_house) {
        for (let itm of modalItems) {
          await supabase.from('products').update({ stock_quantity: itm.products.stock_quantity - itm.quantity }).eq('id', itm.product_id);
          const { data: targetP } = await supabase.from('products').select('id, stock_quantity').eq('name', itm.products.name).eq('model', itm.products.model).eq('house', selectedItem.transfer_to).maybeSingle();
          if (targetP) await supabase.from('products').update({ stock_quantity: targetP.stock_quantity + itm.quantity }).eq('id', targetP.id);
          else await supabase.from('products').insert([{ ...itm.products, id: undefined, stock_quantity: itm.quantity, house: selectedItem.transfer_to }]);
        }
        await supabase.from('chalans').update({ status: 'completed' }).eq('id', selectedItem.id);
      } else {
        for (let itm of modalItems) {
          await supabase.from('products').update({ stock_quantity: itm.products.stock_quantity - itm.quantity }).eq('id', itm.product_id);
        }
        await supabase.from('chalans').update({ status: 'paid', payment_method: paymentMethod, bill_no: billNo }).eq('id', selectedItem.id);
      }
      alert('সফল হয়েছে!'); setSelectedItem(null); fetchDashboardData();
    } catch (e) { alert('ত্রুটি: ' + e.message); }
    setProcessing(false);
  };

  const getCustomerData = (item) => ({
    name: item.customer_name || item.customers?.name || (item.is_in_house ? 'Transfer' : 'Walk-in'),
    phone: item.phone || item.customers?.phone || '',
    address: item.address || item.customers?.address || ''
  });

  if (loading) return <div className="flex justify-center items-center h-screen font-black animate-pulse">Loading...</div>;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-8 space-y-8 pb-20">
      {/* স্ট্যাটাস কার্ডস */}
      <div className="grid grid-cols-4 gap-4">
        {[ { label: 'Pending Action', val: holdChalans.length, color: 'bg-orange-500', icon: '⏳' }, { label: "Today's Chalans", val: todayChalans.length, color: 'bg-blue-600', icon: '📦' }, { label: "Today's Sales", val: todayBills.length, color: 'bg-green-600', icon: '🧾' }, { label: 'Low Stock Alert', val: lowStockProducts.length, color: 'bg-red-500', icon: '⚠️' } ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border shadow-sm flex justify-between items-center">
            <div><p className="text-[10px] font-black uppercase tracking-widest">{s.label}</p><h3 className="text-3xl font-black">{s.val}</h3></div>
            <div className={`w-3 h-3 rounded-full ${s.color}`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* পেন্ডিং সেকশন */}
        <div className="col-span-3 space-y-4">
          <h2 className="text-xs font-black uppercase">Pending Action</h2>
          {holdChalans.map(c => (
            <div key={c.id} onClick={() => handleViewDetails(c, 'chalan')} className="bg-white p-5 rounded-3xl border cursor-pointer hover:border-orange-400">
               <h4 className="font-black text-lg">{c.chalan_no}</h4>
               <p className="text-xs font-bold text-slate-400">{getCustomerData(c).name}</p>
               <p className="text-lg font-black mt-2">{c.total_amount} ৳</p>
            </div>
          ))}
        </div>

        {/* টুডেস চালান ও বিল এবং স্টক এলার্ট */}
        <div className="col-span-9 grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border h-[500px] overflow-y-auto">
             <h2 className="text-xs font-black uppercase mb-4">Today's Chalans</h2>
             {todayChalans.map(tc => <div key={tc.id} onClick={() => handleViewDetails(tc, 'chalan')} className="p-4 bg-slate-50 rounded-xl mb-2 cursor-pointer">{tc.chalan_no} - {getCustomerData(tc).name}</div>)}
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border h-[500px] overflow-y-auto">
             <h2 className="text-xs font-black uppercase mb-4">Today's Bills</h2>
             {todayBills.map(tb => <div key={tb.id} onClick={() => handleViewDetails(tb, 'bill')} className="p-4 bg-slate-50 rounded-xl mb-2 cursor-pointer">#{tb.bill_no} - {getCustomerData(tb).name}</div>)}
          </div>
          <div className="bg-red-50 p-6 rounded-[2.5rem] border h-[500px] overflow-y-auto">
             <h2 className="text-xs font-black uppercase mb-4">Critical Stock</h2>
             {lowStockProducts.map(p => <div key={p.id} className="p-4 bg-white rounded-xl mb-2 flex justify-between">{p.name} <span className="font-black text-red-500">{p.stock_quantity}</span></div>)}
          </div>
        </div>
      </div>

      {/* মডাল */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-8">
            <h2 className="text-2xl font-black">{selectedItem.chalan_no || selectedItem.bill_no}</h2>
            {modalItems.map((itm, i) => <div key={i} className="flex justify-between py-2">{itm.products?.name} x {itm.quantity} <span>{itm.total_price} ৳</span></div>)}
            
            {selectedItem.status === 'hold' ? (
              <div className="mt-6 space-y-4">
                 {!selectedItem.is_in_house && (
                    <>
                      <input type="text" placeholder="বিল নম্বর দিন" onChange={(e) => setBillNo(e.target.value)} className="w-full p-4 border rounded-xl font-bold" />
                      <select onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-4 border rounded-xl font-bold"><option value="">পেমেন্ট মেথড...</option><option value="Cash">Cash</option><option value="bKash">bKash</option></select>
                    </>
                 )}
                 <button onClick={handleAction} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase">Confirm & Finalize</button>
              </div>
            ) : <div className="mt-6 text-center text-green-600 font-black">✓ বিল সম্পন্ন</div>}
            <button onClick={() => setSelectedItem(null)} className="w-full mt-4 text-slate-400 font-bold">বন্ধ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;