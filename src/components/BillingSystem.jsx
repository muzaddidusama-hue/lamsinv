import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';
import { downloadPDF } from '../utils/pdfGenerator';
import { logAction } from '../utils/logger';

const BillingSystem = () => {
  const [house, setHouse] = useState('Head Office'); 
  const [isInHouse, setIsInHouse] = useState(false); 
  const [transferTo, setTransferTo] = useState('Showroom');
  const [isManualChalan, setIsManualChalan] = useState(false);
  const [manualChalanNo, setManualChalanNo] = useState('');
  const [manualDate, setManualDate] = useState(''); 
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [activeSearchField, setActiveSearchField] = useState('');
  
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productSearchText, setProductSearchText] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [qty, setQty] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [quickBillMode, setQuickBillMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
    const [isManualBill, setIsManualBill] = useState(false);
    const [manualBillNo, setManualBillNo] = useState('');
    const [billGenerated, setBillGenerated] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => { fetchAvailableProducts(); }, [house]);

useEffect(() => {
const handleGlobalShortcuts = (e) => {
      // ⌨️ Ctrl + S চাপলে বিল/চালান জেনারেট হবে
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault(); // ব্রাউজারের ডিফল্ট সেভ উইন্ডো বন্ধ করবে
        if (cart.length > 0) handleGenerateChallan();
      }
      
      // ⌨️ Escape (Esc) চাপলে যেকোনো মডাল/পপ-আপ বন্ধ হবে
      if (e.key === 'Escape') {
        setShowSuccessModal(false);
        setQuickBillMode(false);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [cart, isInHouse]); // ডিপেন্ডেন্সিগুলো দিতে হবে

  const fetchAvailableProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('house', house).gt('stock_quantity', 0);
    if (data) {
      const sortedData = data.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        const modelA = (a.model || '').toLowerCase();
        const modelB = (b.model || '').toLowerCase();
        return modelA.localeCompare(modelB, undefined, { numeric: true });
      });
      setProducts(sortedData);
    }
  };
  const handlePhoneChange = (val) => {
    setPhone(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        const { data } = await supabase.from('customers').select('*').ilike('phone', `%${val}%`).limit(10);
        setCustomerSuggestions(data || []);
        setActiveSearchField('phone');
      }, 300);
    } else {
      setCustomerSuggestions([]);
      setActiveSearchField('');
    }
  };

  const handleNameChange = (val) => {
    setName(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        const { data } = await supabase.from('customers').select('*').ilike('name', `%${val}%`).limit(10);
        setCustomerSuggestions(data || []);
        setActiveSearchField('name');
      }, 300);
    } else {
      setCustomerSuggestions([]);
      setActiveSearchField('');
    }
  };

  const selectCustomer = (cust) => {
    setPhone(cust.phone || ''); 
    setName(cust.name || ''); 
    setAddress(cust.address || '');
    setCustomerSuggestions([]); 
    setActiveSearchField('');
  };

