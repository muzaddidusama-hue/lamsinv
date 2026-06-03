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
  
  // কাস্টোমার সার্চ ও ড্রপডাউনের জন্য স্টেটস
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 📦 প্রোডাক্ট ওয়াইজ রিপোর্টের জন্য স্টেটস
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // 📝 লেজার (Ledger) রিপোর্টের জন্য স্টেটস
  const [ledgerData, setLedgerData] = useState([]);
  const [salesOutData, setSalesOutData] = useState([]); // 🔴 নতুন: বিক্রয় আউটের ডাটা ট্র্যাকিং স্টেট
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSuggestions, setLedgerSuggestions] = useState([]);
  const [showLedgerSuggestions, setShowLedgerSuggestions] = useState(false);

  // কাস্টোমারের বিল ডিটেইলস মডাল দেখানোর জন্য
  const [selectedCustomerBills, setSelectedCustomerBills] = useState(null);
  const [mrps, setMrps] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    generateReport();
  }, [reportType, startDate, endDate]); 

  useEffect(() => {
    fetchAllCustomers(); 
    fetchAllProducts(); 
  }, []);

  const fetchAllCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name, phone').order('name', { ascending: true });
    if (data) setAllCustomers(data);
  };

  const fetchAllProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, model, category').order('name', { ascending: true });
    if (data) {
      const uniqueProds = [];
      const keys = new Set();
      data.forEach(p => {
        const fullName = `${p.category || ''} ${p.model || ''} ${p.name || ''}`.trim();
        if (!keys.has(fullName)) {
          keys.add(fullName);
          uniqueProds.push({ ...p, fullName });
        }
      });
      setAllProducts(uniqueProds);
    }
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

      // 🔴 নতুন লজিক: চালানের ভেতরের পেইড বিলগুলো থেকে প্রোডাক্ট সেলস আউট (Out) ডাটা এক্সট্র্যাক্ট করা
      const extractedOutItems = [];
      if (chalans) {
        chalans.forEach(ch => {
          if (ch.status === 'paid') {
            ch.chalan_items.forEach(item => {
              const pKey = `${item.products?.name || ''} - ${item.products?.model || ''}`;
              extractedOutItems.push({
                product: pKey,
                quantity: item.quantity,
                date: ch.created_at ? ch.created_at.split('T')[0] : '',
                timestamp: ch.created_at,
                type: 'out',
                source: `Bill: #${ch.bill_no || 'N/A'}`
              });
            });
          }
        });
      }
      setSalesOutData(extractedOutItems);

      // ২. লেজার টেবিল থেকে ডাটা লোড করা হচ্ছে (তারিখ রেঞ্জ অনুযায়ী)
      const { data: ledger, error: ledgerErr } = await supabase
        .from('ledger')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (!ledgerErr && ledger) setLedgerData(ledger);

    } catch (error) {
      console.error(error);
      alert('রিপোর্ট জেনারেট করতে সমস্যা হয়েছে!');
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
      combinedProductStats: {} 
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

          if (!data.productStats[pKey]) {
            data.productStats[pKey] = { name: pName, house: house, qty: 0, total: 0 };
          }
          data.productStats[pKey].qty += item.quantity;
          data.productStats[pKey].total += item.total_price;

          if (!data.combinedProductStats[pName]) {
            data.combinedProductStats[pName] = { name: pName, qty: 0, total: 0 };
          }
          data.combinedProductStats[pName].qty += item.quantity;
          data.combinedProductStats[pName].total += item.total_price;

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

  const handleProductSearchAction = (e) => {
    const val = e.target.value;
    setProductSearch(val);

    if (val.length >= 1) {
      const filtered = allProducts.filter(p => p.fullName.toLowerCase().includes(val.toLowerCase()));
      setProductSuggestions(filtered.slice(0, 10));
      setShowProductSuggestions(true);
    } else {
      setShowProductSuggestions(false);
    }
  };

  // 🔴 নতুন ফিক্স: ইনপুট ও সেলস আউট উভয় তালিকা মিলিয়ে স্মার্ট সাজেশন লিস্ট বিল্ড করা
  const handleLedgerSearchAction = (e) => {
    const val = e.target.value;
    setLedgerSearch(val);

    if (val.length >= 1) {
      const allUniqueNames = [...new Set([...ledgerData.map(l => l.product), ...salesOutData.map(s => s.product)])];
      const filtered = allUniqueNames.filter(name => name.toLowerCase().includes(val.toLowerCase()));
      setLedgerSuggestions(filtered.slice(0, 10));
      setShowLedgerSuggestions(true);
    } else {
      setShowLedgerSuggestions(false);
    }
  };

  const downloadReportPDF = () => {
    const element = document.getElementById('formal-corporate-portrait-pdf');
    if (!element) return;

    setPdfLoading(true);

    const executeDownload = () => {
      const opt = {
        margin: 0, 
        filename: `LAMS_POWER_Sales_Report_${startDate}.pdf`,
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

  const getProductWiseStats = () => {
    if (!reportData || !productSearch) return { totalQty: 0, totalAmount: 0, hoQty: 0, hoAmount: 0, showroomQty: 0, showroomAmount: 0 };
    let totalQty = 0, totalAmount = 0, hoQty = 0, hoAmount = 0, showroomQty = 0, showroomAmount = 0;

    Object.values(reportData.productStats).forEach(stat => {
      if (stat.name.toLowerCase() === productSearch.toLowerCase()) {
        totalQty += stat.qty;
        totalAmount += stat.total;
        if (stat.house === 'Head Office') {
          hoQty += stat.qty;
          hoAmount += stat.total;
        } else if (stat.house === 'Showroom') {
          showroomQty += stat.qty;
          showroomAmount += stat.total;
        }
      }
    });
    return { totalQty, totalAmount, hoQty, hoAmount, showroomQty, showroomAmount };
  };

  const productWiseData = getProductWiseStats();

  // 🔴 নতুন লজিক: সার্বিক টেবিলে ইন এবং আউটের টোটাল ডাটা পাশাপাশি সাজানো (হিজিবিজি মুক্ত সামারি)
  const getLedgerSummary = () => {
    const summary = {};
    ledgerData.forEach(item => {
      if (!summary[item.product]) {
        summary[item.product] = { product: item.product, totalIn: 0, totalOut: 0 };
      }
      summary[item.product].totalIn += parseInt(item.quantity) || 0;
    });
    salesOutData.forEach(item => {
      if (!summary[item.product]) {
        summary[item.product] = { product: item.product, totalIn: 0, totalOut: 0 };
      }
      summary[item.product].totalOut += parseInt(item.quantity) || 0;
    });
    return Object.values(summary);
  };

  const ledgerSummaryList = getLedgerSummary();

  // 🔴 নতুন লজিক: সুনির্দিষ্ট প্রোডাক্টের ইন ও আউট হিস্ট্রি একসাথে এক টাইমলাইনে ক্রোনোলজিক্যালি মার্চ করা
  const getIndividualLedgerHistory = () => {
    const history = [];
    ledgerData.forEach(l => {
      if (l.product.toLowerCase() === ledgerSearch.toLowerCase()) {
        history.push({
          date: l.date,
          timestamp: l.in || l.date,
          type: 'in',
          source: l.source || 'Import',
          quantity: l.quantity
        });
      }
    });
    salesOutData.forEach(s => {
      if (s.product.toLowerCase() === ledgerSearch.toLowerCase()) {
        history.push({
          date: s.date,
          timestamp: s.timestamp,
          type: 'out',
          source: s.source,
          quantity: s.quantity
        });
      }
    });
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const combinedLedgerHistory = getIndividualLedgerHistory();

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

      {/* নেভিগেশন ট্যাব বার */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
        <div className="flex flex-wrap gap-2 flex-1">
          {[
            { id: 'summary', label: 'সার্বিক হিসাব (Summary)' },
            { id: 'house', label: 'হাউজ রিপোর্ট (HO vs Showroom)' },
            { id: 'product', label: 'প্রোডাক্ট সেলস রিপোর্ট' },
            { id: 'customer', label: 'কাস্টোমার রিপোর্ট' },
            { id: 'product_wise', label: 'প্রোডাক্ট ওয়াইজ রিপোর্ট' },
            { id: 'ledger_report', label: 'লেজার রিপোর্ট (In & Out)' } // ট্যাব রিনেম করা হয়েছে
          ].map(tab => (
            <button 
              key={tab.id} onClick={() => { setReportType(tab.id); setCustomerSearch(''); setProductSearch(''); setLedgerSearch(''); }}
              className={`flex-1 min-w-[130px] py-3 px-2 rounded-lg font-bold text-[11px] transition-all ${reportType === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
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
          
          {/* সার্বিক হিসাব ট্যাব */}
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

          {/* হাউজ রিপোর্ট ট্যাব */}
          {reportType === 'house' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.keys(reportData.houseStats).map((house, idx) => (
                <div key={idx} className="border p-5 rounded-xl bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b pb-2 mb-3">
                      <h3 className="text-lg font-black text-slate-800">{house}</h3>
                      <span className="bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded text-[10px] uppercase">{reportData.houseStats[house].bills} Bills</span>
                    </div>
                    
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
                            <tr><td colSpan="3" className="p-3 text-center text-slate-400 italic">কোনো মালামাল বিক্রয় হয়নি</td></tr>
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

          {/* প্রোডাক্ট সেলস রিপোর্ট */}
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

          {/* কাস্টোমার রিপোর্ট */}
          {reportType === 'customer' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">🔍 কাস্টোমার সার্চ (নাম/মোবাইল)</label>
                  <input type="text" value={customerSearch} onChange={handleCustomerSearch} placeholder="টাইপ করুন..." className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-500" />
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute left-0 w-full mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto text-xs font-bold">
                      {customerSuggestions.map(c => (<div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border-b hover:bg-blue-50/40 cursor-pointer">{c.name} — {c.phone}</div>))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">📋 কাস্টোমার ড্রপডাউন সিলেকশন</label>
                  <select value={customerSearch} onChange={handleDropdownSelect} className="w-full p-3 bg-white border rounded-xl font-bold text-xs text-slate-700 outline-none cursor-pointer focus:border-blue-500">
                    <option value="">লিস্টের সকল কাস্টোমার (All Active)</option>
                    {allCustomers.map(c => (<option key={c.id} value={c.name}>{c.name} — {c.phone}</option>))}
                  </select>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-900 text-white font-black text-[10px] tracking-wider uppercase p-3.5">
                  নির্ধারিত তারিখের কেনাকাটার তালিকা ({startDate} থেকে {endDate})
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b font-black text-slate-400 uppercase">
                        <th className="p-4">কাস্টোমারের নাম</th>
                        <th className="p-4">মোবাইল নাম্বার</th>
                        <th className="p-4 text-right">মোট পারচেজ ভলিউম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-bold text-slate-700">
                      {filteredCustomers.map((cust, i) => (
                        <tr key={i} onClick={() => setSelectedCustomerBills(cust)} className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                          <td className="p-4 text-slate-900 font-black group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            <span>👤 {cust.name}</span>
                            <span className="text-[9px] font-black uppercase text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1">Detail ➔</span>
                          </td>
                          <td className="p-4 text-slate-500 font-mono">{cust.phone || '—'}</td>
                          <td className="p-4 text-right text-emerald-600 font-black text-sm">{cust.amount} ৳</td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr><td colSpan="3" className="p-8 text-center text-slate-400 italic">উক্ত তারিখ ও ফিল্টারে কোনো কেনাকাটার ইতিহাস নেই</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* প্রোডাক্ট ওয়াইজ রিপোর্ট */}
          {reportType === 'product_wise' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">🔍  প্রোডাক্ট সার্চ (নাম/মডেল)</label>
                  <input type="text" value={productSearch} onChange={handleProductSearchAction} onFocus={() => productSearch && setShowProductSuggestions(true)} onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)} placeholder="যেমন: Solar Panel..." className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-500" />
                  {showProductSuggestions && productSuggestions.length > 0 && (
                    <div className="absolute left-0 w-full mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto text-xs font-bold">
                      {productSuggestions.map((p, i) => (<div key={i} onClick={() => { setProductSearch(p.fullName); setShowProductSuggestions(false); }} className="p-3 border-b hover:bg-orange-50 cursor-pointer">📦 {p.fullName}</div>))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">📋  প্রোডাক্ট ড্রপডাউন সিলেকশন</label>
                  <select value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full p-3 bg-white border rounded-xl font-bold text-xs text-slate-700 outline-none cursor-pointer focus:border-blue-500">
                    <option value="">প্রোডাক্ট সিলেক্ট করুন...</option>
                    {allProducts.map((p, i) => (<option key={i} value={p.fullName}>{p.fullName}</option>))}
                  </select>
                </div>
              </div>

              {productSearch ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between">
                      <p className="text-orange-400 font-black text-xs uppercase tracking-widest mb-1">মোট বিক্রয় ভলিউম (Total Quantity)</p>
                      <h3 className="text-3xl font-black">{productWiseData.totalQty} pcs</h3>
                    </div>
                    <div className="bg-blue-600 text-white p-6 rounded-2xl flex flex-col justify-between">
                      <p className="text-blue-100 font-black text-xs uppercase tracking-widest mb-1">মোট বিক্রয় মূল্য (Gross Revenue)</p>
                      <h3 className="text-3xl font-black">{productWiseData.totalAmount} ৳</h3>
                    </div>
                  </div>

                  <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-slate-100 p-4 border-b font-black text-xs text-slate-700 uppercase tracking-wider">🏢  হাউজ ভিত্তিক বিক্রয়ের বিবরণ (HO vs Showroom)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x font-bold">
                      <div className="p-6 space-y-2">
                        <p className="text-sm font-black text-slate-800 flex items-center gap-2">🏠 Head Office (HO)</p>
                        <p className="text-xs text-slate-500">বিক্রয় পরিমাণ: <span className="text-slate-800 font-black text-sm">{productWiseData.hoQty} pcs</span></p>
                        <p className="text-xs text-slate-500">মোট মূল্য: <span className="text-blue-600 font-black text-sm">{productWiseData.hoAmount} ৳</span></p>
                      </div>
                      <div className="p-6 space-y-2">
                        <p className="text-sm font-black text-slate-800 flex items-center gap-2">🏪 Showroom</p>
                        <p className="text-xs text-slate-500">বিক্রয় পরিমাণ: <span className="text-slate-800 font-black text-sm">{productWiseData.showroomQty} pcs</span></p>
                        <p className="text-xs text-slate-500">মোট মূল্য: <span className="text-blue-600 font-black text-sm">{productWiseData.showroomAmount} ৳</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed rounded-2xl text-slate-400 font-medium italic text-xs">
                  সার্চ বক্সে নাম টাইপ করুন অথবা ড্রপডাউন থেকে প্রোডাক্ট সিলেক্ট করলে বিস্তারিত বিবরণ এখানে লোড হবে।
                </div>
              )}
            </div>
          )}

          {/* 📝 ৬. আপডেট করা ইন ও আউট সম্বলিত লেজার রিপোর্ট এরিয়া ইউআই */}
          {reportType === 'ledger_report' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">🔍 ইনপুট প্রোডাক্ট সার্চ (লেজার)</label>
                  <input type="text" value={ledgerSearch} onChange={handleLedgerSearchAction} onFocus={() => ledgerSearch && setShowLedgerSuggestions(true)} onBlur={() => setTimeout(() => setShowLedgerSuggestions(false), 200)} placeholder="যেমন: Inhenergy..." className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-500" />
                  {showLedgerSuggestions && ledgerSuggestions.length > 0 && (
                    <div className="absolute left-0 w-full mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto text-xs font-bold">
                      {ledgerSuggestions.map((name, i) => (<div key={i} onClick={() => { setLedgerSearch(name); setShowLedgerSuggestions(false); }} className="p-3 border-b hover:bg-orange-50 cursor-pointer">📦 {name}</div>))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">📋 লেজার ড্রপডাউন সিলেকশন</label>
                  <select value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)} className="w-full p-3 bg-white border rounded-xl font-bold text-xs text-slate-700 outline-none cursor-pointer focus:border-blue-500">
                    <option value="">লিস্টের সকল প্রোডাক্ট খতিয়ান সামারি (In & Out Summary)</option>
                    {[...new Set([...ledgerData.map(l => l.product), ...salesOutData.map(s => s.product)])].map((name, i) => (<option key={i} value={name}>{name}</option>))}
                  </select>
                </div>
              </div>

              {!ledgerSearch ? (
                // ক) সার্বিক সামারি ভিউ (ইন এবং আউট কলাম পাশাপাশি)
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="bg-slate-900 text-white font-black text-[10px] tracking-wider uppercase p-3.5 flex justify-between">
                    <span>স্টক ইন-আউট সার্বিক খতিয়ান তালিকা</span>
                    <span className="text-orange-400">Total Unique Items: {ledgerSummaryList.length}</span>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b font-black text-slate-400 uppercase">
                          <th className="p-4">প্রোডাক্ট এর বিবরণ (নাম ও মডেল)</th>
                          <th className="p-4 text-center w-40 text-emerald-600 bg-emerald-50/40">মোট স্টক ইন (+)</th>
                          <th className="p-4 text-center w-40 text-rose-600 bg-rose-50/40">মোট বিক্রয় আউট (-)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-slate-700">
                        {ledgerSummaryList.map((item, i) => (
                          <tr key={i} onClick={() => setLedgerSearch(item.product)} className="hover:bg-orange-50/30 cursor-pointer transition-colors group">
                            <td className="p-4 text-slate-900 font-black group-hover:text-blue-600 transition-colors">📦 {item.product}</td>
                            <td className="p-4 text-center text-emerald-600 font-black text-sm bg-emerald-50/10">{item.totalIn} PCS</td>
                            <td className="p-4 text-center text-rose-600 font-black text-sm bg-rose-50/10">{item.totalOut} PCS</td>
                          </tr>
                        ))}
                        {ledgerSummaryList.length === 0 && (
                          <tr><td colSpan="3" className="p-8 text-center text-slate-400 italic">উক্ত তারিখ রেঞ্জে কোনো প্রকার স্টক আদানপ্রদান হয়নি</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                // খ) সুনির্দিষ্ট প্রোডাক্টের ক্রোনোলজিক্যাল ইন-আউট স্টেটমেন্ট টাইমলাইন হিস্ট্রি
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-orange-50 border border-orange-100 p-4 rounded-xl">
                    <p className="text-xs font-black text-orange-700">🎯 খতিয়ান ট্র্যাক: <span className="text-sm font-black text-slate-900 ml-1">{ledgerSearch}</span></p>
                    <button onClick={() => setLedgerSearch('')} className="text-xs font-bold text-slate-400 bg-white border px-3 py-1 rounded-lg hover:text-red-500">← সার্বিক তালিকায় ফিরুন</button>
                  </div>
                  
                  <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-black text-[10px] uppercase">
                          <th className="p-4">তারিখ (Date)</th>
                          <th className="p-4 text-center">লেনদেনের ধরন (Type)</th>
                          <th className="p-4 text-center">রেফারেন্স / সোর্স (Source/Ref)</th>
                          <th className="p-4 text-right pr-12">পরিমাণ (Qty)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-slate-700">
                        {combinedLedgerHistory.map((l, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-4 font-mono text-slate-600">📅 {new Date(l.date).toLocaleDateString('bn-BD')}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${l.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {l.type === 'in' ? 'স্টক ইন (+)' : 'বিক্রয় আউট (-)'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-slate-500 font-bold text-xs">{l.source}</span>
                            </td>
                            <td className="p-4 text-right pr-12 font-black text-sm">
                              <span className={l.type === 'in' ? 'text-green-600' : 'text-red-600'}>
                                {l.type === 'in' ? `+${l.quantity}` : `-${l.quantity}`} PCS
                              </span>
                            </td>
                          </tr>
                        ))}
                        {combinedLedgerHistory.length === 0 && (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">কোনো রেকর্ড পাওয়া যায়নি</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* PDF layout hidden elements unchanged */}
      <div id="formal-corporate-portrait-pdf" className="hidden bg-white text-slate-900 mx-auto" style={{ width: '210mm', padding: '20mm 15mm 20mm 15mm', boxSizing: 'border-box', fontFamily: "Times New Roman, 'Inter', serif", lineHeight: '1.4' }} >
        <div className="pb-4 mb-6 flex justify-between items-start" style={{ borderBottom: '2px solid #0f172a' }}>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase" style={{ letterSpacing: '0.02em' }}>LAMS POWER</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Corporate Office: Alobdi Eidgah, Mirpur 12, Dhaka, Bangladesh</p>
          </div>
          <div className="text-right">
            <div className="border border-slate-900 px-4 py-1 bg-slate-50 text-center font-bold text-xs uppercase tracking-wider" style={{ minWidth: '170px' }}>Financial Sales Statement</div>
            <p className="text-[10px] text-slate-700 mt-2 font-bold">Period: <span className="font-bold">{startDate}</span> to <span className="font-bold">{endDate}</span></p>
            <p className="text-[9px] text-slate-400">Generated On: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="border border-slate-300 py-3 my-4 grid grid-cols-3 text-center text-[10px] font-bold uppercase bg-slate-50/50">
          <div className="border-r"><span className="text-[9px] text-slate-400 block mb-0.5">Target Value (MRP)</span><span className="text-slate-900 text-xs font-black">{totals.totalMinAllowed} ৳</span></div>
          <div className="border-r"><span className="text-[9px] text-slate-400 block mb-0.5">Actual Realized Revenue</span><span className="text-blue-900 text-xs font-black">{totals.totalActualSold} ৳</span></div>
          <div><span className="text-[9px] text-slate-400 block mb-0.5">Net Margin Surplus</span><span className="text-slate-900 text-xs font-black">+{totals.totalSurplus} ৳</span></div>
        </div>
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
      </div>

      {/* Pop-up Modal */}
      {selectedCustomerBills && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">কাস্টোমার অর্ডার হিস্ট্রি</p>
                <h3 className="text-2xl font-black text-slate-800">👤 {selectedCustomerBills.name}</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">📞 {selectedCustomerBills.phone}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => setSelectedCustomerBills(null)} className="w-10 h-10 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white font-bold transition-all flex items-center justify-center">✕</button>
                <span className="text-xs font-black text-green-600 bg-green-50 px-3 py-1 rounded-md">Total Paid: {selectedCustomerBills.amount} ৳</span>
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
                  <table className="w-full text-left text-xs bg-white border border-slate-100 rounded-2xl overflow-hidden">
                    <thead className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-400">
                      <tr><th className="p-3">Item Details</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                      {bill.chalan_items.map((item, j) => (
                        <tr key={j}>
                          <td className="p-3 text-slate-700">{item.products?.name} <span className="text-[10px] font-bold text-slate-400 block">{item.products?.model} ({item.products?.category})</span></td>
                          <td className="p-3 text-center text-blue-600">{item.quantity} pcs</td>
                          <td className="p-3 text-right text-slate-900">{item.total_price} ৳</td>
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
    </div>
  );
};

export default Reports;