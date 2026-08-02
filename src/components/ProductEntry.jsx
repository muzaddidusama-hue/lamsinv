import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ProductEntry = () => {
  // Page mode: 'create' for new product entry, 'edit' for editing existing products
  const [pageMode, setPageMode] = useState('create');
  // Form active tab: 'general' (essential info) vs 'advanced' (specs and descriptions)
  const [formTab, setFormTab] = useState('general');

  const [brands, setBrands] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCatalogImg, setUploadingCatalogImg] = useState(false);

  // Form states - General
  const [brandName, setBrandName] = useState('');
  const [brandMode, setBrandMode] = useState('new'); // 'new' brand or 'existing' brand selection
  const [category, setCategory] = useState('Hybrid Inverter');
  const [model, setModel] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [availability, setAvailability] = useState('in stock');
  const [house, setHouse] = useState('Head Office');
  const [imageUrl, setImageUrl] = useState('');

  // Special states for Solar Panel auto calculation
  const [panelWatt, setPanelWatt] = useState('');
  const [perWattPrice, setPerWattPrice] = useState('');

  // Form states - Advanced (Descriptions & Specs)
  const [volt, setVolt] = useState('');
  const [watt, setWatt] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [catalogImageUrl, setCatalogImageUrl] = useState('');

  const categories = ["Hybrid Inverter", "On-grid Inverter", "Solar Panel", "Lithium Battery", "Accessories"];

  useEffect(() => {
    fetchBrands();
    fetchProductsList();
  }, []);

  // Fetch unique brand list from database
  const fetchBrands = async () => {
    const { data } = await supabase.from('products').select('name');
    if (data) {
      const uniqueBrands = [...new Set(data.map(item => item.name).filter(Boolean))];
      setBrands(uniqueBrands.sort());
    }
  };

  // Fetch all products for the searchable Edit dropdown
  const fetchProductsList = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) {
      // Sort A-Z by brand name and model
      const sorted = data.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.model || '').localeCompare(b.model || '', undefined, { numeric: true });
      });
      setProductsList(sorted);
    }
  };

  // Solar panel watt price auto calculator
  useEffect(() => {
    if (category === 'Solar Panel') {
      const total = (parseFloat(panelWatt) || 0) * (parseFloat(perWattPrice) || 0);
      setUnitPrice(total > 0 ? total.toString() : '');
    }
  }, [panelWatt, perWattPrice, category]);

  // Fetch existing brand image when adding a product under an existing brand name
  useEffect(() => {
    const fetchExistingImage = async () => {
      if (pageMode === 'create' && brandMode === 'existing' && brandName && category) {
        const { data } = await supabase
          .from('products')
          .select('image_url')
          .eq('name', brandName)
          .eq('category', category)
          .not('image_url', 'is', null)
          .limit(1);

        if (data && data.length > 0 && data[0].image_url) {
          setImageUrl(data[0].image_url);
        } else {
          setImageUrl('');
        }
      }
    };
    fetchExistingImage();
  }, [brandName, category, brandMode, pageMode]);

  // Load selected product data into states for editing
  const handleSelectProductToEdit = (productId) => {
    if (!productId) {
      setSelectedProductToEdit(null);
      resetForm();
      return;
    }

    const prod = productsList.find(p => p.id === parseInt(productId));
    if (prod) {
      setSelectedProductToEdit(prod);
      setBrandName(prod.name || '');
      setCategory(prod.category || 'Hybrid Inverter');
      setModel(prod.model || '');
      setUnitPrice(prod.unit_price ? prod.unit_price.toString() : '');
      setAvailability(prod.availability || 'in stock');
      setHouse(prod.house || 'Head Office');
      setImageUrl(prod.image_url || '');
      setVolt(prod.volt || '');
      setWatt(prod.watt || '');

      // Parse JSON description details (text, pdf_url, catalog_image_url)
      let parsedDesc = '';
      let parsedPdf = '';
      let parsedCatImg = '';

      if (prod.description && prod.description.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(prod.description);
          parsedDesc = parsed.text || '';
          parsedPdf = parsed.pdf_url || '';
          parsedCatImg = parsed.catalog_image_url || '';

          // Fallback for older format
          if (parsed.catalog_url) {
            if (/\.pdf/i.test(parsed.catalog_url)) {
              if (!parsedPdf) parsedPdf = parsed.catalog_url;
            } else {
              if (!parsedCatImg) parsedCatImg = parsed.catalog_url;
            }
          }
        } catch (e) {
          console.error("JSON parsing error:", e);
          parsedDesc = prod.description;
        }
      } else {
        parsedDesc = prod.description || '';
      }

      setDescriptionText(parsedDesc);
      setPdfUrl(parsedPdf);
      setCatalogImageUrl(parsedCatImg);

      // If it's a Solar Panel, attempt to restore panelWatt / perWattPrice if possible
      if (prod.category === 'Solar Panel') {
        setPanelWatt('');
        setPerWattPrice('');
      }
    }
  };

  // Standard File Upload helper into Supabase Storage 'product image' bucket
  const uploadFileToStorage = async (file, prefix) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('product image')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product image')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadFileToStorage(file, 'main_prod');
      setImageUrl(url);
    } catch (err) {
      console.error(err);
      alert('ইমেজ আপলোড করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const url = await uploadFileToStorage(file, 'product_catalog_pdf');
      setPdfUrl(url);
      alert('✅ PDF ক্যাটালগ আপলোড সফল হয়েছে!');
    } catch (err) {
      console.error(err);
      alert('PDF আপলোড করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleCatalogImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCatalogImg(true);
    try {
      const url = await uploadFileToStorage(file, 'product_catalog_img');
      setCatalogImageUrl(url);
      alert('✅ ক্যাটালগ ইমেজ আপলোড সফল হয়েছে!');
    } catch (err) {
      console.error(err);
      alert('ক্যাটালগ ইমেজ আপলোড করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setUploadingCatalogImg(false);
    }
  };

  const resetForm = () => {
    setModel('');
    setUnitPrice('');
    setPanelWatt('');
    setPerWattPrice('');
    setImageUrl('');
    setVolt('');
    setWatt('');
    setDescriptionText('');
    setPdfUrl('');
    setCatalogImageUrl('');
    setSelectedProductToEdit(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const nameToSave = brandName.trim();
    if (!nameToSave || !model.trim() || !unitPrice) {
      return alert('দয়া করে সব প্রয়োজনীয় তথ্য দিন');
    }

    setLoading(true);

    const parsedPrice = parseFloat(unitPrice) || 0;
    
    // Prepare description JSON string (which stores text, pdf_url, catalog_image_url)
    const descriptionJson = JSON.stringify({
      text: descriptionText.trim(),
      pdf_url: pdfUrl.trim(),
      catalog_image_url: catalogImageUrl.trim()
    });

    try {
      if (pageMode === 'create') {
        // Perform standard Insert
        const { error } = await supabase.from('products').insert([
          {
            name: nameToSave,
            category: category,
            model: model.trim(),
            unit_price: parsedPrice,
            stock_quantity: 0,
            availability: availability,
            image_url: imageUrl || null,
            house: house,
            volt: volt.trim() || null,
            watt: watt.trim() || null,
            description: descriptionJson
          }
        ]);

        if (error) throw error;

        alert('✅ প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!');
        resetForm();
        fetchBrands();
        fetchProductsList();
      } else {
        // Perform Edit/Update
        if (!selectedProductToEdit) return alert('দয়া করে এডিট করার জন্য একটি প্রোডাক্ট সিলেক্ট করুন');

        // 1. Update specific row (ID based)
        const { error: rowUpdateError } = await supabase
          .from('products')
          .update({
            name: nameToSave,
            category: category,
            model: model.trim(),
            unit_price: parsedPrice,
            availability: availability,
            image_url: imageUrl || null,
            house: house,
            volt: volt.trim() || null,
            watt: watt.trim() || null,
            description: descriptionJson
          })
          .eq('id', selectedProductToEdit.id);

        if (rowUpdateError) throw rowUpdateError;

        // 2. Propagate technical specs & description details to all houses/locations having the same model
        // matching by edited product's category, brand name, and model. This ensures operations remain identical
        // to FrontEndCustom.jsx which updated volt, watt, description for all matching items in all houses.
        const { error: syncError } = await supabase
          .from('products')
          .update({
            volt: volt.trim() || null,
            watt: watt.trim() || null,
            description: descriptionJson
          })
          .eq('category', category)
          .eq('name', nameToSave)
          .eq('model', model.trim());

        if (syncError) {
          console.warn("Specification propagation notice:", syncError.message);
        }

        alert('✅ প্রোডাক্টের বিবরণ ও তথ্য সফলভাবে আপডেট হয়েছে!');
        fetchProductsList();
        fetchBrands();
      }
    } catch (err) {
      console.error(err);
      alert('ত্রুটি হয়েছে: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1300px] mx-auto space-y-6 pb-12 font-sans">
      
      {/* Breadcrumb Header matching MatDash style */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {pageMode === 'create' ? 'Add Product (নতুন মডেল এন্ট্রি)' : 'Edit Product (প্রোডাক্ট এডিট)'}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Inventory</span>
            <span>/</span>
            <span className="text-[#ea3838]">
              {pageMode === 'create' ? 'Add Product' : 'Edit Product'}
            </span>
          </div>
        </div>

        {/* Create / Edit mode toggle switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
          <button 
            type="button"
            onClick={() => { setPageMode('create'); resetForm(); }}
            className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${pageMode === 'create' ? 'bg-white text-[#ea3838] shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-850'}`}
          >
            ➕ নতুন প্রোডাক্ট যোগ করুন
          </button>
          <button 
            type="button"
            onClick={() => { setPageMode('edit'); resetForm(); }}
            className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${pageMode === 'edit' ? 'bg-white text-[#ea3838] shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-855'}`}
          >
            ✏️ প্রোডাক্ট এডিট / আপডেট
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Details (General / Advanced) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Search Dropdown - visible only in Edit Mode */}
          {pageMode === 'edit' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2">
              <label className="text-[10px] font-black text-[#ea3838] uppercase tracking-widest block">১. এডিট করার জন্য প্রোডাক্ট সিলেক্ট করুন</label>
              <select 
                onChange={(e) => handleSelectProductToEdit(e.target.value)}
                value={selectedProductToEdit ? selectedProductToEdit.id : ''}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#ea3838]/20"
              >
                <option value="">প্রোডাক্ট বেছে নিন...</option>
                {productsList.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] — {p.name} — {p.model} ({p.house})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Form Tabs (General specs vs Advanced details) */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            
            {/* Tab switch bar */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 px-4">
              <button 
                type="button"
                onClick={() => setFormTab('general')}
                className={`py-3.5 px-4 font-bold text-xs transition-all border-b-2 -mb-px flex items-center gap-2 ${formTab === 'general' ? 'border-[#ea3838] text-[#ea3838]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                📦 General Settings
              </button>
              <button 
                type="button"
                onClick={() => setFormTab('advanced')}
                className={`py-3.5 px-4 font-bold text-xs transition-all border-b-2 -mb-px flex items-center gap-2 ${formTab === 'advanced' ? 'border-[#ea3838] text-[#ea3838]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                📝 Advanced details (Catalog & Specs)
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Tab 1: General Info */}
              {formTab === 'general' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  
                  {/* Brand & Mode selection */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand / Company (ব্র্যান্ড)</label>
                      
                      {/* Brand Type Toggler (Only in Create Mode) */}
                      {pageMode === 'create' && (
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                          <button 
                            type="button"
                            onClick={() => { setBrandMode('new'); setBrandName(''); }}
                            className={`px-2.5 py-1 rounded font-bold text-[9px] transition-all ${brandMode === 'new' ? 'bg-white text-[#ea3838] shadow-sm' : 'text-slate-400'}`}
                          >
                            নতুন
                          </button>
                          <button 
                            type="button"
                            onClick={() => { setBrandMode('existing'); setBrandName(''); }}
                            className={`px-2.5 py-1 rounded font-bold text-[9px] transition-all ${brandMode === 'existing' ? 'bg-white text-[#ea3838] shadow-sm' : 'text-slate-400'}`}
                          >
                            পুরাতন
                          </button>
                        </div>
                      )}
                    </div>

                    {pageMode === 'create' && brandMode === 'new' ? (
                      <input 
                        type="text" 
                        value={brandName} 
                        onChange={(e) => setBrandName(e.target.value)} 
                        placeholder="ব্র্যান্ডের নাম লিখুন (উদা: SolarOn)" 
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800" 
                      />
                    ) : (
                      <select 
                        value={brandName} 
                        onChange={(e) => setBrandName(e.target.value)}
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800"
                        disabled={pageMode === 'edit'} // Disable brand edit to keep identifiers intact
                      >
                        <option value="">ব্র্যান্ড সিলেক্ট করুন...</option>
                        {brands.map((b, i) => <option key={i} value={b}>{b}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Category & House locations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Category (প্রোডাক্ট ক্যাটাগরি)</label>
                      <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-700"
                        disabled={pageMode === 'edit'} // Disable category change in edit mode
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Location / House (অবস্থান)</label>
                      <select 
                        value={house} 
                        onChange={(e) => setHouse(e.target.value)}
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-700"
                        disabled={pageMode === 'edit'} // Disable location edit to keep records consistent
                      >
                        <option value="Head Office">Head Office (HO)</option>
                        <option value="Showroom">Showroom</option>
                      </select>
                    </div>
                  </div>

                  {/* Model specifications */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Model / Capacity (মডেল নম্বর বা ক্যাপাসিটি)</label>
                    <input 
                      type="text" 
                      value={model} 
                      onChange={(e) => setModel(e.target.value)} 
                      placeholder="যেমন: 3.6 kW / 550W Mono" 
                      className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800" 
                      disabled={pageMode === 'edit'} // Model is identifier, do not edit
                    />
                  </div>

                  {/* Pricing segment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    {category === 'Solar Panel' ? (
                      <div className="col-span-full grid grid-cols-2 gap-4 bg-[#ea3838]/5 p-4 rounded-xl border border-[#ea3838]/10">
                        <div>
                          <label className="text-[10px] font-black text-[#ea3838] uppercase tracking-widest mb-2 block">Panel Watt (প্যানেল ওয়াট)</label>
                          <input 
                            type="number" 
                            value={panelWatt} 
                            onChange={(e) => setPanelWatt(e.target.value)} 
                            placeholder="550" 
                            className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-850" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-[#ea3838] uppercase tracking-widest mb-2 block">Per Watt (প্রতি ওয়াট দর)</label>
                          <input 
                            type="number" 
                            value={perWattPrice} 
                            onChange={(e) => setPerWattPrice(e.target.value)} 
                            placeholder="65" 
                            className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-850" 
                          />
                        </div>
                        <div className="col-span-full flex justify-between items-center mt-2 pt-2 border-t border-[#ea3838]/10">
                          <span className="text-[11px] font-black text-[#ea3838] uppercase tracking-wider">Calculated Total Price:</span>
                          <span className="text-base font-black text-[#ea3838]">{unitPrice || '0'} ৳</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Unit Price (BDT ৳)</label>
                        <input 
                          type="number" 
                          value={unitPrice} 
                          onChange={(e) => setUnitPrice(e.target.value)} 
                          placeholder="0.00" 
                          className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800" 
                        />
                      </div>
                    )}

                    <div className={category === 'Solar Panel' ? 'col-span-full' : ''}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Availability Status</label>
                      <select 
                        value={availability} 
                        onChange={(e) => setAvailability(e.target.value)}
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-700"
                      >
                        <option value="in stock">In Stock</option>
                        <option value="upcoming">Upcoming</option>
                      </select>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 2: Advanced Specifications & PDF Catalogs */}
              {formTab === 'advanced' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Load voltage & Watt capacities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Voltage parameter (ভোল্টেজ)</label>
                      <input 
                        type="text" 
                        value={volt} 
                        onChange={(e) => setVolt(e.target.value)} 
                        placeholder="যেমন: 12V / 24V / 230V" 
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800" 
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Watt / Capacity rating (লোড ওয়াট)</label>
                      <input 
                        type="text" 
                        value={watt} 
                        onChange={(e) => setWatt(e.target.value)} 
                        placeholder="যেমন: 50W / 200W / 3KW" 
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800" 
                      />
                    </div>
                  </div>

                  {/* Technical Text description */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-semibold">Technical Specs & Details (বিস্তারিত বিবরণ)</label>
                    <textarea 
                      value={descriptionText} 
                      onChange={(e) => setDescriptionText(e.target.value)} 
                      rows="4"
                      placeholder="পাবলিক পেজে দেখানোর জন্য প্রোডাক্টের বিস্তারিত বিবরণ এবং টেকনিক্যাল ডেটা এখানে লিখুন..."
                      className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-semibold text-xs text-slate-800 leading-relaxed"
                    />
                  </div>

                  {/* PDF Catalog file uploader */}
                  <div className="border-t border-slate-100 pt-5 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Catalog PDF File</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Direct PDF URL Link</label>
                        <input 
                          type="text" 
                          value={pdfUrl} 
                          onChange={(e) => setPdfUrl(e.target.value)}
                          placeholder="https://example.com/catalog.pdf" 
                          className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-semibold text-xs text-slate-650" 
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="cursor-pointer flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors p-3 text-center min-h-[48px] relative">
                          {uploadingPdf ? (
                            <span className="text-slate-400 font-bold text-xs">⏳ uploading...</span>
                          ) : (
                            <span className="text-slate-600 font-bold text-xs">📤 PDF আপলোড করুন</span>
                          )}
                          <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" disabled={uploadingPdf} />
                        </label>
                      </div>
                    </div>
                    {pdfUrl && (
                      <div className="p-3 bg-[#ea3838]/5 border border-[#ea3838]/10 rounded-xl flex items-center justify-between text-[11px] font-bold text-[#ea3838]">
                        <span className="truncate max-w-[80%]">📄 PDF: {pdfUrl}</span>
                        <button type="button" onClick={() => setPdfUrl('')} className="text-red-500 hover:text-red-700">✕ মুছে ফেলুন</button>
                      </div>
                    )}
                  </div>

                  {/* Catalog image file uploader */}
                  <div className="border-t border-slate-100 pt-5 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Catalog Poster Image</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Direct Catalog Image URL</label>
                        <input 
                          type="text" 
                          value={catalogImageUrl} 
                          onChange={(e) => setCatalogImageUrl(e.target.value)}
                          placeholder="https://example.com/poster.jpg" 
                          className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-semibold text-xs text-slate-650" 
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="cursor-pointer flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors p-3 text-center min-h-[48px] relative">
                          {uploadingCatalogImg ? (
                            <span className="text-slate-400 font-bold text-xs">⏳ uploading...</span>
                          ) : (
                            <span className="text-slate-600 font-bold text-xs">📤 ক্যাটালগ ইমেজ আপলোড করুন</span>
                          )}
                          <input type="file" accept="image/*" onChange={handleCatalogImageUpload} className="hidden" disabled={uploadingCatalogImg} />
                        </label>
                      </div>
                    </div>
                    {catalogImageUrl && (
                      <div className="p-3 bg-[#ea3838]/5 border border-[#ea3838]/10 rounded-xl flex items-center justify-between text-[11px] font-bold text-[#ea3838]">
                        <span className="truncate max-w-[80%]">🖼️ ক্যাটালগ ছবি: {catalogImageUrl}</span>
                        <button type="button" onClick={() => setCatalogImageUrl('')} className="text-red-500 hover:text-red-700">✕ মুছে ফেলুন</button>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Column: Thumbnail image and submit action button */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Card 1: Image Thumbnail upload preview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col items-center">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block w-full text-center">Product Image (প্রোডাক্ট ইমেজ)</label>
            
            <div className="w-full border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/60 flex flex-col items-center justify-center p-6 min-h-[260px] relative overflow-hidden group aspect-square">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Thumbnail Preview" className="h-full w-full object-contain mix-blend-multiply transition-transform group-hover:scale-105" />
                  <button 
                    type="button" 
                    onClick={() => setImageUrl('')} 
                    className="absolute top-3 right-3 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <label className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center hover:bg-slate-100/50 transition-colors py-8">
                  <div className="text-4xl mb-3 opacity-25">{uploadingImage ? '⏳' : '📤'}</div>
                  <span className="text-slate-500 font-black text-xs uppercase tracking-widest block px-4">
                    {uploadingImage ? 'আপলোড হচ্ছে...' : 'ক্লিক করে ইমেজ আপলোড দিন'}
                  </span>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 px-4">Set the product thumbnail image. *.png, *.jpg accepted.</p>
                  <input type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" disabled={uploadingImage} />
                </label>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea3838]"></div>
                </div>
              )}
            </div>

            <div className="w-full mt-4">
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Image URL Link</label>
              <input 
                type="text" 
                value={imageUrl} 
                readOnly 
                placeholder="আপলোড করা ইমেজের লিঙ্ক এখানে আসবে" 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-[9px] font-bold text-slate-500" 
              />
            </div>
          </div>

          {/* Card 2: Publish / Update Button actions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col gap-3">
            <button 
              type="submit" 
              disabled={loading || uploadingImage || uploadingPdf || uploadingCatalogImg} 
              className="w-full bg-[#ea3838] hover:bg-red-600 text-white py-4 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {loading 
                ? (pageMode === 'create' ? 'পাবলিশ হচ্ছে...' : 'আপডেট হচ্ছে...') 
                : (pageMode === 'create' ? '🚀 প্রোডাক্ট পাবলিশ করুন' : '💾 প্রোডাক্ট আপডেট করুন')}
            </button>
            
            {pageMode === 'edit' && (
              <button 
                type="button" 
                onClick={resetForm}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-650 py-3 rounded-xl font-bold text-xs transition-all"
              >
                Reset Fields (বাতিল করুন)
              </button>
            )}
          </div>

        </div>

      </form>
    </div>
  );
};

export default ProductEntry;