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

  // 📥 কাস্টম মিনিমাল এ৪ পোর্ট্রেট PDF জেনারেটর ইঞ্জিন
  const downloadReportPDF = () => {
    const element = document.getElementById('formal-corporate-portrait-pdf');
    if (!element) return;

    setPdfLoading(true);

    const executeDownload = () => {
      const opt = {
        margin: [15, 12, 15, 12],
        filename: `LAMS_POWER_Sales_Report_${startDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } // 💡 পোর্ট্রেট (লম্বালম্বি) মোড সেট করা হয়েছে
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
        
        <button 
          onClick={downloadReportPDF}
          disabled={pdfLoading}
          className="bg-slate-900 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 whitespace-nowrap"
        >
          {pdfLoading ? 'প্রিন্ট ফাইল রেডি হচ্ছে...' : '📥 Download Formal PDF'}
        </button>
      </div>

      {/* 🖥️ ব্রাউজার ভিউ উইন্ডো */}
      {reportData && !loading && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          {reportType === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 border p-6 rounded-2xl">
                <p className="text-green-600 font-black tracking-widest text-xs mb-2 uppercase">Total Bills (Paid)</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-900">{reportData.totalBills} টি</p>
                  <p className="text-xl font-black text-green-700">{reportData.totalBillAmount} ৳</p>
                </div>
              </div>
              <div className="bg-orange-50 border p-6 rounded-2xl">
                <p className="text-orange-600 font-black tracking-widest text-xs mb-2 uppercase">Total Hold Chalans</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-900">{reportData.totalChalans} টি</p>
                  <p className="text-xl font-black text-orange-700">{reportData.totalChalanAmount} ৳</p>
                </div>
              </div>
            </div>
          )}

          {reportType === 'house' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(reportData.houseStats).map((house, idx) => (
                <div key={idx} className="border p-6 rounded-2xl bg-slate-50">
                  <h3 className="text-lg font-black text-slate-800 mb-3 pb-1 border-b">{house}</h3>
                  <p className="text-sm font-medium text-slate-600 flex justify-between"><span>মোট বিল:</span> <span className="font-bold">{reportData.houseStats[house].bills} টি</span></p>
                  <p className="text-sm font-medium text-slate-600 flex justify-between mt-1"><span>মোট রেভিনিউ:</span> <span className="font-black text-blue-600">{reportData.houseStats[house].amount} ৳</span></p>
                </div>
              ))}
            </div>
          )}

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
                  <tr>
                    <td colSpan="2" className="p-4 text-right">Grand Total:</td>
                    <td className="p-4 text-center text-orange-400">{totals.totalQty} pcs</td>
                    <td></td>
                    <td className="p-4 text-right text-slate-300">{totals.totalMinAllowed} ৳</td>
                    <td className="p-4 text-right text-emerald-400">{totals.totalActualSold} ৳</td>
                    <td className="p-4 text-right text-orange-400">+{totals.totalSurplus} ৳</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {reportType === 'customer' && <div className="text-center font-bold text-slate-400 py-4">কাস্টমার মডিউল। উপরে সার্চ উইন্ডো ব্যবহার করুন।</div>}
        </div>
      )}

      {/* 🏛️ -------------------------------------------------------------------------- 🏛️ */}
      {/* 👔 সম্পূর্ণ এক্সক্লুসিভ ফরমাল মিনিমাল এ৪ পোর্ট্রেট PDF লেআউট (প্রিন্ট ফাইল) */}
      {/* 🏛️ -------------------------------------------------------------------------- 🏛️ */}
      <div id="formal-corporate-portrait-pdf" className="hidden bg-white text-slate-900 mx-auto" style={{ width: '185mm', fontFamily: "Times New Roman, 'Inter', serif", lineHeight: '1.4' }}>
        
        {/* মিনিমালিস্টিক লেটারহেড হেডার */}
        <div className="border-b border-slate-800 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase" style={{ letterSpacing: '0.05em' }}>LAMS POWER</h1>
            <p className="text-[10px] text-slate-400 mt-1">
              Corporate Office: Alobdi Eidgah, Mirpur 12, Dhaka, Bangladesh<br />
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800 border border-slate-800 px-3 py-1 bg-slate-50 inline-block">Financial Sales Statement</h2>
            <p className="text-[10px] text-slate-600 mt-2 font-semibold">Period: <span className="font-bold">{startDate}</span> to <span className="font-bold">{endDate}</span></p>
            <p className="text-[9px] text-slate-400 mt-0.5">Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* এক্সিকিউটিভ সামারি রো (থিন ডিভাইডার স্টাইল) */}
        <div className="border-y border-slate-400 py-3 my-4 grid grid-cols-3 text-center text-[11px] font-bold uppercase tracking-wide bg-slate-50/50">
          <div className="border-r border-slate-200">
            <span className="text-[9px] text-slate-400 block mb-0.5">Target Value (MRP)</span>
            <span className="text-slate-900 text-sm font-black">{totals.totalMinAllowed} ৳</span>
          </div>
          <div className="border-r border-slate-200">
            <span className="text-[9px] text-slate-400 block mb-0.5">Actual Realized Sales</span>
            <span className="text-blue-900 text-sm font-black">{totals.totalActualSold} ৳</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block mb-0.5">Net Margin Surplus</span>
            <span className="text-slate-900 text-sm font-black">+{totals.totalSurplus} ৳</span>
          </div>
        </div>

        {/* আল্ট্রা-মিনিমাল কর্পোরেট ডাটা টেবিল */}
        <div className="mt-6">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-slate-800 font-bold uppercase text-slate-600 tracking-wider">
                <th className="pb-2 font-bold w-1/3">Product Specification</th>
                <th className="pb-2 text-center font-bold">Source</th>
                <th className="pb-2 text-center font-bold">Qty</th>
                <th className="pb-2 text-right font-bold">Base MRP</th>
                <th className="pb-2 text-right font-bold">Min Value</th>
                <th className="pb-2 text-right font-bold">Gross Sold</th>
                <th className="pb-2 text-right font-bold">Net Surplus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportData && Object.values(reportData.productStats).map((stat, idx) => {
                const pKey = `${stat.name}_${stat.house}`;
                const currentMrp = parseFloat(mrps[pKey]) || 0;
                const minVal = currentMrp * stat.qty;
                const surplus = stat.total - minVal;

                return (
                  <tr key={idx} className="bg-white">
                    <td className="py-2.5 font-semibold text-slate-900">{stat.name}</td>
                    <td className="py-2.5 text-center text-slate-600 uppercase font-medium">{stat.house}</td>
                    <td className="py-2.5 text-center font-bold text-slate-800">{stat.qty} pcs</td>
                    <td className="py-2.5 text-right font-medium text-slate-700">{currentMrp} ৳</td>
                    <td className="py-2.5 text-right font-medium text-slate-600">{minVal} ৳</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{stat.total} ৳</td>
                    <td className="py-2.5 text-right font-bold text-slate-900 bg-slate-50/50">
                      {surplus >= 0 ? `+${surplus}` : surplus} ৳
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* বটম গ্র্যান্ড টোটাল ডাবল আন্ডারলাইন স্টাইল */}
            <tfoot>
              <tr className="border-t-2 border-b border-slate-800 font-bold text-slate-900 uppercase tracking-wider bg-slate-50">
                <td colSpan="2" className="py-3 text-right font-bold">Total Valuations:</td>
                <td className="py-3 text-center font-bold">{totals.totalQty} Pcs</td>
                <td></td>
                <td className="py-3 text-right font-bold">{totals.totalMinAllowed} ৳</td>
                <td className="py-3 text-right font-bold text-blue-900">{totals.totalActualSold} ৳</td>
                <td className="py-3 text-right font-bold text-slate-900">+{totals.totalSurplus} ৳</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* অথরাইজড সিগনেচার ব্লক (ফরমাল অফিস স্টাইল) */}
        <div className="mt-24 grid grid-cols-3 gap-8 text-center text-[9px] uppercase tracking-wider text-slate-500 font-bold">
          <div>
            <div className="border-t border-slate-300 pt-1.5 mx-4">Prepared By<br />(Accounts & Promotions)</div>
          </div>
          <div>
            <div className="border-t border-slate-300 pt-1.5 mx-4">Verified By<br />(Internal Auditor)</div>
          </div>
          <div>
            <div className="border-t border-slate-900 pt-1.5 mx-4 text-slate-900 font-bold">Authorized Approval<br />(Managing Director / CEO)</div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Reports;