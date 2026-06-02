import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const ServiceManager = () => {
  const [searchNo, setSearchNo] = useState('');
  const [record, setRecord] = useState(null); // চালান বা বিলের ডাটা
  const [inverterItem, setInverterItem] = useState(null); // শুধুমাত্র ইনভার্টার আইটেম
  const [serialNo, setSerialNo] = useState(''); // ইনভার্টার সিরিয়াল নম্বর
  const [serviceHistory, setServiceHistory] = useState([]); // সার্ভিসের তথ্য
  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);

  // ১. চালান বা বিল নম্বর দিয়ে সার্চ
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchNo.trim()) return alert("চালান বা বিল নম্বর দিন!");

    setLoading(true);
    setRecord(null);
    setInverterItem(null);
    setSerialNo('');
    setServiceHistory([]);

    const queryText = searchNo.trim().toUpperCase();

    try {
      // বিল বা চালান খুঁজে বের করা
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

      // ওই চালানের আন্ডারে থাকা আইটেমগুলো নিয়ে আসা
      const { data: itemData, error: itemErr } = await supabase
        .from('chalan_items')
        .select(`*, products (*)`)
        .eq('chalan_id', mainData.id);

      if (itemErr) throw itemErr;

      // 🔍 শুধুমাত্র ইনভার্টার ফিল্টার করা (ক্যাটাগরি বা নামের মধ্যে 'Inverter' চেক করে)
      const inverter = itemData?.find(item => 
        item.products?.category?.toLowerCase().includes('inverter') || 
        item.products?.name?.toLowerCase().includes('inverter')
      );

      if (inverter) {
        setInverterItem(inverter);
      } else {
        setInverterItem(null); // বিলে কোনো ইনভার্টার নেই
      }

    } catch (error) {
      console.error(error);
      alert("তথ্য লোড করতে সমস্যা হয়েছে!");
    }
    setLoading(false);
  };

  // ২. ইনভার্টারের সিরিয়াল নম্বর দিয়ে সার্ভিসের তথ্য খোঁজা
  const handleSerialSearch = async (e) => {
    e.preventDefault();
    if (!serialNo.trim()) return alert("ইনভার্টারের সিরিয়াল নম্বর দিন!");

    setServiceLoading(true);
    setServiceHistory([]);

    try {
      // আপনার ডেটাবেসের 'services' বা 'service_history' টেবিল থেকে সিরিয়াল অনুযায়ী ডাটা কুয়েরি
      // (এখানে টেবিলের নাম 'services' এবং কলাম 'serial_no' ধরে করা হয়েছে, আপনার টেবিল অনুযায়ী পরিবর্তন করে নিতে পারেন)
      const { data: sData, error: sErr } = await supabase
        .from('services') 
        .select('*')
        .eq('serial_no', serialNo.trim().toUpperCase())
        .order('created_at', { ascending: false });

      if (sErr) throw sErr;

      setServiceHistory(sData || []);
      if (sData?.length === 0) {
        alert("এই সিরিয়াল নম্বরের কোনো সার্ভিসের তথ্য পাওয়া যায়নি!");
      }

    } catch (error) {
      console.error(error);
      alert("সার্ভিসের তথ্য খুঁজতে সমস্যা হয়েছে!");
    }
    setServiceLoading(false);
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
            placeholder="বিল বা চালান নম্বর দিন (যেমন: CHL-123456)" 
            className="flex-1 h-14 px-6 bg-slate-50 border rounded-2xl font-black text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-600" 
          />
          <button type="submit" disabled={loading} className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors">
            {loading ? 'খোঁজা হচ্ছে...' : 'সার্চ'}
          </button>
        </form>
      </div>

      {record && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in-95">
          
          {/* 📋 সেকশন ১: ইনভার্টার ডিটেইলস এবং সিরিয়াল নম্বর ইনপুট */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider border-b pb-2">১. ইনভার্টারের বিবরণ</h3>
              
              {inverterItem ? (
                // ইনভার্টার পাওয়া গেলে এই অংশটি দেখাবে
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold uppercase text-blue-500">ইনভার্টার মডেল</p>
                    <p className="text-lg font-black">{inverterItem.products?.name}</p>
                    <p className="text-sm font-medium text-blue-600">Model: {inverterItem.products?.model}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-xs text-slate-400 block">পরিমাণ</span>
                      <span className="font-black text-slate-700">{inverterItem.quantity} Pcs</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">ওয়ারেন্টি কাল</span>
                      <span className="font-black text-slate-700">{inverterItem.products?.warranty || '১ বছর'}</span>
                    </div>
                  </div>

                  {/* 🔌 সিরিয়াল নম্বর ইনপুট করার ফরম */}
                  <form onSubmit={handleSerialSearch} className="pt-4 border-t border-dashed space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase block">ইনভার্টার সিরিয়াল নম্বর ইনপুট করুন</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={serialNo}
                        onChange={(e) => setSerialNo(e.target.value)}
                        placeholder="যেমন: INV-SR-2026"
                        className="flex-1 p-3 bg-slate-50 border rounded-xl font-bold uppercase outline-none focus:border-blue-600"
                      />
                      <button type="submit" disabled={serviceLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-xs">
                        {serviceLoading ? 'চেকিং...' : 'সাবমিট'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // ইনভার্টার না পাওয়া গেলে এই নোটিশ শো করবে
                <div className="p-6 text-center bg-red-50 border border-red-100 rounded-2xl">
                  <p className="font-black text-red-600 text-base">⚠️ এই বিলে কোন ইনভার্টার নেই</p>
                  <p className="text-xs text-slate-400 mt-1">সার্চকৃত চালান/বিলে কোনো ইনভার্টার প্রোডাক্ট পাওয়া যায়নি।</p>
                </div>
              )}
            </div>
          </div>

          {/* 🛠️ সেকশন ২: সার্ভিসের তথ্য প্রদর্শন */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm h-full min-h-[300px] flex flex-col">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider border-b pb-3 mb-4">
                ২. সার্ভিসের তথ্য (Service & Repair History)
              </h3>

              {serialNo && serviceHistory.length > 0 ? (
                // সিরিয়াল সাবমিট করার পর ডাটা থাকলে তা লিস্ট আকারে দেখাবে
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2">
                  <p className="text-xs font-bold text-green-600">✓ সিরিয়াল নম্বর {serialNo} এর জন্য {serviceHistory.length}টি রেকর্ড পাওয়া গেছে:</p>
                  {serviceHistory.map((service) => (
                    <div key={service.id} className="p-4 bg-slate-50 border rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-slate-800 text-sm">Job ID: {service.job_no || service.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${service.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {service.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600"><span className="font-bold">সমস্যা:</span> {service.issue_description || 'নির্দিষ্ট নয়'}</p>
                      <p className="text-sm text-slate-600"><span className="font-bold">সমাধান:</span> {service.solution || 'চলমান'}</p>
                      <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t">
                        <span>টেকনিশিয়ান: {service.technician_name || '-'}</span>
                        <span>তারিখ: {new Date(service.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : serialNo && !serviceLoading ? (
                // সিরিয়াল দেওয়া হয়েছে কিন্তু ডাটা পাওয়া যায়নি
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 italic">
                  <p>এই সিরিয়ালের কোনো সার্ভিসের ইতিহাস পাওয়া যায়নি।</p>
                </div>
              ) : (
                // শুরুতে যখন কোনো সিরিয়াল ইনপুট দেওয়া হয়নি
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-300 italic border border-dashed rounded-2xl">
                  <p>সেকশন ১ এ ইনভার্টারের সিরিয়াল নম্বর ইনপুট দিয়ে সাবমিট করলে সার্ভিসের যাবতীয় তথ্য এখানে দেখা যাবে।</p>
                </div>
              )}
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