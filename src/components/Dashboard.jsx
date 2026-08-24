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

  useEffect(() => {
    fetchDashboardData(true);

    const chalansChannel = supabase
      .channel('dashboard-chalans-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chalans' },
        () => {
          fetchDashboardData(false);
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel('dashboard-products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchDashboardData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chalansChannel);
      supabase.removeChannel(productsChannel);
    };
  }, []);

  const fetchDashboardData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
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
    if (isInitial) setLoading(false);
  };

  const handleOpenLowStockWindow = () => {
    const newWindow = window.open('', '_blank', 'width=900,height=700');
    if (!newWindow) return alert('Popup blocked! Please allow popups for this site.');
    
    const tableRows = lowStockProducts.map(p => `
      <tr style="border-bottom: 1px solid #e2e8f0; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#fff5f5'" onmouseout="this.style.backgroundColor='transparent'">
        <td style="padding: 14px 16px; font-weight: 700; color: #1e293b;">${p.name}</td>
        <td style="padding: 14px 16px; color: #64748b; font-weight: 500;">${p.model || '-'}</td>
        <td style="padding: 14px 16px;">
          <span style="font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; ${p.house === 'Showroom' ? 'background-color: #f3e8ff; color: #6b21a8;' : 'background-color: #f1f5f9; color: #1e3a8a;'}">
            ${p.house || 'HO'}
          </span>
        </td>
        <td style="padding: 14px 16px; text-align: right;">
          <span style="font-weight: 900; padding: 6px 12px; border-radius: 8px; font-size: 13px; ${p.stock_quantity < 10 ? 'background-color: #fee2e2; color: #ef4444;' : 'background-color: #ffedd5; color: #f97316;'}">
            ${p.stock_quantity}
          </span>
        </td>
      </tr>
    `).join('');

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Critical Low Stock List</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
          <style>
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px; 
              color: #1e293b; 
              background-color: #f8fafc; 
              margin: 0;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 16px;
            }
            h1 { 
              color: #dc2626; 
              font-size: 24px; 
              font-weight: 900;
              margin: 0; 
              letter-spacing: -0.5px;
            }
            .meta { 
              font-size: 12px; 
              color: #64748b; 
              font-weight: 600;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              background: white; 
              border-radius: 16px; 
              overflow: hidden; 
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); 
              border: 1px solid #e2e8f0;
            }
            th { 
              background: #f8fafc; 
              color: #475569; 
              padding: 14px 16px; 
              text-align: left; 
              font-size: 11px; 
              font-weight: 800;
              text-transform: uppercase; 
              letter-spacing: 0.5px;
              border-bottom: 1px solid #e2e8f0;
            }
            .empty {
              padding: 40px; 
              text-align: center; 
              color: #94a3b8; 
              font-weight: 600;
              font-style: italic;
              font-size: 14px;
            }
            @media print {
              body { background-color: white; padding: 20px; }
              table { box-shadow: none; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>
                <h1>⚠️ Critical Low Stock Alert List</h1>
                <div class="meta" style="margin-top: 4px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
              </div>
              <button onclick="window.print()" class="no-print" style="background-color: #dc2626; color: white; border: none; padding: 8px 16px; font-weight: 700; border-radius: 8px; cursor: pointer; font-size: 12px; transition: background-color 0.2s;">
                🖨️ Print List
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Model</th>
                  <th>Location</th>
                  <th style="text-align: right;">Stock Qty</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows || '<tr><td colspan="4" class="empty">All products are well stocked.</td></tr>'}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
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

  const handleAction = async (actionType) => {
    setProcessing(true);
    try {
      const isTransferMode = checkIsTransfer(selectedItem.is_in_house);

      if (actionType === 'transfer') {
        if (!isTransferMode) throw new Error("অবৈধ রিকোয়েস্ট!");
        
        for (let itm of modalItems) {
          const { data: sourceP } = await supabase.from('products').select('id, stock_quantity').eq('id', itm.product_id).single();
          if (sourceP) {
            await supabase.from('products').update({ stock_quantity: sourceP.stock_quantity - itm.quantity }).eq('id', sourceP.id);
          }
          
          const { data: targetP } = await supabase.from('products').select('id, stock_quantity').eq('name', itm.products.name).eq('model', itm.products.model).eq('house', selectedItem.transfer_to).maybeSingle();
          
          if (targetP) {
            await supabase.from('products').update({ stock_quantity: targetP.stock_quantity + itm.quantity }).eq('id', targetP.id);
          } else {
            const { id, created_at, stock_quantity, house, ...cleanProductData } = itm.products;
            
            await supabase.from('products').insert([{ 
              ...cleanProductData, 
              stock_quantity: itm.quantity, 
              house: selectedItem.transfer_to 
            }]);
          }
        }
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
      fetchDashboardData(false);
    } catch (e) { 
      alert(e.message || 'ত্রুটি হয়েছে'); 
      console.error(e); 
    } finally {
      setProcessing(false);
    }
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

  // Aggregated data calculation for custom SVG charts
  const getMonthlyChartsData = () => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();

    // Arrays of objects initialized with day and value
    const salesData = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, total: 0 }));
    const challanData = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, count: 0 }));

    todayBills.forEach(bill => {
      const day = new Date(bill.created_at).getDate();
      if (day >= 1 && day <= daysInMonth) {
        salesData[day - 1].total += (bill.total_amount || 0);
      }
    });

    todayChalans.forEach(chalan => {
      const day = new Date(chalan.created_at).getDate();
      if (day >= 1 && day <= daysInMonth) {
        challanData[day - 1].count += 1;
      }
    });

    return { salesData, challanData, daysInMonth, currentDay };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-[#ea3838] animate-spin"></div>
        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Dashboard...</span>
      </div>
    );
  }

  const { salesData, challanData, daysInMonth } = getMonthlyChartsData();

  // SVG Area Chart parameters calculation (Sales Revenue)
  const maxSales = Math.max(...salesData.map(d => d.total), 100000);
  const salesChartWidth = 550;
  const salesChartHeight = 180;
  const salesPaddingX = 40;
  const salesPaddingY = 20;

  // Generate SVG path for Sales Line/Area
  let salesPointsStr = "";
  let salesAreaStr = "";
  salesData.forEach((d, idx) => {
    const x = salesPaddingX + (idx / (daysInMonth - 1)) * (salesChartWidth - salesPaddingX * 2);
    const y = (salesChartHeight - salesPaddingY * 2) - (d.total / maxSales) * (salesChartHeight - salesPaddingY * 2) + salesPaddingY;
    if (idx === 0) {
      salesPointsStr += `M ${x} ${y}`;
      salesAreaStr += `M ${x} ${salesChartHeight - salesPaddingY} L ${x} ${y}`;
    } else {
      salesPointsStr += ` L ${x} ${y}`;
    }
    if (idx === salesData.length - 1) {
      salesAreaStr += `${salesPointsStr} L ${x} ${salesChartHeight - salesPaddingY} Z`;
    }
  });

  // SVG Bar Chart parameters calculation (Challan Count)
  const maxChallans = Math.max(...challanData.map(d => d.count), 10);
  const chChartWidth = 550;
  const chChartHeight = 180;
  const chPaddingX = 40;
  const chPaddingY = 20;
  const barGap = 4;
  const totalBarWidth = chChartWidth - chPaddingX * 2;
  const singleBarWidth = (totalBarWidth / daysInMonth) - barGap;

  // Icons used inside top cards
  const pendingIcon = (
    <svg className="w-6 h-6 text-[#ea3838]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const chalansIcon = (
    <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );

  const salesIcon = (
    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );

  const stockIcon = (
    <svg className="w-6 h-6 text-rose-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8 pb-16 font-sans">
      
      {/* Welcome segment */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Overview Dashboard</h2>
          <p className="text-xs text-slate-400 font-medium">Realtime inventory status, daily transaction volume, and operational logs.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDashboardData} className="px-4 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* Top statistical cards - modern, sleek design with lavender highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Pending Action', val: holdChalans.length, bg: 'bg-[#ea3838]/5 border-[#ea3838]/10', icon: pendingIcon, colorText: 'text-[#ea3838]' },
          { label: "This Month's Chalans", val: todayChalans.length, bg: 'bg-slate-100/80 border-blue-100/50', icon: chalansIcon, colorText: 'text-slate-700' },
          { label: "This Month's Sales", val: todayBills.length, bg: 'bg-emerald-50/80 border-emerald-100/50', icon: salesIcon, colorText: 'text-emerald-600' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover-scale flex items-center justify-between relative overflow-hidden group">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1.5">{s.val}</h3>
              <span className="text-[9px] text-slate-400 mt-1 block">Live database stats</span>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${s.bg}`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Graphs Section - Replaces the huge monthly lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Graph 1: Sales Revenue line/area chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-[340px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Sales Revenue (BDT)</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Total sales amount generated per day this month.</p>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-55/10 px-2.5 py-1 rounded-full">
              ৳ {salesData.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} Total
            </span>
          </div>

          <div className="flex-1 min-h-0 w-full relative">
            <svg viewBox={`0 0 ${salesChartWidth} ${salesChartHeight}`} className="w-full h-full">
              {/* Definitions for glowing gradient overlays */}
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ea3838" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ea3838" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = salesPaddingY + ratio * (salesChartHeight - salesPaddingY * 2);
                return (
                  <line 
                    key={idx} 
                    x1={salesPaddingX} 
                    y1={y} 
                    x2={salesChartWidth - salesPaddingX} 
                    y2={y} 
                    stroke="#e2e8f0" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                );
              })}

              {/* Area graph */}
              {salesAreaStr && (
                <path d={salesAreaStr} fill="url(#salesGrad)" />
              )}

              {/* Line graph */}
              {salesPointsStr && (
                <path d={salesPointsStr} fill="none" stroke="#ea3838" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Dots on points */}
              {salesData.map((d, idx) => {
                if (d.total === 0) return null;
                const x = salesPaddingX + (idx / (daysInMonth - 1)) * (salesChartWidth - salesPaddingX * 2);
                const y = (salesChartHeight - salesPaddingY * 2) - (d.total / maxSales) * (salesChartHeight - salesPaddingY * 2) + salesPaddingY;
                return (
                  <g key={idx} className="group/dot cursor-pointer">
                    <circle cx={x} cy={y} r="4.5" fill="#ea3838" stroke="#ffffff" strokeWidth="2" />
                    <title>{`Day ${d.day}: ${d.total} ৳`}</title>
                  </g>
                );
              })}

              {/* Y Axis helper labels */}
              <text x={salesPaddingX - 5} y={salesPaddingY + 4} textAnchor="end" className="text-[8px] fill-slate-400 font-bold">{(maxSales / 1000).toFixed(0)}k</text>
              <text x={salesPaddingX - 5} y={salesChartHeight / 2 + 4} textAnchor="end" className="text-[8px] fill-slate-400 font-bold">{(maxSales / 2000).toFixed(0)}k</text>
              <text x={salesPaddingX - 5} y={salesChartHeight - salesPaddingY + 4} textAnchor="end" className="text-[8px] fill-slate-400 font-bold">0</text>
              
              {/* X Axis labels */}
              <text x={salesPaddingX} y={salesChartHeight - 4} textAnchor="middle" className="text-[8px] fill-slate-400 font-bold">Day 1</text>
              <text x={salesChartWidth / 2} y={salesChartHeight - 4} textAnchor="middle" className="text-[8px] fill-slate-400 font-bold">Day {Math.floor(daysInMonth / 2)}</text>
              <text x={salesChartWidth - salesPaddingX} y={salesChartHeight - 4} textAnchor="middle" className="text-[8px] fill-slate-400 font-bold">Day {daysInMonth}</text>
            </svg>
          </div>
        </div>

        {/* Graph 2: Challans Volume bar chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-[340px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Challan Volume (Daily Count)</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Total number of challans generated per day this month.</p>
            </div>
            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              {challanData.reduce((acc, curr) => acc + curr.count, 0)} Challans
            </span>
          </div>

          <div className="flex-1 min-h-0 w-full relative">
            <svg viewBox={`0 0 ${chChartWidth} ${chChartHeight}`} className="w-full h-full">
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = chPaddingY + ratio * (chChartHeight - chPaddingY * 2);
                return (
                  <line 
                    key={idx} 
                    x1={chPaddingX} 
                    y1={y} 
                    x2={chChartWidth - chPaddingX} 
                    y2={y} 
                    stroke="#e2e8f0" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                );
              })}

              {/* Render bars */}
              {challanData.map((d, idx) => {
                const x = chPaddingX + idx * (totalBarWidth / daysInMonth);
                const barHeight = (d.count / maxChallans) * (chChartHeight - chPaddingY * 2);
                const y = (chChartHeight - chPaddingY) - barHeight;

                return (
                  <g key={idx} className="group/bar cursor-pointer">
                    <rect 
                      x={x + barGap/2} 
                      y={y} 
                      width={singleBarWidth} 
                      height={Math.max(barHeight, 1.5)} 
                      rx="2"
                      fill={d.count > 0 ? "#475569" : "#e2e8f0"} 
                      className="transition-all hover:fill-slate-800"
                    />
                    <title>{`Day ${d.day}: ${d.count} Challans`}</title>
                  </g>
                );
              })}

              {/* Y Axis labels */}
              <text x={chPaddingX - 5} y={chPaddingY + 4} textAnchor="end" className="text-[8px] fill-slate-400 font-bold">{maxChallans}</text>
              <text x={chPaddingX - 5} y={chChartHeight / 2 + 4} textAnchor="end" className="text-[8px] fill-slate-400 font-bold">{Math.round(maxChallans / 2)}</text>
              <text x={chPaddingX - 5} y={chChartHeight - chPaddingY + 4} textAnchor="end" className="text-[8px] fill-slate-400 font-bold">0</text>

              {/* X Axis labels */}
              <text x={chPaddingX} y={chChartHeight - 4} textAnchor="middle" className="text-[8px] fill-slate-400 font-bold">Day 1</text>
              <text x={chChartWidth / 2} y={chChartHeight - 4} textAnchor="middle" className="text-[8px] fill-slate-400 font-bold">Day {Math.floor(daysInMonth / 2)}</text>
              <text x={chChartWidth - chPaddingX} y={chChartHeight - 4} textAnchor="middle" className="text-[8px] fill-slate-400 font-bold">Day {daysInMonth}</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Lists Section - Restructured for sleek look */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Pending actions list (critical business flow) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Pending Verification</h3>
            <span className="text-[10px] font-black bg-[#ea3838]/10 text-[#ea3838] px-2 py-0.5 rounded-full uppercase">
              {holdChalans.length} Action Needed
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {holdChalans.map(c => (
              <div 
                key={c.id} 
                onClick={() => handleViewDetails(c, 'chalan')} 
                className="bg-white p-5 rounded-2xl border border-slate-200/70 hover-scale hover:shadow-md hover:border-[#ea3838]/20 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${checkIsTransfer(c.is_in_house) ? 'bg-slate-100 text-slate-700 border border-blue-100' : 'bg-[#ea3838]/5 text-[#ea3838] border border-[#ea3838]/10'}`}>
                    {checkIsTransfer(c.is_in_house) ? 'Transfer' : 'Sales'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <h4 className="font-black text-slate-800 text-base">{c.chalan_no}</h4>
                <p className="text-xs font-semibold text-slate-500 mt-1 truncate">
                  {checkIsTransfer(c.is_in_house) ? `${c.house} ➔ ${c.transfer_to}` : (c.customer_name || c.customers?.name || 'Walk-in')}
                </p>
                <div className="mt-4 flex justify-between items-center pt-2 border-t border-slate-50">
                  <span className="text-base font-black text-slate-800">{c.total_amount.toLocaleString()} ৳</span>
                  <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-[#ea3838]/5 group-hover:text-[#ea3838] flex items-center justify-center transition-colors text-slate-400 text-xs font-bold">
                    →
                  </div>
                </div>
              </div>
            ))}
            {holdChalans.length === 0 && (
              <div className="bg-white border border-dashed border-slate-200 p-8 rounded-2xl text-center text-slate-400 font-semibold italic text-xs">
                No pending challans or actions.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Split Logs (Recent Chalans & Recent Bills) */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Monthly Challan Log */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-[540px]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Monthly Challan Log</h3>
              <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                {todayChalans.length} Chalans
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {todayChalans.map(tc => (
                <div 
                  key={tc.id} 
                  onClick={() => handleViewDetails(tc, 'chalan')} 
                  className="p-3.5 rounded-xl border border-slate-100 bg-[#fafbfe] hover:bg-[#ea3838]/5 hover:border-[#ea3838]/10 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-black text-slate-850 text-xs">{tc.chalan_no}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate max-w-[150px]">
                      {checkIsTransfer(tc.is_in_house) ? `${tc.house} ➔ ${tc.transfer_to}` : (tc.customer_name || tc.customers?.name || 'Walk-in')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-slate-800">{tc.total_amount.toLocaleString()} ৳</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                      tc.status === 'paid' ? 'bg-green-50 text-green-600 border border-green-100' : 
                      tc.status === 'cancelled' ? 'bg-red-50 text-red-600 border border-red-100' : 
                      'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {tc.status}
                    </span>
                  </div>
                </div>
              ))}
              {todayChalans.length === 0 && (
                <div className="text-center py-16 text-slate-400 font-bold italic text-xs">
                  No challans created this month.
                </div>
              )}
            </div>
          </div>

          {/* Monthly Bill Log */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-[540px]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Monthly Bill Log</h3>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                {todayBills.length} Bills
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {todayBills.map(tb => (
                <div 
                  key={tb.id} 
                  onClick={() => handleViewDetails(tb, 'bill')} 
                  className="p-3.5 rounded-xl border border-slate-100 bg-[#fafbfe] hover:bg-green-50/20 hover:border-green-150 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-black text-slate-855 text-xs">#{tb.bill_no || 'N/A'}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate max-w-[150px]">
                      {tb.customer_name || tb.customers?.name || 'Walk-in'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-slate-800">{tb.total_amount.toLocaleString()} ৳</span>
                    <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">
                      {tb.payment_method}
                    </span>
                  </div>
                </div>
              ))}
              {todayBills.length === 0 && (
                <div className="text-center py-16 text-slate-400 font-bold italic text-xs">
                  No bills issued this month.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Low Stock Button */}
      <div className="flex justify-start pt-2">
        <button 
          onClick={handleOpenLowStockWindow}
          className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          ⚠️ Low Stock Alert ({lowStockProducts.length})
        </button>
      </div>

      {/* Action and details modal - styled in violet MatDash theme */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="p-6 bg-slate-50/65 border-b border-slate-100 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-[#ea3838] uppercase tracking-widest">{modalType} DETAILS</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{selectedItem.bill_no || selectedItem.chalan_no || selectedItem.name}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1.5">
                  {modalType === 'product' ? `Model: ${selectedItem.model}` : (checkIsTransfer(selectedItem.is_in_house) ? `Transfer: ${selectedItem.house} ➔ ${selectedItem.transfer_to}` : `Customer: ${selectedItem.customer_name || selectedItem.customers?.name || 'Walk-in'}`)}
                </p>
              </div>
              <div className="flex gap-2">
                {modalType !== 'product' && (
                  <>
                    <button onClick={handlePrint} className="w-9 h-9 bg-white border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center justify-center" title="Print">🖨️</button>
                    <button onClick={handleDownload} className="w-9 h-9 bg-white border border-slate-200 rounded-xl hover:bg-[#ea3838] hover:text-white transition-all shadow-sm flex items-center justify-center" title="Download PDF">📥</button>
                  </>
                )}
                <button onClick={() => setSelectedItem(null)} className="w-9 h-9 bg-white border border-slate-200 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold flex items-center justify-center">✕</button>
              </div>
            </div>

            <div className="p-6 max-h-[45vh] overflow-y-auto custom-scrollbar">
              {modalType === 'product' ? (
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div className="bg-slate-50/60 p-6 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">In Stock</p>
                    <p className="text-3xl font-black text-slate-800">{selectedItem.stock_quantity}</p>
                  </div>
                  <div className="bg-slate-50/60 p-6 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Price</p>
                    <p className="text-3xl font-black text-slate-800">{selectedItem.unit_price} ৳</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">
                      <th className="pb-3">Product Name</th>
                      <th className="pb-3 text-center">Quantity</th>
                      <th className="pb-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalItems.map((itm, i) => (
                      <tr key={i} className="group">
                        <td className="py-3 font-semibold text-slate-700 text-xs">
                          {itm.products?.name} 
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-bold uppercase">{itm.products?.model}</span>
                        </td>
                        <td className="py-3 text-center font-black text-xs">{itm.quantity}</td>
                        <td className="py-3 text-right font-black text-slate-800 text-xs">{itm.total_price.toLocaleString()} ৳</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 bg-slate-50/65 border-t border-slate-100">
               {selectedItem.status === 'hold' ? (
                 <div className="space-y-4">
                    {checkIsTransfer(selectedItem.is_in_house) ? (
                      <button 
                        onClick={() => handleAction('transfer')} 
                        disabled={processing} 
                        className="w-full bg-[#ea3838] hover:bg-red-600 text-white py-4 rounded-xl font-black text-sm shadow-md active:scale-95 uppercase tracking-wider transition-colors"
                      >
                        {processing ? 'Processing Transfer...' : 'Confirm Stock Transfer'}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="ম্যানুয়াল বিল নাম্বার (ফাঁকা রাখলে অটো-জেনারেটেড হবে)" 
                          value={billNo} 
                          onChange={(e) => setBillNo(e.target.value)} 
                          className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#ea3838] focus:ring-2 focus:ring-[#ea3838]/10 shadow-sm" 
                        />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <select 
                            value={paymentMethod} 
                            onChange={(e) => setPaymentMethod(e.target.value)} 
                            className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#ea3838] focus:ring-2 focus:ring-[#ea3838]/10 shadow-sm"
                          >
                            <option value="">Select Payment Method...</option>
                            <option value="Cash">Cash (💵)</option>
                            <option value="bKash">bKash (📱)</option>
                            <option value="Bank">Bank (🏦)</option>
                          </select>
                          <button 
                            onClick={() => handleAction('payment')} 
                            disabled={processing || !paymentMethod} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-black text-xs shadow-md whitespace-nowrap active:scale-95 transition-colors disabled:bg-slate-200 disabled:text-slate-400"
                          >
                            {processing ? 'Processing...' : 'Receive Payment & Issue Bill'}
                          </button>
                        </div>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaction Status</p>
                      <p className="text-sm font-black text-slate-750 mt-0.5 uppercase">
                        {selectedItem.status} via {selectedItem.payment_method || 'System'}
                      </p>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">{selectedItem.total_amount.toLocaleString()} ৳</p>
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