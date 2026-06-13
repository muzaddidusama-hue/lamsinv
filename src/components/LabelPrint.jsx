import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';

const LabelPrint = () => {
  const [activeTab, setActiveTab] = useState('print');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔴 নতুন: প্রিন্ট লিস্ট বা কিউ (Queue) স্টেট
  const [printQueue, setPrintQueue] = useState([]);

  // Editor State
  const [selectedModel, setSelectedModel] = useState('');
  const [quantity, setQuantity] = useState('');
  const [serials, setSerials] = useState([]);
  const printRef = useRef();

  const [barcodePos, setBarcodePos] = useState({ 
    x: 50, y: 82, scale: 1, width: 1.5, height: 40  
  });

  // Add New Template State
  const [newModel, setNewModel] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from('sticker_templates').select('*');
    if (!error && data) setTemplates(data);
  };

  const handleQuantityChange = (e) => {
    const qty = parseInt(e.target.value) || 0;
    setQuantity(qty);
    setSerials(Array.from({ length: qty }, () => ''));
  };

  const handleSerialChange = (index, value) => {
    const newSerials = [...serials];
    newSerials[index] = value;
    setSerials(newSerials);
  };

  const handlePosChange = (axis, value) => {
    setBarcodePos(prev => ({ ...prev, [axis]: parseFloat(value) }));
  };

  // 📥 লিস্টে অ্যাড করার ফাংশন
  const handleAddToQueue = () => {
    if (!selectedModel) return Swal.fire('সতর্কতা', 'মডেল সিলেক্ট করুন!', 'warning');
    if (serials.length === 0 || serials.some(s => s.trim() === '')) {
      return Swal.fire('সতর্কতা', 'সবগুলো সিরিয়াল নম্বর পূরণ করুন!', 'warning');
    }

    const template = templates.find(t => t.id.toString() === selectedModel);
    
    // নতুন আইটেমগুলো লিস্টে যুক্ত করা হচ্ছে
    const newItems = serials.map(serial => ({
      id: Math.random().toString(36).substr(2, 9), // ইউনিক আইডি
      template,
      serial,
      barcodePos: { ...barcodePos } // যে পজিশন সেট করা ছিল সেটাই সেভ হবে
    }));

    setPrintQueue([...printQueue, ...newItems]);
    
    // এন্ট্রি ফিল্ডগুলো ক্লিয়ার করা
    setSerials([]);
    setQuantity('');
    Swal.fire({
      title: 'যুক্ত হয়েছে!',
      text: `${serials.length} টি স্টিকার প্রিন্ট লিস্টে যুক্ত হয়েছে।`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const removeFromQueue = (idToRemove) => {
    setPrintQueue(printQueue.filter(item => item.id !== idToRemove));
  };

  const handleAddNewTemplate = async (e) => {
    e.preventDefault();
    if (!newModel || !uploadFile || !newWidth || !newHeight) {
      return Swal.fire('সতর্কতা', 'সবগুলো তথ্য সঠিকভাবে দিন!', 'warning');
    }
    
    setUploading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${newModel.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('stickers')
        .upload(fileName, uploadFile);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('stickers')
        .getPublicUrl(fileName);

      const { error: dbErr } = await supabase.from('sticker_templates').insert([{
        model_name: newModel,
        brand: newBrand,
        template_url: publicUrl,
        width: Number(newWidth),
        height: Number(newHeight)
      }]);

      if (dbErr) throw dbErr;

      fetchTemplates();
      const result = await Swal.fire({
        title: 'সফল হয়েছে!',
        text: 'নতুন স্টিকার টেমপ্লেট ও সাইজ সফলভাবে যুক্ত হয়েছে।',
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#ea580c',
        confirmButtonText: '🖨️ ওকে (প্রিন্ট করুন)',
        cancelButtonText: '🔄 আরেকটি যুক্ত করুন',
      });

      setNewModel(''); setNewBrand(''); setNewWidth(''); setNewHeight(''); setUploadFile(null);
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';

      if (result.isConfirmed) setActiveTab('print'); 

    } catch (error) {
      Swal.fire('এরর!', 'টেমপ্লেট সেভ করতে সমস্যা হয়েছে!', 'error');
    }
    setUploading(false);
  };

  const selectedTemplateData = templates.find(t => t.id.toString() === selectedModel);

  // 🖨️ গ্রিড আকারে প্রিন্ট করার ফাংশন
  const handlePrintAll = () => {
    if (printQueue.length === 0) return Swal.fire('সতর্কতা', 'লিস্টে কোনো স্টিকার নেই!', 'warning');

    const printContents = printRef.current.innerHTML;
    
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-1000px';
    printFrame.style.left = '-1000px';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    
    // 🔴 A4 পেজে ৪টা করে (সাইড বাই সাইড) সাজানোর CSS লজিক
    frameDoc.write(`
      <html>
        <head>
          <title>Print Labels</title>
          <style>
            @media print {
              @page { margin: 0; size: A4 portrait; }
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; background: #fff; }
              
              .a4-page {
                 width: 210mm;
                 height: 297mm;
                 padding: 10mm; 
                 box-sizing: border-box;
                 page-break-after: always;
                 display: flex;
                 flex-wrap: wrap;        /* জায়গা না পেলে নিচে নামবে */
                 align-content: flex-start;
                 justify-content: flex-start;
                 gap: 5mm;               /* স্টিকারগুলোর মাঝের গ্যাপ */
              }

              .sticker-container { 
                position: relative; 
                overflow: hidden; 
                border: 1px dashed #ccc; /* কাটার সুবিধার জন্য বর্ডার */
              }
              .template-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; z-index: 1; }
              .barcode-overlay { 
                position: absolute; 
                z-index: 10; 
                display: flex; 
                justify-content: center; 
              }
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => document.body.removeChild(printFrame), 1000);
    }, 500); 
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('live-sticker-preview');
    if (!element) return Swal.fire('সতর্কতা', 'ডাউনলোড করার মতো কিছু নেই!', 'warning');
    
    try {
      const canvas = await html2canvas(element, { scale: 3, useCORS: true });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Preview_${selectedTemplateData.model_name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      Swal.fire('এরর', 'ছবি ডাউনলোড করতে সমস্যা হয়েছে!', 'error');
    }
  };

  // 🔴 অ্যারেকে ৪টি করে ভাগ করার হেল্পার ফাংশন
  const chunkArray = (arr, size) => {
    const chunked = [];
    for (let i = 0; i < arr.length; i += size) {
      chunked.push(arr.slice(i, i + size));
    }
    return chunked;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-['Inter'] pb-20">
      
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex gap-4">
        <button 
          onClick={() => setActiveTab('print')}
          className={`flex-1 py-3 rounded-xl font-black transition-all ${activeTab === 'print' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          🖨️ লেবেল প্রিন্ট ও লিস্ট
        </button>
        <button 
          onClick={() => setActiveTab('add_new')}
          className={`flex-1 py-3 rounded-xl font-black transition-all ${activeTab === 'add_new' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          ➕ নতুন মডেল ও সাইজ এন্ট্রি
        </button>
      </div>

      {activeTab === 'print' && (
        <div className="space-y-6">
          
          {/* 🛠️ স্টিকার এডিটর সেকশন */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border shadow-sm space-y-5 h-fit">
              <h2 className="text-lg font-black border-b pb-2 text-slate-800">১. স্টিকার ডিজাইন করুন</h2>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">মডেল সিলেক্ট করুন</label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)} 
                  className="w-full p-3 bg-slate-50 border-2 rounded-xl font-bold outline-none focus:border-blue-500"
                >
                  <option value="">-- সিলেক্ট মডেল --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.brand} - {t.model_name}</option>
                  ))}
                </select>
              </div>

              {selectedModel && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">কত ইউনিট বানাবেন?</label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={handleQuantityChange} 
                    placeholder="যেমন: 5" 
                    className="w-full p-3 bg-slate-50 border-2 rounded-xl font-black outline-none focus:border-blue-500" 
                  />
                </div>
              )}

              {serials.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-dashed">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সিরিয়াল নম্বর এন্ট্রি করুন:</p>
                  <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {serials.map((serial, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="bg-slate-200 px-3 py-3 rounded-xl font-black text-slate-500 text-xs">#{idx + 1}</span>
                        <input 
                          type="text" 
                          value={serial} 
                          onChange={(e) => handleSerialChange(idx, e.target.value)} 
                          placeholder="SN-XXXXXXX" 
                          className="flex-1 p-3 bg-white border-2 rounded-xl font-bold uppercase text-sm outline-none focus:border-blue-500" 
                        />
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    onClick={handleAddToQueue} 
                    className="w-full mt-4 bg-green-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-green-700 uppercase tracking-widest active:scale-95 transition-all text-sm"
                  >
                    ➕ লিস্টে যুক্ত করুন ({serials.length})
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-8 flex flex-col xl:flex-row gap-6">
              
              <div className="flex-1 bg-slate-100 p-6 rounded-3xl border flex flex-col items-center justify-center min-h-[400px]">
                {selectedTemplateData && serials[0] !== undefined ? (
                  <>
                    <div 
                      id="live-sticker-preview"
                      className="relative shadow-2xl bg-white border overflow-hidden mb-4"
                      style={{
                        width: `${selectedTemplateData.width * 2.5}px`, // প্রিভিউ জুম
                        height: `${selectedTemplateData.height * 2.5}px`
                      }}
                    >
                      <img src={selectedTemplateData.template_url} alt="template" className="absolute top-0 left-0 w-full h-full object-fill z-10 pointer-events-none" crossOrigin="anonymous" />
                      
                      {serials[0].trim() !== '' && (
                        <div 
                          className="absolute z-20 flex justify-center w-full"
                          style={{
                            left: `${barcodePos.x}%`,
                            top: `${barcodePos.y}%`,
                            transform: `translate(-50%, -50%) scale(${barcodePos.scale})`,
                          }}
                        >
                          <Barcode 
                            value={serials[0]} 
                            width={barcodePos.width} 
                            height={barcodePos.height} 
                            fontSize={14} 
                            margin={0}
                            displayValue={true} 
                            background="#ffffff"
                          />
                        </div>
                      )}
                    </div>
                    <button onClick={handleDownloadImage} className="text-xs font-bold text-blue-600 underline">📥 প্রিভিউ ডাউনলোড করুন</button>
                  </>
                ) : (
                  <div className="text-center text-slate-400 space-y-2">
                    <p className="text-4xl">📸</p>
                    <p className="font-bold text-sm">মডেল সিলেক্ট করে সিরিয়াল টাইপ করলে প্রিভিউ দেখা যাবে</p>
                  </div>
                )}
              </div>

              {selectedTemplateData && serials[0] !== undefined && serials[0].trim() !== '' && (
                <div className="flex-1 bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <span className="text-xl">🎛️</span>
                    <h3 className="text-sm font-black text-slate-800 uppercase">বারকোড এডিটর</h3>
                  </div>
                  
                  <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                        <span>ডানে-বামে (X)</span> <span className="text-blue-600">{barcodePos.x}%</span>
                      </label>
                      <input type="range" min="0" max="100" step="0.5" value={barcodePos.x} onChange={(e) => handlePosChange('x', e.target.value)} className="w-full accent-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                        <span>উপরে-নিচে (Y)</span> <span className="text-blue-600">{barcodePos.y}%</span>
                      </label>
                      <input type="range" min="0" max="100" step="0.5" value={barcodePos.y} onChange={(e) => handlePosChange('y', e.target.value)} className="w-full accent-blue-600" />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                        <span>প্রস্থ (Width)</span> <span className="text-orange-600">{barcodePos.width}</span>
                      </label>
                      <input type="range" min="0.5" max="4" step="0.1" value={barcodePos.width} onChange={(e) => handlePosChange('width', e.target.value)} className="w-full accent-orange-600" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                        <span>উচ্চতা (Height)</span> <span className="text-orange-600">{barcodePos.height}px</span>
                      </label>
                      <input type="range" min="10" max="150" step="1" value={barcodePos.height} onChange={(e) => handlePosChange('height', e.target.value)} className="w-full accent-orange-600" />
                    </div>
                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                        <span>জুম (Scale)</span> <span className="text-slate-800">{barcodePos.scale}x</span>
                      </label>
                      <input type="range" min="0.5" max="2" step="0.05" value={barcodePos.scale} onChange={(e) => handlePosChange('scale', e.target.value)} className="w-full accent-slate-800" />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 📋 প্রিন্ট কিউ (লিস্ট) সেকশন */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <div className="flex justify-between items-end border-b pb-4 mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800">২. প্রিন্ট লিস্ট (Queue)</h2>
                <p className="text-xs font-bold text-slate-400 mt-1">এখানে অ্যাড করা স্টিকারগুলো একসাথে প্রিন্ট হবে</p>
              </div>
              <button 
                onClick={handlePrintAll} 
                disabled={printQueue.length === 0}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black shadow-lg hover:bg-blue-700 uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
              >
                🖨️ সব প্রিন্ট করুন ({printQueue.length})
              </button>
            </div>

            {printQueue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">
                      <th className="pb-3 pl-2">ব্র্যান্ড ও মডেল</th>
                      <th className="pb-3">সিরিয়াল নম্বর</th>
                      <th className="pb-3">সাইজ (mm)</th>
                      <th className="pb-3 text-right pr-2">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {printQueue.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pl-2 font-bold text-slate-800">
                          {item.template.brand} <span className="text-xs text-slate-400 ml-1">{item.template.model_name}</span>
                        </td>
                        <td className="py-3 font-black text-blue-600">{item.serial}</td>
                        <td className="py-3 text-xs font-bold text-slate-500">{item.template.width}x{item.template.height}</td>
                        <td className="py-3 text-right pr-2">
                          <button onClick={() => removeFromQueue(item.id)} className="text-red-400 font-bold hover:bg-red-50 px-3 py-1 rounded-lg">বাতিল</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 font-bold italic border-2 border-dashed rounded-2xl">
                এখনও কোনো স্টিকার লিস্টে যুক্ত করা হয়নি।
              </div>
            )}
          </div>
        </div>
      )}

      {/* ➕ Add New Template */}
      {activeTab === 'add_new' && (
        <div className="bg-white p-8 rounded-3xl border shadow-sm max-w-2xl mx-auto">
          <h2 className="text-xl font-black border-b pb-4 mb-6 text-slate-800">নতুন স্টিকার টেমপ্লেট ও সাইজ যুক্ত করুন</h2>
          <form onSubmit={handleAddNewTemplate} className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ব্র্যান্ডের নাম</label>
              <input type="text" value={newBrand} onChange={e=>setNewBrand(e.target.value)} placeholder="যেমন: INHENERGY" className="w-full p-4 border-2 rounded-xl font-bold outline-none focus:border-orange-500" required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ইনভার্টার মডেল</label>
              <input type="text" value={newModel} onChange={e=>setNewModel(e.target.value)} placeholder="যেমন: SI-3K-T2" className="w-full p-4 border-2 rounded-xl font-bold outline-none focus:border-orange-500" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">স্টিকারের প্রস্থ / Width (mm)</label>
                <input type="number" value={newWidth} onChange={e=>setNewWidth(e.target.value)} placeholder="যেমন: 100" className="w-full p-4 border-2 rounded-xl font-bold outline-none focus:border-orange-500" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">স্টিকারের উচ্চতা / Height (mm)</label>
                <input type="number" value={newHeight} onChange={e=>setNewHeight(e.target.value)} placeholder="যেমন: 150" className="w-full p-4 border-2 rounded-xl font-bold outline-none focus:border-orange-500" required />
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <label className="text-[10px] font-black text-orange-600 uppercase mb-2 block">ব্ল্যাংক স্টিকারের ছবি (যেখানে বারকোডের জায়গা ফাঁকা)</label>
              <input id="file-upload" type="file" accept="image/*" onChange={e=>setUploadFile(e.target.files[0])} className="w-full p-3 bg-white border rounded-xl font-bold outline-none" required />
            </div>
            <button type="submit" disabled={uploading} className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-orange-700 disabled:opacity-50 active:scale-95 transition-all">
              {uploading ? 'আপলোড হচ্ছে...' : 'সেভ টেমপ্লেট'}
            </button>
          </form>
        </div>
      )}

      {/* 🖨️ হিডেন A4 প্রিন্ট সেকশন */}
      <div className="hidden">
        <div ref={printRef}>
          {chunkArray(printQueue, 4).map((pageData, pIdx) => (
            <div key={pIdx} className="a4-page">
              {pageData.map((item) => (
                <div 
                  key={item.id} 
                  className="sticker-container" 
                  style={{ width: `${item.template.width}mm`, height: `${item.template.height}mm` }}
                >
                  <img src={item.template.template_url} className="template-bg" alt="" crossOrigin="anonymous" />
                  <div 
                    className="barcode-overlay"
                    style={{
                      left: `${item.barcodePos.x}%`,
                      top: `${item.barcodePos.y}%`,
                      transform: `translate(-50%, -50%) scale(${item.barcodePos.scale})`
                    }}
                  >
                    <Barcode 
                      value={item.serial || 'BLANK'} 
                      width={item.barcodePos.width} 
                      height={item.barcodePos.height} 
                      fontSize={14} 
                      margin={0} 
                      background="#ffffff" 
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default LabelPrint;