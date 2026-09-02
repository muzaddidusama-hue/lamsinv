import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { printChallan } from '../utils/printChalan';
import { printBill } from '../utils/printBill';
import { downloadPDF } from '../utils/pdfGenerator';
import { logAction } from '../utils/logger';
import { saveInvoiceSerialsToInvSl } from '../utils/inverterUtils';
// Custom Aesthetic Date Picker with deep calendar icon and dd/mm/yy format
const CustomDatePicker = ({ value, onChange }) => {
  const hiddenInputRef = React.useRef(null);

  const formatDisplayDate = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const getISODateValue = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const handleIconClick = () => {
    if (hiddenInputRef.current) {
      try {
        hiddenInputRef.current.showPicker();
      } catch (err) {
        hiddenInputRef.current.click();
      }
    }
  };

  const handleDateChange = (e) => {
    const selectedVal = e.target.value;
    if (!selectedVal) return;
    const now = new Date();
    const [year, month, day] = selectedVal.split('-');
    const newDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    onChange(newDate.toISOString());
  };

  return (
    <div className="relative flex items-center w-full">
      <input 
        type="date" 
        ref={hiddenInputRef}
        value={getISODateValue(value)}
        onChange={handleDateChange}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
      <input 
        type="text" 
        readOnly
        value={formatDisplayDate(value)}
        onClick={handleIconClick}
        placeholder="DD/MM/YY"
        className="w-full pr-12 cursor-pointer font-bold text-slate-800"
      />
      <button 
        type="button"
        onClick={handleIconClick}
        className="absolute right-3 text-slate-900 hover:text-orange-600 transition-colors p-1"
        title="ক্যালেন্ডার খুলুন"
      >
        <svg className="w-5 h-5 text-slate-950 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
};

const getTodayFormatted = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

   const BillingSystem = () => {
     const [house, setHouse] = useState('Head Office');
  const [isInHouse, setIsInHouse] = useState(false); 
  const [transferTo, setTransferTo] = useState('Showroom');
  const [isManualChalan, setIsManualChalan] = useState(true);
  const [manualChalanNo, setManualChalanNo] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString());
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [activeSearchField, setActiveSearchField] = useState('');
  
  const [products, setProducts] = useState([]);
  const [allHouseProducts, setAllHouseProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productSearchText, setProductSearchText] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // 🔴 আউট পারচেস (Out Purchase) স্টেট
  const [isOutPurchase, setIsOutPurchase] = useState(false);
  const [outPurchaseProduct, setOutPurchaseProduct] = useState(null);
  const [outPurchaseSearchText, setOutPurchaseSearchText] = useState('');
  const [showOutPurchaseDropdown, setShowOutPurchaseDropdown] = useState(false);
  const [outPurchaseQty, setOutPurchaseQty] = useState('');
  const [outPurchaseDate, setOutPurchaseDate] = useState(getTodayFormatted());
  const [outPurchaseLoading, setOutPurchaseLoading] = useState(false);

  const [qty, setQty] = useState('');
  const [enableSN, setEnableSN] = useState(false);
  const [snList, setSnList] = useState([]);
  const [editingSNIndex, setEditingSNIndex] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [quickBillMode, setQuickBillMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Bank');
     const [isManualBill, setIsManualBill] = useState(true);
    const [manualBillNo, setManualBillNo] = useState('');
    const [billGenerated, setBillGenerated] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => { 
    fetchAvailableProducts(); 
  }, [house]);

  const fetchAvailableProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('house', house);
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
      setAllHouseProducts(sortedData);
      setProducts(sortedData.filter(p => (p.stock_quantity || 0) > 0));
    }
  };

  const handleSaveOutPurchase = async () => {
    if (!outPurchaseProduct) return alert('দয়া করে আউট পারচেসের জন্য প্রোডাক্ট নির্বাচন করুন!');
    const parsedQty = parseInt(outPurchaseQty);
    if (isNaN(parsedQty) || parsedQty <= 0) return alert('সঠিক পরিমাণ (০ এর বেশি) লিখুন!');
    if (!outPurchaseDate) return alert('দয়া করে তারিখ নির্বাচন করুন!');

    setOutPurchaseLoading(true);
    try {
      // ১. products টেবিলে স্টক যোগ করা
      const newStock = (outPurchaseProduct.stock_quantity || 0) + parsedQty;
      const { error: prodErr } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', outPurchaseProduct.id);

      if (prodErr) throw prodErr;

      // ২. ledger টেবিলে এন্ট্রি দেওয়া
      const currentTime = new Date().toTimeString().split(' ')[0];
      const finalTimestamp = `${outPurchaseDate}T${currentTime}.000Z`;
      const houseLabel = house === 'Showroom' ? 'Nawabpur' : 'Head Office';

      const { error: ledgerErr } = await supabase.from('ledger').insert([
        {
          product: `${outPurchaseProduct.name} - ${outPurchaseProduct.model}`,
          quantity: parsedQty,
          date: outPurchaseDate,
          in: finalTimestamp,
          source: `Out Purchase (To: ${houseLabel})`
        }
      ]);

      if (ledgerErr) {
        console.error("Ledger sync error:", ledgerErr);
        alert("⚠️ স্টক আপডেট হয়েছে কিন্তু লেজার এন্ট্রিতে ত্রুটি হয়েছে: " + ledgerErr.message);
      }

      alert(`✅ আউট পারচেস সফলভাবে যোগ হয়েছে! (${outPurchaseProduct.name} - ${outPurchaseProduct.model} +${parsedQty} পিস)`);

      // ৩. প্রোডাক্ট রিফ্রেশ এবং বিলিং ফর্মে অটো-সিলেক্ট
      await fetchAvailableProducts();
      setSelectedProduct(outPurchaseProduct.id);
      setProductSearchText(`${outPurchaseProduct.name} - ${outPurchaseProduct.model} [স্টক: ${newStock}]`);
      setQty(parsedQty.toString());

      // রিসেট আউট পারচেস ফর্ম
      setOutPurchaseQty('');
      setOutPurchaseProduct(null);
      setOutPurchaseSearchText('');
      setIsOutPurchase(false);
    } catch (err) {
      console.error(err);
      alert('আউট পারচেস সেভ করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setOutPurchaseLoading(false);
    }
  };

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
    if (!product) return alert('প্রোডাক্ট পাওয়া যায়নি!');

    const parsedQty = parseInt(qty);
    const validSerials = enableSN ? snList.slice(0, parsedQty).map(s => (s || '').trim().toUpperCase()).filter(Boolean) : [];
  
    setCart([...cart, { 
        product_id: product.id, 
        name: product.name, 
        model: product.model, 
        category: product.category, 
        unit_price: isInHouse ? 0 : (parseFloat(product.unit_price) || 0), 
        qty: parsedQty, 
        total: isInHouse ? 0 : ((parseFloat(product.unit_price) || 0) * parsedQty),
        hasSN: enableSN,
        serials: validSerials
    }]);
    setSelectedProduct(''); 
    setQty(''); 
    setProductSearchText(''); 
    setEnableSN(false);
    setSnList([]);
  };

  const handleToggleCartItemSN = (index) => {
    if (editingSNIndex === index) {
      setEditingSNIndex(null);
    } else {
      setEditingSNIndex(index);
      const item = cart[index];
      if (!item.serials || item.serials.length === 0) {
        const updated = [...cart];
        updated[index] = {
          ...item,
          hasSN: true,
          serials: Array.from({ length: item.qty || 1 }, () => '')
        };
        setCart(updated);
      }
    }
  };

  const handleUpdateCartItemSerial = (cartIdx, serialIdx, value) => {
    const updated = [...cart];
    const currentSerials = [...(updated[cartIdx].serials || [])];
    while (currentSerials.length <= serialIdx) currentSerials.push('');
    currentSerials[serialIdx] = value.toUpperCase();
    updated[cartIdx].serials = currentSerials;
    updated[cartIdx].hasSN = true;
    setCart(updated);
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
      updatedCart[index].unit_price = isInHouse ? 0 : (parseFloat(value) || 0); 
    }

    updatedCart[index].total = isInHouse ? 0 : (updatedCart[index].qty * updatedCart[index].unit_price);
    setCart(updatedCart);
  };
  const handleGenerateChallan = async () => {
    if (!isInHouse && !name.trim()) return alert('কাস্টমারের নাম দিন!');
    if (cart.length === 0) return alert('কার্টে মাল যোগ করুন!');
    if (isManualChalan && !manualChalanNo.trim()) return alert('ম্যানুয়াল চালান নম্বর দিন!');

    // Direct bill validations
    if (!isInHouse && paymentMethod) {
      if (isManualBill && !manualBillNo.trim()) {
        return alert('ম্যানুয়াল বিল নম্বর দিন!');
      }
    }

    setLoading(true);
    try {
      let customerId = null;
      let finalName = isInHouse ? `Transfer: ${house} to ${transferTo}` : (name.trim() || 'Walk-in');
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

      const chalanNo = isManualChalan && manualChalanNo.trim() !== '' ? manualChalanNo : `CHL-${Date.now().toString().slice(-6)}`;
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

      // 🔴 অটোমেটিকভাবে inv_sl (সার্ভিসিং ও ওয়ারেন্টি) টেবিলে সিরিয়াল নম্বর সেভ করা
      await saveInvoiceSerialsToInvSl({
        items: cart,
        billNo: finalBillNo,
        chalanNo: chalanNo,
        customerName: finalName,
        customerAddress: finalAddress
      });

      if (isDirectPaidBill) {
        await logAction("Bill Created", `Bill No: ${finalBillNo} created. Payment: ${paymentMethod}. Total: ${chalanData.total_amount} Tk`);
        setBillGenerated(true);
      } else {
        await logAction("Challan Created", `Challan No: ${chalanNo} generated for ${finalName}`);
        setBillGenerated(false);
      }

      setGeneratedData({ chalan: chalanData, customer: customerData, items: itemsForPrint });
      setShowSuccessModal(true);
      setCart([]); setPhone(''); setName(''); setAddress(''); setIsManualChalan(true); setManualChalanNo(''); setManualDate(new Date().toISOString());
      // বিল ডিটেইলস রিসেট
         setPaymentMethod('Bank'); setIsManualBill(true); setManualBillNo('');
      
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

      // 🔴 কুইক বিলের ক্ষেত্রেও inv_sl টেবিলে বিল নম্বর সিঙ্ক করা
      await saveInvoiceSerialsToInvSl({
        items: generatedData.items,
        billNo: finalBillNo,
        chalanNo: generatedData.chalan.chalan_no,
        customerName: generatedData.chalan.customer_name,
        customerAddress: generatedData.chalan.address
      });
      
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

  const displayedOutPurchaseProducts = allHouseProducts.filter(p => 
    `${p.name} ${p.model}`.toLowerCase().includes(outPurchaseSearchText.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 p-4" style={{fontFamily: "'Inter', 'Hind Siliguri', sans-serif"}}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-black text-red-600 tracking-tighter">🧾 চালান ও বিলিং</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="w-full sm:w-48">
               <CustomDatePicker value={manualDate} onChange={setManualDate} />
            </div>
          <button 
            onClick={() => { 
              const newMode = !isInHouse;
              setIsInHouse(newMode); 
              setCart([]); 
              if (!newMode) {
                setHouse('Head Office');
              }
            }} 
            className={`px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg w-full sm:w-auto ${isInHouse ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}
          >
            {isInHouse ? '🏠 ইন-হাউজ মোড: ON' : '🛒 রেগুলার মোড: ON'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
             {isInHouse && (
               <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={isManualChalan} onChange={(e) => setIsManualChalan(e.target.checked)} className="accent-red-600" />
                    <span className="text-[10px] font-black text-red-700 uppercase">ম্যানুয়াল চালান নম্বর?</span>
                  </label>
                  {isManualChalan && <input type="text" value={manualChalanNo} onChange={(e) => setManualChalanNo(e.target.value)} placeholder="CHL-2025" className="w-full p-3 bg-white border border-red-200 rounded-xl font-bold uppercase outline-none" />}
               </div>
             )}
             {isInHouse && (
               <div className="bg-slate-50 p-4 rounded-2xl border">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">১. সোর্স হাউজ</label>
                  <div className="flex gap-6">
                     <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={house==='Head Office'} onChange={()=>setHouse('Head Office')} /> HO</label>
                     <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" checked={house==='Showroom'} onChange={()=>setHouse('Showroom')} /> Showroom</label>
                  </div>
               </div>
             )}
              {isInHouse ? (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <label className="text-[10px] font-bold text-red-400 uppercase block mb-2">গন্তব্য হাউজ (Transfer To)</label>
                  <select value={transferTo} onChange={(e)=>setTransferTo(e.target.value)} className="w-full p-3 bg-white border rounded-xl font-bold outline-none">
                    <option value="Head Office">Head Office</option><option value="Showroom">Showroom</option>
                  </select>
                </div>
              ) : (
                                <div className="space-y-4">
                                  <div className="relative">
                                    <input 
                                      type="text" 
                                      placeholder="নাম" 
                                      value={name} 
                                      onChange={e => handleNameChange(e.target.value)} 
                                      onBlur={() => setTimeout(() => setActiveSearchField(''), 200)}
                                      className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-red-600 text-slate-800" 
                                    />
                                    {activeSearchField === 'name' && customerSuggestions.length > 0 && (
                                      <div className="absolute top-full left-0 w-full z-50 bg-white border rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                                        {customerSuggestions.map(c => (
                                          <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border-b hover:bg-red-50 cursor-pointer font-bold text-xs text-slate-800">
                                            {c.name} {c.phone ? `- ${c.phone}` : ''}
                                          </div>
                                        ))}
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
                                      className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-red-600 text-slate-800" 
                                    />
                                    {activeSearchField === 'phone' && customerSuggestions.length > 0 && (
                                      <div className="absolute top-full left-0 w-full z-50 bg-white border rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                                        {customerSuggestions.map(c => (
                                          <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 border-b hover:bg-red-50 cursor-pointer font-bold text-xs text-slate-800">
                                            {c.name} {c.phone ? `- ${c.phone}` : ''}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                
                                  <input type="text" placeholder="ঠিকানা" value={address} onChange={e=>setAddress(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-red-600 text-slate-800" />
                                </div>
             )}
          </div>
          
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">২. প্রোডাক্ট নির্বাচন</h2>
              <label className="flex items-center gap-2 cursor-pointer bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1 rounded-xl transition-all select-none">
                <input 
                  type="checkbox" 
                  checked={isOutPurchase} 
                  onChange={(e) => {
                    setIsOutPurchase(e.target.checked);
                    if (e.target.checked && !outPurchaseDate) {
                      setOutPurchaseDate(manualDate ? manualDate.split('T')[0] : getTodayFormatted());
                    }
                  }} 
                  className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                />
                <span className="text-xs font-black text-orange-700">📦 আউট পারচেস (Out Purchase)</span>
              </label>
            </div>

            {/* 🔴 আউট পারচেস ফর্ম সেকশন */}
            {isOutPurchase && (
              <div className="p-4 bg-orange-50/70 border-2 border-orange-200 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-orange-200 pb-2">
                  <span className="text-xs font-black text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛒</span> আউট পারচেস স্টক এন্ট্রি
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-0.5 bg-orange-200 text-orange-900 rounded-lg">
                    {house === 'Showroom' ? '🏪 শোরুম (Nawabpur)' : '🏢 হেড অফিস'}
                  </span>
                </div>

                {/* প্রোডাক্ট সিলেক্টর */}
                <div className="relative">
                  <label className="text-[10px] font-black text-orange-900 uppercase tracking-widest block mb-1">প্রোডাক্ট সিলেক্ট করুন</label>
                  <input 
                    type="text" 
                    placeholder="প্রোডাক্ট নাম বা মডেল সার্চ করুন..."
                    value={outPurchaseSearchText}
                    onChange={(e) => {
                      setOutPurchaseSearchText(e.target.value);
                      setShowOutPurchaseDropdown(true);
                      setOutPurchaseProduct(null);
                    }}
                    onFocus={() => setShowOutPurchaseDropdown(true)}
                    onBlur={() => setTimeout(() => setShowOutPurchaseDropdown(false), 200)}
                    className="w-full p-3 bg-white border border-orange-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                  />
                  {showOutPurchaseDropdown && (
                    <div className="absolute w-full mt-1 bg-white border border-orange-200 rounded-xl shadow-2xl z-[110] max-h-48 overflow-y-auto custom-scrollbar">
                      {displayedOutPurchaseProducts.length > 0 ? displayedOutPurchaseProducts.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            setOutPurchaseProduct(p);
                            setOutPurchaseSearchText(`${p.name} - ${p.model}`);
                            setShowOutPurchaseDropdown(false);
                          }}
                          className="p-2.5 border-b border-orange-50 hover:bg-orange-100 cursor-pointer font-bold text-xs text-slate-800"
                        >
                          📦 {p.name} - {p.model} <span className="text-slate-500 ml-1 font-semibold">(বর্তমান স্টক: {p.stock_quantity || 0})</span>
                        </div>
                      )) : (
                        <div className="p-3 text-center text-slate-400 text-xs font-bold">কোনো প্রোডাক্ট পাওয়া যায়নি</div>
                      )}
                    </div>
                  )}
                </div>

                {/* তারিখ ও পরিমাণ */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-orange-900 uppercase tracking-widest block mb-1">তারিখ (Date)</label>
                    <input 
                      type="date" 
                      value={outPurchaseDate}
                      onChange={(e) => setOutPurchaseDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-orange-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-orange-900 uppercase tracking-widest block mb-1">পরিমাণ (Qty)</label>
                    <input 
                      type="number" 
                      value={outPurchaseQty}
                      onChange={(e) => setOutPurchaseQty(e.target.value)}
                      placeholder="পিস..."
                      className="w-full p-2.5 bg-white border border-orange-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                    />
                  </div>
                </div>

                {/* অটো সিলেক্টেড হাউজ */}
                <div>
                  <label className="text-[10px] font-black text-orange-900 uppercase tracking-widest block mb-1">হাউজ (House - Auto Selected)</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={house === 'Showroom' ? 'Showroom (Nawabpur)' : 'Head Office'}
                    className="w-full p-2.5 bg-orange-100/70 border border-orange-200 rounded-xl font-bold text-xs text-orange-950 cursor-not-allowed"
                  />
                </div>

                <button 
                  type="button"
                  onClick={handleSaveOutPurchase}
                  disabled={outPurchaseLoading}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {outPurchaseLoading ? 'যোগ হচ্ছে...' : '➕ স্টকে যোগ ও সিলেক্ট করুন'}
                </button>
              </div>
            )}

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
                className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-600"
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

            <div className="flex gap-2 items-center">
              <input 
                type="number" 
                value={qty} 
                onChange={(e) => {
                  const val = e.target.value;
                  setQty(val);
                  const parsed = parseInt(val) || 0;
                  setSnList(prev => {
                    const arr = [...prev];
                    while (arr.length < parsed) arr.push('');
                    return arr.slice(0, Math.max(1, parsed));
                  });
                }} 
                placeholder="পরিমাণ" 
                className="w-28 p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-600" 
              />

              <label className="flex items-center gap-1.5 px-3 py-3.5 bg-slate-50 border rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors select-none">
                <input 
                  type="checkbox" 
                  checked={enableSN} 
                  onChange={(e) => {
                    setEnableSN(e.target.checked);
                    if (e.target.checked && snList.length === 0) {
                      const parsed = parseInt(qty) || 1;
                      setSnList(Array.from({ length: parsed }, () => ''));
                    }
                  }} 
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <span className="text-xs font-black text-slate-700 tracking-wide">SN</span>
              </label>

              <button onClick={addToCart} className="flex-1 bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-red-600 transition-all whitespace-nowrap">
                Add
              </button>
            </div>

            {/* 🔴 SN চেকবক্স অন থাকলে সিরিয়াল নম্বর ইনপুট করার ঘর */}
            {enableSN && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
                <div className="flex justify-between items-center text-[11px] font-black text-blue-900">
                  <span>ইনভার্টার সিরিয়াল নম্বর (S/N) দিন:</span>
                  <span className="text-[10px] bg-blue-200/70 text-blue-800 px-2 py-0.5 rounded font-mono">মোট {Math.max(1, parseInt(qty) || 1)} টি</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {Array.from({ length: Math.max(1, parseInt(qty) || 1) }).map((_, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black text-blue-600 w-6">#{sIdx + 1}</span>
                      <input 
                        type="text"
                        placeholder={`সিরিয়াল নং #${sIdx + 1}`}
                        value={snList[sIdx] || ''}
                        onChange={(e) => {
                          const updated = [...snList];
                          updated[sIdx] = e.target.value.toUpperCase();
                          setSnList(updated);
                        }}
                        className="flex-1 p-2 bg-white border border-blue-200 rounded-xl font-mono font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">
                    <th className="pb-4">Item</th>
                    <th className="pb-4 text-center w-24">Qty</th>
                    {!isInHouse && <th className="pb-4 text-center w-36">Price (Editable)</th>}
                    {!isInHouse && <th className="pb-4 text-right">Total</th>}
                    <th className="pb-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-4 font-bold text-slate-800">
                        {item.name} <span className="text-xs text-slate-400 block font-medium">{item.model}</span>
                        
                        {/* 🔴 SN ব্যাজ এবং ইনলাইন এডিটর */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {item.serials && item.serials.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {item.serials.map((sn, sIdx) => (
                                <span key={sIdx} className="bg-blue-100 text-blue-700 text-[10px] font-mono font-black px-1.5 py-0.5 rounded border border-blue-200">
                                  SN: {sn}
                                </span>
                              ))}
                              <button 
                                type="button" 
                                onClick={() => handleToggleCartItemSN(idx)}
                                className="text-[10px] font-bold text-blue-600 underline hover:text-blue-800 ml-1"
                              >
                                {editingSNIndex === idx ? 'বন্ধ' : 'এডিট SN'}
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button" 
                              onClick={() => handleToggleCartItemSN(idx)}
                              className="text-[10px] font-black text-slate-400 hover:text-blue-600 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md hover:bg-blue-50 transition-colors"
                            >
                              <span>+ SN দিন</span>
                            </button>
                          )}
                        </div>

                        {editingSNIndex === idx && (
                          <div className="mt-2 p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-black text-blue-900">
                              <span>সিরিয়াল নম্বর ইনপুট ({item.qty} পিস):</span>
                              <button type="button" onClick={() => setEditingSNIndex(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕ বন্ধ</button>
                            </div>
                            {Array.from({ length: item.qty || 1 }).map((_, sIdx) => (
                              <input 
                                key={sIdx}
                                type="text"
                                placeholder={`সিরিয়াল #${sIdx + 1}`}
                                value={(item.serials && item.serials[sIdx]) || ''}
                                onChange={(e) => handleUpdateCartItemSerial(idx, sIdx, e.target.value)}
                                className="w-full p-1.5 bg-white border border-blue-200 rounded-lg font-mono font-bold text-xs uppercase outline-none focus:ring-1 focus:ring-blue-600"
                              />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        <input type="number" value={item.qty} onChange={(e) => handleCartDataChange(idx, 'qty', e.target.value)} className="w-20 p-1 text-center bg-slate-50 border rounded-lg font-black text-xs outline-none focus:border-slate-900" />
                      </td>
                      {!isInHouse && (
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" value={item.unit_price} onChange={(e) => handleCartDataChange(idx, 'unit_price', e.target.value)} className="w-24 p-1.5 bg-slate-50 border rounded-lg text-right font-bold text-xs outline-none focus:border-orange-500" placeholder="0"/>
                            <span className="text-slate-400 text-[11px]">৳</span>
                          </div>
                        </td>
                      )}
                      {!isInHouse && <td className="py-4 text-right font-black text-slate-900">{item.total} ৳</td>}
                      <td className="py-4 text-right">
                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold text-xl">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!isInHouse && (
               <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-50 p-4 rounded-2xl mb-4">
                 <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isManualBill} onChange={(e) => setIsManualBill(e.target.checked)} className="w-4 h-4 accent-red-600" />
                    <span className="text-xs font-bold text-slate-700">ম্যানুয়াল বিল নম্বর?</span>
                 </div>
                 {isManualBill && <input type="text" value={manualBillNo} onChange={(e) => setManualBillNo(e.target.value)} placeholder="Bill No..." className="p-3 bg-white border border-slate-200 rounded-xl font-bold flex-1 text-xs text-slate-800 outline-none" />}

                 <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isManualChalan} onChange={(e) => setIsManualChalan(e.target.checked)} className="w-4 h-4 accent-red-600" />
                    <span className="text-xs font-bold text-slate-700">ম্যানুয়াল চালান নম্বর?</span>
                 </div>
                 {isManualChalan && <input type="text" value={manualChalanNo} onChange={(e) => setManualChalanNo(e.target.value)} placeholder="Chalan No..." className="p-3 bg-white border border-slate-200 rounded-xl font-bold flex-1 text-xs text-slate-800 outline-none" />}
               </div>
            )}
            <div className="mt-6 pt-6 border-t flex justify-between items-center">
              <div className="text-2xl font-black text-slate-900">
                {isInHouse ? (
                  <span className="text-red-600 text-sm font-black uppercase tracking-wider bg-red-50 border border-red-100 px-3 py-1 rounded-xl">In-House Transfer</span>
                ) : (
                  `${cart.reduce((acc, item) => acc + item.total, 0)} ৳`
                )}
              </div>
              <button 
                onClick={handleGenerateChallan} 
                disabled={loading || cart.length === 0} 
                className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black shadow-lg hover:bg-red-600 transition-all uppercase tracking-tighter flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Generating...
                  </>
                ) : (
                  "Generate Challan"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showSuccessModal && generatedData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            {billGenerated ? (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">বিল ও চালান তৈরি হয়েছে!</h2>
                  <p className="font-bold text-slate-400 text-xs mt-1 uppercase">বিল নং: {generatedData.chalan.bill_no}</p>
                  <p className="font-bold text-slate-400 text-[10px] uppercase">চালান নং: {generatedData.chalan.chalan_no}</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={() => printBill({ ...generatedData.chalan, bill_no: generatedData.chalan.bill_no, payment_method: generatedData.chalan.payment_method }, generatedData.customer, generatedData.items)} 
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black uppercase text-sm tracking-wider flex items-center justify-center gap-2"
                  >
                    🖨️ প্রিন্ট বিল
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => downloadPDF(generatedData.chalan, generatedData.customer, generatedData.items, 'Bill')} 
                      className="bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold uppercase text-xs"
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
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                <h2 className="text-2xl font-black mb-2">চালান তৈরি হয়েছে!</h2>
                <p className="font-bold text-slate-400 mb-6 uppercase">নং: {generatedData.chalan.chalan_no}</p>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => printChallan(generatedData.chalan, generatedData.customer, generatedData.items)} className="bg-slate-900 text-white py-4 rounded-xl font-bold uppercase text-xs">🖨️ প্রিন্ট চালান</button>
                     <button onClick={() => downloadPDF(generatedData.chalan, generatedData.customer, generatedData.items, 'Challan')} className="bg-red-600 text-white py-4 rounded-xl font-bold uppercase text-xs">📥 ডাউনলোড PDF</button>
                  </div>
                  {!isInHouse && <button onClick={() => setQuickBillMode(true)} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg uppercase tracking-widest">💰 সরাসরি বিল তৈরি করুন</button>}
                  <button onClick={() => setShowSuccessModal(false)} className="mt-2 text-slate-400 font-bold">পরে করবো / বন্ধ করুন</button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <h2 className="text-xl font-black border-b pb-3">বিল কনফার্মেশন</h2>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={isManualBill} onChange={(e) => setIsManualBill(e.target.checked)} />
                    <span className="text-xs font-black text-red-700 uppercase">ম্যানুয়াল বিল নম্বর?</span>
                  </label>
                  {isManualBill && <input type="text" value={manualBillNo} onChange={(e) => setManualBillNo(e.target.value)} placeholder="BLL-OFF-101" className="w-full p-3 bg-white border border-red-200 rounded-xl font-bold uppercase outline-none" />}
                </div>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black outline-none focus:border-red-500 shadow-sm">
                  <option value="">পেমেন্ট মেথড...</option><option value="Cash">Cash (💵)</option><option value="bKash">bKash (📱)</option><option value="Bank">Bank (🏦)</option>
                </select>
                
                <button 
                  onClick={handleQuickBillConfirm} 
                  disabled={loading || !paymentMethod} 
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      প্রসেসিং...
                    </>
                  ) : (
                    "কনফার্ম ও বিল প্রিন্ট"
                  )}
                </button>
                
                <div className="flex justify-center">
                    <button onClick={() => downloadPDF(generatedData.chalan, generatedData.customer, generatedData.items, 'Challan')} className="text-red-600 font-bold text-sm underline">📥 আপাতত চালানটি PDF ডাউনলোড করুন</button>
                </div>

                <button onClick={() => setQuickBillMode(false)} className="w-full text-slate-400 font-bold text-center">পিছনে যান</button>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-5 text-center max-w-xs mx-4 animate-in zoom-in-95 duration-300">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-red-600 animate-spin"></div>
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-wider">Processing Request</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন, ডাটাবেজ আপডেট করা হচ্ছে...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSystem;