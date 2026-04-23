import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const [holdChalans, setHoldChalans] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // পপ-আপের জন্য স্টেটস
  const [selectedChalan, setSelectedChalan] = useState(null);
  const [chalanItems, setChalanItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // ১. হোল্ড ও ট্রান্সফার পেন্ডিং চালান
      const { data: holdData } = await supabase
        .from('chalans')
        .select('*, customers(name, phone, address)')
        .eq('status', 'hold')
        .order('created_at', { ascending: false });
      
      // ২. লো-স্টক প্রোডাক্ট (< 30)
      const { data: stockData } = await supabase
        .from('products')
        .select('*')
        .lt('stock_quantity', 30)
        .order('stock_quantity', { ascending: true });

      // ৩. আজকের বিল
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: billsData } = await supabase
        .from('chalans')
        .select('*, customers(name, phone)')
        .eq('status', 'paid')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      setHoldChalans(holdData || []);
      setLowStockProducts(stockData || []);
      setRecentBills(billsData || []);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // চালান সিলেক্ট করলে ডিটেইলস আসবে
  const handleSelectChalan = async (chalan) => {
    setSelectedChalan(chalan);
    setPaymentMethod('');
    const { data } = await supabase
      .from('chalan_items')
      .select('*, products(name, model, category, stock_quantity)')
      .eq('chalan_id', chalan.id);
    setChalanItems(data || []);
  };

  // ইন-হাউজ ট্রান্সফার কনফার্ম করার লজিক
  const handleConfirmTransfer = async () => {
    if (!window.confirm('মাল স্থানান্তর কনফার্ম করবেন?')) return;
    setProcessing(true);
    try {
      for (let item of chalanItems) {
        const targetHouse = selectedChalan.transfer_to;
        const { data: targetProd } = await supabase
          .from('products')
          .select('id, stock_quantity')
          .eq('name', item.products.name)
          .eq('model', item.products.model)
          .eq('house', targetHouse)
          .maybeSingle();

        if (targetProd) {
          await supabase.from('products').update({ stock_quantity: targetProd.stock_quantity + item.quantity }).eq('id', targetProd.id);
        } else {
          await supabase.from('products').insert([{
            name: item.products.name, model: item.products.model, category: item.products.category,
            stock_quantity: item.quantity, house: targetHouse, unit_price: item.unit_price
          }]);
        }
      }
      await supabase.from('chalans').update({ status: 'completed' }).eq('id', selectedChalan.id);
      alert('✅ ট্রান্সফার সফল!');
      setSelectedChalan(null);
      fetchDashboardData();
    } catch (e) { alert('ত্রুটি হয়েছে!'); }
    setProcessing(false);
  };

  // রেগুলার পেমেন্ট কনফার্ম করার লজিক
  const handleConfirmPayment = async () => {
    if (!paymentMethod) return alert('পেমেন্ট মেথড দিন');
    setProcessing(true);
    try {
      const billNo = `BLL-${Date.now().toString().slice(-6)}`;
      await supabase.from('chalans').update({ 
        status: 'paid', 
        payment_method: paymentMethod, 
        bill_no: billNo 
      }).eq('id', selectedChalan.id);
      
      alert(`✅ পেমেন্ট সফল! বিল নং: ${billNo}`);
      setSelectedChalan(null);
      fetchDashboardData();
    } catch (e) { alert('পেমেন্ট নিতে সমস্যা হয়েছে'); }
    setProcessing(false);
  };

  if (loading) return <div className="flex justify-center items-center h-64 font-bold text-slate-400 italic">ডাটা লোড হচ্ছে...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-0" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* পেন্ডিং চালান কার্ড সেকশন */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
          <div className="h-5 w-1.5 bg-orange-500 rounded-full"></div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Pending Chalans (Hold)</h2>
          <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">{holdChalans.length}</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {holdChalans.map(hc => (
            <div 
              key={hc.id} 
              onClick={() => handleSelectChalan(hc)}
              className="bg-white p-5 rounded-3xl border border-slate-200 cursor-pointer hover:border-orange-500 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${hc.is_in_house ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                  {hc.is_in_house ? '🏠 Transfer' : '🛒 Sales'}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{new Date(hc.created_at).toLocaleDateString()}</span>
              </div>
              <h4 className="font-black text-slate-900 group-hover:text-orange-600 transition-colors">{hc.chalan_no}</h4>
              <p className="text-xs font-bold text-slate-500 mt-1 truncate">
                {hc.is_in_house ? `${hc.house} ➔ ${hc.transfer_to}` : hc.customers?.name}
              </p>
              <p className="text-lg font-black text-slate-800 mt-3">{hc.total_amount} ৳</p>
            </div>
          ))}
          {holdChalans.length === 0 && <p className="col-span-full py-10 text-center font-bold text-slate-300 border-2 border-dashed rounded-3xl italic">কোনো পেন্ডিং চালান নেই</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* লো স্টক অ্যালার্ট */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 bg-red-50 border-b border-red-100 flex justify-between items-center">
             <h3 className="text-sm font-black text-red-600 uppercase tracking-widest flex items-center gap-2">⚠️ Low Stock Alert</h3>
             <span className="bg-red-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black">{lowStockProducts.length}</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {lowStockProducts.map(p => (
              <div key={p.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                <div><p className="font-bold text-slate-800">{p.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{p.model} • {p.house}</p></div>
                <span className={`px-3 py-1 rounded-lg font-black text-sm ${p.stock_quantity <= 10 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{p.stock_quantity} pcs</span>
              </div>
            ))}
          </div>
        </div>

        {/* আজকের বিল */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 bg-green-50 border-b border-green-100 flex justify-between items-center">
             <h3 className="text-sm font-black text-green-700 uppercase tracking-widest flex items-center gap-2">✅ Today's Sales</h3>
             <span className="bg-green-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black">{recentBills.length}</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {recentBills.map(b => (
              <div key={b.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                <div><p className="font-black text-slate-900">{b.bill_no}</p><p className="text-[10px] font-bold text-slate-400">{b.customers?.name}</p></div>
                <div className="text-right"><p className="font-black text-slate-800">{b.total_amount} ৳</p><span className="text-[9px] font-black text-green-600 border border-green-200 px-2 rounded-full uppercase">{b.payment_method}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* কুইক অ্যাকশন মডাল (পপ-আপ) */}
      {selectedChalan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-start">
              <div>
                <h3 className="font-black text-2xl text-slate-900">{selectedChalan.chalan_no}</h3>
                <p className="text-sm font-bold text-slate-500">
                  {selectedChalan.is_in_house ? `🏠 ইন-হাউজ ট্রান্সফার: ${selectedChalan.transfer_to}` : `🛒 কাস্টমার: ${selectedChalan.customers?.name}`}
                </p>
              </div>
              <button onClick={() => setSelectedChalan(null)} className="p-2 bg-slate-200 rounded-full hover:bg-red-500 hover:text-white transition-all">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase font-black text-slate-400 border-b pb-2 mb-2 block">
                  <tr className="flex">
                    <th className="flex-1">Item Details</th>
                    <th className="w-20 text-center">Qty</th>
                    {!selectedChalan.is_in_house && <th className="w-24 text-right">Price</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 block">
                  {chalanItems.map((item, idx) => (
                    <tr key={idx} className="flex py-3 items-center">
                      <td className="flex-1"><p className="font-bold text-slate-800">{item.products?.name}</p><p className="text-xs text-slate-400">{item.products?.model}</p></td>
                      <td className="w-20 text-center font-black text-lg">{item.quantity}</td>
                      {!selectedChalan.is_in_house && <td className="w-24 text-right font-bold">{item.total_price} ৳</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-8 bg-slate-50 border-t flex flex-col gap-6">
              {!selectedChalan.is_in_house && (
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full md:w-48 p-4 bg-white border-2 border-orange-200 rounded-2xl font-black outline-none focus:border-orange-500"
                  >
                    <option value="">পেমেন্ট মেথড...</option>
                    <option value="Cash">Cash (নগদ)</option>
                    <option value="bKash">bKash (বিকাশ)</option>
                    <option value="Bank">Bank (ব্যাংক)</option>
                  </select>
                  <button 
                    disabled={processing}
                    onClick={handleConfirmPayment}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {processing ? 'লোড হচ্ছে...' : 'পেমেন্ট ও বিল কনফার্ম করুন'}
                  </button>
                </div>
              )}

              {selectedChalan.is_in_house && (
                <button 
                  disabled={processing}
                  onClick={handleConfirmTransfer}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 disabled:opacity-50 transition-all"
                >
                  {processing ? 'প্রসেসিং...' : 'ট্রান্সফার কনফার্ম করুন'}
                </button>
              )}
              
              <div className="flex justify-between items-center border-t pt-4">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-xs">Grand Total</span>
                <span className="font-black text-3xl text-slate-900">{selectedChalan.total_amount} ৳</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;