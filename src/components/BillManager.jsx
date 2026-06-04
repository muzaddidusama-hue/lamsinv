import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';
import { downloadPDF } from '../utils/pdfGenerator';

const BillManager = () => {
  const date = new Date();
  const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' বা 'chalans'
  const [searchNo, setSearchNo] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // ভিউ এবং এডিট মডালের স্টেট
  const [viewRecord, setViewRecord] = useState(null);
  const [viewItems, setViewItems] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { 
    fetchAllRecords(); 
  }, [selectedMonth]); 

  // মাস অনুযায়ী সব ডাটা ফেচ করার লজিক
  const fetchAllRecords = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const firstDay = new Date(year, month - 1, 1).toISOString();
      const lastDay = new Date(year, month, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('chalans')
        .select(`
          *,
          customers(name, phone, address),
          chalan_items(quantity, products(name, model))
        `)
        .gte('created_at', firstDay)
        .lte('created_at', lastDay)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
    setLoading(false);
  };

  // সার্চ লজিক
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchNo.trim()) {
      fetchAllRecords();
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chalans')
        .select(`*, customers(name, phone, address), chalan_items(quantity, products(name, model))`)
        .or(`bill_no.ilike.%${searchNo.trim()}%,chalan_no.ilike.%${searchNo.trim()}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      alert("রেকর্ড খুঁজে পাওয়া যায়নি!");
    }
    setLoading(false);
  };

  // কাস্টমার ডাটা বের করার হেল্পার
  const getCustomerData = (record) => {
    if (!record) return { name: 'Walk-in', phone: '', address: '' };
    return {
      name: record.customer_name || record.customers?.name || (record.is_in_house ? 'Transfer' : 'Walk-in'),
      phone: record.phone || record.customers?.phone || '',
      address: record.address || record.customers?.address || ''
    };
  };

  // প্রোডাক্ট সামারি তৈরি করার হেল্পার
  const getProductSummary = (items) => {
    if (!items || items.length === 0) return 'No items';
    const summary = items.map(i => `${i.products?.name} (${i.quantity})`).join(', ');
    return summary.length > 40 ? summary.substring(0, 40) + '...' : summary;
  };

  // বিল/চালান প্রিন্ট ভিউ লোড করা
  const openViewModal = async (record) => {
    setViewRecord(record);
    try {
      const { data } = await supabase
        .from('chalan_items')
        .select(`*, products(*)`)
        .eq('chalan_id', record.id);
      setViewItems(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  // এডিট মডাল ওপেন করা
  const openEditModal = (record) => {
    setEditForm({
      id: record.id,
      chalan_no: record.chalan_no || '',
      bill_no: record.bill_no || '',
      status: record.status || 'hold',
      total_amount: record.total_amount || 0,
      payment_method: record.payment_method || '',
      created_at: record.created_at ? record.created_at.split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  // এডিট সেভ করার লজিক
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('chalans')
        .update({
          chalan_no: editForm.chalan_no,
          bill_no: editForm.bill_no,
          status: editForm.status,
          total_amount: editForm.total_amount,
          payment_method: editForm.payment_method,
          created_at: new Date(editForm.created_at).toISOString() 
        })
        .eq('id', editForm.id);

      if (error) throw error;
      
      alert('✅ আপডেট সফল হয়েছে!');
      setIsEditModalOpen(false);
      fetchAllRecords(); 
    } catch (error) {
      alert('আপডেট করতে সমস্যা হয়েছে!');
      console.error(error);
    }
    setSavingEdit(false);
  };

  const handleDownload = () => {
    const printItems = viewItems.map(item => ({ ...item.products, quantity: item.quantity, total_price: item.total_price, unit_price: item.unit_price }));
    downloadPDF(viewRecord, getCustomerData(viewRecord), printItems, activeTab === 'bills' ? 'Bill' : 'Challan');
  };

  // 🔴 রেকর্ডগুলোকে দুই ভাগে ভাগ করা (পেন্ডিং লজিক সরানো হয়েছে)
  const bills = records.filter(r => r.status === 'paid' || r.bill_no);
  const chalans = records.filter(r => r.chalan_no); // জেনারেট হওয়া সকল চালান
  const displayRecords = activeTab === 'bills' ? bills : chalans;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 p-4" style={{ fontFamily: "'Hind Siliguri', 'Inter', sans-serif" }}>
      
      {/* 🔍 টপ বার ও সার্চ (Month Filter সহ) */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">📋 বিল ও চালানের তালিকা</h2>
          <p className="text-xs font-bold text-slate-400">নির্দিষ্ট মাসের রেকর্ড ফিল্টার করে দেখুন</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
            className="h-12 px-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-black outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <input 
              type="text" 
              value={searchNo} 
              onChange={(e) => setSearchNo(e.target.value)} 
              placeholder="সার্চ নাম্বার..." 
              className="w-full md:w-48 h-12 px-4 bg-slate-50 border rounded-xl font-bold text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-500" 
            />
            <button type="submit" className="h-12 px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors">সার্চ</button>
          </form>
        </div>
      </div>

      {/* 🔴 ট্যাব সিলেকশন (২টা আলাদা সেকশন) */}
      <div className="flex gap-4">
        <button 
          onClick={() => setActiveTab('bills')} 
          className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'bills' ? 'bg-green-600 text-white shadow-lg shadow-green-600/30' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
        >
          🧾 বিলের তালিকা <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{bills.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('chalans')} 
          className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'chalans' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
        >
          📦 চালানের তালিকা <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{chalans.length}</span>
        </button>
      </div>

      {/* 📋 মেইন ডাটা টেবিল (List View) */}
      <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="overflow-x-auto custom-scrollbar min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`border-b text-[10px] font-black tracking-wider uppercase ${activeTab === 'bills' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
              <tr>
                <th className="p-4 pl-6">তারিখ</th>
                <th className="p-4">{activeTab === 'bills' ? 'বিল নাম্বার' : 'চালান নাম্বার'}</th>
                <th className="p-4">কাস্টমার</th>
                <th className="p-4 w-1/3">প্রোডাক্ট বিবরণ</th>
                <th className="p-4 text-right">মোট টাকা</th>
                <th className="p-4 text-center pr-6">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold animate-pulse">ডাটা লোড হচ্ছে...</td></tr>
              ) : displayRecords.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold italic">এই মাসে কোনো {activeTab === 'bills' ? 'বিল' : 'চালান'} পাওয়া যায়নি</td></tr>
              ) : (
                displayRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 pl-6 text-xs font-bold text-slate-500">
                      {new Date(record.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-4 font-black text-slate-900">
                      {activeTab === 'bills' ? record.bill_no : record.chalan_no}
                      {activeTab === 'bills' && record.chalan_no && <span className="block text-[9px] text-slate-400 font-normal uppercase mt-0.5">Ref: {record.chalan_no}</span>}
                    </td>
                    <td className="p-4 font-bold">
                      {getCustomerData(record).name}
                    </td>
                    <td className="p-4 text-xs text-slate-500 truncate max-w-[200px]" title={getProductSummary(record.chalan_items)}>
                      {getProductSummary(record.chalan_items)}
                    </td>
                    <td className="p-4 text-right font-black text-slate-900">
                      {record.total_amount} ৳
                    </td>
                    <td className="p-4 text-center pr-6 space-x-2">
                      <button onClick={() => openViewModal(record)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors">
                        ভিউ
                      </button>
                      <button onClick={() => openEditModal(record)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-900 hover:text-white transition-colors">
                        এডিট
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✏️ এডিট মডাল (Invoice Metadata Edit) */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-lg font-black text-slate-800">রেকর্ড এডিট করুন</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">তারিখ (Date)</label>
                <input type="date" value={editForm.created_at} onChange={e => setEditForm({...editForm, created_at: e.target.value})} className="w-full p-3 border rounded-xl font-bold bg-slate-50" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">চালান নাম্বার</label>
                  <input type="text" value={editForm.chalan_no} onChange={e => setEditForm({...editForm, chalan_no: e.target.value})} className="w-full p-3 border rounded-xl font-bold bg-slate-50 uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">বিল নাম্বার</label>
                  <input type="text" value={editForm.bill_no} onChange={e => setEditForm({...editForm, bill_no: e.target.value})} className="w-full p-3 border rounded-xl font-bold bg-slate-50 uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">স্ট্যাটাস</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-3 border rounded-xl font-bold bg-slate-50">
                    <option value="hold">Hold (Chalan)</option>
                    <option value="paid">Paid (Bill)</option>
                    <option value="completed">Completed (Transfer)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">পেমেন্ট মেথড</label>
                  <select value={editForm.payment_method} onChange={e => setEditForm({...editForm, payment_method: e.target.value})} className="w-full p-3 border rounded-xl font-bold bg-slate-50">
                    <option value="">N/A</option>
                    <option value="Cash">Cash</option>
                    <option value="bKash">bKash</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">মোট টাকা (Total Amount)</label>
                <input type="number" value={editForm.total_amount} onChange={e => setEditForm({...editForm, total_amount: e.target.value})} className="w-full p-3 border rounded-xl font-black bg-slate-50 text-blue-600" required />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 p-4 rounded-xl font-bold bg-slate-100 text-slate-600">ক্যান্সেল</button>
                <button type="submit" disabled={savingEdit} className="flex-1 p-4 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-50">
                  {savingEdit ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖨️ ভিউ ও প্রিন্ট মডাল */}
      {viewRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-2xl animate-in zoom-in-95 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6 gap-4">
              <div>
                <span className={`text-[10px] font-black px-3 py-1 rounded-md uppercase ${activeTab === 'bills' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {activeTab === 'bills' ? 'BILL DOCUMENT' : 'CHALAN DOCUMENT'}
                </span>
                <h2 className="text-2xl font-black text-slate-900 uppercase mt-2">NO: {activeTab === 'bills' ? viewRecord.bill_no : viewRecord.chalan_no}</h2>
                {activeTab === 'bills' && viewRecord.chalan_no && <p className="text-sm font-bold text-slate-400">Ref Challan: {viewRecord.chalan_no}</p>}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const pItems = viewItems.map(i => ({...i.products, quantity: i.quantity, total_price: i.total_price, unit_price: i.unit_price}));
                    activeTab === 'bills' ? printBill(viewRecord, getCustomerData(viewRecord), pItems) : printChallan(viewRecord, getCustomerData(viewRecord), pItems);
                  }} 
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
                >
                  🖨️ প্রিন্ট
                </button>
                <button onClick={handleDownload} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">📥 PDF</button>
                <button onClick={() => setViewRecord(null)} className="w-12 h-12 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white font-black flex items-center justify-center transition-colors">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Customer Info</p>
                  <p className="font-bold text-slate-800 text-lg">{getCustomerData(viewRecord).name}</p>
                  <p className="text-sm text-slate-400 italic">📍 {getCustomerData(viewRecord).address || 'No Address'}</p>
                </div>
                <div className="md:text-right">
                  {viewRecord.status === 'paid' && (
                    <>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Paid Via</p>
                      <p className="font-bold text-slate-800 text-lg">{viewRecord.payment_method || 'N/A'}</p>
                    </>
                  )}
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-3 mb-1">Date</p>
                  <p className="font-bold text-slate-600">{new Date(viewRecord.created_at).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
              <table className="w-full text-left mb-6">
                <thead className="text-[10px] uppercase font-black text-slate-400 border-b">
                  <tr><th className="pb-4">Product Details</th><th className="pb-4 text-center">Qty</th><th className="pb-4 text-right">Price</th><th className="pb-4 text-right pr-0">Total</th></tr>
                </thead>
                <tbody>
                  {viewItems.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-4 font-bold">{item.products?.name} <br/><span className="text-xs text-slate-400">{item.products?.model}</span></td>
                      <td className="text-center font-black">{item.quantity}</td>
                      <td className="text-right font-medium">{item.unit_price} ৳</td>
                      <td className="text-right font-black pr-0">{item.total_price} ৳</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan="3" className="pt-6 text-right font-black text-slate-400 uppercase">Grand Total</td><td className="pt-6 text-right text-3xl font-black text-blue-600 pr-0">{viewRecord.total_amount} ৳</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillManager;