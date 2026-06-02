import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const ServiceManager = () => {
  const [searchNo, setSearchNo] = useState(''); // বিল/চালান সার্চ
  const [record, setRecord] = useState(null); 
  const [inverterItem, setInverterItem] = useState(null); 
  const [serialNumbers, setSerialNumbers] = useState([]); // চালানের আন্ডারে মাল্টিপল সিরিয়াল ইনপুট

  // 🔍 সেকশন ২-এর জন্য গ্লোবাল সিরিয়াল সার্চ ও ফর্ম স্টেট
  const [globalSerialSearch, setGlobalSerialSearch] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ৪টি সার্ভিসের মেইন ফর্ম স্টেট
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

  // ১. চালান বা বিল নম্বর দিয়ে সার্চ (স্মার্ট সার্চ)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchNo.trim()) return alert("চালান বা বিল নম্বর দিন!");

    setLoading(true);
    setRecord(null);
    setInverterItem(null);
    setSerialNumbers([]);

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
        const emptyFields = Array.from({ length: inverter.quantity }, () => "");
        setSerialNumbers(emptyFields);
        
        // ফর্ম স্টেটে বিল ও চালান নম্বর অটো-সেট করে রাখা
        setFormData(prev => ({
          ...prev,
          bill_no: mainData.bill_no || '',
          chalan_no: mainData.chalan_no || '',
          inv_type: inverter.products?.name?.toLowerCase().includes('on-grid') ? 'On-Grid' : 'Hybrid'
        }));
      } else {
        setInverterItem(null);
      }

    } catch (error) {
      console.error(error);
      alert("তথ্য লোড করতে সমস্যা হয়েছে!");
    }
    setLoading(false);
  };

  // সেকশন ১ থেকে নির্দিষ্ট সিরিয়াল নম্বর inv_sl টেবিলে কুইক রেজিস্টার/লোড করা
  const handleRegisterSerial = async (index, event) => {
    event.preventDefault();
    const currentSerial = serialNumbers[index]?.trim().toUpperCase();

    if (!currentSerial) return alert("অনুগ্রহ করে সিরিয়াল নম্বরটি ইনপুট দিন!");
    
    setGlobalSerialSearch(currentSerial);
    fetchSerialData(currentSerial);
  };

  // 🔍 ২. সেকশন ২-এর সিরিয়াল সার্চ ফাংশন (যা সরাসরি এবং সেকশন ১ দুই জায়গা থেকেই কাজ করবে)
  const handleDirectSerialSearch = (e) => {
    e.preventDefault();
    if (!globalSerialSearch.trim()) return alert("ইনভার্টারের সিরিয়াল নম্বর দিন!");
    fetchSerialData(globalSerialSearch.trim().toUpperCase());
  };

  // সিরিয়াল অনুযায়ী ডাটাবেজ থেকে ডাটা আনা বা ফর্মে রেডি করা
  const fetchSerialData = async (serialNo) => {
    setServiceLoading(true);
    try {
      const { data, error } = await supabase
        .from('inv_sl')
        .select('*')
        .eq('sl_no', serialNo)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData(data);
        alert(`ℹ️ সিরিয়াল নম্বর ${serialNo}-এর পূর্বের সার্ভিসের তথ্য লোড হয়েছে। আপনি এখন এটি আপডেট করতে পারবেন।`);
      } else {
        // যদি ডাটাবেজে না থাকে, তবে ফর্ম রিসেট করে নতুন এন্ট্রির জন্য রেডি করা
        setFormData({
          bill_no: record?.bill_no || '',
          chalan_no: record?.chalan_no || '',
          inv_type: inverterItem?.products?.name?.toLowerCase().includes('on-grid') ? 'On-Grid' : 'Hybrid',
          sl_no: serialNo,
          serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
          serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
          serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
          serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
        });
        alert(`📝 সিরিয়াল নম্বর ${serialNo} সিস্টেমে নতুন। তথ্য ইনপুট দিয়ে নিচে সাবমিট করুন।`);
      }
    } catch (error) {
      console.error(error);
      alert("সিরিয়াল ডাটা লোড করতে সমস্যা হয়েছে!");
    }
    setServiceLoading(false);
  };

  // ফর্ম চেঞ্জ হ্যান্ডলার
  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 💾 ৩. ডাটাবেজে সিরিয়ালসহ সার্ভিসের তথ্য Upsert (Insert অথবা Update) করা
  const handleSaveAllData = async (e) => {
    e.preventDefault();
    if (!formData.sl_no?.trim()) return alert("অনুগ্রহ করে প্রথমে একটি সিরিয়াল নম্বর নিশ্চিত করুন (সার্চ বা এন্ট্রি করে)!");

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        sl_no: formData.sl_no.trim().toUpperCase(),
        serv_1_amount: formData.serv_1_amount ? parseInt(formData.serv_1_amount) : null,
        serv_2_amount: formData.serv_2_amount ? parseInt(formData.serv_2_amount) : null,
        serv_3_amount: formData.serv_3_amount ? parseInt(formData.serv_3_amount) : null,
        serv_4_amount: formData.serv_4_amount ? parseInt(formData.serv_4_amount) : null,
      };

      // upsert ব্যবহার করা হয়েছে যেন নতুন হলে insert হয়, পুরাতন হলে update হয়
      const { error } = await supabase
        .from('inv_sl')
        .upsert(payload, { onConflict: 'sl_no' });

      if (error) throw error;

      alert(`🎉 সিরিয়াল নম্বর ${payload.sl_no}-এর যাবতীয় তথ্য সফলভাবে ডাটাবেসে সেভ করা হয়েছে!`);
    } catch (error) {
      console.error(error);
      alert("তথ্য সেভ করতে সমস্যা হয়েছে: " + error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 p-4" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* 🔍 টপ মেইন সার্চ বার (চালান/বিল সার্চ) */}
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
            {loading ? 'খোঁজা হচ্ছে...' : 'চালান সার্চ'}
          </button>
        </form>
      </div>

      {/* প্রধান ২-কলাম লেআউট (যা সবসময় স্ক্রিনে থাকবে) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ==================== 📋 সেকশন ১: ইনভার্টারের বিবরণ ও চালানের সিরিয়াল তালিকা ==================== */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 min-h-[400px]">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider border-b pb-2">
              ১. চালানের ইনভার্টার তালিকা
            </h3>
            
            {record ? (
              inverterItem ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold uppercase text-blue-500">ইনভার্টার মডেল</p>
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

                  {/* ডায়নামিক সিরিয়াল ইনপুট রেন্ডারিং */}
                  <div className="space-y-3 pt-2 border-t border-dashed">
                    <p className="text-[11px] font-black text-slate-500 uppercase">সিরিয়াল নম্বর লিখে ডানপাশের বাটনে ক্লিক করুন:</p>
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
                          লোড করুন
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
                উপরে চালান নম্বর দিয়ে সার্চ দিলে চালানের ইনভার্টার ও পরিমাণ এখানে আসবে।
              </div>
            )}
          </div>
        </div>

        {/* ==================== 🛠️ সেকশন ২: সিরিয়াল সার্চ, ইনপুট ও ৪টি সার্ভিসের তথ্য (PERMANENT VISIBLE) ==================== */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
            
            {/* সেকশন ২-এর নিজস্ব সিরিয়াল সার্চ ইনপুট */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>২. ইনভার্টার সিরিয়াল সার্চ ও সার্ভিসের তথ্য ইনপুট</span>
                {formData.sl_no && (
                  <span className="bg-orange-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                    Active: {formData.sl_no}
                  </span>
                )}
              </h3>
              
              <form onSubmit={handleDirectSerialSearch} className="flex gap-2 max-w-md">
                <input 
                  type="text"
                  value={globalSerialSearch}
                  onChange={(e) => setGlobalSerialSearch(e.target.value)}
                  placeholder="সরাসরি ইনভার্টার সিরিয়াল দিয়ে সার্চ দিন..."
                  className="flex-1 p-2.5 bg-slate-50 border rounded-xl font-bold uppercase text-xs outline-none focus:ring-1 focus:ring-blue-600"
                />
                <button type="submit" disabled={serviceLoading} className="bg-slate-900 text-white px-4 rounded-xl text-xs font-bold hover:bg-slate-800">
                  {serviceLoading ? 'খোঁজা হচ্ছে...' : 'সিরিয়াল সার্চ'}
                </button>
              </form>
            </div>

            {/* মেইন ৪টি সার্ভিসের ইনপুট ফর্ম */}
            <form onSubmit={handleSaveAllData} className="space-y-6">
              
              {/* মেটাডাটা ইনফো (বিল, চালান ও টাইপ) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border text-xs font-bold">
                <div className="space-y-1">
                  <label className="text-slate-400 block">সিরিয়াল নম্বর (Required)</label>
                  <input type="text" name="sl_no" value={formData.sl_no} onChange={handleFormChange} placeholder="যেমন: INV-1022" className="w-full p-2 bg-white border rounded-lg font-black uppercase" required />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block">বিল নম্বর</label>
                  <input type="text" name="bill_no" value={formData.bill_no} onChange={handleFormChange} placeholder="BILL NO" className="w-full p-2 bg-white border rounded-lg uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block">চালান নম্বর</label>
                  <input type="text" name="chalan_no" value={formData.chalan_no} onChange={handleFormChange} placeholder="CHALAN NO" className="w-full p-2 bg-white border rounded-lg uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block">ইনভার্টার টাইপ</label>
                  <select name="inv_type" value={formData.inv_type} onChange={handleFormChange} className="w-full p-2 bg-white border rounded-lg">
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-Grid">On-Grid</option>
                  </select>
                </div>
              </div>

              {/* ৪টি সার্ভিসের সেগমেন্ট গ্রিড */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 relative">
                    <span className="absolute top-2 right-2 bg-slate-200 text-slate-500 font-black text-[9px] px-2 py-0.5 rounded">
                      সার্ভিস রেকর্ড ০{num}
                    </span>
                    <h4 className="font-black text-slate-700 text-xs flex items-center gap-1 border-b pb-1 mb-2">🛠️ Service Record</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 block">তারিখ (Date)</label>
                      <input type="text" name={`serv_${num}_date`} placeholder="DD-MM-YYYY" value={formData[`serv_${num}_date`] || ''} onChange={handleFormChange} className="w-full p-2 bg-white border rounded-lg text-xs font-bold" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 block">সমস্যা (Problem)</label>
                      <textarea name={`serv_${num}_problem`} placeholder="কী সমস্যা হয়েছিল..." value={formData[`serv_${num}_problem`] || ''} onChange={handleFormChange} className="w-full p-2 bg-white border rounded-lg text-xs font-bold min-h-[45px] max-h-[70px]" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 block">বিল অ্যামাউন্ট (৳)</label>
                        <input type="number" name={`serv_${num}_amount`} placeholder="টাকা" value={formData[`serv_${num}_amount`] || ''} onChange={handleFormChange} className="w-full p-2 bg-white border rounded-lg text-xs font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 block">মন্তব্য (Remarks)</label>
                        <input type="text" name={`remarks${num}`} placeholder="নোট" value={formData[`remarks${num}`] || ''} onChange={handleFormChange} className="w-full p-2 bg-white border rounded-lg text-xs font-bold" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* অ্যাকশন বাটন */}
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full h-12 bg-orange-600 text-white rounded-xl font-black text-sm hover:bg-orange-700 shadow-md transition-all active:scale-[0.99]"
              >
                {submitting ? 'সেভ করা হচ্ছে...' : '💾 সিরিয়াল ও সার্ভিসের যাবতীয় তথ্য টেবিলে সেভ/আপডেট করুন'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ServiceManager;