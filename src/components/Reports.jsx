import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Reports = () => {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [reportType, setReportType] = useState('summary'); 
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedCustomerBills, setSelectedCustomerBills] = useState(null);
  const [mrps, setMrps] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    generateReport();
  }, [reportType]);

  useEffect(() => {
    fetchAllCustomers(); 
  }, []);

  const fetchAllCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name, phone').order('name', { ascending: true });
    if (data) setAllCustomers(data);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data: chalans, error } = await supabase
        .from('chalans')
        .select(`
          *,
          customers(name, phone),
          chalan_items(*, products(name, model, category))
        `)
        .gte('created_at', `${startDate}T00:00:00.000Z`)
        .lte('created_at', `${endDate}T23:59:59.999Z`);

      if (error) throw error;
      processReportData(chalans || []);
    } catch (error) {
      console.error(error);
      alert('রিপোর্ট জেনারেট করতে সমস্যা হয়েছে!');
    }
    setLoading(false);
  };

  const processReportData = (chalans) => {
    const data = {
      totalBills: 0,
      totalBillAmount: 0,
      totalChalans: 0,
      totalChalanAmount: 0,
      houseStats: { 'Head Office': { bills: 0, amount: 0, products: {} }, 'Showroom': { bills: 0, amount: 0, products: {} } },
      customerStats: {},
      productStats: {},
      combinedProductStats: {} // 📊 সার্বিক প্রোডাক্ট লজিক (HO + Showroom Combined)
    };

    chalans.forEach(ch => {
      const isPaid = ch.status === 'paid';
      const amt = parseFloat(ch.total_amount) || 0;
      const house = ch.house || 'Head Office';

      if (isPaid) {
        data.totalBills += 1;
        data.totalBillAmount += amt;
        
        if (!data.houseStats[house]) data.houseStats[house] = { bills: 0, amount: 0, products: {} };
        data.houseStats[house].bills += 1;
        data.houseStats[house].amount += amt;
      } else if (ch.status === 'hold') {
        data.totalChalans += 1;
        data.totalChalanAmount += amt;
      }

      if (isPaid && ch.customers) {
        const custName = ch.customers.name;
        const custPhone = ch.customers.phone || '';
        const custKey = `${custName}_${custPhone}`; 

        if (!data.customerStats[custKey]) {
          data.customerStats[custKey] = { name: custName, phone: custPhone, amount: 0, items: [], bills: [] };
        }
        data.customerStats[custKey].amount += amt;
        data.customerStats[custKey].bills.push(ch);
        
        ch.chalan_items.forEach(item => {
          const pName = `${item.products?.category || ''} ${item.products?.model || ''}`.trim();
          data.customerStats[custKey].items.push(`${pName} (${item.quantity} pcs)`);
        });
      }

      if (isPaid) {
        ch.chalan_items.forEach(item => {
          const pName = `${item.products?.category || ''} ${item.products?.model || ''} ${item.products?.name || ''}`.trim();
          const pKey = `${pName}_${house}`; 

          // ১. ট্যাব ৩-এর জন্য সাধারণ স্টক প্রোডাক্ট অবজেক্ট
          if (!data.productStats[pKey]) {
            data.productStats[pKey] = { name: pName, house: house, qty: 0, total: 0 };
          }
          data.productStats[pKey].qty += item.quantity;
          data.productStats[pKey].total += item.total_price;

          // ২. সার্বিক হিসাব ট্যাব (HO + Showroom combined product breakdown)
          if (!data.combinedProductStats[pName]) {
            data.combinedProductStats[pName] = { name: pName, qty: 0, total: 0 };
          }
          data.combinedProductStats[pName].qty += item.quantity;
          data.combinedProductStats[pName].total += item.total_price;

          // ৩. হাউজ রিপোর্ট ট্যাব (আইটেম ওয়াইজ ব্রেকডাউন)
          if (!data.houseStats[house].products[pName]) {
            data.houseStats[house].products[pName] = { name: pName, qty: 0, total: 0 };
          }
          data.houseStats[house].products[pName].qty += item.quantity;
          data.houseStats[house].products[pName].total += item.total_price;
        });
      }
    });

    setReportData(data);
  };

  const handleCustomerSearch = async (e) => {
    const val = e.target.value;
    setCustomerSearch(val);
    
    if (val.length >= 2) {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone')
        .or(`name.ilike.%${val}%,phone.ilike.%${val}%`)
        .limit(10);
      
      setCustomerSuggestions(data || []);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (cust) => {
    setCustomerSearch(cust.name); 
    setShowSuggestions(false);
  };

  const handleDropdownSelect = (e) => {
    setCustomerSearch(e.target.value);
  };

  // 📥 এ৪ পোর্ট্রেট ফরমাল মডিউল জেনারেটর (মার্জিন ফিক্সড)
  const downloadReportPDF = () => {
    const element = document.getElementById('formal-corporate-portrait-pdf');
    if (!element) return;

    setPdfLoading(true);

    const executeDownload = () => {
      const opt = {
        margin: 0, // মার্জিন সিএসএস দিয়ে হ্যান্ডেলড, তাই ইঞ্জিনে ০ থাকবে
        filename: `Lams_Power_Sales_Report_${startDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      element.classList.remove('hidden');

      window.html2pdf().from(element).set(opt).save().then(() => {
        element.classList.add('hidden');
        setPdfLoading(false);
      }).catch((err) => {
        console.error(err);
        element.classList.add('hidden');
        setPdfLoading(false);
      });
    };

    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = executeDownload;
      document.head.appendChild(script);
    } else {
      executeDownload();
    }
  };

  const calculateTotals = () => {
    let q = 0, m = 0, s = 0;
    if (reportData && reportData.productStats) {
      Object.values(reportData.productStats).forEach(stat => {
        const pKey = `${stat.name}_${stat.house}`;
        const currentMrp = parseFloat(mrps[pKey]) || 0;
        q += stat.qty;
        m += (currentMrp * stat.qty);
        s += stat.total;
      });
    }
    return { totalQty: q, totalMinAllowed: m, totalActualSold: s, totalSurplus: s - m };
  };

  const totals = calculateTotals();
  const filteredCustomers = reportData ? Object.values(reportData.customerStats)
    .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
    .sort((a, b) => b.amount - a.amount) : [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* ফিল্টার কন্ট্রোল বার */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">From Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">To Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500" />
          </div>
        </div>
        <button onClick={generateReport} disabled={loading} className="bg-blue-600 text-white px-10 py-3 h-[50px] rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95">
          {loading ? 'জেনারেট হচ্ছে...' : '📊 Generate Report'}
        </button>
      </div>

      {/* নেভিগেশন ট্যাব */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
        <div className="flex flex-wrap gap-2 flex-1">
          {[
            { id: 'summary', label: 'সার্বিক হিসাব (Summary)' },
            { id: 'house', label: 'হাউজ রিপোর্ট (HO vs Showroom)' },
            { id: 'product', label: 'প্রোডাক্ট সেলস রিপোর্ট' },
            { id: 'customer', label: 'কাস্টমার রিপোর্ট' }
          ].map(tab => (
            <button 
              key={tab.id} onClick={() => { setReportType(tab.id); setCustomerSearch(''); }}
              className={`flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold text-sm transition-all ${reportType === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={downloadReportPDF}
          disabled={pdfLoading}
          className="bg-slate-900 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
        >
          {pdfLoading ? 'প্রিন্ট ফাইল রেডি হচ্ছে...' : '📥 Download Formal PDF'}
        </button>
      </div>

      {/* 🖥️ ব্রাউজার ইউজার ইন্টারফেস এরিয়া */}
      {reportData && !loading && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
          
          {/* ১. সার্বিক হিসাব ট্যাব (উইথ কমপ্লিট প্রোডাক্টস কাউন্ট) */}
          {reportType === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border p-5 rounded-xl">
                  <p className="text-green-600 font-black text-xs mb-1 uppercase">Total Bills (Paid)</p>
                  <p className="text-2xl font-black text-slate-900">{reportData.totalBills} টি বিল — <span className="text-green-700">{reportData.totalBillAmount} ৳</span></p>
                </div>
                <div className="bg-orange-50 border p-5 rounded-xl">
                  <p className="text-orange-600 font-black text-xs mb-1 uppercase">Total Hold Chalans</p>
                  <p className="text-2xl font-black text-slate-900">{reportData.totalChalans} টি চালান — <span className="text-orange-700">{reportData.totalChalanAmount} ৳</span></p>
                </div>
              </div>

              {/* প্রোডাক্ট সেলস ওভারভিউ */}
              <div className="border rounded-xl overflow-hidden mt-4">
                <div className="bg-slate-50 p-4 border-b font-black text-xs text-slate-600 uppercase">Head Office + Showroom প্রোডাক্ট সেলস ব্রেকডাউন</div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-white font-black text-slate-400 border-b uppercase"><th className="p-3">Product Model</th><th className="p-3 text-center">Total Quantity</th><th className="p-3 text-right">Total Amount</th></tr>
                  </thead>
                  <tbody className="divide-y font-bold">
                    {Object.values(reportData.combinedProductStats).map((prod, i) => (
                      <tr key={i} className="hover:bg-slate-50"><td className="p-3">{prod.name}</td><td className="p-3 text-center text-blue-600">{prod.qty} pcs</td><td className="p-3 text-right text-slate-900">{prod.total} ৳</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ২. হাউজ রিপোর্ট ট্যাব (সুনির্দিষ্ট প্রোডাক্ট ব্রেকডাউন সহ) */}
          {reportType === 'house' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.keys(reportData.houseStats).map((house, idx) => (
                <div key={idx} className="border p-5 rounded-xl bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b pb-2 mb-3">
                      <h3 className="text-lg font-black text-slate-800">{house}</h3>
                      <span className="bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded text-[10px] uppercase">{reportData.houseStats[house].bills} Bills</span>
                    </div>
                    
                    {/* হাউজ ভিত্তিক স্পেসিফিক প্রোডাক্ট চার্ট */}
                    <div className="bg-white border rounded-xl overflow-hidden mb-4">
                      <table className="w-full text-left text-[11px] divide-y divide-slate-100">
                        <thead>
                          <tr className="bg-slate-50 font-black text-slate-400 uppercase"><th className="p-2">Product</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Total</th></tr>
                        </thead>
                        <tbody className="divide-y font-bold text-slate-700">
                          {Object.values(reportData.houseStats[house].products).map((p, i) => (
                            <tr key={i}>
                              <td className="p-2 truncate max-w-[150px]">{p.name}</td>
                              <td className="p-2 text-center text-purple-600">{p.qty} pcs</td>
                              <td className="p-2 text-right">{p.total} ৳</td>
                            </tr>
                          ))}
                          {Object.keys(reportData.houseStats[house].products).length === 0 && (
                            <tr><td colSpan="3" className="p-3 text-center text-slate-400 italic">কোনো মালামাল বিক্রয় হয়নি</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-sm font-black text-slate-800 flex justify-between border-t pt-2 mt-2"><span>মোট রেভিনিউ:</span> <span className="text-blue-600 text-base">{reportData.houseStats[house].amount} ৳</span></p>
                </div>
              ))}
            </div>
          )}

          {/* ৩. প্রোডাক্ট সেলস রিপোর্ট */}
          {reportType === 'product' && (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 uppercase font-black text-slate-500 border-b">
                    <th className="p-4">Product Description</th>
                    <th className="p-4 text-center">House</th>
                    <th className="p-4 text-center">Qty Sold</th>
                    <th className="p-4 text-center w-32">MRP (Unit)</th>
                    <th className="p-4 text-right">Min Value</th>
                    <th className="p-4 text-right">Actual Sold</th>
                    <th className="p-4 text-right">Surplus</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.values(reportData.productStats).map((stat, idx) => {
                    const pKey = `${stat.name}_${stat.house}`;
                    const currentMrp = parseFloat(mrps[pKey]) || 0;
                    const minVal = currentMrp * stat.qty;
                    const surplus = stat.total - minVal;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-800">{stat.name}</td>
                        <td className="p-4 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 uppercase">{stat.house}</span></td>
                        <td className="p-4 text-center font-black text-blue-600">{stat.qty} pcs</td>
                        <td className="p-4 text-center">
                          <input type="number" value={mrps[pKey] || ''} onChange={(e) => setMrps({ ...mrps, [pKey]: e.target.value })} className="w-20 p-1 bg-slate-50 border text-center font-bold text-xs rounded" placeholder="0" />
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-500">{currentMrp > 0 ? `${minVal} ৳` : '—'}</td>
                        <td className="p-4 text-right font-black text-slate-900">{stat.total} ৳</td>
                        <td className="p-4 text-right font-black">
                          {currentMrp > 0 ? <span className={surplus >= 0 ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded' : 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'}>{surplus >= 0 ? `+${surplus}` : surplus} ৳</span> : <span className="text-slate-400 italic">Set MRP</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black">
                  <tr><td colSpan="2" className="p-4 text-right">Grand Total:</td><td className="p-4 text-center text-orange-400">{totals.totalQty} pcs</td><td></td><td className="p-4 text-right text-slate-300">{totals.totalMinAllowed} ৳</td><td className="p-4 text-right text-emerald-400">{totals.totalActualSold} ৳</td><td className="p-4 text-right text-orange-400">+{totals.totalSurplus} ৳</td></tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ৪. কাস্টমার রিপোর্ট (স্মার্ট সার্চ ও ড্রপডাউন সিলেক্টর) */}
          {reportType === 'customer' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">🔍 সার্চ বক্স</label>
                  <input type="text" value={customerSearch} onChange={handleCustomerSearch} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="কাস্টমারের নাম বা মোবাইল নাম্বার টাইপ করুন..." className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none" />
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute left-0 w-full mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto text-xs font-bold">
                      {customerSuggestions.map(c => (<div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border-b hover:bg-blue-50 cursor-pointer">{c.name} — {c.phone}</div>))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">📋 কাস্টমার ড্রপডাউন মেনু</label>
                  <select value={customerSearch} onChange={handleDropdownSelect} className="w-full p-3 bg-white border rounded-xl font-bold text-xs text-slate-700 outline-none cursor-pointer">
                    <option value="">লিস্ট থেকে সিলেক্ট করুন...</option>
                    {allCustomers.map(c => (<option key={c.id} value={c.name}>{c.name} — {c.phone}</option>))}
                  </select>
                </div>
              </div>

              {/* লিস্ট ডিসপ্লে */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredCustomers.map((cust, i) => (
                  <div key={i} onClick={() => setSelectedCustomerBills(cust)} className="border p-4 rounded-xl bg-white hover:border-blue-500 transition-all shadow-sm cursor-pointer flex justify-between items-center text-xs font-bold">
                    <div><p className="text-slate-900 text-sm font-black">{cust.name}</p><p className="text-slate-400 font-medium mt-0.5">{cust.phone}</p></div>
                    <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-black">Total: {cust.amount} ৳</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 🏛️ -------------------------------------------------------------------------- 🏛️ */}
      {/* 👔 ৩. ফিক্সড আল্ট্রা-মিনিমাল এ৪ পোর্ট্রেট ফরমাল PDF কন্টেন্ট (স্ক্রিনশট ইমেজ_56dc68 থিম) */}
      {/* 🏛️ -------------------------------------------------------------------------- 🏛️ */}
      <div 
        id="formal-corporate-portrait-pdf" 
        className="hidden bg-white text-slate-900 mx-auto" 
        style={{ 
          width: '210mm',         
          padding: '20mm 15mm 20mm 15mm', // ট্রিপল মার্জিন সেফ জোন
          boxSizing: 'border-box',
          fontFamily: "Times New Roman, 'Inter', serif", 
          lineHeight: '1.4' 
        }}
      >
        
        {/* 💡 ফিক্সড স্ক্রিনশট হেডার থিম লেআউট */}
        <div className="pb-4 mb-6 flex justify-between items-start" style={{ borderBottom: '2px solid #0f172a' }}>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase" style={{ letterSpacing: '0.02em' }}>LAMS POWER</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Corporate Office: Alobdi Eidgah, Mirpur 12, Dhaka, Bangladesh</p>
          </div>
          <div className="text-right">
            <div className="border border-slate-900 px-4 py-1 bg-slate-50 text-center font-bold text-xs uppercase tracking-wider" style={{ minWidth: '170px' }}>
              Financial Sales Statement
            </div>
            <p className="text-[10px] text-slate-700 mt-2 font-bold">Period: <span className="font-bold">{startDate}</span> to <span className="font-bold">{endDate}</span></p>
            <p className="text-[9px] text-slate-400">Generated On: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* এক্সিকিউটিভ ফিন্যান্সিয়াল ওভারভিউ সামারি */}
        <div className="border border-slate-300 py-3 my-4 grid grid-cols-3 text-center text-[10px] font-bold uppercase bg-slate-50/50">
          <div className="border-r"><span className="text-[9px] text-slate-400 block mb-0.5">Target Value (MRP)</span><span className="text-slate-900 text-xs font-black">{totals.totalMinAllowed} ৳</span></div>
          <div className="border-r"><span className="text-[9px] text-slate-400 block mb-0.5">Actual Realized Revenue</span><span className="text-blue-900 text-xs font-black">{totals.totalActualSold} ৳</span></div>
          <div><span className="text-[9px] text-slate-400 block mb-0.5">Net Margin Surplus</span><span className="text-slate-900 text-xs font-black">+{totals.totalSurplus} ৳</span></div>
        </div>

        {/* ডাইনামিক ডাটা টেবিল (ক্লিন ও কম্প্যাক্ট ফরমাল স্টাইল) */}
        <div className="mt-6">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-slate-800 font-bold uppercase text-slate-500">
                <th className="pb-2 font-bold w-2/5">Product Description Specification</th>
                <th className="pb-2 text-center font-bold">Source</th>
                <th className="pb-2 text-center font-bold">Volume</th>
                <th className="pb-2 text-right font-bold">Base MRP</th>
                <th className="pb-2 text-right font-bold">Min Allowed</th>
                <th className="pb-2 text-right font-bold">Gross Sold</th>
                <th className="pb-2 text-right font-bold">Net Surplus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportType === 'product' && reportData && Object.values(reportData.productStats).map((stat, idx) => {
                const pKey = `${stat.name}_${stat.house}`;
                const currentMrp = parseFloat(mrps[pKey]) || 0;
                const minVal = currentMrp * stat.qty;
                const surplus = stat.total - minVal;
                return (
                  <tr key={idx}>
                    <td className="py-2 font-semibold text-slate-900">{stat.name}</td>
                    <td className="py-2 text-center text-slate-600 uppercase">{stat.house}</td>
                    <td className="py-2 text-center font-bold">{stat.qty} pcs</td>
                    <td className="py-2 text-right">{currentMrp} ৳</td>
                    <td className="py-2 text-right">{minVal} ৳</td>
                    <td className="py-2 text-right font-bold">{stat.total} ৳</td>
                    <td className="py-2 text-right font-bold bg-slate-50">+{surplus} ৳</td>
                  </tr>
                );
              })}
              
              {/* যদি ইউজার সামারি ট্যাবে থাকে, তবে পিডিএফেও সামারি প্রোডাক্ট লিস্ট প্রিন্ট হবে */}
              {reportType === 'summary' && reportData && Object.values(reportData.combinedProductStats).map((prod, idx) => (
                <tr key={idx}>
                  <td className="py-2 font-semibold text-slate-900" colSpan="2">{prod.name}</td>
                  <td className="py-2 text-center font-bold">{prod.qty} pcs</td>
                  <td className="py-2 text-right">—</td><td className="py-2 text-right">—</td>
                  <td className="py-2 text-right font-bold">{prod.total} ৳</td>
                  <td className="py-2 text-right font-bold bg-slate-50">—</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-b border-slate-800 font-bold text-slate-900 uppercase bg-slate-100">
                <td colSpan="2" className="py-2.5 text-right font-bold">Grand Valuations Total:</td>
                <td className="py-2.5 text-center font-bold">{totals.totalQty} Pcs</td>
                <td></td>
                <td className="py-2.5 text-right font-bold">{totals.totalMinAllowed} ৳</td>
                <td className="py-2.5 text-right font-bold text-blue-900">{totals.totalActualSold} ৳</td>
                <td className="py-2.5 text-right font-bold text-emerald-700">+{totals.totalSurplus} ৳</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* সিগনেচার এটেস্টেশন বার */}
        <div className="mt-20 grid grid-cols-3 gap-8 text-center text-[8px] uppercase tracking-wider text-slate-400 font-bold">
          <div><div className="border-t border-slate-300 pt-1.5 mx-4">Prepared By (Accounts)</div></div>
          <div><div className="border-t border-slate-300 pt-1.5 mx-4">Verified By (Auditor)</div></div>
          <div><div className="border-t border-slate-900 pt-1.5 mx-4 text-slate-900 font-bold">Authorized Approval (CEO)</div></div>
        </div>

      </div>

      {/* কাস্টমার বিল ডিটেইলস মডাল উইন্ডো কোড অপরিবর্তিত */}
    </div>
  );
};

export default Reports;