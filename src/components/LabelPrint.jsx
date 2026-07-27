import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';

const LabelPrint = () => {
  const [activeTab, setActiveTab] = useState('print');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Template State
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // প্রিন্ট লিস্ট বা কিউ (Queue) স্টেট
  const [printQueue, setPrintQueue] = useState([]);

  // Editor State
  const [selectedModel, setSelectedModel] = useState('');
  const [quantity, setQuantity] = useState('');
  const [serials, setSerials] = useState([]);
  const printRef = useRef();
  const parentRef = useRef(null);

  const [barcodePos, setBarcodePos] = useState({ 
    x: 50, y: 82, scale: 1, width: 1.5, height: 40  
  });

  const [previewZoom, setPreviewZoom] = useState(1);

  // Add New Template State
  const [newModel, setNewModel] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [paperSize, setPaperSize] = useState('A4');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from('sticker_templates').select('*');
    if (!error && data) setTemplates(data);
  };

  const handleDeleteTemplate = async (template) => {
    const result = await Swal.fire({
      title: 'আপনি কি নিশ্চিত?',
      text: `"${template.brand} - ${template.model_name}" টেমপ্লেটটি ডিলিট করতে চান?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'হ্যাঁ, ডিলিট করুন!',
      cancelButtonText: 'বাতিল'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      // 1. Storage থেকে ছবি ডিলিট করুন (যদি থাকে)
      if (template.template_url) {
        try {
          const urlParts = template.template_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          await supabase.storage.from('stickers').remove([fileName]);
        } catch (storageErr) {
          console.error('Storage deletion error:', storageErr);
        }
      }

      // 2. Database থেকে রেকর্ড ডিলিট করুন
      const { error } = await supabase
        .from('sticker_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      Swal.fire('ডিলিট হয়েছে!', 'টেমপ্লেটটি সফলভাবে ডিলিট করা হয়েছে।', 'success');
      
      // Select model clear if the deleted one was selected
      if (selectedModel === template.id.toString()) {
        setSelectedModel('');
      }
      
      fetchTemplates();
    } catch (err) {
      console.error(err);
      Swal.fire('এরর!', 'টেমপ্লেট ডিলিট করতে সমস্যা হয়েছে!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (template) => {
    setEditingTemplate(template);
    setEditBrand(template.brand || '');
    setEditModel(template.model_name || '');
    setEditWidth(template.width || '');
    setEditHeight(template.height || '');
    setEditFile(null);
  };

  const handleSaveEditTemplate = async (e) => {
    e.preventDefault();
    if (!editingTemplate || !editBrand || !editModel || !editWidth || !editHeight) {
      return Swal.fire('সতর্কতা', 'সবগুলো তথ্য সঠিকভাবে দিন!', 'warning');
    }

    setSavingEdit(true);
    try {
      let finalImageUrl = editingTemplate.template_url;

      // যদি নতুন ছবি আপলোড করা হয়
      if (editFile) {
        const fileExt = editFile.name.split('.').pop();
        const fileName = `${editModel.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('stickers')
          .upload(fileName, editFile);

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from('stickers')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrl;

        // পুরানো ছবি ডিলিট করুন (যদি থাকে)
        if (editingTemplate.template_url) {
          try {
            const oldUrlParts = editingTemplate.template_url.split('/');
            const oldFileName = oldUrlParts[oldUrlParts.length - 1];
            await supabase.storage.from('stickers').remove([oldFileName]);
          } catch (storageErr) {
            console.error('Old storage deletion error:', storageErr);
          }
        }
      }

      // ডাটাবেজ আপডেট
      const { error: dbErr } = await supabase
        .from('sticker_templates')
        .update({
          brand: editBrand,
          model_name: editModel,
          width: Number(editWidth),
          height: Number(editHeight),
          template_url: finalImageUrl
        })
        .eq('id', editingTemplate.id);

      if (dbErr) throw dbErr;

      Swal.fire({
        title: 'আপডেট হয়েছে!',
        text: 'টেমপ্লেট সফলভাবে আপডেট করা হয়েছে।',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error(err);
      Swal.fire('এরর!', 'টেমপ্লেট আপডেট করতে সমস্যা হয়েছে!', 'error');
    } finally {
      setSavingEdit(false);
    }
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
    if (value === '') {
      setBarcodePos(prev => ({ ...prev, [axis]: '' }));
      return;
    }
    const val = parseFloat(value);
    if (!isNaN(val)) {
      setBarcodePos(prev => ({ ...prev, [axis]: val }));
    }
  };

  const handleAddToQueue = () => {
    if (!selectedModel) return Swal.fire('সতর্কতা', 'মডেল সিলেক্ট করুন!', 'warning');
    if (serials.length === 0 || serials.some(s => s.trim() === '')) {
      return Swal.fire('সতর্কতা', 'সবগুলো সিরিয়াল নম্বর পূরণ করুন!', 'warning');
    }

    const template = templates.find(t => t.id.toString() === selectedModel);
    
    const newItems = serials.map(serial => ({
      id: Math.random().toString(36).substr(2, 9),
      template,
      serial,
      barcodePos: { ...barcodePos } 
    }));

    setPrintQueue([...printQueue, ...newItems]);
    
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

  const handleAutoFit = () => {
    if (selectedTemplateData && parentRef.current) {
      const parentWidth = parentRef.current.clientWidth - 64;
      const parentHeight = parentRef.current.clientHeight - 64;
      const templateW = selectedTemplateData.width * 2.5;
      const templateH = selectedTemplateData.height * 2.5;
      
      let fitScale = 1;
      const scaleX = parentWidth / templateW;
      const scaleY = parentHeight / templateH;
      fitScale = Math.min(scaleX, scaleY);
      
      setPreviewZoom(Math.max(0.1, Math.min(2, Math.round(fitScale * 100) / 100)));
    }
  };

  useEffect(() => {
    if (!selectedTemplateData) return;
    
    // Auto fit on mount / template change
    const timer = setTimeout(() => {
      handleAutoFit();
    }, 100);

    const handleResize = () => {
      handleAutoFit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedModel, selectedTemplateData]);

  // 🖨️ আপডেট: গ্যাপ ছাড়া একসাথে প্রিন্ট করার লজিক
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
    
    frameDoc.write(`
      <html>
        <head>
          <title>Print Labels</title>
          <style>
            @media print {
              @page { margin: 0; size: ${paperSize === 'A4' ? 'A4 portrait' : '100mm 150mm'}; }
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; background: #fff; }
              
              .a4-page {
                 width: 210mm;
                 height: 297mm;
                 padding: 10mm; 
                 box-sizing: border-box;
                 page-break-after: always;
                 display: flex;
                 flex-wrap: wrap;        
                 align-content: flex-start;
                 justify-content: flex-start;
                 gap: 0; /* 🔴 গ্যাপ শূন্য করে দেওয়া হলো যাতে একসাথে লেগে থাকে */
              }

              .sticker-container { 
                position: relative; 
                overflow: hidden; 
                box-sizing: border-box;
                border: 1px dashed #888; /* 🔴 কাটার সুবিধার জন্য বর্ডার */
                margin-right: -1px;      /* 🔴 ডাবল লাইন যেন না হয় তার জন্য মার্জিন ওভারল্যাপ */
                margin-bottom: -1px;     /* 🔴 ডাবল লাইন যেন না হয় তার জন্য মার্জিন ওভারল্যাপ */
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
    
    const originalZoom = previewZoom;
    try {
      setPreviewZoom(1);
      // Wait for React to render at scale 1 before capturing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const canvas = await html2canvas(element, { scale: 3, useCORS: true });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Preview_${selectedTemplateData.model_name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      Swal.fire('এরর', 'ছবি ডাউনলোড করতে সমস্যা হয়েছে!', 'error');
    } finally {
      setPreviewZoom(originalZoom);
    }
  };

  const chunkArray = (arr, size) => {
    const chunked = [];
    for (let i = 0; i < arr.length; i += size) {
      chunked.push(arr.slice(i, i + size));
    }
    return chunked;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-['Inter'] pb-20">
      
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-wrap md:flex-nowrap gap-4">
        <button 
          onClick={() => setActiveTab('print')}
          className={`flex-1 py-3 px-4 rounded-xl font-black transition-all text-sm md:text-base ${activeTab === 'print' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          🖨️ লেবেল প্রিন্ট ও লিস্ট
        </button>
        <button 
          onClick={() => setActiveTab('manage')}
          className={`flex-1 py-3 px-4 rounded-xl font-black transition-all text-sm md:text-base ${activeTab === 'manage' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          📋 টেমপ্লেট তালিকা ও ম্যানেজমেন্ট
        </button>
        <button 
          onClick={() => setActiveTab('add_new')}
          className={`flex-1 py-3 px-4 rounded-xl font-black transition-all text-sm md:text-base ${activeTab === 'add_new' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          ➕ নতুন মডেল ও সাইজ এন্ট্রি
        </button>
      </div>

      {activeTab === 'print' && (
        <div className="space-y-6">
          
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
              
              <div className="flex-1 bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden min-h-[450px]">
                {selectedTemplateData && serials[0] !== undefined ? (
                  <div className="flex flex-col h-full">
                    {/* Zoom Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border-b px-4 py-3 text-xs font-bold text-slate-600">
                      <div className="flex items-center gap-1">
                        <span>🖼️</span>
                        <span>স্টিকার প্রিভিউ (Preview)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => setPreviewZoom(prev => Math.max(0.1, Math.round((prev - 0.1) * 10) / 10))}
                          className="w-7 h-7 flex items-center justify-center bg-white border hover:bg-slate-100 rounded-lg text-slate-800 active:scale-95 transition-all shadow-sm"
                          title="Zoom Out"
                        >
                          ➖
                        </button>
                        <input 
                          type="range" 
                          min="0.1" 
                          max="2" 
                          step="0.05" 
                          value={previewZoom} 
                          onChange={(e) => setPreviewZoom(parseFloat(e.target.value))} 
                          className="w-20 md:w-28 accent-slate-800 cursor-pointer" 
                        />
                        <button 
                          type="button"
                          onClick={() => setPreviewZoom(prev => Math.min(2, Math.round((prev + 0.1) * 10) / 10))}
                          className="w-7 h-7 flex items-center justify-center bg-white border hover:bg-slate-100 rounded-lg text-slate-800 active:scale-95 transition-all shadow-sm"
                          title="Zoom In"
                        >
                          ➕
                        </button>
                        <span className="bg-slate-200 px-2 py-1 rounded text-slate-700 font-mono w-12 text-center text-[10px]">
                          {Math.round(previewZoom * 100)}%
                        </span>
                        <button 
                          type="button"
                          onClick={handleAutoFit}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-lg active:scale-95 transition-all text-[10px]"
                        >
                          Auto Fit
                        </button>
                        <button 
                          type="button"
                          onClick={() => setPreviewZoom(1)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border rounded-lg active:scale-95 transition-all text-[10px]"
                        >
                          100%
                        </button>
                      </div>
                    </div>

                    {/* Viewport Workspace */}
                    <div 
                      ref={parentRef}
                      className="flex-1 min-h-[350px] overflow-auto flex items-center justify-center p-6 relative custom-scrollbar bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"
                    >
                      <div 
                        style={{
                          width: `${selectedTemplateData.width * 2.5 * previewZoom}px`,
                          height: `${selectedTemplateData.height * 2.5 * previewZoom}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}
                      >
                        <div 
                          id="live-sticker-preview"
                          className="relative shadow-2xl bg-white border overflow-hidden origin-top-left flex-shrink-0"
                          style={{
                            width: `${selectedTemplateData.width * 2.5}px`, 
                            height: `${selectedTemplateData.height * 2.5}px`,
                            transform: `scale(${previewZoom})`,
                            transformOrigin: 'top left',
                          }}
                        >
                          <img src={selectedTemplateData.template_url} alt="template" className="absolute top-0 left-0 w-full h-full object-fill z-10 pointer-events-none" crossOrigin="anonymous" />
                          
                          {serials[0].trim() !== '' && (
                            <div 
                              className="absolute z-20 flex justify-center w-full"
                              style={{
                                left: `${barcodePos.x || 0}%`,
                                top: `${barcodePos.y || 0}%`,
                                transform: `translate(-50%, -50%) scale(${barcodePos.scale || 1})`,
                              }}
                            >
                              <Barcode 
                                value={serials[0]} 
                                width={parseFloat(barcodePos.width) || 1.5} 
                                height={parseFloat(barcodePos.height) || 40} 
                                fontSize={14} 
                                margin={0}
                                displayValue={true} 
                                background="#ffffff"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 border-t text-center">
                      <button onClick={handleDownloadImage} className="text-xs font-black text-blue-600 hover:text-blue-700 transition-colors">📥 প্রিভিউ ডাউনলোড করুন</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 min-h-[400px] text-center text-slate-400 space-y-2">
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
                      <label className="text-[10px] font-black text-slate-500 uppercase block">
                        ডানে-বামে (X)
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="0.5" 
                          value={barcodePos.x === '' ? 0 : barcodePos.x} 
                          onChange={(e) => handlePosChange('x', e.target.value)} 
                          className="flex-1 accent-blue-600 cursor-pointer" 
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            step="0.5" 
                            value={barcodePos.x} 
                            onChange={(e) => handlePosChange('x', e.target.value)} 
                            className="w-16 p-1.5 text-center bg-white border rounded-lg font-bold text-xs text-blue-600 outline-none focus:border-blue-500 shadow-sm" 
                          />
                          <span className="text-xs text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">
                        উপরে-নিচে (Y)
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="0.5" 
                          value={barcodePos.y === '' ? 0 : barcodePos.y} 
                          onChange={(e) => handlePosChange('y', e.target.value)} 
                          className="flex-1 accent-blue-600 cursor-pointer" 
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            step="0.5" 
                            value={barcodePos.y} 
                            onChange={(e) => handlePosChange('y', e.target.value)} 
                            className="w-16 p-1.5 text-center bg-white border rounded-lg font-bold text-xs text-blue-600 outline-none focus:border-blue-500 shadow-sm" 
                          />
                          <span className="text-xs text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">
                        প্রস্থ (Width)
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="0.5" 
                          max="4" 
                          step="0.1" 
                          value={barcodePos.width === '' ? 0.5 : barcodePos.width} 
                          onChange={(e) => handlePosChange('width', e.target.value)} 
                          className="flex-1 accent-orange-600 cursor-pointer" 
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input 
                            type="number" 
                            min="0.5" 
                            max="4" 
                            step="0.1" 
                            value={barcodePos.width} 
                            onChange={(e) => handlePosChange('width', e.target.value)} 
                            className="w-16 p-1.5 text-center bg-white border rounded-lg font-bold text-xs text-orange-600 outline-none focus:border-orange-500 shadow-sm" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">
                        উচ্চতা (Height)
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="10" 
                          max="150" 
                          step="1" 
                          value={barcodePos.height === '' ? 10 : barcodePos.height} 
                          onChange={(e) => handlePosChange('height', e.target.value)} 
                          className="flex-1 accent-orange-600 cursor-pointer" 
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input 
                            type="number" 
                            min="10" 
                            max="150" 
                            step="1" 
                            value={barcodePos.height} 
                            onChange={(e) => handlePosChange('height', e.target.value)} 
                            className="w-16 p-1.5 text-center bg-white border rounded-lg font-bold text-xs text-orange-600 outline-none focus:border-orange-500 shadow-sm" 
                          />
                          <span className="text-xs text-slate-400 font-bold">px</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">
                        জুম (Scale)
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2" 
                          step="0.05" 
                          value={barcodePos.scale === '' ? 0.5 : barcodePos.scale} 
                          onChange={(e) => handlePosChange('scale', e.target.value)} 
                          className="flex-1 accent-slate-800 cursor-pointer" 
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input 
                            type="number" 
                            min="0.5" 
                            max="2" 
                            step="0.05" 
                            value={barcodePos.scale} 
                            onChange={(e) => handlePosChange('scale', e.target.value)} 
                            className="w-16 p-1.5 text-center bg-white border rounded-lg font-bold text-xs text-slate-800 outline-none focus:border-slate-500 shadow-sm" 
                          />
                          <span className="text-xs text-slate-400 font-bold">x</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

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

      {activeTab === 'manage' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 animate-pulse-subtle">📋 টেমপ্লেট তালিকা ও ম্যানেজমেন্ট</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">এখানে সকল স্টিকার টেমপ্লেট দেখতে, এডিট বা ডিলিট করতে পারবেন</p>
            </div>
            
            {/* Search Filter */}
            <div className="w-full md:w-80">
              <input 
                type="text" 
                placeholder="🔍 মডেল বা ব্র্যান্ড খুঁজুন..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 rounded-xl font-bold outline-none focus:border-blue-500 text-sm shadow-inner"
              />
            </div>
          </div>

          {/* Templates Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">
                  <th className="pb-3 pl-2">ছবি (Preview)</th>
                  <th className="pb-3">ব্র্যান্ড ও মডেল</th>
                  <th className="pb-3">সাইজ (mm)</th>
                  <th className="pb-3 text-right pr-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {templates
                  .filter(t => 
                    (t.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (t.model_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((template) => (
                    <tr key={template.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pl-2">
                        <a 
                          href={template.template_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="block w-16 h-10 border rounded-lg overflow-hidden bg-slate-100 hover:opacity-85 transition-opacity"
                          title="সম্পূর্ণ ছবি দেখতে ক্লিক করুন"
                        >
                          <img src={template.template_url} alt="" className="w-full h-full object-contain" />
                        </a>
                      </td>
                      <td className="py-3 font-bold text-slate-800">
                        {template.brand} <span className="text-xs text-slate-400 ml-1">{template.model_name}</span>
                      </td>
                      <td className="py-3 text-xs font-bold text-slate-500">
                        {template.width} x {template.height} mm
                      </td>
                      <td className="py-3 text-right pr-2 space-x-2">
                        <button 
                          onClick={() => handleOpenEditModal(template)} 
                          className="text-blue-500 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm transition-colors border border-transparent hover:border-blue-100"
                        >
                          ✏️ এডিট
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(template)} 
                          className="text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm transition-colors border border-transparent hover:border-red-100"
                        >
                          🗑️ ডিলিট
                        </button>
                      </td>
                    </tr>
                  ))}
                {templates.filter(t => 
                  (t.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                  (t.model_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-slate-400 font-bold italic">
                      কোনো টেমপ্লেট খুঁজে পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

      {/* ✏️ এডিট টেমপ্লেট মোডাল */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <h3 className="text-lg font-black text-slate-850 flex items-center gap-2">
                <span>✏️</span> টেমপ্লেট এডিট করুন: {editingTemplate.brand} - {editingTemplate.model_name}
              </h3>
              <button 
                onClick={() => setEditingTemplate(null)} 
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTemplate} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ব্র্যান্ডের নাম</label>
                <input 
                  type="text" 
                  value={editBrand} 
                  onChange={(e) => setEditBrand(e.target.value)} 
                  placeholder="যেমন: INHENERGY" 
                  className="w-full p-3.5 border-2 rounded-xl font-bold outline-none focus:border-blue-500 text-sm" 
                  required 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ইনভার্টার মডেল</label>
                <input 
                  type="text" 
                  value={editModel} 
                  onChange={(e) => setEditModel(e.target.value)} 
                  placeholder="যেমন: SI-3K-T2" 
                  className="w-full p-3.5 border-2 rounded-xl font-bold outline-none focus:border-blue-500 text-sm" 
                  required 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">প্রস্থ / Width (mm)</label>
                  <input 
                    type="number" 
                    value={editWidth} 
                    onChange={(e) => setEditWidth(e.target.value)} 
                    placeholder="যেমন: 100" 
                    className="w-full p-3.5 border-2 rounded-xl font-bold outline-none focus:border-blue-500 text-sm" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">উচ্চতা / Height (mm)</label>
                  <input 
                    type="number" 
                    value={editHeight} 
                    onChange={(e) => setEditHeight(e.target.value)} 
                    placeholder="যেমন: 150" 
                    className="w-full p-3.5 border-2 rounded-xl font-bold outline-none focus:border-blue-500 text-sm" 
                    required 
                  />
                </div>
              </div>

              {/* Current / New Image preview */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="w-24 h-16 bg-white rounded-lg border overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                  <img 
                    src={editFile ? URL.createObjectURL(editFile) : editingTemplate.template_url} 
                    alt="Current preview" 
                    className="max-w-full max-h-full object-contain" 
                  />
                </div>
                <div className="flex-1 w-full text-center md:text-left">
                  <span className="text-[10px] font-black text-blue-600 uppercase mb-1 block">ব্ল্যাংক স্টিকারের ছবি (যদি পরিবর্তন করতে চান)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setEditFile(e.target.files[0])} 
                    className="w-full p-1.5 bg-white border rounded-xl font-bold text-xs outline-none" 
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingTemplate(null)} 
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm active:scale-95 transition-all"
                >
                  বাতিল করুন
                </button>
                <button 
                  type="submit" 
                  disabled={savingEdit} 
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-black text-sm shadow-md hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {savingEdit ? 'আপলোড ও সেভ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LabelPrint;