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

  // স্মার্ট এবং টাইপো-টলারেন্ট ম্যাচিং অ্যালগরিদম
  const findBestMatch = (aiDesc) => {
    if (!aiDesc) return null;
    
    const stripSpecial = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const getSimilarity = (s1, s2) => {
      const len1 = s1.length;
      const len2 = s2.length;
      if (len1 === 0 || len2 === 0) return 0;
      
      const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));
      for (let i = 0; i <= len1; i++) matrix[0][i] = i;
      for (let j = 0; j <= len2; j++) matrix[j][0] = j;

      for (let j = 1; j <= len2; j++) {
        for (let i = 1; i <= len1; i++) {
          const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j - 1][i] + 1,     
            matrix[j][i - 1] + 1,     
            matrix[j - 1][i - 1] + cost 
          );
        }
      }
      return 1 - (matrix[len2][len1] / Math.max(len1, len2));
    };

    const aiTokens = aiDesc.toLowerCase().split(/[\s\-,_/\+]+/).filter(t => t.length > 1);
    let bestMatch = null;
    let maxScore = 0;

    dbProducts.forEach(product => {
      const brand = (product.name || '').toLowerCase().trim();
      const model = (product.model || '').toLowerCase().trim();
      const category = (product.category || '').toLowerCase().trim();
      
      const cleanBrand = stripSpecial(brand);
      const cleanModel = stripSpecial(model);
      let currentScore = 0;

      aiTokens.forEach(token => {
        const cleanToken = stripSpecial(token);
        if (!cleanToken) return;

        if (cleanModel && cleanToken) {
          if (cleanModel === cleanToken) {
            currentScore += 30; 
          } else if (cleanModel.includes(cleanToken) && cleanToken.length >= 3) {
            currentScore += 22; 
          } else if (cleanToken.includes(cleanModel) && cleanModel.length >= 3) {
            currentScore += 22;
          }
        }

        if (cleanBrand) {
          const brandSim = getSimilarity(cleanBrand, cleanToken);
          if (brandSim >= 0.75) { 
            currentScore += (brandSim * 15);
          }
        }

        if (category && category.includes(cleanToken)) {
          currentScore += 2;
        }
      });

      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestMatch = product;
      }
    });

    if (maxScore < 10) return null;
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
      
      setExtractedData({
        ...parsedData,
        bill_no: parsedData.bill_no || '',
        chalan_no: parsedData.chalan_no || ''
      });

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
      let rawPhone = extractedData.customer_phone ? extractedData.customer_phone.trim() : '';
      let cPhone = rawPhone.replace(/[^0-9+]/g, ''); 
      if (cPhone.length < 5) cPhone = null; 

      let cName = extractedData.customer_name ? extractedData.customer_name.trim() : '';
      if (!cName || cName.toLowerCase() === 'n/a') cName = 'Walk-in';

      let cAddress = extractedData.customer_address ? extractedData.customer_address.trim() : '';
      if (!cAddress || cAddress.toLowerCase() === 'n/a') cAddress = null;

      let customerId = null;

      if (cPhone) {
        const { data: existingCust } = await supabase.from('customers').select('id').eq('phone', cPhone).maybeSingle();
        if (existingCust) {
          customerId = existingCust.id;
          await supabase.from('customers').update({ name: cName, address: cAddress }).eq('id', customerId);
        } else {
          const { data: newCust, error: insertErr } = await supabase.from('customers').insert([{
            name: cName, phone: cPhone, address: cAddress
          }]).select().single();
          if (insertErr) throw new Error("কাস্টমার সেভ এরর: " + insertErr.message);
          customerId = newCust.id;
        }
      } else {
        const fakePhone = `N/A-${Date.now().toString().slice(-6)}`;
        const { data: newCust, error: insertErr } = await supabase.from('customers').insert([{
          name: cName, phone: fakePhone, address: cAddress
        }]).select().single();
        if (insertErr) throw new Error("কাস্টমার সেভ এরর (No Phone): " + insertErr.message);
        customerId = newCust.id;
      }

      const chalanPayload = {
        bill_no: extractedData.bill_no || "N/A",
        chalan_no: extractedData.chalan_no || `AUTO-${Date.now().toString().slice(-6)}`,
        customer_id: customerId, 
        customer_name: cName,
        phone: cPhone || null,
        address: cAddress,
        total_amount: extractedData.items.reduce((acc, item) => acc + (parseFloat(item.total_price) || 0), 0),
        status: uploadMode === 'Bill' ? 'paid' : 'hold', 
        payment_method: uploadMode === 'Bill' ? 'Cash' : null,
        house: selectedHouse
      };

      const { data: insertedChalan, error: docError } = await supabase.from('chalans').insert([chalanPayload]).select().single();
      if (docError) throw new Error("চালান সেভ এরর: " + docError.message);

      for (const match of matchedItems) {
        if (match.matchedProduct) {
          await supabase.from('chalan_items').insert([{
            chalan_id: insertedChalan.id,
            product_id: match.matchedProduct.id,
            quantity: Number(match.quantity),
            unit_price: Number(match.unitPrice),
            total_price: Number(match.totalPrice)
          }]);

          const currentStock = match.matchedProduct.stock_quantity || 0;
          const newStock = currentStock - Number(match.quantity);
          await supabase.from('products').update({ stock_quantity: newStock }).eq('id', match.matchedProduct.id).eq('house', selectedHouse);
        }
      }

      alert(`✅ সফলভাবে ${uploadMode} এবং কাস্টমার ডাটাবেজে সেভ হয়েছে!`);
      setExtractedData(null); setImageFile(null); setPreview(null); setShowConfirmModal(false);
      fetchProducts(); 

    } catch (error) {
      console.error("Save Error:", error);
      alert("❌ " + error.message); 
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
            {isLoading ? '🤖 AI দিয়ে স্ক্যান হচ্ছে...' : `${uploadMode} স্ক্যান করুন`}
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
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      Bill No {uploadMode === 'Challan' && <span className="text-orange-500">(Optional for Challan)</span>}
                    </label>
                    <input type="text" value={extractedData.bill_no || ''} onChange={(e) => setExtractedData({...extractedData, bill_no: e.target.value})} className="w-full bg-transparent font-bold text-slate-800 outline-none" placeholder="Enter Bill No" />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      Chalan No {uploadMode === 'Bill' && <span className="text-orange-500">(Required for reference)</span>}
                    </label>
                    <input type="text" value={extractedData.chalan_no || ''} onChange={(e) => setExtractedData({...extractedData, chalan_no: e.target.value})} className="w-full bg-transparent font-bold text-slate-800 outline-none" placeholder="Enter Chalan No" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Customer Name</label>
                    <input type="text" value={extractedData.customer_name || ''} onChange={(e) => setExtractedData({...extractedData, customer_name: e.target.value})} className="w-full bg-transparent font-bold text-slate-800 outline-none" placeholder="Enter Customer Name" />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Mobile</label>
                    <input type="text" value={extractedData.customer_phone || ''} onChange={(e) => setExtractedData({...extractedData, customer_phone: e.target.value})} className="w-full bg-transparent font-bold text-slate-800 outline-none" placeholder="Enter Mobile No" />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Address</label>
                    <input type="text" value={extractedData.customer_address || ''} onChange={(e) => setExtractedData({...extractedData, customer_address: e.target.value})} className="w-full bg-transparent font-bold text-slate-800 outline-none" placeholder="Enter Full Address" />
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
                  {/* 🔴 ফিক্স: ফ্লেক্স ডিরেক্টশন কলামে নিয়ে আসা হয়েছে যাতে ড্রপডাউনটি সুন্দরভাবে ফিট হয় */}
                  <div key={idx} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Matched Product</p>
                        <p className="font-black text-slate-800">
                          {match.matchedProduct ? `${match.matchedProduct.name} - ${match.matchedProduct.model}` : "⚠️ ম্যাচ পাওয়া যায়নি!"}
                        </p>
                        <p className="text-xs text-slate-400 italic">Extracted: {match.aiDescription}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-orange-600">-{match.quantity}</p>
                        <p className="text-[10px] font-bold text-slate-400">PCS</p>
                      </div>
                    </div>

                    {/* 🔴 নতুন ফিচার: ম্যানুয়াল ড্রপডাউন সিলেকশন এবং সার্চ অপশন */}
                    <div className="mt-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">🛠️ ভুল ম্যাচ হলে এখান থেকে ম্যানুয়ালি মডেল ঠিক করুন:</label>
                      <select 
                        value={match.matchedProduct ? match.matchedProduct.id : ''} 
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const updatedMatches = [...matchedItems];
                          // ড্রপডাউন থেকে আইডি দিয়ে ডাটাবেজের অবজেক্ট খুঁজে সেট করা হচ্ছে
                          updatedMatches[idx].matchedProduct = selectedId ? dbProducts.find(p => p.id === parseInt(selectedId)) : null;
                          setMatchedItems(updatedMatches);
                        }}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-orange-500 shadow-sm cursor-pointer"
                      >
                        <option value="">-- সঠিক প্রোডাক্ট মডেল বেছে নিন --</option>
                        {dbProducts.map(p => (
                          <option key={p.id} value={p.id}>
                            📦 {p.name} — {p.model} [{p.house}] (স্টক: {p.stock_quantity} pcs)
                          </option>
                        ))}
                      </select>
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