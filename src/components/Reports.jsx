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
  
  // কাস্টমার সার্চ ও ড্রপডাউনের জন্য স্টেটস
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // কাস্টমারের বিল ডিটেইলস মডাল দেখানোর জন্য
  const [selectedCustomerBills, setSelectedCustomerBills] = useState(null);

  // 📝 নতুন স্টেট: প্রোডাক্ট অনুযায়ী ম্যানুয়াল MRP ট্র্যাক করার অবজেক্ট
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

  // 📥 ডাইনামিক ল্যান্ডস্কেপ PDF ডাউনলোড ইঞ্জিন
  const downloadReportPDF = () => {
    const element = document.getElementById('report-print-area');
    if (!element) return;

    setPdfLoading(true);

    const executeDownload = () => {
      const opt = {
        margin: [12, 12, 12, 12],
        filename: `Lams_Power_${reportType}_Report_${startDate}_to_${endDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } // ল্যান্ডস্কেপ মোড সেট করা হয়েছে বড় ডাটার জন্য
      };

      window.html2pdf().from(element).set(opt).save().then(() => {
        setPdfLoading(false);
      }).catch((err) => {
        console.error(err);
        setPdfLoading(false);
      });
    };

    // যদি উইন্ডোতে html2pdf স্ক্রিপ্ট লোড না থাকে তবে ইনস্ট্যান্ট CDN ইনজেক্ট করবে
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = executeDownload;
      document.head.appendChild(script);
    } else {
      executeDownload();
    }
  };

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

      {/* নেভিগেশন ট্যাব এবং PDF ডাউনলোড বোতাম */}
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
        
        {/* 📥 পিডিএফ এক্সপোর্ট বাটন */}
        {reportData && !loading && (
          <button 
            onClick={downloadReportPDF}
            disabled={pdfLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 whitespace-nowrap"
          >
            {pdfLoading ? 'প্রিন্ট ফাইল রেডি হচ্ছে...' : '📥 Download PDF'}
          </button>
        )}
      </div>

      {reportData && !loading && (
        // 🎯 আইডি র্যাপার এরিয়াটি html2pdf প্রিন্ট করার জন্য ডিফাইন করা হয়েছে
        <div id="report-print-area" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
          
          {/* PDF এর টপ হেডার ব্রান্ডিং (যা প্রিন্ট ফাইলে দৃশ্যমান হবে) */}
          <div className="hidden pdf-header border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">LAMS POWER</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Inventory & Sales Statement Report</p>
            </div>
            <div className="text-right text-xs font-bold text-slate-600">
              <p>তারিখ পরিধি: <span className="font-black text-slate-900">{startDate}</span> থেকে <span className="font-black text-slate-900">{endDate}</span></p>
              <p className="text-[10px] uppercase text-slate-400 mt-1">Report Type: {reportType}</p>
            </div>
          </div>

          {/* ১. সামারি */}
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

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">এই সময়ের ক্রেতাগণ (Purchasing Customers)</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white text-[11px] uppercase font-black text-slate-400 sticky top-0 shadow-sm border-b">
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Mobile No.</th>
                        <th className="p-3 text-right">Total Purchased</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.values(reportData.customerStats).sort((a,b) => b.amount - a.amount).map((cust, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{cust.name}</td>
                          <td className="p-3 text-slate-500">{cust.phone}</td>
                          <td className="p-3 text-right font-black text-blue-600">{cust.amount} ৳</td>
                        </tr>
                      ))}
                      {Object.values(reportData.customerStats).length === 0 && (
                        <tr><td colSpan="3" className="p-4 text-center font-bold text-slate-400">এই তারিখে কোনো বিক্রয় নেই</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ২. হাউজ রিপোর্ট */}
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

          {/* 📦 ৩. প্রোডাক্ট সেলস রিপোর্ট (ম্যানুয়াল MRP ও অতিরিক্ত বিক্রয় লজিকসহ) */}
          {reportType === 'product' && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase font-black text-slate-500 border-b">
                    <th className="p-4">Product Description</th>
                    <th className="p-4 text-center">House</th>
                    <th className="p-4 text-center">Total Qty Sold</th>
                    {/* প্রিন্ট বা পিডিএফে ইনপুট বক্সের বর্ডার এবং প্লেসহোল্ডার হাইড করতে বিশেষ ক্লাস ও স্টাইলিং */}
                    <th className="p-4 text-center w-36 hide-on-pdf-label">MRP (Per Unit)</th>
                    <th className="p-4 text-right">Min Allowed Value</th>
                    <th className="p-4 text-right">Actual Sold Value</th>
                    <th className="p-4 text-right">Surplus Above MRP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.values(reportData.productStats).sort((a,b) => b.qty - a.qty).map((stat, idx) => {
                    const pKey = `${stat.name}_${stat.house}`;
                    const currentMrp = parseFloat(mrps[pKey]) || 0;
                    const minAllowedTotal = currentMrp * stat.qty;
                    const surplusAmount = stat.total - minAllowedTotal;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-800">{stat.name}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${stat.house === 'Showroom' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`}>
                            {stat.house}
                          </span>
                        </td>
                        <td className="p-4 text-center font-black text-blue-600">{stat.qty} pcs</td>
                        
                        {/* 🛠️ MRP ম্যানুয়াল এন্ট্রি ইনপুট বক্স */}
                        <td className="p-4 text-center justify-center flex items-center">
                          <div className="relative print-mrp-wrapper">
                            <input 
                              type="number" 
                              value={mrps[pKey] || ''} 
                              onChange={(e) => setMrps({ ...mrps, [pKey]: e.target.value })}
                              placeholder="0" 
                              className="w-24 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-slate-800 outline-none focus:border-blue-500 text-xs shadow-inner hide-input-border-pdf"
                            />
                            <span className="hidden pdf-mrp-text font-black text-slate-800 text-xs">{currentMrp} ৳</span>
                          </div>
                        </td>

                        <td className="p-4 text-right font-bold text-slate-500">
                          {currentMrp > 0 ? `${minAllowedTotal} ৳` : '—'}
                        </td>
                        <td className="p-4 text-right font-black text-slate-900">{stat.total} ৳</td>
                        
                        {/* 💰 MRP থেকে কত বেশি মূল্যে বিক্রি হয়েছে তার লাভ নির্ণয় */}
                        <td className="p-4 text-right font-black">
                          {currentMrp > 0 ? (
                            <span className={surplusAmount >= 0 ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded' : 'text-rose-600 bg-rose-50 px-2 py-1 rounded'}>
                              {surplusAmount >= 0 ? `+${surplusAmount}` : surplusAmount} ৳
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-medium text-[11px]">MRP সেট করুন</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {Object.keys(reportData.productStats).length === 0 && (
                    <tr><td colSpan="7" className="p-4 text-center font-bold text-slate-400">কোনো তথ্য নেই</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ৪. কাস্টমার রিপোর্ট */}
          {reportType === 'customer' && (
            <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 filter-selectors-hide">
                {/* স্মার্ট সার্চ বক্স */}
                <div className="relative z-40">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">🔍 সার্চ করে খুঁজুন</label>
                  <input 
                    type="text" 
                    value={customerSearch}
                    onChange={handleCustomerSearch}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="নাম বা মোবাইল টাইপ করুন..." 
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                  />
                  {showSuggestions && customerSearch.length >= 2 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                      {customerSuggestions.length > 0 ? (
                        customerSuggestions.map(cust => (
                          <div key={cust.id} onClick={() => selectCustomer(cust)} className="p-4 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors">
                            <p className="font-black text-slate-800">{cust.name}</p>
                            <p className="text-xs font-bold text-slate-500">{cust.phone}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-400 font-bold text-sm">কোনো কাস্টমার পাওয়া যায়নি</div>
                      )}
                    </div>
                  )}
                </div>

                {/* ড্রপডাউন মেনু */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">📋 অথবা লিস্ট থেকে সিলেক্ট করুন</label>
                  <select 
                    value={customerSearch}
                    onChange={handleDropdownSelect}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="">সকল কাস্টমার (All Customers)</option>
                    {allCustomers.map(cust => (
                      <option key={cust.id} value={cust.name}>{cust.name} - {cust.phone}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* কাস্টমার রেজাল্ট লিস্ট */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 mt-4 custom-scrollbar">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center bg-white border border-slate-200 rounded-xl p-10">
                    <span className="text-4xl block mb-2">🕵️</span>
                    <p className="text-slate-400 font-bold">এই নির্দিষ্ট তারিখে উক্ত কাস্টমারের কোনো ক্রয়ের রেকর্ড নেই।</p>
                  </div>
                ) : (
                  filteredCustomers.map((cust, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedCustomerBills(cust)} 
                      className="border border-slate-200 p-5 rounded-xl bg-white hover:border-blue-500 transition-all shadow-sm cursor-pointer relative group"
                    >
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-3">
                        <div>
                          <h3 className="font-black text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{cust.name}</h3>
                          <p className="text-xs font-bold text-slate-400">{cust.phone}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest hidden md:block select-ignore-pdf">Click to view bills ➔</span>
                          <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-black text-sm text-center">
                            Total Purchased: {cust.amount} ৳
                          </span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg text-sm font-medium text-slate-600">
                        <span className="font-bold text-slate-800">Items: </span>
                        {cust.items.join(', ')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* কাস্টমার বিল ডিটেইলস মডাল উইন্ডো */}
      {selectedCustomerBills && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Customer History</p>
                <h3 className="text-2xl font-black text-slate-800">{selectedCustomerBills.name}</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">{selectedCustomerBills.phone}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => setSelectedCustomerBills(null)} className="w-10 h-10 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white font-bold transition-all flex items-center justify-center">✕</button>
                <span className="text-xs font-black text-green-600 bg-green-50 px-3 py-1 rounded-md">Total: {selectedCustomerBills.amount} ৳</span>
              </div>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-6">
              {selectedCustomerBills.bills.map((bill, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-5 md:p-6 rounded-3xl">
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-green-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Paid</span>
                        <p className="font-black text-slate-900 text-lg">#{bill.bill_no || 'N/A'}</p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Ref Chalan: {bill.chalan_no}</p>
                    </div>
                    <div className="md:text-right">
                      <p className="font-black text-slate-800 text-xl">{bill.total_amount} ৳</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(bill.created_at).toLocaleDateString()} • via {bill.payment_method}</p>
                    </div>
                  </div>

                  <table className="w-full text-left text-sm bg-white border border-slate-100 rounded-2xl overflow-hidden">
                    <thead className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-400">
                      <tr>
                        <th className="p-3">Item Details</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bill.chalan_items.map((item, j) => (
                        <tr key={j}>
                          <td className="p-3 font-bold text-slate-700">
                            {item.products?.name} 
                            <span className="text-[10px] font-bold text-slate-400 block">{item.products?.model}</span>
                          </td>
                          <td className="p-3 text-center font-black text-slate-600">{item.quantity}</td>
                          <td className="p-3 text-right font-black text-slate-800">{item.total_price} ৳</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* 📋 PDF এক্সপোর্ট ইন্টিগ্রিটি কন্ট্রোল কাস্টম গ্লোবাল CSS */}
      <style>{`
        @media print {
          .hide-on-pdf-label { font-size: 10px !important; }
        }
        /* html2pdf জেনারেট করার সময় ইনপুট বক্স লুকিয়ে ক্লিন টেক্সট দেখানোর স্টাইলিং রুলস */
        .html2pdf__page-active .hide-input-border-pdf {
          display: none !important;
        }
        .html2pdf__page-active .pdf-mrp-text {
          display: inline-block !important;
        }
        .html2pdf__page-active .pdf-header {
          display: flex !important;
        }
        .html2pdf__page-active .filter-selectors-hide,
        .html2pdf__page-active .select-ignore-pdf {
          display: none !important;
        }
      `}</style>

    </div>
  );
};

export default Reports;