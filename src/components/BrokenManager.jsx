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

  // Searchable dropdown states
  const [productSearchText, setProductSearchText] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchBrokenList();
    fetchSolarPanels();
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
      // Fetch all products in the "Solar Panel" category
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

  // Map user-facing warehouse label to products database 'house' column
  const getDbHouse = (wh) => {
    return wh === 'Head Office' ? 'Head Office' : 'Showroom';
  };

  // Filter solar panels based on selected warehouse and search text
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

      // If they typed manually, try to find a matching product in the database first
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
          // Found exact matching product
          matchedProduct = matchedProds[0];
        }
      }

      if (!matchedProduct) {
        throw new Error(`সিলেক্টেড হাউজে "${finalPanelName} - ${finalWatt}" নামের কোনো সোলার প্যানেল খুঁজে পাওয়া যায়নি। স্টক থেকে সঠিক প্রোডাক্ট সিলেক্ট করুন।`);
      }

      // Check current stock
      if (matchedProduct.stock_quantity < qtyInt) {
        throw new Error(`পর্যাপ্ত স্টক নেই! বর্তমান স্টক: ${matchedProduct.stock_quantity} পিস।`);
      }

      // 1. Subtract from stock
      const newStock = matchedProduct.stock_quantity - qtyInt;
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', matchedProduct.id);

      if (updateError) throw updateError;

      // 2. Add entry to stock_out table for logging
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

      // 3. Add to Broken table
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
        // Rollback stock reduction in case of error
        await supabase
          .from('products')
          .update({ stock_quantity: matchedProduct.stock_quantity })
          .eq('id', matchedProduct.id);
        throw insertError;
      }

      await Swal.fire('সফল!', 'ব্রোকেন প্যানেল সফলভাবে যুক্ত করা হয়েছে এবং স্টক থেকে রিমুভ করা হয়েছে।', 'success');

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

  // Restore/Delete Broken Entry handler (Rolls back the stock)
  const handleRestore = async (brokenItem) => {
    const confirmRestore = await Swal.fire({
      title: 'আপনি কি নিশ্চিত?',
      text: `এই ব্রোকেন এন্ট্রিটি ডিলিট করে ${brokenItem.unit} পিস প্যানেল আবার "${brokenItem.from}" এর স্টকে ফিরিয়ে নিতে চান?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'হ্যাঁ, ফিরিয়ে নিন!',
      cancelButtonText: 'বাতিল'
    });

    if (!confirmRestore.isConfirmed) return;

    try {
      const targetHouse = getDbHouse(brokenItem.from);
      const qtyInt = parseInt(brokenItem.unit);

      // Find the product in products table to restore stock
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
        // 1. Add back to stock
        const newStock = product.stock_quantity + qtyInt;
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', product.id);

        if (updateError) throw updateError;
      } else {
        // If product was deleted, maybe warn the user, but proceed to delete the broken entry anyway
        console.warn('Product not found in stock to restore, deleting broken record directly.');
      }

      // 2. Delete from Broken table
      const { error: deleteError } = await supabase
        .from('Broken')
        .delete()
        .eq('id', brokenItem.id);

      if (deleteError) throw deleteError;

      Swal.fire('সফল!', 'ব্রোকেন এন্ট্রিটি ডিলিট হয়েছে এবং স্টক পুনরুদ্ধার করা হয়েছে।', 'success');
      fetchBrokenList();
      fetchSolarPanels();
    } catch (err) {
      console.error(err);
      Swal.fire('ত্রুটি!', 'পুনরুদ্ধার করতে সমস্যা হয়েছে: ' + err.message, 'error');
    }
  };

  const filteredBrokenList = brokenList.filter(item => 
    item.panel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.watt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.from.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 px-2 md:px-0" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            💔 ব্রোকেন প্যানেল ম্যানেজমেন্ট (Broken List)
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Remove from stock and track broken panels
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* left: Add Broken Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800">➕ ব্রোকেন প্যানেল রিপোর্ট করুন</h3>
            <p className="text-xs text-slate-400 font-bold">স্টক থেকে বাদ দিয়ে ব্রোকেন লিস্টে যুক্ত করুন</p>
          </div>

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest block">১. ওয়্যারহাউজ সিলেক্ট করুন</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setWarehouse('Head Office')}
                className={`p-3.5 rounded-2xl font-black text-xs border-2 transition-all flex items-center justify-center gap-2 ${
                  warehouse === 'Head Office' 
                    ? 'border-orange-500 bg-orange-50/70 text-orange-600' 
                    : 'border-slate-100 text-slate-400 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                🏢 Head Office
              </button>
              <button 
                type="button"
                onClick={() => setWarehouse('Nawabpur')}
                className={`p-3.5 rounded-2xl font-black text-xs border-2 transition-all flex items-center justify-center gap-2 ${
                  warehouse === 'Nawabpur' 
                    ? 'border-orange-500 bg-orange-50/70 text-orange-600' 
                    : 'border-slate-100 text-slate-400 bg-slate-50 hover:bg-slate-100/70'
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
                  setPanelName(e.target.value); // Sync to manual input also
                }}
                onFocus={() => setShowProductDropdown(true)}
                onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm text-slate-800"
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
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px]">স্টক: {p.stock_quantity} Pcs</span>
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
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm text-slate-800"
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
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm text-slate-800"
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
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-orange-500 transition-all text-slate-800"
              required
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl font-black transition-all shadow-lg active:scale-95 text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'ব্রোকেন লিস্টে যোগ করুন 🚨'}
          </button>
        </form>

        {/* Right: Broken History List */}
        <div className="lg:col-span-8 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 flex flex-col min-h-[500px]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">📋 ব্রোকেন প্যানেলের তালিকা</h3>
              <p className="text-xs text-slate-400 font-bold">ব্রোকেন প্যানেলের রেকর্ড ও হিস্ট্রি</p>
            </div>
            
            {/* Search Input */}
            <input 
              type="text" 
              placeholder="🔍 ব্রোকেন লিস্টে সার্চ করুন..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-xs w-full md:w-64" 
            />
          </div>

          <div className="flex-1 overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr className="text-[10px] uppercase font-black text-slate-400">
                  <th className="p-4">তারিখ (Date)</th>
                  <th className="p-4">প্যানেল নাম</th>
                  <th className="p-4">ওয়াট (Watt)</th>
                  <th className="p-4 text-center">পরিমাণ (Qty)</th>
                  <th className="p-4">কোথা থেকে (From)</th>
                  <th className="p-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-16 text-center text-slate-400 italic">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-orange-500 animate-spin"></div>
                        লোড হচ্ছে...
                      </div>
                    </td>
                  </tr>
                ) : filteredBrokenList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-16 text-center text-slate-400 italic">
                      কোনো ব্রোকেন প্যানেল পাওয়া যায়নি
                    </td>
                  </tr>
                ) : filteredBrokenList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-4 text-slate-500">
                      {new Date(item.created_at).toLocaleDateString('bn-BD', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4 font-black text-slate-900">{item.panel}</td>
                    <td className="p-4">
                      <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase">
                        {item.watt}
                      </span>
                    </td>
                    <td className="p-4 text-center font-black">
                      <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg">
                        {item.unit} Pcs
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black ${
                        item.from === 'Head Office' 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {item.from === 'Head Office' ? '🏢 Head Office' : '🏪 Nawabpur'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleRestore(item)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all"
                        title="স্টক পুনরুদ্ধার করুন ও মুছুন"
                      >
                        রিস্টোর ও ডিলিট ↩️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

export default BrokenManager;
