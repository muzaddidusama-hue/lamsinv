import React, { useState, useEffect, useMemo } from 'react';
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
  
  // কাস্টমার স্টেট 
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // প্রোডাক্ট স্টেট
  const [allProducts, setAllProducts] = useState([]);
  const [rawProducts, setRawProducts] = useState([]); 
  const [productSearch, setProductSearch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // ট্রানজেকশন ও লেজার স্টেট
  const [allTransactions, setAllTransactions] = useState([]); 
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSuggestions, setLedgerSuggestions] = useState([]);
  const [showLedgerSuggestions, setShowLedgerSuggestions] = useState(false);
  // 🔴 নতুন: লেজারের সাব-ট্যাব স্টেট
  const [ledgerTab, setLedgerTab] = useState('total'); // 'total', 'ho', 'showroom'

  const [selectedCustomerBills, setSelectedCustomerBills] = useState(null);
  const [mrps, setMrps] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);
const [invSerials, setInvSerials] = useState([]);
   const [serialSearch, setSerialSearch] = useState('');
   const [loadingSerials, setLoadingSerials] = useState(false);

  const getStandardKey = (name) => {
    if (!name) return 'unknown';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const totals = useMemo(() => {
    let q = 0, m = 0, s = 0;
    if (reportData && reportData.combinedProductStats) {
      Object.values(reportData.combinedProductStats).forEach(prod => {
        const currentMrp = parseFloat(mrps[prod.name]) || 0;
        q += prod.qty;
        m += (currentMrp * prod.qty);
        s += prod.total;
      });
    }
    return { totalQty: q, totalMinAllowed: m, totalActualSold: s, totalSurplus: s - m };
  }, [reportData, mrps]);

  const getProductWiseStats = () => {
    if (!reportData || !productSearch) return { totalQty: 0, totalAmount: 0, hoQty: 0, hoAmount: 0, showroomQty: 0, showroomAmount: 0 };
    let totalQty = 0, totalAmount = 0, hoQty = 0, hoAmount = 0, showroomQty = 0, showroomAmount = 0;

    Object.values(reportData.productStats).forEach(stat => {
      if (stat.name && stat.name.toLowerCase() === productSearch.toLowerCase()) {
        totalQty += stat.qty;
        totalAmount += stat.total;
        if (stat.house === 'Head Office') { hoQty += stat.qty; hoAmount += stat.total; } 
        else if (stat.house === 'Showroom') { showroomQty += stat.qty; showroomAmount += stat.total; }
      }
    });
    return { totalQty, totalAmount, hoQty, hoAmount, showroomQty, showroomAmount };
  };

  const productWiseStats = getProductWiseStats();

  // 🔴 ওপেনিং ও ক্লোজিং স্টক ক্যালকুলেশনের মূল ফাংশন (হাউজ স্পেসিফিক আপডেট)
  const getLedgerSummary = () => {
    const summaryMap = new Map();

    rawProducts.forEach(p => {
      const fullName = `${p.name || ''} - ${p.model || ''}`.trim();
      const key = getStandardKey(fullName);
      if (!summaryMap.has(key)) {
        summaryMap.set(key, { 
          product: fullName, 
          totalIn: 0, totalOut: 0, futureIn: 0, futureOut: 0, 
          hoIn: 0, hoOut: 0, hoFutureIn: 0, hoFutureOut: 0,
          showIn: 0, showOut: 0, showFutureIn: 0, showFutureOut: 0,
          stocks: { 'Head Office': 0, 'Showroom': 0 } 
        });
      }
      const houseName = p.house || 'Head Office';
      summaryMap.get(key).stocks[houseName] += parseInt(p.stock_quantity) || 0;
    });

    allTransactions.forEach(t => {
      if (!t.product) return;
      const key = getStandardKey(t.product);
      if (!summaryMap.has(key)) {
        summaryMap.set(key, { 
          product: t.product, 
          totalIn: 0, totalOut: 0, futureIn: 0, futureOut: 0, 
          hoIn: 0, hoOut: 0, hoFutureIn: 0, hoFutureOut: 0,
          showIn: 0, showOut: 0, showFutureIn: 0, showFutureOut: 0,
          stocks: { 'Head Office': 0, 'Showroom': 0 } 
        });
      }
      
      const isHo = t.house === 'Head Office';
      const isShow = t.house === 'Showroom';

      if (t.isFuture) {
        if (t.type === 'in') {
          summaryMap.get(key).futureIn += t.quantity;
          if (isHo) summaryMap.get(key).hoFutureIn += t.quantity;
          if (isShow) summaryMap.get(key).showFutureIn += t.quantity;
        }
        if (t.type === 'out') {
          summaryMap.get(key).futureOut += t.quantity;
          if (isHo) summaryMap.get(key).hoFutureOut += t.quantity;
          if (isShow) summaryMap.get(key).showFutureOut += t.quantity;
        }
      } else {
        if (t.type === 'in') {
          summaryMap.get(key).totalIn += t.quantity;
          if (isHo) summaryMap.get(key).hoIn += t.quantity;
          if (isShow) summaryMap.get(key).showIn += t.quantity;
        }
        if (t.type === 'out') {
          summaryMap.get(key).totalOut += t.quantity;
          if (isHo) summaryMap.get(key).hoOut += t.quantity;
          if (isShow) summaryMap.get(key).showOut += t.quantity;
        }
      }
    });

    const list = Array.from(summaryMap.values()).map(item => {
      // Total Stock
      const currentStock = item.stocks['Head Office'] + item.stocks['Showroom'];
      const openingStock = currentStock - item.totalIn + item.totalOut - item.futureIn + item.futureOut;
      const closingStock = openingStock + item.totalIn - item.totalOut;

      // HO Stock
      const hoOpening = item.stocks['Head Office'] - item.hoIn + item.hoOut - item.hoFutureIn + item.hoFutureOut;
      const hoClosing = hoOpening + item.hoIn - item.hoOut;

      // Showroom Stock
      const showOpening = item.stocks['Showroom'] - item.showIn + item.showOut - item.showFutureIn + item.showFutureOut;
      const showClosing = showOpening + item.showIn - item.showOut;

      return { 
        ...item, 
        currentStock, openingStock, closingStock,
        hoOpening, hoClosing,
        showOpening, showClosing
      };
    });

    return list
      .filter(item => item.totalIn > 0 || item.totalOut > 0 || item.openingStock > 0 || item.closingStock > 0 || item.hoOpening > 0 || item.showOpening > 0 || item.hoClosing > 0 || item.showClosing > 0)
      .sort((a, b) => a.product.localeCompare(b.product, undefined, { numeric: true, sensitivity: 'base' }));
  };

  const ledgerSummaryList = useMemo(() => {
    return getLedgerSummary();
  }, [rawProducts, allTransactions]);

  const selectedSummary = useMemo(() => {
    return ledgerSummaryList.find(s => s.product === ledgerSearch);
  }, [ledgerSummaryList, ledgerSearch]);

  const combinedLedgerHistory = useMemo(() => {
    if (!ledgerSearch) return [];
    const targetKey = getStandardKey(ledgerSearch);
    return allTransactions
      .filter(t => !t.isFuture && getStandardKey(t.product) === targetKey) 
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [allTransactions, ledgerSearch]);

  // 🔴 বর্তমান সাব-ট্যাব অনুযায়ী ডাটা ফিল্টার
  const filteredLedgerHistory = useMemo(() => {
    return combinedLedgerHistory.filter(t => {
      if (ledgerTab === 'total') return true;
      if (ledgerTab === 'ho') return t.house === 'Head Office';
      if (ledgerTab === 'showroom') return t.house === 'Showroom';
      return true;
    });
  }, [combinedLedgerHistory, ledgerTab]);

  const getActiveTabValues = (item) => {
    if (!item) return { open: 0, inp: 0, out: 0, close: 0 };
    if (ledgerTab === 'ho') return { open: item.hoOpening, inp: item.hoIn, out: item.hoOut, close: item.hoClosing };
    if (ledgerTab === 'showroom') return { open: item.showOpening, inp: item.showIn, out: item.showOut, close: item.showClosing };
    return { open: item.openingStock, inp: item.totalIn, out: item.totalOut, close: item.closingStock };
  };

  const filteredCustomers = useMemo(() => {
    if (!reportData) return [];
    return Object.values(reportData.customerStats)
      .filter(c => {
        const nameStr = c.name ? String(c.name).toLowerCase() : '';
        const phoneStr = c.phone ? String(c.phone) : '';
        const searchStr = customerSearch ? customerSearch.toLowerCase() : '';
        return nameStr.includes(searchStr) || phoneStr.includes(searchStr);
      })
      .sort((a, b) => b.amount - a.amount);
  }, [reportData, customerSearch]);

  useEffect(() => {
    generateReport();
  }, [startDate, endDate]); 
// LAZY LOADING
   useEffect(() => {
     if ((reportType === 'ledger_report' || reportType === 'product_wise') && rawProducts.length === 0) fetchAllProducts();
   }, [reportType]);
  // REALTIME SERIAL SEARCH WITH DEBOUNCE
  useEffect(() => {
    if (reportType !== 'serial_history') return;

    const query = serialSearch.trim();
    if (query.length < 2) {
      setInvSerials([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoadingSerials(true);
      try {
        const { data, error } = await supabase
          .from('inv_sl')
          .select('*')
          .ilike('sl_no', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && data) {
          setInvSerials(data);
        }
      } catch (err) {
        console.error(err);
      }
      setLoadingSerials(false);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [serialSearch, reportType]);

   const fetchInvSerials = async () => {
     // Fallback / legacy helper if needed elsewhere
     const { data } = await supabase.from('inv_sl').select('*').order('created_at', { ascending: false }).limit(1);
     if (data) setInvSerials(data);
   };

  const fetchAllProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, model, category, house, stock_quantity').order('name', { ascending: true });
    if (data) {
      setRawProducts(data);
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
      const { data: allChalans, error } = await supabase
        .from('chalans')
        .select(`*, customers(name, phone), chalan_items(*, products(name, model, category))`)
        .gte('created_at', `${startDate}T00:00:00.000Z`);

      if (error) throw error;
      
      const endDateTime = new Date(`${endDate}T23:59:59.999Z`).getTime();
      const periodChalans = [];
      const extractedTrans = [];
      
      if (allChalans) {
        allChalans.forEach(ch => {
          const isFuture = new Date(ch.created_at).getTime() > endDateTime;

          if (!isFuture) periodChalans.push(ch);
          if (!ch.is_in_house && ch.chalan_items) {
            ch.chalan_items.forEach(item => {
              const pName = `${item.products?.name || ''} - ${item.products?.model || ''}`.trim();
              const cName = ch.customer_name || ch.customers?.name || 'Walk-in';
              if (ch.status === 'paid') {
                extractedTrans.push({
                  id: `sale_${ch.id}_${item.id}`,
                  date: ch.created_at ? ch.created_at.split('T')[0] : '',
                  timestamp: ch.created_at,
                  product: pName,
                  type: 'out',
                  house: ch.house || 'Head Office',
                  quantity: item.quantity,
                  source: `Sold to: ${cName}`,
                  ref: `Bill: #${ch.bill_no || 'N/A'} ${ch.chalan_no && ch.chalan_no !== 'N/A' ? `(Chl: ${ch.chalan_no})` : ''}`,
                  isFuture
                });
              } else if (ch.status === 'hold') {
                extractedTrans.push({
                  id: `sale_hold_${ch.id}_${item.id}`,
                  date: ch.created_at ? ch.created_at.split('T')[0] : '',
                  timestamp: ch.created_at,
                  product: pName,
                  type: 'out',
                  house: ch.house || 'Head Office',
                  quantity: item.quantity,
                  source: `Challan Out: ${cName}`,
                  ref: `Chl: #${ch.chalan_no}`,
                  isFuture
                });
              }
            });
          }
          
          if (ch.is_in_house && ch.chalan_items) {
            ch.chalan_items.forEach(item => {
              const pName = `${item.products?.name || ''} - ${item.products?.model || ''}`.trim();
              extractedTrans.push({
                id: `tr_out_${ch.id}_${item.id}`, date: ch.created_at ? ch.created_at.split('T')[0] : '', timestamp: ch.created_at, product: pName, type: 'out', house: ch.house, quantity: item.quantity, source: `Transfer Out (To ${ch.transfer_to})`, ref: `Chl: #${ch.chalan_no}`, isFuture
              });
              extractedTrans.push({
                id: `tr_in_${ch.id}_${item.id}`, date: ch.created_at ? ch.created_at.split('T')[0] : '', timestamp: ch.created_at, product: pName, type: 'in', house: ch.transfer_to, quantity: item.quantity, source: `Transfer In (From ${ch.house})`, ref: `Chl: #${ch.chalan_no}`, isFuture
              });
            });
          }
        });
      }

      processReportData(periodChalans); 

      // Fetch manual additions from ledger (filter to 'in' type entries only)
      const { data: allLedger, error: ledgerErr } = await supabase
        .from('ledger')
        .select('*')
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (!ledgerErr && allLedger) {
        allLedger.forEach(l => {
          if (l.type === 'out') return; // Exclude manual stock outs from ledger (since they are now fetched from stock_out)
          const isFuture = l.date > endDate;
          extractedTrans.push({
            id: `leg_${l.id}`,
            dbId: l.id, 
            dbTable: 'ledger',
            date: l.date,
            timestamp: l.in || l.date,
            product: l.product,
            type: l.type || 'in',
            house: l.house || 'Head Office',
            quantity: parseInt(l.quantity) || 0,
            source: l.source || 'Import / Manual Entry',
            ref: 'Manual Entry',
            isFuture
          });
        });
      }

      // Fetch manual removals from stock_out
      const { data: allStockOut, error: stockOutErr } = await supabase
        .from('stock_out')
        .select('*')
        .gte('date', startDate);

      if (!stockOutErr && allStockOut) {
        allStockOut.forEach(s => {
          const isFuture = s.date > endDate;
          extractedTrans.push({
            id: `stout_${s.id}`,
            dbId: s.id,
            dbTable: 'stock_out',
            date: s.date,
            timestamp: s.date,
            product: `${s.type} - ${s.model}`,
            type: 'out',
            house: 'Head Office',
            quantity: parseInt(s.amount) || 0,
            source: s.reason || 'Manual Removal',
            ref: 'Manual Removal',
            isFuture
          });
        });
      }

      setAllTransactions(extractedTrans);

    } catch (error) {
      console.error(error);
      alert('রিপোর্ট জেনারেট করতে সমস্যা হয়েছে!');
    }
    setLoading(false);
  };

  const processReportData = (chalans) => {
    const data = {
      totalBills: 0, totalBillAmount: 0, totalChalans: 0, totalChalanAmount: 0,
      houseStats: { 'Head Office': { bills: 0, amount: 0, products: {} }, 'Showroom': { bills: 0, amount: 0, products: {} } },
      customerStats: {}, productStats: {}, combinedProductStats: {} 
    };

    chalans.forEach(ch => {
      const isPaid = ch.status === 'paid';
      const amt = parseFloat(ch.total_amount) || 0;
      const house = ch.house || 'Head Office';

      if (isPaid) {
        data.totalBills += 1; data.totalBillAmount += amt;
        if (!data.houseStats[house]) data.houseStats[house] = { bills: 0, amount: 0, products: {} };
        data.houseStats[house].bills += 1; data.houseStats[house].amount += amt;
      } else if (ch.status === 'hold') {
        data.totalChalans += 1; data.totalChalanAmount += amt;
      }

      if (isPaid && ch.customers) {
        const custName = ch.customers.name || 'Walk-in';
        const custPhone = ch.customers.phone || '';
        const custKey = `${custName}_${custPhone}`; 

        if (!data.customerStats[custKey]) data.customerStats[custKey] = { name: custName, phone: custPhone, amount: 0, items: [], bills: [] };
        data.customerStats[custKey].amount += amt;
        data.customerStats[custKey].bills.push(ch);
        
        if (ch.chalan_items) {
          ch.chalan_items.forEach(item => {
            const pName = `${item.products?.category || ''} ${item.products?.model || ''}`.trim();
            data.customerStats[custKey].items.push(`${pName} (${item.quantity} pcs)`);
          });
        }
      }

      if (isPaid && ch.chalan_items) {
        ch.chalan_items.forEach(item => {
          const pName = `${item.products?.category || ''} ${item.products?.model || ''} ${item.products?.name || ''}`.trim();
          const pKey = `${pName}_${house}`; 

          if (!data.productStats[pKey]) data.productStats[pKey] = { name: pName, house: house, qty: 0, total: 0 };
          data.productStats[pKey].qty += item.quantity;
          data.productStats[pKey].total += item.total_price;

          if (!data.combinedProductStats[pName]) data.combinedProductStats[pName] = { name: pName, qty: 0, total: 0 };
          data.combinedProductStats[pName].qty += item.quantity;
          data.combinedProductStats[pName].total += item.total_price;

          if (!data.houseStats[house].products[pName]) data.houseStats[house].products[pName] = { name: pName, qty: 0, total: 0 };
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
      const { data } = await supabase.from('customers').select('id, name, phone').or(`name.ilike.%${val}%,phone.ilike.%${val}%`).limit(10);
      setCustomerSuggestions(data || []); setShowSuggestions(true);
    } else setShowSuggestions(false);
  };

  const selectCustomer = (cust) => { setCustomerSearch(cust.name); setShowSuggestions(false); };

  const handleProductSearchAction = (e) => {
    const val = e.target.value;
    setProductSearch(val);
    if (val.length >= 1) {
      const filtered = allProducts.filter(p => p.fullName?.toLowerCase().includes(val.toLowerCase()));
      setProductSuggestions(filtered.slice(0, 10)); setShowProductSuggestions(true);
    } else setShowProductSuggestions(false);
  };

  const handleLedgerSearchAction = (e) => {
    const val = e.target.value;
    setLedgerSearch(val);
    if (val.length >= 1) {
      const filtered = ledgerSummaryList.map(s => s.product).filter(name => name.toLowerCase().includes(val.toLowerCase()));
      setLedgerSuggestions(filtered.slice(0, 10)); setShowLedgerSuggestions(true);
    } else setShowLedgerSuggestions(false);
  };

  const downloadReportPDF = () => {
    const element = document.getElementById('formal-corporate-portrait-pdf');
    if (!element) return;
    setPdfLoading(true);
    const executeDownload = () => {
      const opt = { margin: 0, filename: `LAMS_POWER_${reportType}_Report_${startDate}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      element.classList.remove('hidden');
      window.html2pdf().from(element).set(opt).save().then(() => { element.classList.add('hidden'); setPdfLoading(false); }).catch(() => { element.classList.add('hidden'); setPdfLoading(false); });
    };
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = executeDownload;
      document.head.appendChild(script);
    } else executeDownload();
  };

  const getServiceDetails = (inv) => {
    let count = 0;
    let lastDate = 'N/A';
    for (let i = 1; i <= 10; i++) {
      const dateVal = inv[`serv_${i}_date`];
      if (dateVal && String(dateVal).trim() !== '' && String(dateVal).toLowerCase() !== 'null') {
        count++;
        lastDate = dateVal;
      }
    }
    return { count, lastDate };
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
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

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
        <div className="flex flex-wrap gap-2 flex-1">
          {[
            { id: 'summary', label: 'সার্বিক হিসাব (Summary)' },
            { id: 'house', label: 'হাউজ রিপোর্ট (HO vs Showroom)' },
            { id: 'product', label: 'প্রোডাক্ট সেলস রিপোর্ট' },
            { id: 'customer', label: 'কাস্টোমার রিপোর্ট' },
            { id: 'product_wise', label: 'প্রোডাক্ট ওয়াইজ রিপোর্ট' },
            { id: 'ledger_report', label: 'লেজার রিপোর্ট (In & Out)' },
            { id: 'serial_history', label: 'ইনভার্টার সিরিয়াল' } 
          ].map(tab => (
            <button 
              key={tab.id} onClick={() => { setReportType(tab.id); setCustomerSearch(''); setProductSearch(''); setLedgerSearch(''); setSerialSearch(''); setLedgerTab('total'); }}
              className={`flex-1 min-w-[130px] py-3 px-2 rounded-lg font-bold text-[11px] transition-all ${reportType === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <button onClick={downloadReportPDF} disabled={pdfLoading} className="bg-slate-900 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95">
          {pdfLoading ? 'প্রিন্ট ফাইল রেডি হচ্ছে...' : '📥 Download Formal PDF'}
        </button>
      </div>

      {reportData && !loading && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
          
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
                  <thead><tr className="bg-white font-black text-slate-400 border-b uppercase"><th className="p-3">Product Model</th><th className="p-3 text-center">Total Quantity</th><th className="p-3 text-right">Total Amount</th></tr></thead>
                  <tbody className="divide-y font-bold">{Object.values(reportData.combinedProductStats).map((prod, i) => (<tr key={i} className="hover:bg-slate-50"><td className="p-3">{prod.name}</td><td className="p-3 text-center text-blue-600">{prod.qty} pcs</td><td className="p-3 text-right text-slate-900">{prod.total} ৳</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

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
                        <thead><tr className="bg-slate-50 font-black text-slate-400 uppercase"><th className="p-2">Product</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Total</th></tr></thead>
                        <tbody className="divide-y font-bold text-slate-700">
                          {Object.values(reportData.houseStats[house].products).map((p, i) => (<tr key={i} className="hover:bg-slate-50"><td className="p-2 truncate max-w-[150px]">{p.name}</td><td className="p-2 text-center text-purple-600">{p.qty} pcs</td><td className="p-2 text-right">{p.total} ৳</td></tr>))}
                          {Object.keys(reportData.houseStats[house].products).length === 0 && (<tr><td colSpan="3" className="p-3 text-center text-slate-400 italic">কোনো মালামাল বিক্রয় হয়নি</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-sm font-black text-slate-800 flex justify-between border-t pt-2 mt-2"><span>মোট রেভিনিউ:</span> <span className="text-blue-600 text-base">{reportData.houseStats[house].amount} ৳</span></p>
                </div>
              ))}
            </div>
          )}

          {reportType === 'product' && (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 uppercase font-black text-slate-500 border-b"><th className="p-4">Product Description</th><th className="p-4 text-center">Qty Sold</th><th className="p-4 text-center w-32">MRP (Unit)</th><th className="p-4 text-right">Min Value</th><th className="p-4 text-right">Actual Sold</th><th className="p-4 text-right">Surplus</th></tr>
                </thead>
                <tbody className="divide-y">
                  {Object.values(reportData.combinedProductStats).map((prod, idx) => {
                    const currentMrp = parseFloat(mrps[prod.name]) || 0;
                    const minVal = currentMrp * prod.qty;
                    const surplus = prod.total - minVal;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-800">{prod.name}</td>
                        <td className="p-4 text-center font-black text-blue-600">{prod.qty} pcs</td>
                        <td className="p-4 text-center"><input type="number" value={mrps[prod.name] || ''} onChange={(e) => setMrps({ ...mrps, [prod.name]: e.target.value })} className="w-20 p-1 bg-slate-50 border text-center font-bold text-xs rounded" placeholder="0" /></td>
                        <td className="p-4 text-right font-semibold text-slate-500">{currentMrp > 0 ? `${minVal} ৳` : '—'}</td>
                        <td className="p-4 text-right font-black text-slate-900">{prod.total} ৳</td>
                        <td className="p-4 text-right font-black">{currentMrp > 0 ? <span className={surplus >= 0 ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded' : 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'}>{surplus >= 0 ? `+${surplus}` : surplus} ৳</span> : <span className="text-slate-400 italic">Set MRP</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'customer' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-50 p-4 rounded-xl border">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">🔍 কাস্টোমার সার্চ (নাম/মোবাইল)</label>
                  <input type="text" value={customerSearch} onChange={handleCustomerSearch} placeholder="নাম বা মোবাইল নম্বর টাইপ করুন..." className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-500" />
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute left-0 w-full mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto text-xs font-bold">{customerSuggestions.map(c => (<div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border-b hover:bg-blue-50/40 cursor-pointer">{c.name} — {c.phone}</div>))}</div>
                  )}
                </div>
              </div>
              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-900 text-white font-black text-[10px] tracking-wider uppercase p-3.5">নির্ধারিত তারিখের কেনাকাটার তালিকা ({startDate} থেকে {endDate})</div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead><tr className="bg-slate-50 border-b font-black text-slate-400 uppercase"><th className="p-4">কাস্টোমারের নাম</th><th className="p-4">মোবাইল নাম্বার</th><th className="p-4 text-right">মোট পারচেজ ভলিউম</th></tr></thead>
                    <tbody className="divide-y font-bold text-slate-700">
                      {filteredCustomers.map((cust, i) => (
                        <tr key={i} onClick={() => setSelectedCustomerBills(cust)} className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                          <td className="p-4 text-slate-900 font-black group-hover:text-blue-600 transition-colors flex items-center gap-2"><span>👤 {cust.name}</span><span className="text-[9px] font-black uppercase text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1">Detail ➔</span></td>
                          <td className="p-4 text-slate-500 font-mono">{cust.phone || '—'}</td>
                          <td className="p-4 text-right text-emerald-600 font-black text-sm">{cust.amount} ৳</td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr><td colSpan="3" className="p-8 text-center text-slate-400 italic">এই সময়ের মধ্যে কোনো কাস্টমার রেকর্ড নেই।</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {reportType === 'product_wise' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-50 p-4 rounded-xl border">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">🔍 প্রোডাক্ট সার্চ (নাম/মডেল)</label>
                  <input type="text" value={productSearch} onChange={handleProductSearchAction} onFocus={() => productSearch && setShowProductSuggestions(true)} onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)} placeholder="যেমন: Solar Panel..." className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-500" />
                  {showProductSuggestions && productSuggestions.length > 0 && (
                    <div className="absolute left-0 w-full mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto text-xs font-bold">{productSuggestions.map((p, i) => (<div key={i} onClick={() => { setProductSearch(p.fullName); setShowProductSuggestions(false); }} className="p-3 border-b hover:bg-orange-50 cursor-pointer">📦 {p.fullName}</div>))}</div>
                  )}
                </div>
              </div>
              {productSearch ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between"><p className="text-orange-400 font-black text-xs uppercase tracking-widest mb-1">মোট বিক্রয় ভলিউম (Total Quantity)</p><h3 className="text-3xl font-black">{productWiseStats.totalQty} pcs</h3></div>
                    <div className="bg-blue-600 text-white p-6 rounded-2xl flex flex-col justify-between"><p className="text-blue-100 font-black text-xs uppercase tracking-widest mb-1">মোট বিক্রয় মূল্য (Gross Revenue)</p><h3 className="text-3xl font-black">{productWiseStats.totalAmount} ৳</h3></div>
                  </div>
                  <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-slate-100 p-4 border-b font-black text-xs text-slate-700 uppercase tracking-wider">🏢 হাউজ ভিত্তিক বিক্রয়ের বিবরণ (HO vs Showroom)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x font-bold">
                      <div className="p-6 space-y-2"><p className="text-sm font-black text-slate-800 flex items-center gap-2">🏠 Head Office (HO)</p><p className="text-xs text-slate-500">বিক্রয় পরিমাণ: <span className="text-slate-800 font-black text-sm">{productWiseStats.hoQty} pcs</span></p><p className="text-xs text-slate-500">মোট মূল্য: <span className="text-blue-600 font-black text-sm">{productWiseStats.hoAmount} ৳</span></p></div>
                      <div className="p-6 space-y-2"><p className="text-sm font-black text-slate-800 flex items-center gap-2">🏪 Showroom</p><p className="text-xs text-slate-500">বিক্রয় পরিমাণ: <span className="text-slate-800 font-black text-sm">{productWiseStats.showroomQty} pcs</span></p><p className="text-xs text-slate-500">মোট মূল্য: <span className="text-blue-600 font-black text-sm">{productWiseStats.showroomAmount} ৳</span></p></div>
                    </div>
                  </div>
                </div>
              ) : (<div className="text-center py-16 border border-dashed rounded-2xl text-slate-400 font-medium italic text-xs">সার্চ করে প্রোডাক্ট সিলেক্ট করুন।</div>)}
            </div>
          )}

          {reportType === 'ledger_report' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">🔍 ইনপুট প্রোডাক্ট সার্চ (লেজার)</label>
                  <input type="text" value={ledgerSearch} onChange={handleLedgerSearchAction} onFocus={() => ledgerSearch && setShowLedgerSuggestions(true)} onBlur={() => setTimeout(() => setShowLedgerSuggestions(false), 200)} placeholder="যেমন: Inhenergy..." className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-500" />
                  {showLedgerSuggestions && ledgerSuggestions.length > 0 && (
                    <div className="absolute left-0 w-full mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto text-xs font-bold">{ledgerSuggestions.map((name, i) => (<div key={i} onClick={() => { setLedgerSearch(name); setShowLedgerSuggestions(false); }} className="p-3 border-b hover:bg-orange-50 cursor-pointer">📦 {name}</div>))}</div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">📋 লেজার ড্রপডাউন সিলেকশন</label>
                  <select value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)} className="w-full p-3 bg-white border rounded-xl font-bold text-xs text-slate-700 outline-none cursor-pointer focus:border-blue-500">
                    <option value="">লিস্টের সকল প্রোডাক্ট খতিয়ান সামারি (In & Out Summary)</option>
                    {ledgerSummaryList.map((item, i) => (<option key={i} value={item.product}>{item.product}</option>))}
                  </select>
                </div>
              </div>

              {/* 🔴 নতুন যোগ করা ৩টি সাব-ট্যাব */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-fit mt-2 mb-4">
                <button onClick={() => setLedgerTab('total')} className={`flex-1 md:px-6 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all ${ledgerTab === 'total' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>মোট স্টক (Total)</button>
                <button onClick={() => setLedgerTab('ho')} className={`flex-1 md:px-6 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all ${ledgerTab === 'ho' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>হেড অফিস (HO)</button>
                <button onClick={() => setLedgerTab('showroom')} className={`flex-1 md:px-6 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all ${ledgerTab === 'showroom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>শোরুম</button>
              </div>

              {!ledgerSearch ? (
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="bg-slate-900 text-white font-black text-[10px] tracking-wider uppercase p-3.5 flex justify-between">
                    <span>স্টক ইন-আউট সার্বিক খতিয়ান তালিকা ({startDate} থেকে {endDate}) • {ledgerTab === 'total' ? 'All' : ledgerTab === 'ho' ? 'Head Office' : 'Showroom'}</span>
                  </div>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-slate-50 border-b font-black text-slate-400 uppercase">
                          <th className="p-4 bg-slate-50">প্রোডাক্ট এর বিবরণ (নাম ও মডেল)</th>
                          <th className="p-4 text-center bg-slate-100 text-slate-600">ওপেনিং স্টক</th>
                          <th className="p-4 text-center w-32 text-emerald-600 bg-emerald-50">মোট ইন (+)</th>
                          <th className="p-4 text-center w-32 text-rose-600 bg-rose-50">মোট আউট (-)</th>
                          <th className="p-4 text-center text-blue-600 bg-blue-50">ক্লোজিং স্টক</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-slate-700">
                        {ledgerSummaryList.map((item, i) => {
                          const vals = getActiveTabValues(item);
                          return (
                            <tr key={i} onClick={() => setLedgerSearch(item.product)} className="hover:bg-orange-50/30 cursor-pointer transition-colors">
                              <td className="p-4 text-slate-900 font-black">📦 {item.product}</td>
                              <td className="p-4 text-center font-black text-slate-500">{vals.open} PCS</td>
                              <td className="p-4 text-center text-emerald-600">{vals.inp} PCS</td>
                              <td className="p-4 text-center text-rose-600">{vals.out} PCS</td>
                              <td className="p-4 text-center font-black text-blue-600">{vals.close} PCS</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <p className="text-xs font-black text-orange-700 flex flex-col md:flex-row md:items-center gap-1">
                      <span>🎯 খতিয়ান ট্র্যাক:</span> 
                      <span className="text-sm font-black text-slate-900 md:ml-1">{ledgerSearch}</span>
                    </p>
                    <button onClick={() => setLedgerSearch('')} className="text-xs font-bold text-slate-500 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 active:scale-95 transition-all">← সার্বিক তালিকা</button>
                  </div>
                  
                  {selectedSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-4">
                      {(() => {
                        const vals = getActiveTabValues(selectedSummary);
                        return (
                          <>
                            <div className="bg-slate-100 p-4 rounded-xl text-center border">
                              <p className="text-[10px] uppercase font-black text-slate-400 mb-1">শুরুর স্টক (Opening)</p>
                              <p className="text-xl font-black text-slate-800">{vals.open} PCS</p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100">
                              <p className="text-[10px] uppercase font-black text-emerald-600 mb-1">মোট ইন (+)</p>
                              <p className="text-xl font-black text-emerald-700">{vals.inp} PCS</p>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-xl text-center border border-rose-100">
                              <p className="text-[10px] uppercase font-black text-rose-600 mb-1">মোট আউট (-)</p>
                              <p className="text-xl font-black text-rose-700">{vals.out} PCS</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                              <p className="text-[10px] uppercase font-black text-blue-600 mb-1">শেষ স্টক (Closing)</p>
                              <p className="text-xl font-black text-blue-700">{vals.close} PCS</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="overflow-x-auto border rounded-xl bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                          <th className="p-4">তারিখ (Date)</th>
                          <th className="p-4 text-center">হাউজ (House)</th>
                          <th className="p-4 text-center">লেনদেনের ধরন</th>
                          <th className="p-4">রেফারেন্স / সোর্স (Ref/Source)</th>
                          <th className="p-4 text-right pr-8">পরিমাণ (Qty)</th>
                          <th className="p-4 text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-slate-700">
                        {filteredLedgerHistory.map((l, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 whitespace-nowrap">📅 {new Date(l.date).toLocaleDateString('bn-BD')}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${l.house === 'Showroom' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {l.house}
                              </span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${l.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {l.type === 'in' ? 'স্টক ইন (+)' : 'স্টক আউট (-)'}
                              </span>
                            </td>
                            <td className="p-4">
                              <p className="text-slate-800">{l.source}</p>
                              {l.ref && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{l.ref}</p>}
                            </td>
                            <td className="p-4 text-right pr-8 font-black text-sm whitespace-nowrap">
                              <span className={l.type === 'in' ? 'text-green-600' : 'text-red-600'}>
                                {l.type === 'in' ? `+${l.quantity}` : `-${l.quantity}`} PCS
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={async () => {
                                  if (!l.dbId) return alert("চালান বা বিল থেকে আসা এন্ট্রিগুলো এখান থেকে ডিলিট করা যাবে না। 'পেমেন্ট ও চালান' সেকশন থেকে ডিলিট বা রিটার্ন করুন।");
                                  if (window.confirm("এই ম্যানুয়াল এন্ট্রিটি মুছে ফেললে ডাটাবেজ থেকে চিরতরে চলে যাবে। নিশ্চিত?")) {
                                    try {
                                      const tableName = l.dbTable || 'ledger';
                                      const { error } = await supabase.from(tableName).delete().eq('id', l.dbId);
                                      if (error) throw error;
                                      alert("রেকর্ড মুছে ফেলা হয়েছে!");
                                      generateReport();
                                    } catch (err) { alert("মুছতে সমস্যা হয়েছে!"); }
                                  }
                                }}
                                className={`text-red-500 hover:text-red-700 font-black px-2 ${!l.dbId ? 'opacity-30 cursor-not-allowed' : ''}`}
                                disabled={!l.dbId}
                              >
                                🗑️ ডিলিট
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredLedgerHistory.length === 0 && (<tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">কোনো রেকর্ড পাওয়া যায়নি</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {reportType === 'serial_history' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-50 p-4 rounded-xl border">
                <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase">🔍 ইনভার্টার সিরিয়াল সার্চ</label>
                <input 
                  type="text" 
                  value={serialSearch} 
                  onChange={(e) => setSerialSearch(e.target.value)} 
                  placeholder="সিরিয়ালের কিছু ডিজিট লিখুন..." 
                  className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-500" 
                />
              </div>
              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-900 text-white font-black text-[10px] tracking-wider uppercase p-3.5">
                  ইনভার্টার সিরিয়াল ও কাস্টমার রেকর্ড
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b font-black text-slate-400 uppercase">
                        <th className="p-4">মডেল নাম</th>
                        <th className="p-4">সিরিয়াল নাম্বার</th>
                        <th className="p-4">কাস্টোমার নাম</th>
                        <th className="p-4">ঠিকানা</th>
                        <th className="p-4 text-center">এন্ট্রি তারিখ</th>
                        <th className="p-4 text-center">মোট সার্ভিস</th>
                        <th className="p-4 text-center">সর্বশেষ সার্ভিস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-bold text-slate-700">
                      {serialSearch.trim().length < 2 ? (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">সিরিয়াল খুঁজতে কমপক্ষে ২ টি অক্ষর টাইপ করুন...</td></tr>
                      ) : loadingSerials ? (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">খোঁজা হচ্ছে...</td></tr>
                      ) : invSerials.length === 0 ? (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">কোনো সিরিয়াল পাওয়া যায়নি</td></tr>
                      ) : (
                        invSerials.map((s, i) => {
                          const { count, lastDate } = getServiceDetails(s);
                          return (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4">
                                {s.inv_model || 'N/A'} 
                                <span className="text-[10px] text-slate-400 ml-1.5 uppercase font-black">({s.inv_type || 'Hybrid'})</span>
                              </td>
                              <td className="p-4 font-mono text-blue-600">{s.sl_no}</td>
                              <td className="p-4">{s.customer_name || 'N/A'}</td>
                              <td className="p-4 truncate max-w-[150px]" title={s.address}>{s.address || 'ঠিকানা নেই'}</td>
                              <td className="p-4 text-center text-slate-500">{s.created_at ? new Date(s.created_at).toLocaleDateString('bn-BD') : 'N/A'}</td>
                              <td className="p-4 text-center">
                                <span className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest ${count > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                  {count} বার
                                </span>
                              </td>
                              <td className="p-4 text-center text-slate-500">{lastDate}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 🏛️ ডাইনামিক এ৪ পোর্ট্রেট ফরমাল PDF লেআউট (Hidden) */}
      <div id="formal-corporate-portrait-pdf" className="hidden bg-white text-slate-900 mx-auto" style={{ width: '210mm', padding: '20mm 15mm', boxSizing: 'border-box', fontFamily: "Times New Roman, serif", lineHeight: '1.4' }}>
        <div className="pb-4 mb-6 flex justify-between items-start" style={{ borderBottom: '2px solid #0f172a' }}>
          <div><h1 className="text-3xl font-bold tracking-tight uppercase">LAMS POWER</h1><p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Corporate Office: Alobdi Eidgah, Mirpur 12, Dhaka, Bangladesh</p></div>
          <div className="text-right"><div className="border border-slate-900 px-4 py-1 bg-slate-50 font-bold text-xs uppercase tracking-wider">{reportType === 'ledger_report' ? 'Inventory Ledger Statement' : 'Financial Sales Statement'}</div><p className="text-[10px] text-slate-700 mt-2 font-bold">Period: {startDate} to {endDate}</p></div>
        </div>
        <div className="border border-slate-300 py-3 my-4 grid grid-cols-3 text-center text-[10px] font-bold uppercase bg-slate-50">
          <div className="border-r"><span className="text-[9px] text-slate-400 block mb-0.5">Target Value (MRP)</span><span>{totals.totalMinAllowed} ৳</span></div>
          <div className="border-r"><span className="text-[9px] text-slate-400 block mb-0.5">Actual Realized Revenue</span><span>{totals.totalActualSold} ৳</span></div>
          <div><span className="text-[9px] text-slate-400 block mb-0.5">Net Margin Surplus</span><span>+{totals.totalSurplus} ৳</span></div>
        </div>
        <div className="mt-6">
          <table className="w-full text-left text-[10px] border-collapse">
            {(reportType === 'summary' || reportType === 'product') && (
              <>
                <thead><tr className="border-b border-slate-800 uppercase text-slate-500 font-bold"><th className="pb-2 w-2/5">Product Description Specification</th><th className="pb-2 text-center">Volume</th><th className="pb-2 text-right">Actual Sold</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.values(reportData?.combinedProductStats || {}).map((prod, idx) => (
                    <tr key={idx} className="hover:bg-slate-50"><td className="py-2 font-semibold">{prod.name}</td><td className="py-2 text-center font-bold">{prod.qty} pcs</td><td className="py-2 text-right font-bold">{prod.total} ৳</td></tr>
                  ))}
                </tbody>
              </>
            )}
            {reportType === 'house' && (
              <>
                <thead><tr className="border-b border-slate-800 uppercase text-slate-500 font-bold"><th className="pb-2">Source House Location</th><th className="pb-2 text-center">Total Document Bills</th><th className="pb-2 text-right">Gross Generated Revenue</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.keys(reportData?.houseStats || {}).map((house, idx) => (
                    <tr key={idx} className="hover:bg-slate-50"><td className="py-3 font-semibold">🏢 {house}</td><td className="py-3 text-center font-bold">{reportData?.houseStats?.[house]?.bills || 0} Bills</td><td className="py-3 text-right font-black text-blue-900">{reportData?.houseStats?.[house]?.amount || 0} ৳</td></tr>
                  ))}
                </tbody>
              </>
            )}
            {reportType === 'customer' && (
              <>
                <thead><tr className="border-b border-slate-800 uppercase text-slate-500 font-bold"><th className="pb-2">Client Identity Name</th><th className="pb-2 text-center">Contact Mobile No</th><th className="pb-2 text-right">Cumulative Sales Volume</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCustomers.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-slate-50"><td className="py-2 font-semibold">👤 {cust.name}</td><td className="py-2 text-center font-mono">{cust.phone || '—'}</td><td className="py-2 text-right font-black text-emerald-700">{cust.amount} ৳</td></tr>
                  ))}
                </tbody>
              </>
            )}
            {reportType === 'ledger_report' && (
              <>
                {(!ledgerSearch) ? (
                  <>
                    <thead><tr className="border-b border-slate-800 uppercase text-slate-500 font-bold"><th className="pb-2">Inventory Stock Specification</th><th className="pb-2 text-center">Opening Stock</th><th className="pb-2 text-center">Gross Incoming (+)</th><th className="pb-2 text-center">Gross Outgoing (-)</th><th className="pb-2 text-center">Closing Stock</th></tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      {ledgerSummaryList.map((item, idx) => {
                        const vals = getActiveTabValues(item);
                        return (
                          <tr key={idx} className="hover:bg-slate-50"><td className="py-2 font-semibold">📦 {item.product}</td><td className="py-2 text-center text-slate-500 font-bold">{vals.open} PCS</td><td className="py-2 text-center text-green-600 font-bold">{vals.inp} PCS</td><td className="py-2 text-center text-red-600 font-bold">{vals.out} PCS</td><td className="py-2 text-center text-blue-600 font-bold">{vals.close} PCS</td></tr>
                        );
                      })}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead><tr className="border-b border-slate-800 uppercase text-slate-500 font-bold"><th className="pb-2">Transaction Timestamp</th><th className="pb-2 text-center">Movement Type</th><th className="pb-2 text-center">Reference Log Info</th><th className="pb-2 text-right">Volume</th></tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredLedgerHistory.map((l, idx) => (
                        <tr key={idx} className="hover:bg-slate-50"><td className="py-2">📅 {new Date(l.date).toLocaleDateString('bn-BD')}</td><td className="py-2 text-center uppercase font-bold">{l.type === 'in' ? 'STOCK IN' : 'SALES OUT'}</td><td className="py-2 text-center text-slate-500">{l.source}</td><td className="py-2 text-right font-bold">{l.type === 'in' ? `+${l.quantity}` : `-${l.quantity}`} PCS</td></tr>
                      ))}
                    </tbody>
                  </>
                )}
              </>
            )}
            <tfoot>
              <tr className="border-t border-b border-slate-800 font-bold text-slate-900 uppercase bg-slate-100">
                <td className="py-2 text-right font-bold" colSpan={reportType === 'ledger_report' && !ledgerSearch ? 4 : (reportType === 'ledger_report' && ledgerSearch ? 3 : 2)}>Grand Valuation Totals:</td>
                <td className="py-2 text-right font-bold text-blue-900">
                  {reportType === 'ledger_report' ? (ledgerSearch ? `${filteredLedgerHistory.reduce((s,c)=>s+c.quantity, 0)} PCS` : `-`) : `${totals.totalActualSold} ৳`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-20 grid grid-cols-3 gap-8 text-center text-[8px] uppercase tracking-wider text-slate-400 font-bold">
          <div><div className="border-t border-slate-300 pt-1.5 mx-4">Prepared By (Accounts)</div></div>
          <div><div className="border-t border-slate-300 pt-1.5 mx-4">Verified By (Auditor)</div></div>
          <div><div className="border-t border-slate-900 pt-1.5 mx-4 text-slate-900 font-bold">Authorized Approval (CEO)</div></div>
        </div>
      </div>

      {selectedCustomerBills && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">কাস্টোমার অর্ডার হিস্ট্রি</p><h3 className="text-2xl font-black text-slate-800">👤 {selectedCustomerBills.name}</h3><p className="text-sm font-bold text-slate-500 mt-1">📞 {selectedCustomerBills.phone}</p></div>
              <div className="flex flex-col items-end gap-2"><button onClick={() => setSelectedCustomerBills(null)} className="w-10 h-10 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white font-bold flex items-center justify-center">✕</button><span className="text-xs font-black text-green-600 bg-green-50 px-3 py-1 rounded-md">Total Paid: {selectedCustomerBills.amount} ৳</span></div>
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-6">
              {selectedCustomerBills.bills.map((bill, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-5 md:p-6 rounded-3xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div><div className="flex items-center gap-2 mb-1"><span className="bg-green-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Paid</span><p className="font-black text-slate-900 text-lg">#{bill.bill_no || 'N/A'}</p></div><p className="text-[10px] font-bold text-slate-400 uppercase">Ref Chalan: {bill.chalan_no}</p></div>
                    <div className="md:text-right"><p className="font-black text-slate-800 text-xl">{bill.total_amount} ৳</p><p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(bill.created_at).toLocaleDateString()} • via {bill.payment_method}</p></div>
                  </div>
                  <table className="w-full text-left text-xs bg-white border border-slate-100 rounded-2xl overflow-hidden">
                    <thead className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-400"><tr><th className="p-3">Item Details</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Total</th></tr></thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                      {bill.chalan_items?.map((item, j) => (
                        <tr key={j}><td className="p-3 text-slate-700">{item.products?.name} <span className="text-[10px] font-bold text-slate-400 block">{item.products?.model} ({item.products?.category})</span></td><td className="p-3 text-center text-blue-600">{item.quantity} pcs</td><td className="p-3 text-right text-slate-900">{item.total_price} ৳</td></tr>
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