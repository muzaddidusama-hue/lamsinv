import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ServiceManager = () => {
  const [searchNo, setSearchNo] = useState(''); // বিল, চালান বা সিরিয়াল নম্বর সার্চ
  const [record, setRecord] = useState(null); 
  const [inverterItem, setInverterItem] = useState(null); 
  const [serialNumbers, setSerialNumbers] = useState([]); 
  const [saleDate, setSaleDate] = useState(''); 
  const [savedSerials, setSavedSerials] = useState([]); 

  // সেকশন ২-এর জন্য ফর্ম স্টেট
  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 📝 সেকশন ৩ (ডাইরেক্ট সিরিয়াল এন্ট্রি) এর জন্য স্টেটস
  const [standaloneSerial, setStandaloneSerial] = useState('');
  const [standaloneInvType, setStandaloneInvType] = useState('Hybrid');
  const [standaloneInvModel, setStandaloneInvModel] = useState(''); // 🔴 নতুন: মডেল স্টেট
  const [standaloneCustName, setStandaloneCustName] = useState('');
  const [standaloneAddress, setStandaloneAddress] = useState('');
  const [showStandaloneForm, setShowStandaloneForm] = useState(false); // 🔴 নতুন: টগল স্টেট

  // ডাটাবেজের কলাম স্ট্রাকচার অনুযায়ী স্টেট
  const [dbRowData, setDbRowData] = useState({
    bill_no: '', chalan_no: '', inv_type: 'Hybrid', inv_model: '', sl_no: '', customer_name: '', address: '',
    serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
    serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
    serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
    serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
  });

  const [selectedServiceSlot, setSelectedServiceSlot] = useState('1'); 
  const [singleInput, setSingleInput] = useState({
    date: '', problem: '', amount: '', remarks: ''
  });

  // 🔍 অল-ইন-ওয়ান সার্চ (বিল নম্বর / চালান নম্বর / সিরিয়াল নম্বর সরাসরি)
  const handleAllInOneSearch = async (e) => {
    e.preventDefault();
    const queryText = searchNo.trim().toUpperCase();
    if (!queryText) return alert("বিল, চালান অথবা সিরিয়াল নম্বর দিন!");

    setLoading(true);
    setRecord(null); setInverterItem(null); setSerialNumbers([]); setSavedSerials([]); setSaleDate('');
    resetServiceForm();

    try {
      const { data: slData } = await supabase.from('inv_sl').select('*').eq('sl_no', queryText).maybeSingle();
      
      let targetChalanNo = queryText;
      let targetBillNo = queryText;

      if (slData) {
        setDbRowData(slData);
        determineNextAvailableSlot(slData);
        targetChalanNo = slData.chalan_no;
        targetBillNo = slData.bill_no;
      }

      const { data: mainData } = await supabase
        .from('chalans')
        .select(`*, customers (*)`)
        .or(`chalan_no.eq.${targetChalanNo},bill_no.eq.${targetBillNo}`)
        .maybeSingle();

      if (mainData) {
        setRecord(mainData);
        setSaleDate(mainData.created_at ? new Date(mainData.created_at).toLocaleDateString('bn-BD') : 'পাওয়া যায়নি');

        const { data: itemData } = await supabase.from('chalan_items').select(`*, products (*)`).eq('chalan_id', mainData.id);
        const inverter = itemData?.find(item => item.products?.category?.toLowerCase().includes('inverter') || item.products?.name?.toLowerCase().includes('inverter'));

        if (inverter) {
          setInverterItem(inverter);
          const { data: existingSerials } = await supabase.from('inv_sl').select('sl_no').eq('chalan_no', mainData.chalan_no);
          
          const dbSerials = existingSerials ? existingSerials.map(s => s.sl_no.toUpperCase()) : [];
          setSavedSerials(dbSerials); 
          
          const mergedSerials = Array.from({ length: inverter.quantity }, (_, index) => dbSerials[index] || "");
          setSerialNumbers(mergedSerials);
        }
      } else {
        if (slData) {
          setDbRowData(slData);
          determineNextAvailableSlot(slData);
        } else {
          alert("⚠️ এই নম্বর দিয়ে কোনো চালান, বিল বা সিরিয়াল রেকর্ড খুঁজে পাওয়া যায়নি!");
        }
      }
    } catch (error) { console.error(error); alert("তথ্য লোড করতে সমস্যা হয়েছে!"); }
    setLoading(false);
  };

  // 📝 সেকশন ১: রেগুলার চালানের সিরিয়াল ডাটাবেজে সরাসরি সেভ করা
  const handleRegisterSerial = async (index) => {
    const currentSerial = serialNumbers[index]?.trim().toUpperCase();
    if (!currentSerial) return alert("অনুগ্রহ করে সিরিয়াল নম্বরটি ইনপুট দিন!");
    
    setServiceLoading(true);
    resetServiceForm();

    try {
      const { data, error } = await supabase.from('inv_sl').select('*').eq('sl_no', currentSerial).maybeSingle();
      if (error) throw error;

      if (data) {
        setDbRowData(data);
        determineNextAvailableSlot(data);
        alert(`ℹ️ সিরিয়াল নম্বর ${currentSerial}-এর তথ্য লোড হয়েছে।`);
      } else {
        const freshRow = {
          bill_no: record?.bill_no || 'N/A',
          chalan_no: record?.chalan_no || 'N/A',
          inv_type: inverterItem?.products?.name?.toLowerCase().includes('on-grid') ? 'On-Grid' : 'Hybrid',
          inv_model: inverterItem?.products?.model || 'N/A',
          sl_no: currentSerial,
          customer_name: record?.customers?.name || 'Walk-in',
          address: record?.customers?.address || 'N/A'
        };
        const { error: insertErr } = await supabase.from('inv_sl').insert([freshRow]);
        if (insertErr) throw insertErr;

        setDbRowData(freshRow);
        setSavedSerials(prev => [...prev, currentSerial]); 
        setSelectedServiceSlot('1');
        alert(`✅ সিরিয়াল নম্বর ${currentSerial} সফলভাবে এন্ট্রি হয়েছে!`);
      }
    } catch (error) { console.error(error); alert("সিরিয়াল এন্ট্রি করতে সমস্যা হয়েছে!"); }
    setServiceLoading(false);
  };

  // 📥 সেকশন ৩: ডাইরেক্ট সিরিয়াল এন্ট্রি (বিনা চালানে কাস্টোমার ও মডেল ডাটা সহ)
  const handleStandaloneSerialSubmit = async (e) => {
    e.preventDefault();
    const sl = standaloneSerial.trim().toUpperCase();
    const invModel = standaloneInvModel.trim();
    const custName = standaloneCustName.trim();
    const custAddr = standaloneAddress.trim();

    if (!sl) return alert("সিরিয়াল নম্বর দিন!");
    if (!invModel) return alert("ইনভার্টার মডেল মেনশন করুন!");
    if (!custName) return alert("কাস্টোমারের নাম দিন!");

    setLoading(true);
    setRecord(null); setInverterItem(null); setSerialNumbers([]); setSavedSerials([]); setSaleDate('');
    resetServiceForm();

    try {
      const { data, error } = await supabase.from('inv_sl').select('*').eq('sl_no', sl).maybeSingle();
      if (error) throw error;

      if (data) {
        setDbRowData(data);
        determineNextAvailableSlot(data);
        alert("ℹ️ এই সিরিয়াল নম্বরের রেকর্ড অলরেডি ডাটাবেজে বিদ্যমান রয়েছে!");
      } else {
        // 💾 নতুন কাস্টোমার ও ইনভার্টার মডেল সহ পে-লোড
        const freshRow = {
          bill_no: 'N/A', 
          chalan_no: 'N/A', 
          inv_type: standaloneInvType,
          inv_model: invModel, // কাস্টম মডেল সেভ হবে
          sl_no: sl,
          customer_name: custName,
          address: custAddr || 'N/A'
        };
        const { error: insErr } = await supabase.from('inv_sl').insert([freshRow]);
        if (insErr) throw insErr;
        
        setDbRowData(freshRow);
        setSelectedServiceSlot('1');
        alert("✅ নতুন কাস্টোমার ও সিরিয়াল রেকর্ড সফলভাবে যুক্ত করা হয়েছে!");
      }
    } catch (err) { console.error(err); alert("ত্রুটি হয়েছে!"); }
    setLoading(false);
    setStandaloneSerial('');
    setStandaloneInvModel('');
    setStandaloneCustName('');
    setStandaloneAddress('');
  };

  const determineNextAvailableSlot = (data) => {
    if (!data.serv_1_date) setSelectedServiceSlot('1');
    else if (!data.serv_2_date) setSelectedServiceSlot('2');
    else if (!data.serv_3_date) setSelectedServiceSlot('3');
    else if (!data.serv_4_date) setSelectedServiceSlot('4');
    else setSelectedServiceSlot('1');
  };

  const resetServiceForm = () => {
    setSingleInput({ date: '', problem: '', amount: '', remarks: '' });
    setIsEditing(false);
  };

  const handleEditClick = (slotNum) => {
    const slotStr = slotNum.toString();
    setIsEditing(true);
    setSelectedServiceSlot(slotStr);
    setSingleInput({
      date: dbRowData[`serv_${slotStr}_date`] || '',
      problem: dbRowData[`serv_${slotStr}_problem`] || '',
      amount: dbRowData[`serv_${slotStr}_amount`] || '',
      remarks: dbRowData[`remarks${slotStr}`] || '',
    });
  };

  const handleSingleInputChange = (e) => {
    const { name, value } = e.target;
    setSingleInput(prev => ({ ...prev, [name]: value }));
  };

  const handleSlotChange = (e) => {
    const slotStr = e.target.value;
    setSelectedServiceSlot(slotStr);
    if (dbRowData[`serv_${slotStr}_date`]) {
      setSingleInput({
        date: dbRowData[`serv_${slotStr}_date`] || '',
        problem: dbRowData[`serv_${slotStr}_problem`] || '',
        amount: dbRowData[`serv_${slotStr}_amount`] || '',
        remarks: dbRowData[`remarks${slotStr}`] || '',
      });
    } else {
      setSingleInput({ date: '', problem: '', amount: '', remarks: '' });
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!dbRowData.sl_no?.trim()) return alert("প্রথমে একটি সিরিয়াল নম্বর লোড করুন!");
    if (!singleInput.date || !singleInput.problem) return alert("তারিখ এবং সমস্যার বিবরণ আবশ্যিক!");

    setSubmitting(true);
    const slot = selectedServiceSlot;

    const updatedDbRow = {
      ...dbRowData,
      [`serv_${slot}_date`]: singleInput.date,
      [`serv_${slot}_problem`]: singleInput.problem,
      [`serv_${slot}_amount`]: singleInput.amount || '',
      [`remarks${slot}`]: singleInput.remarks,
    };

    try {
      const { error: updateErr } = await supabase
        .from('inv_sl')
        .update({
          [`serv_${slot}_date`]: singleInput.date,
          [`serv_${slot}_problem`]: singleInput.problem,
          [`serv_${slot}_amount`]: singleInput.amount || '',
          [`remarks${slot}`]: singleInput.remarks,
        })
        .eq('sl_no', updatedDbRow.sl_no);

      if (updateErr) throw updateErr;

      alert(`✅ 서비스 রেকর্ড-০${slot} সফলভাবে সেভ হয়েছে!`);
      setDbRowData(updatedDbRow);
      resetServiceForm();
      determineNextAvailableSlot(updatedDbRow);

    } catch (error) { console.error(error); alert("সংরক্ষণ করতে ত্রুটি হয়েছে!"); }
    setSubmitting(false);
  };

  const isSlotLocked = (slotNum) => {
    if (isEditing && selectedServiceSlot === slotNum.toString()) return false; 
    return !!dbRowData[`serv_${slotNum}_date`]; 
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 p-4" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* 🔍 গ্লোবাল সার্চ বার */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <form onSubmit={handleAllInOneSearch} className="flex gap-4">
          <input 
            type="text" 
            value={searchNo} 
            onChange={(e) => setSearchNo(e.target.value)} 
            placeholder="বিল, চালান অথবা সিরিয়াল নম্বর সরাসরি সার্চ করুন..." 
            className="flex-1 h-14 px-6 bg-slate-50 border rounded-2xl font-black text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-600" 
          />
          <button type="submit" disabled={loading} className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors">
            {loading ? 'খোঁজা হচ্ছে...' : 'সার্চ করুন'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ==================== লেফট কলাম (সেকশন ১ এবং ৩) ==================== */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* সেকশন ১: ইনভার্টারের বিবরণ */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider border-b pb-2">
              ১. ইনভার্টার ও বিক্রয়ের বিবরণ
            </h3>
            
            {dbRowData.sl_no || record ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold uppercase text-blue-500">ইনভার্টার টাইপ / নাম</p>
                  <p className="text-base font-black">
                    {inverterItem?.products?.name || `${dbRowData.inv_type} Inverter`}
                  </p>
                  {/* 🔴 ফিক্স: রেগুলার প্রোডাক্টের মডেল অথবা ৩ নং সেকশনের ম্যানুয়াল মডেল দুইটাই এখানে ডাইনামিকালি শো করবে */}
                  {(inverterItem?.products?.model || dbRowData.inv_model) && (
                    <p className="text-xs font-medium text-blue-600">
                      মডেল: {inverterItem?.products?.model || dbRowData.inv_model}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border">
                  <div><span className="text-slate-400 block">বিক্রয়ের তারিখ</span><span className="font-black text-slate-700 text-sm">{saleDate || 'বিনা চালানে এন্ট্রি'}</span></div>
                  <div><span className="text-slate-400 block">ওয়ারেন্টি কাল</span><span className="font-black text-slate-700 text-sm">{inverterItem?.products?.warranty || '১ বছর'}</span></div>
                  <div className="pt-2 border-t col-span-2">
                    <span className="text-slate-400 block">গ্রাহকের নাম</span>
                    <span className="font-black text-slate-800">{record?.customers?.name || dbRowData?.customer_name || 'Walk-in'}</span>
                  </div>
                  <div className="pt-2 border-t col-span-2">
                    <span className="text-slate-400 block">📍 ঠিকানা</span>
                    <span className="font-bold text-slate-600 text-xs">{record?.customers?.address || dbRowData?.address || 'N/A'}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-slate-400 block">চালান নং</span>
                    <span className="font-bold text-slate-600 text-xs">{dbRowData.chalan_no || '—'}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-slate-400 block">বিল নং</span>
                    <span className="font-bold text-slate-600 text-xs">{dbRowData.bill_no || '—'}</span>
                  </div>
                </div>

                {serialNumbers.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-dashed">
                    <p className="text-[11px] font-black text-slate-500 uppercase">ইনভার্টার সিরিয়াল নম্বরসমূহ:</p>
                    {serialNumbers.map((serial, index) => {
                      const isExisting = serial !== "" && savedSerials.includes(serial.trim().toUpperCase());
                      return (
                        <div key={index} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border">
                          <span className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center font-black text-[10px] text-slate-600">#{index + 1}</span>
                          <input 
                            type="text" value={serial} disabled={isExisting} 
                            onChange={(e) => { const updated = [...serialNumbers]; updated[index] = e.target.value; setSerialNumbers(updated); }}
                            placeholder="সিরিয়াল দিন"
                            className={`flex-1 p-1 bg-white border rounded font-bold uppercase text-xs outline-none ${isExisting ? 'bg-slate-100 text-slate-800 border-green-200 font-black' : 'focus:border-blue-600'}`}
                          />
                          <button 
                            type="button" onClick={() => handleRegisterSerial(index)} disabled={serviceLoading || isExisting}
                            className={`px-3 py-1 text-[10px] font-black rounded text-white transition-colors ${isExisting ? 'bg-green-600 opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            {isExisting ? '✅ সেভড' : 'এন্ট্রি'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-300 italic text-sm">চালান অথবা সিরিয়াল সার্চ করলে এখানে ডিটেইলস আসবে।</div>
            )}
          </div>

          {/* 🔴 ৩. ডাইরেক্ট সিরিয়াল এন্ট্রি (কলালাক্সিবল ও মডেল ফিল্ড সহ) */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <h3 
              onClick={() => setShowStandaloneForm(!showStandaloneForm)} 
              className="text-sm font-black text-slate-400 uppercase tracking-wider border-b pb-2 flex justify-between items-center cursor-pointer select-none hover:text-slate-600 transition-colors"
            >
              <span>৩. ডাইরেক্ট সিরিয়াল এন্ট্রি (বিনা চালানে)</span>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-bold">
                {showStandaloneForm ? 'বন্ধ করুন 🔼' : 'খুলুন 🔽'}
              </span>
            </h3>
            
            {showStandaloneForm && (
              <form onSubmit={handleStandaloneSerialSubmit} className="space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">ইনভার্টার টাইপ</label>
                  <select value={standaloneInvType} onChange={(e) => setStandaloneInvType(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs outline-none">
                    <option value="Hybrid">Hybrid Inverter</option>
                    <option value="On-Grid">On-Grid Inverter</option>
                  </select>
                </div>
                {/* 🔴 নতুন ইনপুট ফিল্ড: ইনভার্টার মডেল */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">ইনভার্টার মডেল</label>
                  <input 
                    type="text" value={standaloneInvModel} onChange={(e) => setStandaloneInvModel(e.target.value)} 
                    placeholder="যেমন: Talegent V IV 5.6KW" 
                    className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-600" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">সিরিয়াল নম্বর (S/N)</label>
                  <input 
                    type="text" value={standaloneSerial} onChange={(e) => setStandaloneSerial(e.target.value)} 
                    placeholder="যেমন: SN-998877" 
                    className="w-full p-3 bg-white border rounded-xl font-bold text-xs uppercase outline-none focus:border-blue-600" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">কাস্টোমারের নাম</label>
                  <input 
                    type="text" value={standaloneCustName} onChange={(e) => setStandaloneCustName(e.target.value)} 
                    placeholder="নাম লিখুন" 
                    className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-600" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 block uppercase mb-1">ঠিকানা (Address)</label>
                  <input 
                    type="text" value={standaloneAddress} onChange={(e) => setStandaloneAddress(e.target.value)} 
                    placeholder="ঠিকানা লিখুন" 
                    className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-600" 
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl transition-all shadow-sm">
                  {loading ? 'প্রসেসিং...' : '➕ সরাসরি ডাটাবেজে যুক্ত করুন'}
                </button>
              </form>
            )}
          </div>

        </div>

        {/* ==================== রাইট কলাম (সেকশন ২: সার্ভিস ম্যানেজার) ==================== */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
            
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>২. সার্ভিস ম্যানেজার উইন্ডো</span>
                {dbRowData.sl_no && (
                  <span className="bg-blue-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                    S/N: {dbRowData.sl_no}
                  </span>
                )}
              </h3>
            </div>

            {dbRowData.sl_no ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <h4 className="font-black text-slate-800 text-sm">
                      {isEditing ? '📝 রেকর্ড এডিট মোড' : '📥 নতুন সার্ভিস ইনপুট ঘর'}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500">রেকর্ড স্লট:</label>
                    <select value={selectedServiceSlot} onChange={handleSlotChange} disabled={isEditing} className="p-1 bg-white border rounded-lg text-xs font-black text-slate-800 outline-none">
                      <option value="1">সার্ভिस রেকর্ড ০১ {isSlotLocked('1') ? '🔒 (Locked)' : ''}</option>
                      <option value="2">সার্ভিস রেকর্ড ০২ {isSlotLocked('2') ? '🔒 (Locked)' : ''}</option>
                      <option value="3">সার্ভিস রেকর্ড ০৩ {isSlotLocked('3') ? '🔒 (Locked)' : ''}</option>
                      <option value="4">সার্ভিস রেকর্ড ০৪ {isSlotLocked('4') ? '🔒 (Locked)' : ''}</option>
                    </select>
                  </div>
                </div>

                {isSlotLocked(selectedServiceSlot) ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-amber-800 text-xs font-bold">
                    🔒 এই সার্ভিস স্লটটি লক করা আছে। তথ্য পরিবর্তন করতে নিচের টেবিল থেকে "এডিট" বাটন চাপুন।
                  </div>
                ) : (
                  <form onSubmit={handleSaveService} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 block uppercase">তারিখ (Date)</label>
                        <input type="text" name="date" placeholder="DD-MM-YYYY" value={singleInput.date} onChange={handleSingleInputChange} className="w-full p-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-600" required />
                      </div>
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 block uppercase">বিল অ্যামাউন্ট (৳)</label>
                        <input type="text" name="amount" placeholder="টাকা" value={singleInput.amount} onChange={handleSingleInputChange} className="w-full p-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
                      </div>
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 block uppercase">মন্তব্য (Remarks)</label>
                        <input type="text" name="remarks" placeholder="নোট" value={singleInput.remarks} onChange={handleSingleInputChange} className="w-full p-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 block uppercase">সমস্যা (Problem)</label>
                      <textarea name="problem" placeholder="কী সমস্যা হয়েছিল বিস্তারিত লিখুন..." value={singleInput.problem} onChange={handleSingleInputChange} className="w-full p-2.5 bg-white border rounded-xl font-bold text-xs outline-none min-h-[50px] max-h-[80px]" required />
                    </div>

                    <div className="flex gap-2 justify-end">
                      {isEditing && (
                        <button type="button" onClick={resetServiceForm} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">বাতিল</button>
                      )}
                      <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-sm">
                        {submitting ? 'সেভ হচ্ছে...' : isEditing ? '🔄 আপডেট করুন' : '📥 সেভ সার্ভিস'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-300 italic text-sm">
                প্রথমে বাম পাশ বা ৩ নং সেকশন থেকে কোনো সিরিয়াল নম্বর লোড করুন।
              </div>
            )}

            {/* 📊 ৪টি সার্ভিসের কমপ্লিট ডাটা টেবিল ভিউ */}
            {dbRowData.sl_no && (
              <div className="space-y-3">
                <h4 className="font-black text-slate-700 text-xs uppercase tracking-wider px-1">📊 সার্ভিসের ইতিহাস তালিকা</h4>
                <div className="overflow-x-auto border rounded-2xl bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider border-b">
                        <th className="p-3 text-center">রেকর্ড</th>
                        <th className="p-3">তারিখ</th>
                        <th className="p-3">সমস্যার বিবরণ</th>
                        <th className="p-3 text-right">বিল (৳)</th>
                        <th className="p-3">মন্তব্য</th>
                        <th className="p-3 text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y font-medium text-slate-700">
                      {[1, 2, 3, 4].map((num) => {
                        const date = dbRowData[`serv_${num}_date`];
                        const problem = dbRowData[`serv_${num}_problem`]; 
                        const amount = dbRowData[`serv_${num}_amount`];
                        const remarks = dbRowData[`remarks${num}`];

                        return (
                          <tr key={num} className={date ? "hover:bg-slate-50 transition-colors" : "bg-slate-50/50 text-slate-300"}>
                            <td className="p-3 text-center font-black">০{num}</td>
                            <td className="p-3 font-bold">{date || '—'}</td>
                            <td className="p-3 max-w-xs truncate">{problem || 'কোনো রেকর্ড নেই'}</td>
                            <td className="p-3 text-right font-black">{amount || '—'}</td>
                            <td className="p-3 max-w-[120px] truncate">{remarks || '—'}</td>
                            <td className="p-3 text-center">
                              {date ? (
                                <button 
                                  type="button" 
                                  onClick={() => handleEditClick(num)}
                                  className="px-3 py-1 bg-slate-900 text-white rounded-lg font-bold text-[10px] hover:bg-orange-600 transition-colors"
                                >
                                  📝 এডিট
                                </button>
                              ) : (
                                <span className="text-[10px] italic text-slate-300">ফাঁকা স্লট</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default ServiceManager;