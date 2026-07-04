import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { printBill } from '../utils/printBill';
import { downloadPDF } from '../utils/pdfGenerator';

const NawabpurBilling = () => {
  const house = 'Showroom';
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
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isManualBill, setIsManualBill] = useState(false);
  const [manualBillNo, setManualBillNo] = useState('');
  const [manualDate, setManualDate] = useState(''); 
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => { fetchAvailableProducts(); }, []);

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

  const handleDirectBill = async () => {
    if (!phone && !name) return alert('কাস্টমারের তথ্য দিন (নাম বা মোবাইল)!');
    if (cart.length === 0) return alert('কার্টে মাল যোগ করুন!');
    if (!paymentMethod) return alert('পেমেন্ট মেথড সিলেক্ট করুন!');
    if (isManualBill && !manualBillNo) return alert('ম্যানুয়াল বিল নম্বর দিন!');

    setLoading(true);
    try {
      let customerId = null;
      let finalName = name.trim() || 'Walk-in';
      let finalPhone = phone.trim() === '' ? null : phone.trim();
      let finalAddress = address.trim() || null;
      let customerData = { name: finalName, phone: finalPhone, address: finalAddress };

      let existingCust = null;

      // 🔴 কাস্টোমার সেভ করার স্মার্ট লজিক
      if (finalPhone) {
        const { data } = await supabase.from('customers').select('id').eq('phone', finalPhone).maybeSingle();
        existingCust = data;
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
  // 🔴 ফোন না থাকলেও শুধু নাম দিয়ে কাস্টমার টেবিলে এন্ট্রি নেওয়ার অনুমতি দেওয়া হলো
  const { data: newCust, error: custErr } = await supabase.from('customers').insert([{ 
    name: finalName, 
    phone: finalPhone, // এখানে null যাবে যদি ইনপুট খালি থাকে
    address: finalAddress 
  }]).select().single();
  if (!custErr) customerId = newCust?.id;
      }

      const finalBillNo = isManualBill ? manualBillNo : `BLL-${Date.now().toString().slice(-6)}`;
      const chalanNo = `CHL-DIR-${Date.now().toString().slice(-6)}`;
      const finalCreatedAt = manualDate ? new Date(manualDate).toISOString() : new Date().toISOString();

      const { data: chalanData, error: chalanErr } = await supabase.from('chalans').insert([{
        chalan_no: chalanNo, 
        bill_no: finalBillNo,
        status: 'paid',
        payment_method: paymentMethod,
        total_amount: cart.reduce((acc, item) => acc + item.total, 0), 
        house: house, 
        customer_id: customerId,
        customer_name: finalName,
        phone: finalPhone,
        address: finalAddress,
        is_in_house: false,
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

        const { data: p } = await supabase.from('products').select('id, stock_quantity').eq('id', item.product_id).single();
        if (p) {
          await supabase.from('products').update({ stock_quantity: p.stock_quantity - item.qty }).eq('id', p.id);
        }

        itemsForPrint.push({ ...item, quantity: item.qty, total_price: item.total });
      }

      setGeneratedData({ chalan: chalanData, customer: customerData, items: itemsForPrint });
      setShowSuccessModal(true);
      
      setCart([]); setPhone(''); setName(''); setAddress(''); setIsManualBill(false); setManualBillNo(''); setPaymentMethod('Cash'); setManualDate('');
      fetchAvailableProducts();
    } catch (e) { alert("ত্রুটি হয়েছে!"); console.error(e); }
    
    setLoading(false);
  };

  const displayedProducts = products.filter(p => 
    `${p.name} ${p.model}`.toLowerCase().includes(productSearchText.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 p-4" style={{fontFamily: "'Inter', 'Hind Siliguri', sans-serif"}}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-blue-600 p-6 rounded-3xl border shadow-sm text-white gap-4">
        <div>
           <h1 className="text-2xl font-black tracking-tighter">🏪 নওয়াবপুর ডিরেক্ট বিলিং</h1>
           <p className="text-xs text-blue-200 mt-1 uppercase tracking-widest">স্টক থেকে সরাসরি মাইনাস হবে</p>
        </div>
        <div className="bg-blue-700/50 p-3 rounded-xl border border-blue-500 w-full md:w-auto">
           <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Custom Date (ঐচ্ছিক)</label>
           <input type="datetime-local" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="bg-transparent text-white font-bold outline-none w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                           <div className="space-y-4">
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
          </div>
          
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">প্রোডাক্ট নির্বাচন</h2>
            
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
                className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-600"
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
                      className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer font-bold text-sm text-slate-700"
                    >
                      📦 {p.name} - {p.model} <span className="text-blue-600 ml-1">[স্টক: {p.stock_quantity}]</span>
                    </div>
                  )) : (
                    <div className="p-4 text-center text-slate-400 text-sm font-bold">কোনো প্রোডাক্ট পাওয়া যায়নি</div>
                  )}
                </div>
              )}
            </div>

            {/* 🔴 ফিক্স: ফ্লেক্স কলাম করে বাটনটিকে নিচে দেওয়া হলো যাতে ঢাকা না পড়ে */}
            <div className="flex flex-col gap-3">
              <input 
                type="number" 
                value={qty} 
                onChange={(e) => setQty(e.target.value)} 
                placeholder="পরিমাণ (Qty)" 
                className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-600" 
              />
              <button 
                onClick={addToCart} 
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-md"
              >
                ➕ Add Product
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">
                    <th className="pb-4">Item</th><th className="pb-4 text-center w-24">Qty</th><th className="pb-4 text-center w-36">Price</th><th className="pb-4 text-right">Total</th><th className="pb-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 font-bold text-slate-800">{item.name} <span className="text-xs text-slate-400 block font-medium">{item.model}</span></td>
                      <td className="py-4 text-center">
                        <input type="number" value={item.qty} onChange={(e) => handleCartDataChange(idx, 'qty', e.target.value)} className="w-16 p-1 text-center bg-slate-50 border rounded-lg font-black text-xs outline-none" />
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={item.unit_price} onChange={(e) => handleCartDataChange(idx, 'unit_price', e.target.value)} className="w-24 p-1.5 bg-slate-50 border rounded-lg text-right font-bold text-xs outline-none" placeholder="0"/>
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
            <div className="mt-6 pt-6 border-t space-y-4">
               <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-50 p-4 rounded-2xl">
                 <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full md:w-auto flex-1 p-3 bg-white border rounded-xl font-bold outline-none">
                    <option value="">পেমেন্ট মেথড...</option><option value="Cash">Cash</option><option value="bKash">bKash</option><option value="Bank">Bank</option>
                 </select>
                 <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isManualBill} onChange={(e) => setIsManualBill(e.target.checked)} className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500">ম্যানুয়াল বিল?</span>
                 </div>
                 {isManualBill && <input type="text" value={manualBillNo} onChange={(e) => setManualBillNo(e.target.value)} placeholder="Bill No..." className="p-3 bg-white border rounded-xl font-bold w-32" />}
               </div>

              <div className="flex justify-between items-center">
                <div className="text-2xl font-black text-slate-900">{cart.reduce((acc, item) => acc + item.total, 0)} ৳</div>
                <button onClick={handleDirectBill} disabled={loading || cart.length === 0} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all uppercase tracking-tighter">
                  {loading ? 'Processing...' : 'Confirm & Bill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSuccessModal && generatedData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 text-center">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
             <h2 className="text-2xl font-black mb-1">বিল তৈরি হয়েছে!</h2>
             <p className="font-bold text-slate-400 mb-6 uppercase">নং: {generatedData.chalan.bill_no}</p>
             <div className="flex flex-col gap-3">
                <button onClick={() => printBill(generatedData.chalan, generatedData.customer, generatedData.items)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest">🖨️ প্রিন্ট বিল</button>
                <button onClick={() => setShowSuccessModal(false)} className="mt-2 text-slate-400 font-bold">বন্ধ করুন</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NawabpurBilling;