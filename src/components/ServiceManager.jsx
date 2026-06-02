import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const ServiceManager = () => {
  const [searchNo, setSearchNo] = useState('');
  const [record, setRecord] = useState(null); // চালান বা বিলের মূল ডাটা
  const [inverterItem, setInverterItem] = useState(null); // ফিল্টার করা ইনভার্টার প্রোডাক্ট
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ১. inv_sl টেবিলের কলাম স্ট্রাকচার অনুযায়ী স্টেট ম্যানেজমেন্ট
  const [serialNumbers, setSerialNumbers] = useState([]); // মাল্টিপল সিরিয়াল নম্বর ইনপুট ট্র্যাক করার জন্য
  const [activeSerialData, setActiveSerialData] = useState(null); // বর্তমানে যে সিরিয়ালটি সেকশন ২ এ সিলেক্টেড আছে
  const [formData, setFormData] = useState({
    bill_no: '',
    chalan_no: '',
    inv_type: 'Hybrid',
    sl_no: '',
    serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
    serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
    serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
    serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
  });

  // স্মার্ট সার্চ: বিল বা চালান নম্বর দিয়ে ডাটাবেজ খোঁজা
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchNo.trim()) return alert("চালান বা বিল নম্বর দিন!");

    setLoading(true);
    setRecord(null);
    setInverterItem(null);
    setSerialNumbers([]);
    setActiveSerialData(null);

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

      // ইনভার্টার ফিল্টার করা
      const inverter = itemData?.find(item => 
        item.products?.category?.toLowerCase().includes('inverter') || 
        item.products?.name?.toLowerCase().includes('inverter')
      );

      if (inverter) {
        setInverterItem(inverter);
        // কোয়ান্টিটি অনুযায়ী খালি ইনপুট ফিল্ড জেনারেট করা
        const emptyFields = Array.from({ length: inverter.quantity }, () => "");
        setSerialNumbers(emptyFields);
      } else {
        setInverterItem(null);
      }

    } catch (error) {
      console.error(error);
      alert("তথ্য লোড করতে সমস্যা হয়েছে!");
    }
    setLoading(false);
  };

  // সিরিয়াল ফিল্ডের ইনপুট চেঞ্জ হ্যান্ডলার
  const handleSerialInputChange = (index, value) => {
    const updated = [...serialNumbers];
    updated[index] = value;
    setSerialNumbers(updated);
  };

  // 🔑 ২. inv_sl টেবিলে সিরিয়াল এন্ট্রি এবং সার্ভিস উইন্ডো লক করার ফাংশন
  const handleRegisterSerial = async (index, event) => {
    event.preventDefault();
    const currentSerial = serialNumbers[index]?.trim();

    if (!currentSerial) return alert("অনুগ্রহ করে সিরিয়াল নম্বরটি ইনপুট দিন!");
    setSubmitting(true);

    try {
      // প্রথমে চেক করব inv_sl টেবিলে এই সিরিয়াল আগে থেকে ইনসার্ট করা আছে কি না
      const { data: existingRecord, error: fetchErr } = await supabase
        .from('inv_sl')
        .select('*')
        .eq('sl_no', currentSerial)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (existingRecord) {
        // যদি ডাটা অলরেডি থাকে, তবে সেই এক্সিস্টিং ডাটা ফর্মে লোড হবে (যাতে আগের সার্ভিস হিস্টোরি দেখা যায়)
        setFormData(existingRecord);
        setActiveSerialData(existingRecord);
        alert(`ℹ️ এই সিরিয়াল নম্বরটি আগে থেকেই সিস্টেমে রেজিস্টার্ড আছে। পূর্বের সার্ভিসের তথ্য লোড করা হয়েছে।`);
      } else {
        // যদি ডাটা না থাকে, তবে স্মার্ট সার্চ থেকে পাওয়া বিল ও চালান নম্বরসহ নতুন রো তৈরি (Insert) হবে
        const newSerialRow = {
          bill_no: record?.bill_no || '',
          chalan_no: record?.chalan_no || '',
          inv_type: inverterItem?.products?.name?.toLowerCase().includes('on-grid') ? 'On-Grid' : 'Hybrid',
          sl_no: currentSerial,
          serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
          serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
          serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
          serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
        };

        const { data: insertedData, error: insertErr } = await supabase
          .from('inv_sl')
          .insert([newSerialRow])
          .select()
          .single();

        if (insertErr) throw insertErr;

        setFormData(insertedData);
        setActiveSerialData(insertedData);
        alert(`✅ সিরিয়াল নম্বর ${currentSerial} সফলভাবে inv_sl টেবিলে রেজিস্টার করা হয়েছে!`);
      }
    } catch (error) {
      console.error(error);
      alert("সিরিয়াল নম্বর এন্ট্রি করতে সমস্যা হয়েছে: " + error.message);
    }
    setSubmitting(false);
  };

  // ৪টি সার্ভিসের ইনপুট চেঞ্জ হ্যান্ডলার
  const handleServiceFieldChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 🛠️ ৩. সেকশন ২: ৪টি সার্ভিসের যাবতীয় তথ্য এন্ট্রি/আপডেট করার ফাইনাল ফাংশন
  const handleSaveServiceDetails = async (e) => {
    e.preventDefault();
    if (!formData.sl_no) return alert("প্রথমে সেকশন ১ থেকে একটি সিরিয়াল নম্বর রেজিস্টার করুন!");

    setSubmitting(true);
    try {
      // টাইপকাস্টিং ফিক্স: অ্যামাউন্টগুলো ডাটাবেজের int8 ফরম্যাটের সাথে ম্যাচ করতে নাম্বারে কনভার্ট করা হয়েছে
      const payload = {
        ...formData,
        serv_1_amount: formData.serv_1_amount ? parseInt(formData.serv_1_amount) : null,
        serv_2_amount: formData.serv_2_amount ? parseInt(formData.serv_2_amount) : null,
        serv_3_amount: formData.serv_3_amount ? parseInt(formData.serv_3_amount) : null,
        serv_4_amount: formData.serv_4_amount ? parseInt(formData.serv_4_amount) : null,
      };

      const { error } = await supabase
        .from('inv_sl')
        .update(payload)
        .eq('sl_no', formData.sl_no);

      if (error) throw error;

      alert(`🎉 সিরিয়াল ${formData.sl_no} এর যাবতীয় সার্ভিসের তথ্য সফলভাবে সেভ করা হয়েছে!`);
      setActiveSerialData(payload); // লাইভ ভিউ আপডেট
    } catch (error) {
      console.error(error);
      alert("সার্ভিসের তথ্য সেভ করতে ত্রুটি হয়েছে: " + error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 p-4" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* প্রধান সার্চ বার */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input 
            type="text" 
            value={searchNo} 
            onChange={(e) => setSearchNo(e.target.value)} 
            placeholder="বিল বা চালান নম্বর দিন (যেমন: BILL-123456 বা CHL-123456)" 
            className="flex-1 h-14 px-6 bg-slate-50 border rounded-2xl font-black text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-600" 
          />
          <button type="submit" disabled={loading} className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors">
            {loading ? 'খোঁজা হচ্ছে...' : 'সার্চ'}
          </button>
        </form>
      </div>

      {record && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in-95">
          
          {/* ==================== সেকশন ১: ইনভার্টারের বিবরণ ও ডায়নামিক সিরিয়াল এন্ট্রি ==================== */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider border-b pb-2">১. ইনভার্টারের বিবরণ ও সিরিয়াল এন্ট্রি</h3>
              
              {inverterItem ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold uppercase text-blue-500">ইনভার্টার মডেল</p>
                    <p className="text-lg font-black">{inverterItem.products?.name}</p>
                    <p className="text-sm font-medium text-blue-600">Model: {inverterItem.products?.model}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-xs text-slate-400 block">মোট পরিমাণ</span>
                      <span className="font-black text-slate-700 text-base">{inverterItem.quantity} Pcs</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">ওয়ারেন্টি কাল</span>
                      <span className="font-black text-slate-700 text-base">{inverterItem.products?.warranty || '১ বছর'}</span>
                    </div>
                  </div>

                  {/* কোয়ান্টিটি অনুযায়ী ডায়নামিক সিরিয়াল ইনপুট লিস্ট */}
                  <div className="pt-4 border-t border-dashed space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase block">
                      সিরিয়াল নম্বর টাইপ করে ডানপাশের বাটনে ক্লিক করে টেবিলে এন্ট্রি করুন:
                    </label>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {serialNumbers.map((serial, index) => (
                        <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border">
                          <span className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center font-black text-xs text-slate-600">
                            #{index + 1}
                          </span>
                          <input 
                            type="text"
                            value={serial}
                            onChange={(e) => handleSerialInputChange(index, e.target.value)}
                            placeholder={`সিরিয়াল নম্বর লিখুন`}
                            className="flex-1 p-2 bg-white border rounded-lg font-bold uppercase text-xs outline-none focus:border-blue-600"
                          />
                          <button 
                            type="button"
                            onClick={(e) => handleRegisterSerial(index, e)}
                            disabled={submitting}
                            className={`px-3 py-2 text-xs font-bold rounded-lg text-white transition-all ${activeSerialData?.sl_no === serial && serial !== "" ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            {activeSerialData?.sl_no === serial && serial !== "" ? '✅ লোডেড' : 'এন্ট্রি'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-red-50 border border-red-100 rounded-2xl">
                  <p className="font-black text-red-600 text-base">⚠️ এই বিলে কোন ইনভার্টার নেই</p>
                </div>
              )}
            </div>
          </div>

          {/* ==================== সেকশন ২: ৪টি সার্ভিসের তথ্য ইনপুট ও লাইভ ভিউ প্রদর্শন ==================== */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b pb-3 mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">
                    ২. সার্ভিসের তথ্য ইনপুট এবং লাইভ স্ট্যাটাস
                  </h3>
                  {activeSerialData && (
                    <span className="bg-orange-600 text-white font-black text-xs px-3 py-1 rounded-full uppercase">
                      S/N: {activeSerialData.sl_no}
                    </span>
                  )}
                </div>

                {activeSerialData ? (
                  <form onSubmit={handleSaveServiceDetails} className="space-y-6">
                    {/* ইনভার্টার টাইপ সিলেক্টর */}
                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border w-fit">
                      <label className="text-xs font-black text-slate-600 uppercase">ইনভার্টার টাইপ:</label>
                      <select 
                        name="inv_type" 
                        value={formData.inv_type} 
                        onChange={handleServiceFieldChange} 
                        className="p-1.5 bg-white border rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="Hybrid">Hybrid (হাইব্রিড)</option>
                        <option value="On-Grid">On-Grid (অন-গ্রিড)</option>
                      </select>
                    </div>

                    {/* ৪টি সার্ভিসের গ্রিড কন্টেইনার */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
                      {[1, 2, 3, 4].map((num) => (
                        <div key={num} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 relative">
                          <span className="absolute top-2 right-2 bg-slate-200 text-slate-500 font-black text-[10px] px-2 py-0.5 rounded-md">
                            Record ০{num}
                          </span>
                          <h4 className="font-black text-slate-700 text-xs flex items-center gap-1 border-b pb-1 mb-2">🛠️ সার্ভিস সেগমেন্ট</h4>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase block">তারিখ (Date)</label>
                            <input 
                              type="text" 
                              name={`serv_${num}_date`} 
                              placeholder="DD-MM-YYYY" 
                              value={formData[`serv_${num}_date`] || ''} 
                              onChange={handleServiceFieldChange} 
                              className="w-full p-2 bg-white border rounded-lg text-xs font-bold outline-none focus:border-blue-600" 
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase block">সমস্যা (Problem)</label>
                            <textarea 
                              name={`serv_${num}_problem`} 
                              placeholder="কী সমস্যা হয়েছিল বিস্তারিত..." 
                              value={formData[`serv_${num}_problem`] || ''} 
                              onChange={handleServiceFieldChange} 
                              className="w-full p-2 bg-white border rounded-lg text-xs font-bold outline-none min-h-[50px] max-h-[80px]" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase block">বিল অ্যামাউন্ট (৳)</label>
                              <input 
                                type="number" 
                                name={`serv_${num}_amount`} 
                                placeholder="টাকা" 
                                value={formData[`serv_${num}_amount`] || ''} 
                                onChange={handleServiceFieldChange} 
                                className="w-full p-2 bg-white border rounded-lg text-xs font-bold outline-none focus:border-blue-600" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase block">মন্তব্য (Remarks)</label>
                              <input 
                                type="text" 
                                name={`remarks${num}`} 
                                placeholder="নোট" 
                                value={formData[`remarks${num}`] || ''} 
                                onChange={handleServiceFieldChange} 
                                className="w-full p-2 bg-white border rounded-lg text-xs font-bold outline-none focus:border-blue-600" 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* বড় পাবলিশ বাটন */}
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full h-12 bg-orange-600 text-white rounded-xl font-black text-sm hover:bg-orange-700 shadow-md transition-all active:scale-[0.99]"
                    >
                      {submitting ? 'সংরক্ষণ করা হচ্ছে...' : `💾 সিরিয়াল ${formData.sl_no} এর যাবতীয় সার্ভিসের তথ্য আপডেট করুন`}
                    </button>
                  </form>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed rounded-2xl min-h-[300px]">
                    <p className="italic font-bold text-sm">সেকশন ১ এর সিরিয়াল নাম্বারটি লিখে পাশে থাকা "এন্ট্রি" বাটনে ক্লিক করুন।</p>
                    <p className="text-[11px] text-slate-400 mt-1">ক্লিক করার সাথে সাথে ডেটাবেজের inv_sl টেবিলে বিল ও চালান নম্বরসহ সিরিয়ালটি রেজিস্টার হয়ে যাবে এবং এখানে সার্ভিসের ফর্ম ওপেন হবে।</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ইনিশিয়াল স্টেট মেসেজ */}
      {!record && !loading && (
        <div className="py-20 text-center font-bold text-slate-300 italic border border-dashed rounded-3xl bg-white">
          শুরু করতে প্রথমে উপরে চালান বা বিল নম্বর দিয়ে সার্চ করুন।
        </div>
      )}
    </div>
  );
};

export default ServiceManager;