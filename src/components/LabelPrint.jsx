import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2'; // 🔴 সরাসরি ইম্পোর্ট করা হলো

const LabelPrint = () => {
  const [activeTab, setActiveTab] = useState('print');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Print State
  const [selectedModel, setSelectedModel] = useState('');
  const [quantity, setQuantity] = useState('');
  const [serials, setSerials] = useState([]);
  const printRef = useRef();

  // Barcode Control State
  const [barcodePos, setBarcodePos] = useState({ 
    x: 50, 
    y: 82, 
    scale: 1, 
    width: 1.5, 
    height: 40  
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

  // 🔴 আপডেট করা হ্যান্ডলার
  const handleAddNewTemplate = async (e) => {
    e.preventDefault();
    if (!newModel || !uploadFile || !newWidth || !newHeight) {
      Swal.fire('সতর্কতা', 'সবগুলো তথ্য সঠিকভাবে দিন!', 'warning');
      return;
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

      // 🔴 সফল হওয়ার পর কাস্টম ডায়ালগ
      fetchTemplates();
      const result = await Swal.fire({
        title: 'সফল হয়েছে!',
        text: 'নতুন স্টিকার টেমপ্লেট ও সাইজ সফলভাবে ডাটাবেজে যুক্ত হয়েছে।',
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#ea580c',
        confirmButtonText: '🖨️ ওকে (প্রিন্ট করুন)',
        cancelButtonText: '🔄 রিট্রাই (আরেকটি যুক্ত করুন)',
        customClass: { popup: 'rounded-[2rem]' }
      });

      // ফর্ম ফিল্ডগুলো রিসেট করা
      setNewModel('');
      setNewBrand('');
      setNewWidth('');
      setNewHeight('');
      setUploadFile(null);
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';

      // ইউজারের সিদ্ধান্তের ওপর ভিত্তি করে নেভিগেশন
      if (result.isConfirmed) {
        setActiveTab('print'); // ওকে দিলে প্রিন্ট ট্যাবে যাবে
      } else {
        // রিট্রাই দিলে এই পেজেই থাকবে
      }

    } catch (error) {
      console.error(error);
      // 🔴 এরর হলে এই পেজেই থাকবে এবং এরর মেসেজ দেখাবে
      Swal.fire({
        title: 'এরর!',
        text: 'টেমপ্লেট সেভ করতে সমস্যা হয়েছে! ' + (error.message || ''),
        icon: 'error',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ঠিক আছে',
        customClass: { popup: 'rounded-[2rem]' }
      });
    }
    setUploading(false);
  };

  const selectedTemplateData = templates.find(t => t.id.toString() === selectedModel);

  const handlePrint = () => {
    if (!selectedModel) {
      Swal.fire('সতর্কতা', 'মডেল সিলেক্ট করুন!', 'warning');
      return;
    }
    if (serials.some(s => s.trim() === '')) {
      Swal.fire('সতর্কতা', 'সবগুলো সিরিয়াল নম্বর পূরণ করুন!', 'warning');
      return;
    }

    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;

    const w = selectedTemplateData?.width || 100;
    const h = selectedTemplateData?.height || 150;

    const printStyle = `
      <style>
        @media print {
          @page { margin: 0; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; background: #fff; }
          .page-break { page-break-after: always; }
          .a4-wrapper {
             width: 210mm;
             height: 297mm;
             padding-top: 10mm;
             padding-left: 10mm;
             box-sizing: border-box;
          }
          .sticker-container { 
            position: relative; 
            width: ${w}mm; 
            height: ${h}mm; 
            overflow: hidden; 
            border: 1px dashed #ccc;
          }
          .template-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; z-index: 1; }
          .barcode-overlay { 
            position: absolute; 
            left: ${barcodePos.x}%; 
            top: ${barcodePos.y}%; 
            transform: translate(-50%, -50%) scale(${barcodePos.scale});
            z-index: 10; 
            display: flex; 
            justify-content: center; 
          }
        }
      </style>
    `;

    document.body.innerHTML = printStyle + printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); 
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('live-sticker-preview');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { scale: 3, useCORS: true });
      const dataUrl = canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.download = `Sticker_${selectedTemplateData.model_name}_${serials[0] || 'Blank'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      Swal.fire('এরর', 'ছবি ডাউনলোড করতে সমস্যা হয়েছে!', 'error');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 font-['Inter']">
      
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex gap-4">
        <button 
          onClick={() => setActiveTab('print')}
          className={`flex-1 py-3 rounded-xl font-black transition-all ${activeTab === 'print' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          🖨️ লেবেল প্রিন্ট ও ডাউনলোড
        </button>
        <button 
          onClick={() => setActiveTab('add_new')}
          className={`flex-1 py-3 rounded-xl font-black transition-all ${activeTab === 'add_new' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          ➕ নতুন মডেল ও সাইজ এন্ট্রি
        </button>
      </div>

      {activeTab === 'print' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border shadow-sm space-y-5 h-fit">
            <h2 className="text-lg font-black border-b pb-2 text-slate-800">স্টিকার তৈরি করুন</h2>
            
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
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">কত ইউনিট প্রিন্ট করবেন?</label>
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
                <div className="max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
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
                
                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={handleDownloadImage} 
                    className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg hover:bg-slate-800 uppercase tracking-widest active:scale-95 transition-all text-xs"
                  >
                    📥 ইমেজ ডাউনলোড
                  </button>
                  <button 
                    onClick={handlePrint} 
                    className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-blue-700 uppercase tracking-widest active:scale-95 transition-all text-xs"
                  >
                    🖨️ A4 প্রিন্ট ({serials.length})
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center italic mt-2">* প্রিন্ট করার সময় A4 পেজ সিলেক্ট করুন</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-slate-100 p-6 rounded-3xl border flex items-center justify-center min-h-[450px]">
              {selectedTemplateData && serials[0] !== undefined ? (
                <div 
                  id="live-sticker-preview"
                  className="relative shadow-2xl bg-white border overflow-hidden"
                  style={{
                    width: `${selectedTemplateData.width * 3}px`, 
                    height: `${selectedTemplateData.height * 3}px`
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
              ) : (
                <div className="text-center text-slate-400 space-y-2">
                  <p className="text-4xl">📸</p>
                  <p className="font-bold text-sm">মডেল সিলেক্ট করে সিরিয়াল টাইপ করলে প্রিভিউ দেখা যাবে</p>
                </div>
              )}
            </div>

            {selectedTemplateData && serials[0] !== undefined && serials[0].trim() !== '' && (
              <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b pb-2">
                  <span className="text-xl">🎛️</span>
                  <h3 className="text-sm font-black text-slate-800 uppercase">বারকোড এডিটর (পজিশন ও সাইজ)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">১. পজিশন (Position)</p>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                        <span>ডানে-বামে (X-Axis)</span> <span className="text-blue-600">{barcodePos.x}%</span>
                      </label>
                      <input type="range" min="0" max="100" step="0.5" value={barcodePos.x} onChange={(e) => handlePosChange('x', e.target.value)} className="w-full accent-blue-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                        <span>উপরে-নিচে (Y-Axis)</span> <span className="text-blue-600">{barcodePos.y}%</span>
                      </label>
                      <input type="range" min="0" max="100" step="0.5" value={barcodePos.y} onChange={(e) => handlePosChange('y', e.target.value)} className="w-full accent-blue-600" />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">২. স্ট্রেচ ও জুম (Stretch & Zoom)</p>
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
              </div>
            )}
          </div>
        </div>
      )}

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
              {/* 🔴 id অ্যাড করা হয়েছে ফাইল ক্লিয়ারের জন্য */}
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
          {serials.map((serial, i) => (
            <div key={i} className="a4-wrapper page-break">
              <div className="sticker-container">
                {selectedTemplateData && <img src={selectedTemplateData.template_url} className="template-bg" alt="" />}
                <div className="barcode-overlay">
                  <Barcode 
                    value={serial || 'BLANK'} 
                    width={barcodePos.width} 
                    height={barcodePos.height} 
                    fontSize={14} 
                    margin={0} 
                    background="#ffffff" 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default LabelPrint;