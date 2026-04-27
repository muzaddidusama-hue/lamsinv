import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient'; 

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const SmartUpload = () => {
  const [uploadMode, setUploadMode] = useState('Bill'); 
  const [selectedHouse, setSelectedHouse] = useState('Head Office'); 
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [matchedItems, setMatchedItems] = useState([]);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) setDbProducts(data);
  };

  const findBestMatch = (aiDesc) => {
    if (!aiDesc) return null;
    const cleanDesc = aiDesc.toLowerCase().replace(/[^a-z0-9]/g, ' '); 
    const aiKeywords = cleanDesc.split(' ').filter(word => word.length > 1);
    let bestMatch = null;
    let maxMatchCount = 0;

    dbProducts.forEach(product => {
      const dbFullName = `${product.category || ''} ${product.model || ''} ${product.name || ''}`.toLowerCase();
      let currentMatches = 0;
      aiKeywords.forEach(word => {
        if (dbFullName.includes(word)) currentMatches++;
      });
      if (currentMatches > maxMatchCount) {
        maxMatchCount = currentMatches;
        bestMatch = product;
      }
    });
    return bestMatch;
  };

  const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type } };
  };

  const handleScanImage = async () => {
    if (!imageFile) return alert("Please upload an image first.");
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const imagePart = await fileToGenerativePart(imageFile);

      const prompt = `Analyze this ${uploadMode}. Extract info and return ONLY a valid JSON.
        JSON structure: { "bill_no": "string", "chalan_no": "string", "customer_name": "string", "customer_phone": "string", "customer_address": "string", 
        "items": [ { "description": "string", "quantity": number, "unit_price": number, "total_price": number } ] }`;

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();
      let cleanedJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanedJson.substring(cleanedJson.indexOf('{'), cleanedJson.lastIndexOf('}') + 1));
      setExtractedData(parsedData);
    } catch (error) {
      console.error(error);
      alert("স্ক্যানিং এরর! ২-৩ সেকেন্ড পর আবার চেষ্টা করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  const initiateSave = () => {
    const matches = extractedData.items.map(item => {
      const product = findBestMatch(item.description);
      return {
        aiDescription: item.description,
        matchedProduct: product,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price
      };
    });
    setMatchedItems(matches);
    setShowConfirmModal(true);
  };

  const handleFinalConfirm = async () => {
    setIsSaving(true);
    try {
      let customerId = null;
      if (extractedData.customer_phone) {
        const { data: existingCust } = await supabase.from('customers').select('id').eq('phone', extractedData.customer_phone).maybeSingle();
        if (existingCust) {
          customerId = existingCust.id;
          await supabase.from('customers').update({ address: extractedData.customer_address }).eq('id', customerId);
        } else {
          const { data: newCust, error: custErr } = await supabase.from('customers').insert([{
            name: extractedData.customer_name || 'Walk-in',
            phone: extractedData.customer_phone,
            address: extractedData.customer_address
          }]).select().single();
          if (custErr) throw custErr;
          customerId = newCust.id;
        }
      }

      const chalanPayload = {
        bill_no: extractedData.bill_no || "N/A",
        chalan_no: extractedData.chalan_no || `AUTO-${Date.now().toString().slice(-6)}`,
        customer_id: customerId,
        customer_name: extractedData.customer_name || 'Walk-in',
        phone: extractedData.customer_phone || null,
        address: extractedData.customer_address || null,
        total_amount: extractedData.items.reduce((acc, item) => acc + (parseFloat(item.total_price) || 0), 0),
        status: uploadMode === 'Bill' ? 'paid' : 'completed',
        payment_method: uploadMode === 'Bill' ? 'Cash' : null,
        house: selectedHouse // 🔴 ডাইনামিক হাউজ সিলেকশন
      };

      const { data: insertedChalan, error: docError } = await supabase.from('chalans').insert([chalanPayload]).select().single();
      if (docError) throw docError;

      for (const match of matchedItems) {
        if (match.matchedProduct) {
          await supabase.from('chalan_items').insert([{
            chalan_id: insertedChalan.id,
            product_id: match.matchedProduct.id,
            quantity: Number(match.quantity),
            unit_price: Number(match.unitPrice),
            total_price: Number(match.totalPrice)
          }]);

          // 🔴 স্টক কমানো (শুধুমাত্র সিলেক্ট করা হাউজের স্টক কমবে)
          const currentStock = match.matchedProduct.stock_quantity || 0;
          const newStock = currentStock - Number(match.quantity);
          await supabase.from('products').update({ stock_quantity: newStock }).eq('id', match.matchedProduct.id);
        }
      }

      alert(`✅ সফলভাবে ${uploadMode} এবং কাস্টমার তথ্য সেভ হয়েছে!`);
      setExtractedData(null); setImageFile(null); setPreview(null); setShowConfirmModal(false);
      fetchProducts();
    } catch (error) {
      alert("সেভ এরর: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen" style={{fontFamily: "'Inter', 'Hind Siliguri', sans-serif"}}>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Smart <span className="text-orange-500">AI Scanner</span></h2>
            <div className="bg-white p-1 rounded-2xl border flex">
                {['Bill', 'Challan'].map(mode => (
                    <button key={mode} onClick={() => {setUploadMode(mode); setExtractedData(null);}} className={`px-6 py-2 rounded-xl font-bold transition-all ${uploadMode === mode ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>{mode}</button>
                ))}
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 flex flex-col items-center">
          <input type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files[0];
            if (file) { setImageFile(file); setPreview(URL.createObjectURL(file)); }
          }} className="mb-6 block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-8 file:rounded-2xl file:border-0 file:bg-orange-50 file:text-orange-700 font-bold cursor-pointer" />
          {preview && <img src={preview} alt="Preview" className="max-h-72 rounded-3xl mb-6 shadow-xl border-8 border-slate-50" />}
          <button onClick={handleScanImage} disabled={isLoading || !imageFile} className="w-full bg-orange-600 text-white py-5 rounded-[1.5rem] font-black text-xl hover:bg-slate-900 transition-all shadow-xl disabled:bg-slate-200">
            {isLoading ? '🤖 AI দিয়ে স্ক্যান হচ্ছে...' : `${uploadMode} স্ক্যান করুন`}
          </button>
        </div>

        {extractedData && extractedData.items && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-orange-100 animate-in fade-in zoom-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <label className="text-[10px] font-black text-orange-500 uppercase block mb-1">সোর্স হাউজ (Stock Source)</label>
                    <select value={selectedHouse} onChange={(e) => setSelectedHouse(e.target.value)} className="w-full bg-transparent font-black text-slate-800 outline-none cursor-pointer">
                        <option value="Head Office">Head Office (HO)</option>
                        <option value="Showroom">Showroom</option>
                    </select>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Bill / Chalan No</label>
                    <input type="text" value={extractedData.bill_no || extractedData.chalan_no || ''} onChange={(e) => setExtractedData({...extractedData, bill_no: e.target.value})} className="w-full bg-transparent font-bold text-slate-800 outline-none" />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Customer Name</label>
                    <input type="text" value={extractedData.customer_name || ''} onChange={(e) => setExtractedData({...extractedData, customer_name: e.target.value})} className="w-full bg-transparent font-bold text-slate-800 outline-none" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Mobile</label>
                    <input type="text" value={extractedData.customer_phone || ''} onChange={(e) => setExtractedData({...extractedData, customer_phone: e.target.value})} className="w-full bg-transparent font-bold text-slate-800 outline-none" />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 h-full min-h-[140px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Address</label>
                    <textarea value={extractedData.customer_address || ''} onChange={(e) => setExtractedData({...extractedData, customer_address: e.target.value})} className="w-full bg-transparent font-bold text-slate-800 outline-none h-24 resize-none" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 mb-8">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Item Description</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase w-24 text-center">Qty</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase w-32 text-right">Unit Price</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase w-32 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="p-2">
                        <input type="text" value={item.description || ''} onChange={(e) => {
                          const newItems = [...extractedData.items];
                          newItems[index].description = e.target.value;
                          setExtractedData({...extractedData, items: newItems});
                        }} className="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-orange-500 font-bold text-slate-800" />
                      </td>
                      <td className="p-2">
                        <input type="number" value={item.quantity || ''} onChange={(e) => {
                          const newItems = [...extractedData.items];
                          newItems[index].quantity = e.target.value;
                          newItems[index].total_price = (parseFloat(e.target.value) || 0) * (parseFloat(newItems[index].unit_price) || 0);
                          setExtractedData({...extractedData, items: newItems});
                        }} className="w-full p-3 bg-white border border-slate-100 rounded-xl text-center outline-none focus:border-orange-500 font-bold text-slate-700" />
                      </td>
                      <td className="p-2">
                        <input type="number" value={item.unit_price || ''} onChange={(e) => {
                          const newItems = [...extractedData.items];
                          newItems[index].unit_price = e.target.value;
                          newItems[index].total_price = (parseFloat(e.target.value) || 0) * (parseFloat(newItems[index].quantity) || 0);
                          setExtractedData({...extractedData, items: newItems});
                        }} className="w-full p-3 bg-white border border-slate-100 rounded-xl text-right outline-none focus:border-orange-500 font-bold text-slate-700" />
                      </td>
                      <td className="p-4 text-right font-black text-orange-600">{(parseFloat(item.total_price) || 0).toLocaleString()} ৳</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={initiateSave} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-orange-600 transition-all active:scale-95">
              Confirm & Save Data
            </button>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 animate-in slide-in-from-bottom-10">
              <h3 className="text-2xl font-black text-slate-800 mb-6">স্টক ভেরিফিকেশন ({selectedHouse})</h3>
              <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                {matchedItems.map((match, idx) => (
                  <div key={idx} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Matched Product</p>
                      <p className="font-black text-slate-800">{match.matchedProduct ? `${match.matchedProduct.name} - ${match.matchedProduct.model}` : "⚠️ ম্যাচ পাওয়া যায়নি!"}</p>
                      <p className="text-xs text-slate-400 italic">Extracted: {match.aiDescription}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-orange-600">-{match.quantity}</p>
                      <p className="text-[10px] font-bold text-slate-400">PCS</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600">বাতিল</button>
                <button onClick={handleFinalConfirm} disabled={isSaving} className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-600 shadow-xl active:scale-95 disabled:bg-slate-300">
                  {isSaving ? '⏳ সেভ হচ্ছে...' : 'সব ঠিক আছে, সেভ করুন'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartUpload;