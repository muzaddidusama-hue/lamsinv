import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const ServiceManager = () => {
  const [searchNo, setSearchNo] = useState(''); // বিল/চালান সার্চ
  const [record, setRecord] = useState(null); 
  const [inverterItem, setInverterItem] = useState(null); 
  const [serialNumbers, setSerialNumbers] = useState([]); // চালানের আন্ডারে সিরিয়াল তালিকা

  // সেকশন ২-এর জন্য সিরিয়াল সার্চ ও ফর্ম স্টেট
  const [globalSerialSearch, setGlobalSerialSearch] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // এডিট মোড ট্র্যাক করার স্টেট
  const [isEditing, setIsEditing] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(true); // ডাটাবেজে রো-টি একদম নতুন কি না ট্র্যাক করার জন্য

  // ডাটাবেজের কলাম স্ট্রাকচার অনুযায়ী স্টেট (সব ডাটা টেক্সট হিসেবে হ্যান্ডেল হবে)
  const [dbRowData, setDbRowData] = useState({
    bill_no: '', chalan_no: '', inv_type: 'Hybrid', sl_no: '',
    serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
    serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
    serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
    serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
  });

  // সিঙ্গেল ইনপুট বক্সের জন্য স্টেট
  const [selectedServiceSlot, setSelectedServiceSlot] = useState('1'); 
  const [singleInput, setSingleInput] = useState({
    date: '',
    problem: '',
    amount: '',
    remarks: ''
  });

  // চালান বা বিল নম্বর দিয়ে সার্চ
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchNo.trim()) return alert("চালান বা বিল নম্বর দিন!");

    setLoading(true);
    setRecord(null);
    setInverterItem(null);
    setSerialNumbers([]);
    resetServiceForm();

    const queryText = searchNo.trim().toUpperCase();

    try {
      const { data: mainData, error: mainErr } = await supabase
        .from('chalans')
        .select(`*, customers (*)`)
        .or(`chalan_no.eq.${queryText},bill_no.eq.${queryText}`)
        .maybeSingle();

      if (mainErr) throw mainErr;
      if (!mainData) {
        alert("কোনো চালান বা বিল খুঁজে পাওয়া যায়নি!");
        setLoading(false);
        return;
      }

      setRecord(mainData);

      const { data: itemData, error: itemErr } = await supabase
        .from('chalan_items')
        .select(`*, products (*)`)
        .eq('chalan_id', mainData.id);

      if (itemErr) throw itemErr;

      const inverter = itemData?.find(item => 
        item.products?.category?.toLowerCase().includes('inverter') || 
        item.products?.name?.toLowerCase().includes('inverter')
      );

      if (inverter) {
        setInverterItem(inverter);
        setSerialNumbers(Array.from({ length: inverter.quantity }, () => ""));
        
        setDbRowData(prev => ({
          ...prev,
          bill_no: mainData.bill_no || '',
          chalan_no: mainData.chalan_no || '',
          inv_type: inverter.products?.name?.toLowerCase().includes('on-grid') ? 'On-Grid' : 'Hybrid'
        }));
      } else {
        alert("⚠️ এই বিলে কোন ইনভার্টার নেই!");
      }

    } catch (error) {
      console.error(error);
      alert("তথ্য লোড করতে সমস্যা হয়েছে!");
    }
    setLoading(false);
  };

  // সেকশন ১ থেকে সিরিয়াল কুইক লোড
  const handleRegisterSerial = (index, event) => {
    event.preventDefault();
    const currentSerial = serialNumbers[index]?.trim().toUpperCase();
    if (!currentSerial) return alert("অনুগ্রহ করে সিরিয়াল নম্বরটি ইনপুট দিন!");
    setGlobalSerialSearch(currentSerial);
    fetchSerialData(currentSerial);
  };

  // সিরিয়াল নম্বর দিয়ে সরাসরি সার্চ (সেকশন ২)
  const handleDirectSerialSearch = (e) => {
    e.preventDefault();
    if (!globalSerialSearch.trim()) return alert("ইনভার্টারের সিরিয়াল নম্বর দিন!");
    fetchSerialData(globalSerialSearch.trim().toUpperCase());
  };

  // ডাটাবেজ থেকে সিরিয়ালের ডাটা তুলে আনা (ফিক্সড সেভ/আপডেট মেকানিজম)
  const fetchSerialData = async (serialNo) => {
    setServiceLoading(true);
    resetServiceForm();
    try {
      const { data, error } = await supabase
        .from('inv_sl')
        .select('*')
        .eq('sl_no', serialNo)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDbRowData(data);
        setIsNewRecord(false); // রেকর্ড আগে থেকে আছে, তাই পরবর্তীতে update কোয়েরি হবে
        determineNextAvailableSlot(data);
      } else {
        // নতুন রেকর্ড হলে মেটাডাটা সহ স্ট্রাকচার রেডি করা
        const freshRow = {
          bill_no: record?.bill_no || '',
          chalan_no: record?.chalan_no || '',
          inv_type: inverterItem?.products?.name?.toLowerCase().includes('on-grid') ? 'On-Grid' : 'Hybrid',
          sl_no: serialNo,
          serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
          serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
          serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
          serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
        };
        setDbRowData(freshRow);
        setIsNewRecord(true); // রেকর্ডটি একদম নতুন, তাই প্রথমবার insert কোয়েরি হবে
        setSelectedServiceSlot('1');
      }
    } catch (error) {
      console.error(error);
      alert("সিরিয়াল ডাটা লোড করতে সমস্যা হয়েছে!");
    }
    setServiceLoading(false);
  };

  // পরবর্তী খালি সার্ভিস স্লটটি অটো খুঁজে বের করার লজিক
  const determineNextAvailableSlot = (data) => {
    if (!data.serv_1_date) setSelectedServiceSlot('1');
    else if (!data.serv_2_date) setSelectedServiceSlot('2');
    else if (!data.serv_3_date) setSelectedServiceSlot('3');
    else if (!data.serv_4_date) setSelectedServiceSlot('4');
    else setSelectedServiceSlot('1');
  };

  // ফর্ম ক্লিয়ারিং হেল্পার
  const resetServiceForm = () => {
    setSingleInput({ date: '', problem: '', amount: '', remarks: '' });
    setIsEditing(false);
  };

  // টেবিল থেকে কোনো রো এডিট করতে চাইলে তা ফর্মে পুশ করা
  const handleEditClick = (slotNum) => {
    const slotStr = slotNum.toString();
    setIsEditing(true);
    setSelectedServiceSlot(slotStr);
    
    setSingleInput({
      date: dbRowData[`serv_${slotStr}_date`] || '',
      problem: dbRowData[`serv_${slotStr}_problem`] || '',
      amount: dbRowData[`serv_${slotStr}_amount`] || '', // আপনার ডাটাবেজ অনুযায়ী এটি সরাসরি টেক্সট
      remarks: dbRowData[`remarks${slotStr}`] || '',
    });
  };

  // সিঙ্গল ইনপুট ফিল্ড চেঞ্চ হ্যান্ডলার
  const handleSingleInputChange = (e) => {
    const { name, value } = e.target;
    setSingleInput(prev => ({ ...prev, [name]: value }));
  };

  // স্লট ড্রপডাউন ম্যানুয়ালি পরিবর্তন করলে স্টেট সিঙ্ক করা
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

  // 💾 ডাটাবেজে ডাটা সংরক্ষণ লজিক (অন-কনফ্লিক্ট এরর ফিক্সড মেথড)
  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!dbRowData.sl_no?.trim()) return alert("প্রথমে একটি সিরিয়াল নম্বর সার্চ বা লোড করুন!");
    if (!singleInput.date || !singleInput.problem) return alert("তারিখ এবং সমস্যার বিবরণ আবশ্যিক!");

    setSubmitting(true);
    const slot = selectedServiceSlot;

    // নতুন অবজেক্ট স্টেট প্রিপেয়ার করা (সব ডাটা টেক্সট হিসেবে যাবে)
    const updatedDbRow = {
      ...dbRowData,
      sl_no: dbRowData.sl_no.trim().toUpperCase(),
      [`serv_${slot}_date`]: singleInput.date,
      [`serv_${slot}_problem`]: singleInput.problem,
      [`serv_${slot}_amount`]: singleInput.amount || '', // টেক্সট ফরম্যাট বহাল রাখা হলো
      [`remarks${slot}`]: singleInput.remarks,
    };

    try {
      if (isNewRecord) {
        // ১. রেকর্ড একদম নতুন হলে ডাটাবেজে প্রথমবার Insert হবে
        const { error: insertErr } = await supabase
          .from('inv_sl')
          .insert([updatedDbRow]);

        if (insertErr) throw insertErr;
        setIsNewRecord(false); // সফলভাবে ইনসার্ট হওয়ার পর এটি পুরাতন রেকর্ড হয়ে গেল
      } else {
        // ২. রেকর্ড আগে থেকে থাকলে অন-কনফ্লিক্ট ছাড়া নির্দিষ্ট sl_no ধরে সরাসরি Update হবে (যা আপনার এরর দূর করবে)
        const { error: updateErr } = await supabase
          .from('inv_sl')
          .update(updatedDbRow)
          .eq('sl_no', updatedDbRow.sl_no);

        if (updateErr) throw updateErr;
      }

      alert(`✅ সার্ভিস রেকর্ড-০${slot} সফলভাবে ডাটাবেজে সংরক্ষণ করা হয়েছে!`);
      setDbRowData(updatedDbRow); // টেবিল লাইভ রি-রেন্ডার হবে
      resetServiceForm();
      determineNextAvailableSlot(updatedDbRow);

    } catch (error) {
      console.error(error);
      alert("সংরক্ষণ করতে ত্রুটি হয়েছে: " + error.message);
    }
    setSubmitting(false);
  };

  // নির্দিষ্ট স্লট লকড কি না চেক করার মেথড
  const isSlotLocked = (slotNum) => {
    if (isEditing && selectedServiceSlot === slotNum.toString()) return false; 
    return !!dbRowData[`serv_${slotNum}_date`]; 
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 p-4" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* 🔍 চালান/বিল সার্চ বার */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input 
            type="text" 
            value={searchNo} 
            onChange={(e) => setSearchNo(e.target.value)} 
            placeholder="বিল বা চালান নম্বর দিন (যেমন: BILL-530391)" 
            className="flex-1 h-14 px-6 bg-slate-50 border rounded-2xl font-black text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-600" 
          />
          <button type="submit" disabled={loading} className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors">
            {loading ? 'খোঁজা হচ্ছে...' : 'চালান সার্চ'}
          </button>
        </form>
      </div>

      {/* মেইন ড্যাশবোর্ড গ্রিড */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ==================== সেকশন ১: ইনভার্টারের বিবরণ ও চালান লিস্ট ==================== */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 min-h-[400px]">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider border-b pb-2">
              ১. চালানের ইনভার্টার তালিকা
            </h3>
            
            {record ? (
              inverterItem ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold uppercase text-blue-500">ইনভার্টারモデル</p>
                    <p className="text-base font-black">{inverterItem.products?.name}</p>
                    <p className="text-xs font-medium text-blue-600">Model: {inverterItem.products?.model}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 block">মোট পরিমাণ</span>
                      <span className="font-black text-slate-700 text-sm">{inverterItem.quantity} Pcs</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">ওয়ারেন্টি কাল</span>
                      <span className="font-black text-slate-700 text-sm">{inverterItem.products?.warranty || '১ বছর'}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-dashed">
                    <p className="text-[11px] font-black text-slate-500 uppercase">সিরিয়াল নম্বর লিখে "লোড করুন" চাপুন:</p>
                    {serialNumbers.map((serial, index) => (
                      <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border">
                        <span className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center font-black text-[10px] text-slate-600">
                          #{index + 1}
                        </span>
                        <input 
                          type="text"
                          value={serial}
                          onChange={(e) => {
                            const updated = [...serialNumbers];
                            updated[index] = e.target.value;
                            setSerialNumbers(updated);
                          }}
                          placeholder={`সিরিয়াল দিন`}
                          className="flex-1 p-1.5 bg-white border rounded font-bold uppercase text-xs outline-none focus:border-blue-600"
                        />
                        <button 
                          type="button"
                          onClick={(e) => handleRegisterSerial(index, e)}
                          className="px-2 py-1.5 text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          লোড
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-red-50 border border-red-100 rounded-2xl">
                  <p className="font-black text-red-600 text-sm">⚠️ এই বিলে কোন ইনভার্টার নেই</p>
                </div>
              )
            ) : (
              <div className="text-center py-12 text-slate-300 italic text-sm">
                চালান সার্চ দিলে ইনভার্টারের বিবরণ এখানে আসবে।
              </div>
            )}
          </div>
        </div>

        {/* ==================== সেকশন ২: সিঙ্গেল ইনপুট সেগমেন্ট ও ডাটা টেবিল ভিউ ==================== */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
            
            {/* সিরিয়াল সার্চ বার */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span>২. সার্ভিস ম্যানেজার উইন্ডো</span>
                  {dbRowData.sl_no && (
                    <span className="bg-blue-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                      S/N: {dbRowData.sl_no}
                    </span>
                  )}
                </h3>
              </div>
              
              <form onSubmit={handleDirectSerialSearch} className="flex gap-2 w-full md:w-auto max-w-sm">
                <input 
                  type="text"
                  value={globalSerialSearch}
                  onChange={(e) => setGlobalSerialSearch(e.target.value)}
                  placeholder="সরাসরি ইনভার্টার সিরিয়াল দিয়ে সার্চ..."
                  className="w-full md:w-56 p-2.5 bg-slate-50 border rounded-xl font-bold uppercase text-xs outline-none focus:ring-1 focus:ring-blue-600"
                />
                <button type="submit" disabled={serviceLoading} className="bg-slate-900 text-white px-4 rounded-xl text-xs font-bold hover:bg-slate-800 whitespace-nowrap">
                  {serviceLoading ? 'খোঁজা হচ্ছে...' : 'সিরিয়াল সার্চ'}
                </button>
              </form>
            </div>

            {/* একক (Single) সার্ভিস ইনপুট ফর্ম সেগমেন্ট */}
            {dbRowData.sl_no && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <h4 className="font-black text-slate-800 text-sm">
                      {isEditing ? '📝 রেকর্ড এডিট মোড' : '📥 নতুন সার্ভিস ইনপুট ঘর'}
                    </h4>
                  </div>
                  
                  {/* সার্ভিস স্লট সিলেক্টর */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500">রেকর্ড স্লট:</label>
                    <select
                      value={selectedServiceSlot}
                      onChange={handleSlotChange}
                      disabled={isEditing} 
                      className="p-1 bg-white border rounded-lg text-xs font-black text-slate-800 outline-none"
                    >
                      <option value="1">সার্ভিস রেকর্ড ০১ {isSlotLocked('1') ? '🔒 (Locked)' : ''}</option>
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
                        <input 
                          type="text" 
                          name="date" 
                          placeholder="DD-MM-YYYY" 
                          value={singleInput.date} 
                          onChange={handleSingleInputChange} 
                          className="w-full p-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-600" 
                          required 
                        />
                      </div>
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 block uppercase">বিল অ্যামাউন্ট (৳)</label>
                        <input 
                          type="text"  // টেক্সট ডাটা টাইপ সিঙ্ক করার জন্য টেক্সট ইনপুট রাখা হলো
                          name="amount" 
                          placeholder="টাকা" 
                          value={singleInput.amount} 
                          onChange={handleSingleInputChange} 
                          className="w-full p-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-600" 
                        />
                      </div>
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 block uppercase">মন্তব্য (Remarks)</label>
                        <input 
                          type="text" 
                          name="remarks" 
                          placeholder="নোট" 
                          value={singleInput.remarks} 
                          onChange={handleSingleInputChange} 
                          className="w-full p-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-blue-600" 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 block uppercase">সমস্যা (Problem)</label>
                      <textarea 
                        name="problem" 
                        placeholder="কী সমস্যা হয়েছিল বিস্তারিত এখানে লিখুন..." 
                        value={singleInput.problem} 
                        onChange={handleSingleInputChange} 
                        className="w-full p-2.5 bg-white border rounded-xl font-bold text-xs outline-none min-h-[50px] max-h-[80px]" 
                        required 
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      {isEditing && (
                        <button type="button" onClick={resetServiceForm} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">বাতিল</button>
                      )}
                      <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-sm">
                        {submitting ? 'সেভ হচ্ছে...' : isEditing ? '🔄 আপডেট করুন' : '📥 টেবিলে পাঠান'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 📊 ৪টি সার্ভিসের কমপ্লিট ডাটা টেবিল ভিউ */}
            {dbRowData.sl_no && (
              <div className="space-y-3">
                <h4 className="font-black text-slate-700 text-xs uppercase tracking-wider px-1">📊 সার্ভিসের ইতিহাস তালিকা (inv_sl)</h4>
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