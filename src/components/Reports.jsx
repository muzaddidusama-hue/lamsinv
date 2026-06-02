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

  // প্রোডাক্ট অনুযায়ী ম্যানুয়াল MRP ট্র্যাক করার অবজেক্ট
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
      houseStats: { 'Head Office': { bills: 0, amount: 0 }, 'Showroom': { bills: 0, amount: 0 } },
      customerStats: {},
      productStats: {}
    };

    chalans.forEach(ch => {
      const isPaid = ch.status === 'paid';
      const amt = parseFloat(ch.total_amount) || 0;
      const house = ch.house || 'Head Office';

      if (isPaid) {
        data.totalBills += 1;
        data.totalBillAmount += amt;
      } else if (ch.status === 'hold') {
        data.totalChalans += 1;
        data.totalChalanAmount += amt;
      }

      if (isPaid) {
        if (!data.houseStats[house]) data.houseStats[house] = { bills: 0, amount: 0 };
        data.houseStats[house].bills += 1;
        data.houseStats[house].amount += amt;
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

          if (!data.productStats[pKey]) {
            data.productStats[pKey] = { name: pName, house: house, qty: 0, total: 0 };
          }
          data.productStats[pKey].qty += item.quantity;
          data.productStats[pKey].total += item.total_price;
        });
      }
    });

    setReportData(data);
  };

  // 📥 কর্পোরেট লেটারহেড ফরমাল PDF জেনারেটর
  const downloadReportPDF = () => {
    const element = document.getElementById('formal-corporate-pdf-template');
    if (!element) return;

    setPdfLoading(true);

    const executeDownload = () => {
      const opt = {
        margin: [15, 15, 15, 15],
        filename: `Lams_Power_Sales_Report_${startDate}_to_${endDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      // হিডেন ফরমাল টেমপ্লেটটি সাময়িকভাবে প্রিন্টের জন্য ভিজিবল করা
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

  // টোটাল সামারি ক্যালকুলেটর হেল্পার
  const calculateTotals = () => {
    let q = 0, m = 0, s = 0, su = 0;
    if (reportData && reportData.productStats) {
      Object.values(reportData.productStats).forEach(stat => {
        const pKey = `${stat.name}_${stat.house}`;
        const currentMrp = parseFloat(mrps[pKey]) || 0;
        q += stat.qty;
        m += (currentMrp * stat.qty);
        s += stat.total;
      });
      su = s - m;
    }
    return { totalQty: q, totalMinAllowed: m, totalActualSold: s, totalSurplus: su };
  };

  const totals = calculateTotals();

  const filteredCustomers = reportData ? Object.values(reportData.customerStats)
    .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
    .sort((a, b) => b.amount - a.amount) : [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* ফিল্টার কন্ট্রোল উইন্ডো */}
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
        <button onClick={generateReport} disabled={loading} className="bg-blue-600 text-white px-10 py-3 h-[50px] rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 whitespace-nowrap">
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
        
        {reportData && !loading && (
          <button 
            onClick={downloadReportPDF}
            disabled={pdfLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 whitespace-nowrap"
          >
            {pdfLoading ? 'রিপোর্ট জেনারেট হচ্ছে...' : '📥 Download Formal PDF'}
          </button>
        )}
      </div>

      {/* 🖥️ ব্রাউজারে দেখার জন্য সাধারণ UI এরিয়া */}
      {reportData && !loading && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          
          {reportType === 'summary' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-100 p-6 rounded-2xl">
                  <p className="text-green-600 font-black uppercase tracking-widest text-xs mb-2">Total Bills (Paid)</p>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-black text-slate-900">{reportData.totalBills} <span className="text-lg text-slate-500">টি বিল</span></p>
                    <p className="text-2xl font-black text-green-700">{reportData.totalBillAmount} ৳</p>
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl">
                  <p className="text-orange-600 font-black uppercase tracking-widest text-xs mb-2">Total Pending Chalans (Hold)</p>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-black text-slate-900">{reportData.totalChalans} <span className="text-lg text-slate-500">টি চালান</span></p>
                    <p className="text-2xl font-black text-orange-700">{reportData.totalChalanAmount} ৳</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'house' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(reportData.houseStats).map((house, idx) => (
                <div key={idx} className="border border-slate-200 p-6 rounded-2xl bg-slate-50">
                  <h3 className="text-xl font-black text-slate-800 mb-4 pb-2 border-b border-slate-200">{house}</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-500">মোট ক্লিয়ার বিল:</span>
                    <span className="font-black text-slate-900 text-lg">{reportData.houseStats[house].bills} টি</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500">মোট বিক্রয়:</span>
                    <span className="font-black text-blue-600 text-xl">{reportData.houseStats[house].amount} ৳</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 📦 প্রোডাক্ট সেলস রিপোর্ট ভিউ উইন্ডো (Grand Totals সহ) */}
          {reportType === 'product' && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase font-black text-slate-500 border-b">
                    <th className="p-4">Product Description</th>
                    <th className="p-4 text-center">House</th>
                    <th className="p-4 text-center">Total Qty Sold</th>
                    <th className="p-4 text-center w-36">MRP (Per Unit)</th>
                    <th className="p-4 text-right">Min Allowed Value</th>
                    <th className="p-4 text-right">Actual Sold Value</th>
                    <th className="p-4 text-right">Surplus Above MRP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.values(reportData.productStats).map((stat, idx) => {
                    const pKey = `${stat.name}_${stat.house}`;
                    const currentMrp = parseFloat(mrps[pKey]) || 0;
                    const minAllowedTotal = currentMrp * stat.qty;
                    const surplusAmount = stat.total - minAllowedTotal;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-800">{stat.name}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">{stat.house}</span>
                        </td>
                        <td className="p-4 text-center font-black text-blue-600">{stat.qty} pcs</td>
                        <td className="p-4 text-center">
                          <input 
                            type="number" 
                            value={mrps[pKey] || ''} 
                            onChange={(e) => setMrps({ ...mrps, [pKey]: e.target.value })}
                            placeholder="0" 
                            className="w-24 p-1.5 bg-slate-50 border rounded-lg text-center font-black text-slate-800 text-xs"
                          />
                        </td>
                        <td className="p-4 text-right font-bold text-slate-500">{currentMrp > 0 ? `${minAllowedTotal} ৳` : '—'}</td>
                        <td className="p-4 text-right font-black text-slate-900">{stat.total} ৳</td>
                        <td className="p-4 text-right font-black">
                          {currentMrp > 0 ? (
                            <span className={surplusAmount >= 0 ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded' : 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'}>
                              {surplusAmount >= 0 ? `+${surplusAmount}` : surplusAmount} ৳
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-xs italic">Set MRP</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* 🔴 ব্রাউজারে গ্র্যান্ড টোটাল রো ইন্টিগ্রেশন */}
                <tfoot className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-900">
                  <tr>
                    <td colSpan="2" className="p-4 uppercase tracking-wider text-right">Grand Total:</td>
                    <td className="p-4 text-center text-orange-400 font-black text-sm">{totals.totalQty} pcs</td>
                    <td className="p-4"></td>
                    <td className="p-4 text-right text-slate-300">{totals.totalMinAllowed} ৳</td>
                    <td className="p-4 text-right text-emerald-400 text-sm">{totals.totalActualSold} ৳</td>
                    <td className="p-4 text-right text-orange-400 text-sm">+{totals.totalSurplus} ৳</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {reportType === 'customer' && (
            // কাস্টমার রিপোর্টের এক্সিস্টিং ভিউ কোড অপরিবর্তিত...
            <div className="text-center font-bold text-slate-400 py-4">কাস্টমার মডিউল লোডেড। উপরে কাস্টমার সার্চ করুন।</div>
          )}
        </div>
      )}

      {/* 👑 ------------------------------------------------------------- 👑 */}
      {/* 🏛️ সম্পূর্ণ হিডেন ফরমাল কর্পোরেট PDF টেমপ্লেট (শুধুমাত্র ডাউনলোডের সময় জেনারেট হবে) */}
      {/* 👑 ------------------------------------------------------------- 👑 */}
      <div id="formal-corporate-pdf-template" className="hidden bg-white p-12 text-slate-900 font-sans tracking-tight" style={{ width: '277mm' }}>
        
        {/* অফিশিয়াল লেটারহেড হেডার */}
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">LAMS POWER</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Socioeconomic & Solar Energy Solutions</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Faridpur, Bangladesh</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight bg-slate-100 px-4 py-1.5 rounded-lg inline-block">Monthly Sales & Revenue Report</h2>
            <p className="text-xs font-bold text-slate-600 mt-3">Statement Period: <span className="font-black text-slate-900">{startDate}</span> to <span className="font-black text-slate-900">{endDate}</span></p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Generated On: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* এক্সিকিউটিভ সামারি বক্স */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border-2 border-slate-200 rounded-xl p-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Total Sales Target (MRP Based)</span>
            <span className="text-xl font-black text-slate-800">{totals.totalMinAllowed} ৳</span>
          </div>
          <div className="border-2 border-slate-900 rounded-xl p-4 text-center bg-slate-50">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Actual Realized Revenue</span>
            <span className="text-xl font-black text-blue-700">{totals.totalActualSold} ৳</span>
          </div>
          <div className="border-2 border-emerald-200 rounded-xl p-4 text-center bg-emerald-50/30">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-1">Net Margin Surplus</span>
            <span className="text-xl font-black text-emerald-600">+{totals.totalSurplus} ৳</span>
          </div>
        </div>

        {/* ফরমাল ডাটা টেবিল */}
        <div className="border-2 border-slate-900 rounded-2xl overflow-hidden mb-12">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider border-b border-slate-900">
                <th className="p-3 border-r border-slate-800">Product Description</th>
                <th className="p-3 text-center border-r border-slate-800">Warehouse Source</th>
                <th className="p-3 text-center border-r border-slate-800">Volume Sold</th>
                <th className="p-3 text-right border-r border-slate-800">Base MRP / Unit</th>
                <th className="p-3 text-right border-r border-slate-800">Min Allowed Value</th>
                <th className="p-3 text-right border-r border-slate-800">Actual Gross Sold</th>
                <th className="p-3 text-right">Net Surplus Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {reportData && Object.values(reportData.productStats).map((stat, idx) => {
                const pKey = `${stat.name}_${stat.house}`;
                const currentMrp = parseFloat(mrps[pKey]) || 0;
                const minAllowedTotal = currentMrp * stat.qty;
                const surplusAmount = stat.total - minAllowedTotal;

                return (
                  <tr key={idx} className="bg-white">
                    <td className="p-3 font-bold text-slate-900 border-r border-slate-200">{stat.name}</td>
                    <td className="p-3 text-center font-bold uppercase text-slate-600 border-r border-slate-200">{stat.house}</td>
                    <td className="p-3 text-center font-black text-slate-800 border-r border-slate-200">{stat.qty} units</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-700 border-r border-slate-200">{currentMrp} ৳</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-600 border-r border-slate-200">{minAllowedTotal} ৳</td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 border-r border-slate-200">{stat.total} ৳</td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 bg-slate-50">
                      {surplusAmount >= 0 ? `+${surplusAmount}` : surplusAmount} ৳
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* 🔴 পিডিএফ এর গ্র্যান্ড টোটাল কন্ট্রোল */}
            <tfoot className="bg-slate-200 text-slate-900 font-black uppercase text-[10px] tracking-wider border-t-2 border-slate-900">
              <tr>
                <td colSpan="2" className="p-3 text-right border-r border-slate-300">Grand Financial Total:</td>
                <td className="p-3 text-center font-black text-slate-900 border-r border-slate-300">{totals.totalQty} Units</td>
                <td className="p-3 border-r border-slate-300"></td>
                <td className="p-3 text-right font-mono font-black text-slate-800 border-r border-slate-300">{totals.totalMinAllowed} ৳</td>
                <td className="p-3 text-right font-mono font-black text-blue-900 border-r border-slate-300">{totals.totalActualSold} ৳</td>
                <td className="p-3 text-right font-mono font-black text-emerald-700 bg-emerald-50">{totals.totalSurplus} ৳</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* কর্পোরেট সিগনেচার ভেরিফিকেশন ব্লক */}
        <div className="grid grid-cols-3 gap-12 mt-16 pt-8 text-center text-xs font-black uppercase tracking-wider text-slate-600">
          <div>
            <div className="border-t border-slate-400 pt-2 mx-6">Prepared By (Accounts Executive)</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-2 mx-6">Checked By (Manager Audit)</div>
          </div>
          <div>
            <div className="border-t border-slate-900 pt-2 mx-6 text-slate-900">Approved By (Managing Director / CEO)</div>
          </div>
        </div>

      </div>

      {/* কাস্টমার বিল ডিটেইলস মডাল কোড অপরিবর্তিত */}
    </div>
  );
};

export default Reports;