const addToCart = () => {
    if (!selectedProduct || !qty || qty <= 0) return alert('সঠিক তথ্য দিন');
    const product = products.find(p => p.id === parseInt(selectedProduct));
  
    
    setCart([...cart, { 
        product_id: product.id, 
        name: product.name, 
        model: product.model, 
        category: product.category, 
        unit_price: parseFloat(product.unit_price) || 0, 
        qty: parseInt(qty), 
        total: (parseFloat(product.unit_price) || 0) * parseInt(qty) 
    }]);
    setSelectedProduct(''); setQty(''); setProductSearchText(''); 
  };

  const handleCartDataChange = (index, field, value) => {
    const updatedCart = [...cart];
    
    if (field === 'qty') {
      const parsedQty = parseInt(value) || 0;
      const originalProduct = products.find(p => p.id === updatedCart[index].product_id);
      if (originalProduct && parsedQty > originalProduct.stock_quantity) {
        alert(`দুঃখিত, স্টকে সর্বোচ্চ ${originalProduct.stock_quantity} পিস উপলব্ধ আছে!`);
        return;
      }
      updatedCart[index].qty = parsedQty;
    } else if (field === 'unit_price') {
      updatedCart[index].unit_price = parseFloat(value) || 0; 
    }

    updatedCart[index].total = updatedCart[index].qty * updatedCart[index].unit_price;
    setCart(updatedCart);
  };
  const handleGenerateChallan = async () => {
    if (!isInHouse && !name.trim()) return alert('কাস্টমারের নাম দিন!');
    if (cart.length === 0) return alert('কার্টে মাল যোগ করুন!');
    if (isManualChalan && !manualChalanNo) return alert('ম্যানুয়াল চালান নম্বর দিন!');

    // Direct bill validations
    if (!isInHouse && paymentMethod) {
      if (isManualBill && !manualBillNo.trim()) {
        return alert('ম্যানুয়াল বিল নম্বর দিন!');
      }
    }

    setLoading(true);
    try {
      let customerId = null;
      let finalName = name.trim() || 'Walk-in';
      let finalPhone = phone.trim() || null;
      let finalAddress = address.trim() || null;
      let customerData = { name: finalName, phone: finalPhone, address: finalAddress };

      if (!isInHouse) {
        let existingCust = null;

        if (finalPhone) {
          const { data } = await supabase.from('customers').select('id').eq('phone', finalPhone).limit(1);
          if (data && data.length > 0) existingCust = data[0];
        }
        if (!existingCust && finalName !== 'Walk-in') {
          const { data } = await supabase.from('customers').select('id').eq('name', finalName).maybeSingle();
          existingCust = data;
        }

        if (existingCust) {
          customerId = existingCust.id;
          const updatePayload = {};
          if (finalName !== 'Walk-in') updatePayload.name = finalName;
          if (finalPhone) updatePayload.phone = finalPhone;
          if (finalAddress) updatePayload.address = finalAddress;
          
          if (Object.keys(updatePayload).length > 0) {
            await supabase.from('customers').update(updatePayload).eq('id', customerId);
          }
        } else if (finalName !== 'Walk-in' || finalPhone) {
          const { data: newCust } = await supabase.from('customers').insert([{ 
            name: finalName, phone: finalPhone, address: finalAddress 
          }]).select().single();
          customerId = newCust?.id;
        }
      } else {
        customerData = { name: `Transfer: ${house} to ${transferTo}`, phone: '-', address: '-' };
      }

      const chalanNo = isManualChalan ? manualChalanNo : `CHL-${Date.now().toString().slice(-6)}`;
      const finalCreatedAt = manualDate ? new Date(manualDate).toISOString() : new Date().toISOString();

      const isDirectPaidBill = !isInHouse && paymentMethod !== '';
      const finalBillNo = isDirectPaidBill ? (isManualBill && manualBillNo.trim() !== '' ? manualBillNo : `BLL-${Date.now().toString().slice(-6)}`) : null;
      const finalStatus = isDirectPaidBill ? 'paid' : 'hold';

      const { data: chalanData, error: chalanErr } = await supabase.from('chalans').insert([{
        chalan_no: chalanNo, 
        bill_no: finalBillNo,
        status: finalStatus, 
        payment_method: isDirectPaidBill ? paymentMethod : null,
        total_amount: cart.reduce((acc, item) => acc + item.total, 0), 
        house, 
        customer_id: customerId,
        customer_name: finalName,
        phone: finalPhone,
        address: finalAddress, 
        is_in_house: isInHouse, 
        transfer_to: isInHouse ? transferTo : null,
        created_at: finalCreatedAt
      }]).select().single();

      if (chalanErr) throw chalanErr;

      const itemsForPrint = [];
      for (let item of cart) {
        await supabase.from('chalan_items').insert([{ 
          chalan_id: chalanData.id, 
          product_id: item.product_id, 
          quantity: item.qty, 
          unit_price: item.unit_price, 
          total_price: item.total 
        }]);
        itemsForPrint.push({ ...item, quantity: item.qty, total_price: item.total });

        // Direct bill হলে স্টকের পরিমাণ রিয়েলটাইমে কমিয়ে নিবো
        if (isDirectPaidBill) {
          await supabase.rpc('update_product_stock', { prod_id: item.product_id, qty_change: -item.qty });
        }
      }

      if (isDirectPaidBill) {
        await logAction("Bill Created", `Bill No: ${finalBillNo} created. Payment: ${paymentMethod}. Total: ${chalanData.total_amount} Tk`);
        setBillGenerated(true);
      } else {
        await logAction("Challan Created", `Challan No: ${chalanNo} generated for ${finalName}`);
        setBillGenerated(false);
      }

      setGeneratedData({ chalan: chalanData, customer: customerData, items: itemsForPrint });
      setShowSuccessModal(true);
      setCart([]); setPhone(''); setName(''); setAddress(''); setIsManualChalan(false); setManualChalanNo(''); setManualDate('');
      
      // বিল ডিটেইলস রিসেট
      setPaymentMethod(''); setIsManualBill(false); setManualBillNo('');
      
      fetchAvailableProducts();
    } catch (e) { alert("ত্রুটি হয়েছে!"); console.error(e); }
    
    setLoading(false);
  };

