import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';

const BrokenManager = () => {
  const [brokenList, setBrokenList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [warehouse, setWarehouse] = useState('Head Office'); // 'Head Office' or 'Nawabpur'
  const [panelName, setPanelName] = useState('');
  const [watt, setWatt] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deductFromStock, setDeductFromStock] = useState(true); // Option to add without removing from stock

  // Searchable dropdown states
  const [productSearchText, setProductSearchText] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Group Details Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    fetchBrokenList();
    fetchSolarPanels();
  }, []);

  useEffect(() => {
    const brokenChannel = supabase
      .channel('broken-manager-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Broken' },
        () => {
          fetchBrokenList();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchSolarPanels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(brokenChannel);
    };
  }, []);

  // Whenever warehouse changes, reset the selected product and search text
  useEffect(() => {
    setSelectedProduct(null);
    setProductSearchText('');
    setPanelName('');
    setWatt('');
  }, [warehouse]);

  const fetchBrokenList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Broken')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrokenList(data || []);
    } catch (error) {
      console.error('Error fetching broken list:', error);
      Swal.fire('এরর!', 'ব্রোকেন লিস্ট লোড করতে সমস্যা হয়েছে: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSolarPanels = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Solar Panel');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching solar panels:', error);
    }
  };

  const getDbHouse = (wh) => {
    return wh === 'Head Office' ? 'Head Office' : 'Showroom';
  };

  const filteredProducts = products.filter(p => {
    const targetHouse = getDbHouse(warehouse);
    const matchesHouse = p.house === targetHouse;
    const matchesSearch = `${p.name} ${p.model}`.toLowerCase().includes(productSearchText.toLowerCase());
    return matchesHouse && matchesSearch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalPanelName = selectedProduct ? selectedProduct.name : panelName.trim();
    const finalWatt = selectedProduct ? selectedProduct.model : watt.trim();
    const qtyInt = parseInt(quantity);

    if (!finalPanelName) {
      return Swal.fire('সতর্কতা', 'প্যানেলের নাম লিখুন বা স্টক থেকে সিলেক্ট করুন!', 'warning');
    }
    if (!finalWatt) {
      return Swal.fire('সতর্কতা', 'প্যানেল ওয়াট লিখুন বা স্টক থেকে সিলেক্ট করুন!', 'warning');
    }
    if (isNaN(qtyInt) || qtyInt <= 0) {
      return Swal.fire('সতর্কতা', 'সঠিক সংখ্যা (ইউনিট) দিন!', 'warning');
    }

    setIsSubmitting(true);

    try {
      const targetHouse = getDbHouse(warehouse);
      let matchedProduct = selectedProduct;

      // Handle stock deduction validation if checkbox is enabled
      if (deductFromStock) {
        if (!matchedProduct) {
          const { data: matchedProds, error: matchError } = await supabase
            .from('products')
            .select('*')
            .eq('category', 'Solar Panel')
            .eq('house', targetHouse)
            .ilike('name', finalPanelName)
            .ilike('model', finalWatt);

          if (matchError) throw matchError;
          if (matchedProds && matchedProds.length > 0) {
            matchedProduct = matchedProds[0];
          }
        }

        if (!matchedProduct) {
          throw new Error(`সিলেক্টেড হাউজে "${finalPanelName} - ${finalWatt}" নামের কোনো সোলার প্যানেল স্টক টেবিলে খুঁজে পাওয়া যায়নি। স্টক থেকে বাদ দেওয়ার জন্য সঠিক প্রোডাক্ট সিলেক্ট করুন বা "কমানো হবে স্টক থেকে" অপশনটি বন্ধ করুন।`);
        }

        if (matchedProduct.stock_quantity < qtyInt) {
          throw new Error(`পর্যাপ্ত স্টক নেই! বর্তমান স্টক: ${matchedProduct.stock_quantity} পিস।`);
        }

        // Deduct from stock
        const newStock = matchedProduct.stock_quantity - qtyInt;
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', matchedProduct.id);

        if (updateError) throw updateError;

        // Log in stock_out log table
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('stock_out').insert([
          {
            type: matchedProduct.name,
            model: matchedProduct.model,
            amount: qtyInt.toString(),
            reason: `Broken Panel - Added to Broken List (From: ${warehouse})`,
            date: today
          }
        ]);
      }

      // Add to Broken table
      const { error: insertError } = await supabase
        .from('Broken')
        .insert([
          {
            panel: finalPanelName,
            watt: finalWatt,
            unit: qtyInt.toString(),
            from: warehouse
          }
        ]);

      if (insertError) {
        // Rollback stock deduction in case of db insertion failure
        if (deductFromStock && matchedProduct) {
          await supabase
            .from('products')
            .update({ stock_quantity: matchedProduct.stock_quantity })
            .eq('id', matchedProduct.id);
        }
        throw insertError;
      }

      await Swal.fire('সফল!', deductFromStock 
        ? 'ব্রোকেন প্যানেল সফলভাবে যুক্ত করা হয়েছে এবং স্টক থেকে বাদ দেওয়া হয়েছে।' 
        : 'ব্রোকেন প্যানেল সফলভাবে স্টক পরিবর্তন ছাড়া তালিকায় যুক্ত করা হয়েছে।', 'success');

      // Reset form
      setPanelName('');
      setWatt('');
      setQuantity('');
      setProductSearchText('');
      setSelectedProduct(null);

      // Refresh data
      fetchBrokenList();
      fetchSolarPanels();
    } catch (err) {
      console.error(err);
      Swal.fire('ত্রুটি!', err.message || 'ডাটাবেজে সেভ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete/Restore single record inside group list
  const handleItemDelete = async (brokenItem, shouldRestoreStock) => {
    try {
      if (shouldRestoreStock) {
        const targetHouse = getDbHouse(brokenItem.from);
        const qtyInt = parseInt(brokenItem.unit);

        const { data: matchedProds, error: matchError } = await supabase
          .from('products')
          .select('*')
          .eq('category', 'Solar Panel')
          .eq('house', targetHouse)
          .ilike('name', brokenItem.panel)
          .ilike('model', brokenItem.watt);

        if (matchError) throw matchError;

        if (matchedProds && matchedProds.length > 0) {
          const product = matchedProds[0];
          const newStock = product.stock_quantity + qtyInt;
          const { error: updateError } = await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', product.id);

          if (updateError) throw updateError;

          // Add entry to ledger table for logging restoration
          const today = new Date().toISOString().split('T')[0];
          await supabase.from('ledger').insert([
            {
              product: `${brokenItem.panel} - ${brokenItem.watt}`,
              quantity: qtyInt,
              source: `Restored from Broken List (To: ${brokenItem.from})`,
              date: today,
              in: new Date().toISOString()
            }
          ]);
        }
      }

      // Delete from Broken table
      const { error: deleteError } = await supabase
        .from('Broken')
        .delete()
        .eq('id', brokenItem.id);

      if (deleteError) throw deleteError;

      // Update state for currently open modal group if open
      if (selectedGroup) {
        const updatedItems = selectedGroup.items.filter(i => i.id !== brokenItem.id);
        if (updatedItems.length === 0) {
          setSelectedGroup(null);
        } else {
          setSelectedGroup({
            ...selectedGroup,
            totalQty: selectedGroup.totalQty - parseInt(brokenItem.unit),
            items: updatedItems
          });
        }
      }

      Swal.fire('সফল!', 'ব্রোকেন রেকর্ডটি সফলভাবে ডিলিট করা হয়েছে।', 'success');
      fetchBrokenList();
      fetchSolarPanels();
    } catch (err) {
      console.error(err);
      Swal.fire('ত্রুটি!', 'ডিলিট করতে সমস্যা হয়েছে: ' + err.message, 'error');
    }
  };

  const showRestoreDialog = (item) => {
    Swal.fire({
      title: 'ব্রোকেন প্যানেল রেকর্ড অ্যাকশন',
      text: `আপনি কি করতে চান? (${item.panel} - ${item.watt}, পরিমাণ: ${item.unit} পিস)`,
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'স্টক পুনরুদ্ধার ও ডিলিট ↩️',
      denyButtonText: 'শুধু ডিলিট (স্টক অপরিবর্তিত) ❌',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
        handleItemDelete(item, true);
      } else if (result.isDenied) {
        handleItemDelete(item, false);
      }
    });
  };

  // Group brokenList by panel and watt
  const getAggregatedBrokenList = () => {
    const map = {};
    const list = brokenList.filter(item => 
      item.panel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.watt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    list.forEach(item => {
      const key = `${item.panel.trim()} - ${item.watt.trim()}`.toLowerCase();
      if (!map[key]) {
        map[key] = {
          panel: item.panel.trim(),
          watt: item.watt.trim(),
          totalQty: 0,
          items: []
        };
      }
      map[key].totalQty += (parseInt(item.unit) || 0);
      map[key].items.push(item);
    });

    return Object.values(map);
  };

  const aggregatedList = getAggregatedBrokenList();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 px-2 md:px-0" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            💔 ব্রোকেন প্যানেলের তালিকা (Broken List)
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Track and manage broken solar panel counts by model
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Add Broken Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800">➕ ব্রোকেন প্যানেল রিপোর্ট করুন</h3>
            <p className="text-xs text-slate-400 font-bold">ব্রোকেন প্যানেল ডাটা এন্ট্রি করুন</p>
          </div>

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#ea3838] uppercase tracking-widest block">১. ওয়্যারহাউজ সিলেক্ট করুন</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setWarehouse('Head Office')}
                className={`p-3.5 rounded-2xl font-black text-xs border-2 transition-all flex items-center justify-center gap-2 ${
                  warehouse === 'Head Office' 
                    ? 'border-[#ea3838] bg-[#ea3838]/5 text-[#ea3838]' 
                    : 'border-slate-105 text-slate-400 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                🏢 Head Office
              </button>
              <button 
                type="button"
                onClick={() => setWarehouse('Nawabpur')}
                className={`p-3.5 rounded-2xl font-black text-xs border-2 transition-all flex items-center justify-center gap-2 ${
                  warehouse === 'Nawabpur' 
                    ? 'border-[#ea3838] bg-[#ea3838]/5 text-[#ea3838]' 
                    : 'border-slate-105 text-slate-400 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                🏪 Nawabpur
              </button>
            </div>
          </div>

          {/* Searchable Dropdown from Stock */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">২. স্টক থেকে প্যানেল সিলেক্ট করুন</label>
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="সার্চ করুন (উদা: LONGi, Jinko)..."
                value={productSearchText}
                onChange={(e) => {
                  setProductSearchText(e.target.value);
                  setShowProductDropdown(true);
                  setSelectedProduct(null);
                  setPanelName(e.target.value);
                }}
                onFocus={() => setShowProductDropdown(true)}
                onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#ea3838]/20 transition-all text-sm text-slate-800"
              />
              {showProductDropdown && (
                <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredProducts.length > 0 ? filteredProducts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => {
                        setSelectedProduct(p);
                        setProductSearchText(`${p.name} - ${p.model}`);
                        setPanelName(p.name);
                        setWatt(p.model);
                        setShowProductDropdown(false);
                      }}
                      className="p-3 border-b border-slate-50 hover:bg-slate-100 cursor-pointer font-bold text-xs text-slate-700 flex justify-between items-center"
                    >
                      <span>☀️ {p.name} - {p.model}</span>
                      <span className="bg-red-50 text-[#ea3838] px-2 py-0.5 rounded text-[10px]">স্টক: {p.stock_quantity} Pcs</span>
                    </div>
                  )) : (
                    <div className="p-4 text-center text-slate-400 text-xs font-bold">কোনো প্যানেল পাওয়া যায়নি</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 my-4 pt-4 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">বা ম্যানুয়ালি ইনপুট দিন</p>

            {/* Panel Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">প্যানেলের নাম (Panel Name / Brand)</label>
              <input 
                type="text" 
                placeholder="যেমন: Jinko, LONGi, JA Solar"
                value={panelName}
                onChange={e => {
                  setPanelName(e.target.value);
                  if (selectedProduct && e.target.value !== selectedProduct.name) {
                    setSelectedProduct(null);
                  }
                }}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#ea3838]/20 transition-all text-sm text-slate-800"
              />
            </div>

            {/* Watt */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">ওয়াট (Watt)</label>
              <input 
                type="text" 
                placeholder="যেমন: 585W, 550W, 300W Mono"
                value={watt}
                onChange={e => {
                  setWatt(e.target.value);
                  if (selectedProduct && e.target.value !== selectedProduct.model) {
                    setSelectedProduct(null);
                  }
                }}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#ea3838]/20 transition-all text-sm text-slate-800"
              />
            </div>
          </div>

          {/* Unit / Quantity */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">৩. ব্রোকেন পরিমাণ (Unit / Quantity)</label>
            <input 
              type="number" 
              placeholder="পিস লিখুন (যেমন: 5)"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-[#ea3838]/20 transition-all text-slate-800"
              required
            />
          </div>

          {/* Deduct Stock Option Checkbox */}
          <div className="flex items-center gap-2.5 pt-2">
            <input 
              type="checkbox" 
              id="deductStockOpt"
              checked={deductFromStock}
              onChange={(e) => setDeductFromStock(e.target.checked)}
              className="w-4 h-4 text-[#ea3838] border-slate-300 rounded focus:ring-[#ea3838]/20 cursor-pointer"
            />
            <label htmlFor="deductStockOpt" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
              কমানো হবে স্টক থেকে (Deduct from main stock)
            </label>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 bg-slate-900 hover:bg-[#ea3838] text-white rounded-2xl font-black transition-all shadow-lg active:scale-95 text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'ব্রোকেন লিস্টে যোগ করুন 🚨'}
          </button>
        </form>

        {/* Right: Aggregated Broken History List */}
        <div className="lg:col-span-8 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 flex flex-col min-h-[500px]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">📋 ব্রোকেন প্যানেলের মডেল ভিত্তিক সারসংক্ষেপ</h3>
              <p className="text-xs text-slate-400 font-bold">প্রতিটি মডেলের মোট ব্রোকেন প্যানেলের হিসাব</p>
            </div>
            
            {/* Search Input */}
            <input 
              type="text" 
              placeholder="🔍 মডেল সার্চ করুন..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-xs w-full md:w-64" 
            />
          </div>

          <div className="flex-1 overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr className="text-[10px] uppercase font-black text-slate-400">
                  <th className="p-4">প্যানেল ও মডেল (Model Info)</th>
                  <th className="p-4 text-center">মোট ব্রোকেন পরিমাণ (Total Qty)</th>
                  <th className="p-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="p-16 text-center text-slate-400 italic">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-[#ea3838] animate-spin"></div>
                        লোড হচ্ছে...
                      </div>
                    </td>
                  </tr>
                ) : aggregatedList.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-16 text-center text-slate-400 italic">
                      কোনো ব্রোকেন প্যানেল পাওয়া যায়নি
                    </td>
                  </tr>
                ) : aggregatedList.map((group, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm">{group.panel}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-extrabold mt-0.5">{group.watt}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-800 px-4 py-1.5 rounded-xl font-black text-xs">
                        {group.totalQty} Pcs
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedGroup(group)}
                        className="bg-[#ea3838]/5 hover:bg-[#ea3838]/10 text-[#ea3838] px-4 py-2 rounded-xl text-xs font-black transition-all"
                      >
                        বিস্তারিত ও অ্যাকশন ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Group Details Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black text-[#ea3838] uppercase tracking-widest">Model Breakdown Log</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedGroup.panel} - {selectedGroup.watt}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">সর্বমোট: {selectedGroup.totalQty} পিস ব্রোকেন</p>
              </div>
              <button 
                onClick={() => setSelectedGroup(null)} 
                className="w-9 h-9 bg-white border border-slate-200 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">
                    <th className="pb-3">তারিখ (Date)</th>
                    <th className="pb-3">কোথা থেকে (From)</th>
                    <th className="pb-3 text-center">পরিমাণ</th>
                    <th className="pb-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {selectedGroup.items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-3.5 text-slate-500">
                        {new Date(item.created_at).toLocaleDateString('bn-BD', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          item.from === 'Head Office' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {item.from}
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-black">{item.unit} Pcs</td>
                      <td className="py-3.5 text-right">
                        <button 
                          onClick={() => showRestoreDialog(item)}
                          className="bg-red-50 hover:bg-[#ea3838] hover:text-white text-[#ea3838] px-3 py-1.5 rounded-lg text-[10px] font-black transition-all"
                        >
                          রিস্টোর / ডিলিট ↩️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BrokenManager;