const handleQuickBillConfirm = async () => {
    if (!paymentMethod) return alert('পেমেন্ট মেথড সিলেক্ট করুন!');
    
    setLoading(true);
    try {
      const finalBillNo = isManualBill && manualBillNo.trim() !== '' ? manualBillNo : `BLL-${Date.now().toString().slice(-6)}`;

      // 🔴 ফিক্সড: item এর বদলে itm হবে এবং বাড়তি ব্র্যাকেট সরানো হয়েছে
      for (let itm of generatedData.items) {
        await supabase.rpc('update_product_stock', { prod_id: itm.product_id, qty_change: -itm.quantity });
      }

      const { error } = await supabase.from('chalans').update({ 
        status: 'paid', 
        payment_method: paymentMethod, 
        bill_no: finalBillNo 
      }).eq('id', generatedData.chalan.id);
      
      if (error) throw error;
      
      await logAction("Bill Created", `Bill No: ${finalBillNo} created. Payment: ${paymentMethod}. Total: ${generatedData.chalan.total_amount} Tk`);
      
      alert(`✅ বিল তৈরি হয়েছে! নং: ${finalBillNo}`);
      
      const billToPrint = { ...generatedData.chalan, bill_no: finalBillNo, payment_method: paymentMethod };
      printBill(billToPrint, generatedData.customer, generatedData.items);
      
      setShowSuccessModal(false);
      setQuickBillMode(false);
      fetchAvailableProducts(); 
    } catch (e) { 
      alert("সমস্যা হয়েছে!"); 
      console.error(e); 
    }
    setLoading(false);
  };

  const displayedProducts = products.filter(p => 
    `${p.name} ${p.model}`.toLowerCase().includes(productSearchText.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 p-4" style={{fontFamily: "'Inter', 'Hind Siliguri', sans-serif"}}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border shadow-sm gap-4">
        <div>
           <h1 className="text-2xl font-black text-slate-800 tracking-tighter">🧾 চালান ও বিলিং</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 w-full sm:w-auto">
             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Custom Date (ঐচ্ছিক)</label>
             <input type="datetime-local" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="bg-transparent text-slate-800 font-bold outline-none text-sm w-full" />
          </div>
          <button onClick={() => { setIsInHouse(!isInHouse); setCart([]); }} className={`px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg w-full sm:w-auto ${isInHouse ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
            {isInHouse ? '🏠 ইন-হাউজ মোড: ON' : '🛒 রেগুলার মোড: ON'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
             <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={isManualChalan} onChange={(e) => setIsManualChalan(e.target.checked)} className="accent-orange-600" />
                  <span className="text-[10px] font-black text-orange-700 uppercase">ম্যানুয়াল চালান নম্বর?</span>
                </label>
                {isManualChalan && <input type="text" value={manualChalanNo} onChange={(e) => setManualChalanNo(e.target.value)} placeholder="CHL-2025" className="w-full p-3 bg-white border border-orange-200 rounded-xl font-bold uppercase outline-none" />}
             </div>

             <div className="bg-slate-50 p-4 rounded-2xl border">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">১. সোর্স হাউজ</label>
                <div className="flex gap-6">
                   <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={house==='Head Office'} onChange={()=>setHouse('Head Office')} /> HO</label>
                   <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={house==='Showroom'} onChange={()=>setHouse('Showroom')} /> Showroom</label>
                </div>
             </div>
              {isInHouse ? (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-bold text-blue-400 uppercase block mb-2">গন্তব্য হাউজ (Transfer To)</label>
                  <select value={transferTo} onChange={(e)=>setTransferTo(e.target.value)} className="w-full p-3 bg-white border rounded-xl font-bold outline-none">
                    <option value="Head Office">Head Office</option><option value="Showroom">Showroom</option>
                  </select>
                </div>
              ) : (
                                <div className="space-y-4">
                                  {/* পেমেন্ট ও বিল ডিটেইলস অপশন (সরাসরি বিল এন্ট্রি করার জন্য) */}
                                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100 space-y-3">
                                    <label className="text-[10px] font-black text-green-700 uppercase block mb-1">পেমেন্ট ও বিল টাইপ (ঐচ্ছিক)</label>
                                    <select 
                                      value={paymentMethod} 
                                      onChange={(e) => {
                                        setPaymentMethod(e.target.value);
                                        if (!e.target.value) {
                                          setIsManualBill(false);
                                          setManualBillNo('');
                                        }
                                      }} 
                                      className="w-full p-3 bg-white border border-green-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-green-500 text-slate-800"
                                    >
                                      <option value="">চালান মোড (Hold)</option>
                                      <option value="Cash">Cash (💵)</option>
                                      <option value="bKash">bKash (📱)</option>
                                      <option value="Bank">Bank (🏦)</option>
                                    </select>
                                    
                                    {paymentMethod && (
                                      <div className="pt-2 border-t border-green-200/50 space-y-2 animate-in slide-in-from-top-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="checkbox" checked={isManualBill} onChange={(e) => setIsManualBill(e.target.checked)} className="accent-green-600" />
                                          <span className="text-[10px] font-black text-green-700 uppercase">ম্যানুয়াল বিল নম্বর?</span>
                                        </label>
                                        {isManualBill && (
                                          <input type="text" value={manualBillNo} onChange={(e) => setManualBillNo(e.target.value)} placeholder="BLL-12345" className="w-full p-3 bg-white border border-green-200 rounded-xl font-bold uppercase outline-none text-xs text-slate-800" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <input 
                                      type="text" 
                                      placeholder="মোবাইল" 
                                      value={phone} 
                                      onChange={e => handlePhoneChange(e.target.value)} 
                                      onBlur={() => setTimeout(() => setActiveSearchField(''), 200)}
                                      className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-600 text-slate-800" 
                                    />
                                    {activeSearchField === 'phone' && customerSuggestions.length > 0 && (
                                      <div className="absolute top-full left-0 w-full z-50 bg-white border rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                                        {customerSuggestions.map(c => (
                                          <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border-b hover:bg-blue-50 cursor-pointer font-bold text-xs text-slate-800">
                                            {c.name} {c.phone ? `- ${c.phone}` : ''}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                
                                  <div className="relative">
                                    <input 
                                      type="text" 
                                      placeholder="নাম" 
                                      value={name} 
                                      onChange={e => handleNameChange(e.target.value)} 
                                      onBlur={() => setTimeout(() => setActiveSearchField(''), 200)}
                                      className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-600 text-slate-800" 
                                    />
                                    {activeSearchField === 'name' && customerSuggestions.length > 0 && (
                                      <div className="absolute top-full left-0 w-full z-50 bg-white border rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                                        {customerSuggestions.map(c => (
                                          <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border-b hover:bg-blue-50 cursor-pointer font-bold text-xs text-slate-800">
                                            {c.name} {c.phone ? `- ${c.phone}` : ''}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                
                                  <input type="text" placeholder="ঠিকানা" value={address} onChange={e=>setAddress(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-600 text-slate-800" />
                                </div>
             )}
          </div>
          
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">২. প্রোডাক্ট নির্বাচন</h2>
            
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="প্রোডাক্ট সার্চ করে সিলেক্ট করুন..."
                value={productSearchText}
                onChange={(e) => {
                  setProductSearchText(e.target.value);
                  setShowProductDropdown(true);
                  setSelectedProduct(''); 
                }}
                onFocus={() => setShowProductDropdown(true)}
                onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900"
              />
              {showProductDropdown && (
                <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] max-h-64 overflow-y-auto custom-scrollbar">
                  {displayedProducts.length > 0 ? displayedProducts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => {
                        setSelectedProduct(p.id);
                        setProductSearchText(`${p.name} - ${p.model} [স্টক: ${p.stock_quantity}]`);
                        setShowProductDropdown(false);
                      }}
                      className="p-3 border-b border-slate-50 hover:bg-slate-100 cursor-pointer font-bold text-sm text-slate-700"
                    >
                      📦 {p.name} - {p.model} <span className="text-slate-500 ml-1">[স্টক: {p.stock_quantity}]</span>
                    </div>
                  )) : (
                    <div className="p-4 text-center text-slate-400 text-sm font-bold">কোনো প্রোডাক্ট পাওয়া যায়নি</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="পরিমাণ" className="w-36 p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900" />
              <button onClick={addToCart} className="flex-1 bg-slate-900 text-white px-8 rounded-2xl font-bold hover:bg-orange-600 transition-all whitespace-nowrap">Add</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">
                    <th className="pb-4">Item</th><th className="pb-4 text-center w-24">Qty</th><th className="pb-4 text-center w-36">Price (Editable)</th><th className="pb-4 text-right">Total</th><th className="pb-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 font-bold text-slate-800">{item.name} <span className="text-xs text-slate-400 block font-medium">{item.model}</span></td>
                      <td className="py-4 text-center">
                        <input type="number" value={item.qty} onChange={(e) => handleCartDataChange(idx, 'qty', e.target.value)} className="w-16 p-1 text-center bg-slate-50 border rounded-lg font-black text-xs outline-none focus:border-slate-900" />
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={item.unit_price} onChange={(e) => handleCartDataChange(idx, 'unit_price', e.target.value)} className="w-24 p-1.5 bg-slate-50 border rounded-lg text-right font-bold text-xs outline-none focus:border-orange-500" placeholder="0"/>
                          <span className="text-slate-400 text-[11px]">৳</span>
                        </div>
                      </td>
                      <td className="py-4 text-right font-black text-slate-900">{item.total} ৳</td>
                      <td className="py-4 text-right">
                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold text-xl">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-6 border-t flex justify-between items-center">
              <div className="text-2xl font-black text-slate-900">{cart.reduce((acc, item) => acc + item.total, 0)} ৳</div>
              <button onClick={handleGenerateChallan} disabled={loading || cart.length === 0} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black shadow-lg hover:bg-orange-600 transition-all uppercase tracking-tighter">Generate Challan</button>
            </div>
          </div>
        </div>
      </div>
      {showSuccessModal && generatedData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            {billGenerated ? (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">বিল ও চালান তৈরি হয়েছে!</h2>
                  <p className="font-bold text-slate-400 text-xs mt-1 uppercase">বিল নং: {generatedData.chalan.bill_no}</p>
                  <p className="font-bold text-slate-400 text-[10px] uppercase">চালান নং: {generatedData.chalan.chalan_no}</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={() => printBill({ ...generatedData.chalan, bill_no: generatedData.chalan.bill_no, payment_method: generatedData.chalan.payment_method }, generatedData.customer, generatedData.items)} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-black uppercase text-sm tracking-wider flex items-center justify-center gap-2"
                  >
                    🖨️ প্রিন্ট বিল
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => downloadPDF(generatedData.chalan, generatedData.customer, generatedData.items, 'Bill')} 
                      className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold uppercase text-xs"
                    >
                      📥 ডাউনলোড PDF
                    </button>
                    <button 
                      onClick={() => printChallan(generatedData.chalan, generatedData.customer, generatedData.items)} 
                      className="bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold uppercase text-xs"
                    >
                      🖨️ প্রিন্ট চালান
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowSuccessModal(false)} 
                    className="mt-4 w-full border border-slate-200 text-slate-500 hover:text-slate-700 py-3 rounded-xl font-bold text-xs"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            ) : !quickBillMode ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                <h2 className="text-2xl font-black mb-2">চালান তৈরি হয়েছে!</h2>
                <p className="font-bold text-slate-400 mb-6 uppercase">নং: {generatedData.chalan.chalan_no}</p>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => printChallan(generatedData.chalan, generatedData.customer, generatedData.items)} className="bg-slate-900 text-white py-4 rounded-xl font-bold uppercase text-xs">🖨️ প্রিন্ট চালান</button>
                     <button onClick={() => downloadPDF(generatedData.chalan, generatedData.customer, generatedData.items, 'Challan')} className="bg-blue-600 text-white py-4 rounded-xl font-bold uppercase text-xs">📥 ডাউনলোড PDF</button>
                  </div>
                  {!isInHouse && <button onClick={() => setQuickBillMode(true)} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg uppercase tracking-widest">💰 সরাসরি বিল তৈরি করুন</button>}
                  <button onClick={() => setShowSuccessModal(false)} className="mt-2 text-slate-400 font-bold">পরে করবো / বন্ধ করুন</button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <h2 className="text-xl font-black border-b pb-3">বিল কনফার্মেশন</h2>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={isManualBill} onChange={(e) => setIsManualBill(e.target.checked)} />
                    <span className="text-xs font-black text-orange-700 uppercase">ম্যানুয়াল বিল নম্বর?</span>
                  </label>
                  {isManualBill && <input type="text" value={manualBillNo} onChange={(e) => setManualBillNo(e.target.value)} placeholder="BLL-OFF-101" className="w-full p-3 bg-white border border-orange-200 rounded-xl font-bold uppercase outline-none" />}
                </div>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black outline-none focus:border-green-500 shadow-sm">
                  <option value="">পেমেন্ট মেথড...</option><option value="Cash">Cash (💵)</option><option value="bKash">bKash (📱)</option><option value="Bank">Bank (🏦)</option>
                </select>
                
                <button onClick={handleQuickBillConfirm} disabled={loading || !paymentMethod} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest active:scale-95 transition-all">কনফার্ম ও বিল প্রিন্ট</button>
                
                <div className="flex justify-center">
                    <button onClick={() => downloadPDF(generatedData.chalan, generatedData.customer, generatedData.items, 'Challan')} className="text-blue-600 font-bold text-sm underline">📥 আপাতত চালানটি PDF ডাউনলোড করুন</button>
                </div>

                <button onClick={() => setQuickBillMode(false)} className="w-full text-slate-400 font-bold text-center">পিছনে যান</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSystem;