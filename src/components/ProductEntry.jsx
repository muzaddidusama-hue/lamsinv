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

  // Get unique products by brand name + category + model for edit selector dropdown
  const getUniqueProductsForEdit = () => {
    const seen = new Set();
    const unique = [];
    productsList.forEach(p => {
      const key = `${p.category}-${p.name}-${p.model}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    });
    return unique;
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
      alert('✅ ক্যাটালগ PDF আপলোড সফল হয়েছে!');
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
        // Perform Edit/Update on BOTH warehouses simultaneously
        if (!selectedProductToEdit) return alert('দয়া করে এডিট করার জন্য একটি প্রোডাক্ট সিলেক্ট করুন');

        // Update all products in products table matching category, original brand name, and original model
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: nameToSave,
            category: category,
            model: model.trim(),
            unit_price: parsedPrice,
            availability: availability,
            image_url: imageUrl || null,
            volt: volt.trim() || null,
            watt: watt.trim() || null,
            description: descriptionJson
          })
          .eq('category', selectedProductToEdit.category)
          .eq('name', selectedProductToEdit.name)
          .eq('model', selectedProductToEdit.model);

        if (updateError) throw updateError;

        alert('✅ প্রোডাক্টের বিবরণ ও তথ্য সফলভাবে আপডেট হয়েছে (উভয় হাউজে আপডেট হয়েছে)!');
        fetchProductsList();
        fetchBrands();
        resetForm();
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
          
          {/* Search Dropdown - visible only in Edit Mode (Unique products by model, no houses shown) */}
          {pageMode === 'edit' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2">
              <label className="text-[10px] font-black text-[#ea3838] uppercase tracking-widest block">১. এডিট করার জন্য প্রোডাক্ট সিলেক্ট করুন</label>
              <select 
                onChange={(e) => handleSelectProductToEdit(e.target.value)}
                value={selectedProductToEdit ? selectedProductToEdit.id : ''}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#ea3838]/20"
              >
                <option value="">প্রোডাক্ট বেছে নিন...</option>
                {getUniqueProductsForEdit().map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] — {p.name} — {p.model}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Form Tabs (General specs vs Advanced details) */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setFormTab('general')}
                className={`py-3.5 px-4 font-bold text-xs transition-all border-b-2 -mb-px flex items-center gap-2 ${formTab === 'general' ? 'border-[#ea3838] text-[#ea3838]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                📋 General Info
              </button>
              <button
                type="button"
                onClick={() => setFormTab('advanced')}
                className={`py-3.5 px-4 font-bold text-xs transition-all border-b-2 -mb-px flex items-center gap-2 ${formTab === 'advanced' ? 'border-[#ea3838] text-[#ea3838]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                ⚙️ Technical & Catalog Details
              </button>
            </div>

            <div className="p-6">
              
              {/* Tab 1: General Info */}
              {formTab === 'general' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Brand Selector */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand Name (ব্র্যান্ড বা প্রস্তুতকারক)</label>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/40">
                        <button
                          type="button"
                          onClick={() => { setBrandMode('new'); setBrandName(''); }}
                          className={`px-2.5 py-1 rounded font-bold text-[9px] transition-all ${brandMode === 'new' ? 'bg-white text-[#ea3838] shadow-sm' : 'text-slate-400'}`}
                        >
                          New Brand
                        </button>
                        <button
                          type="button"
                          onClick={() => { setBrandMode('existing'); setBrandName(brands[0] || ''); }}
                          className={`px-2.5 py-1 rounded font-bold text-[9px] transition-all ${brandMode === 'existing' ? 'bg-white text-[#ea3838] shadow-sm' : 'text-slate-400'}`}
                        >
                          Select Existing
                        </button>
                      </div>
                    </div>

                    {brandMode === 'new' ? (
                      <input 
                        type="text" 
                        value={brandName} 
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="উদা: Powerland, LONGi, Jinko, Growatt" 
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800" 
                      />
                    ) : (
                      <select 
                        value={brandName} 
                        onChange={(e) => setBrandName(e.target.value)}
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800"
                        disabled={pageMode === 'edit'} // Disable brand edit to keep identifiers intact
                      >
                        {brands.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Category & House locations (House hidden in edit mode) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className={pageMode === 'edit' ? 'col-span-full' : ''}>
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

                    {pageMode === 'create' && (
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Location / House (অবস্থান)</label>
                        <select 
                          value={house} 
                          onChange={(e) => setHouse(e.target.value)}
                          className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-700"
                        >
                          <option value="Head Office">Head Office (HO)</option>
                          <option value="Showroom">Showroom</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Model specifications */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Model / Capacity (মডেল নম্বর বা ক্যাপাসিটি)</label>
                    <input 
                      type="text" 
                      value={model} 
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="উদা: 550W, 10KW hybrid, 50W, 12V 200AH" 
                      className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800" 
                    />
                  </div>

                  {/* Unit price and stock parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {category === 'Solar Panel' ? (
                      <div className="col-span-full grid grid-cols-2 gap-4 bg-[#ea3838]/5 p-4 rounded-xl border border-[#ea3838]/10">
                        <div>
                          <label className="text-[10px] font-black text-[#ea3838] uppercase tracking-widest mb-2 block">Panel Watt (প্যানেল ওয়াট)</label>
                          <input 
                            type="number" 
                            placeholder="Watt (e.g. 550)" 
                            value={panelWatt}
                            onChange={(e) => setPanelWatt(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-250 rounded-lg text-xs font-bold outline-none text-slate-800" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-[#ea3838] uppercase tracking-widest mb-2 block">Per Watt (প্রতি ওয়াট দর)</label>
                          <input 
                            type="number" 
                            placeholder="Price (e.g. 35)" 
                            value={perWattPrice}
                            onChange={(e) => setPerWattPrice(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-250 rounded-lg text-xs font-bold outline-none text-slate-800" 
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
                        placeholder="উদা: 12V / 24V / 48V / 220V" 
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Load Capacity Watt (ওয়াট/ক্যাপাসিটি)</label>
                      <input 
                        type="text" 
                        value={watt} 
                        onChange={(e) => setWatt(e.target.value)}
                        placeholder="উদা: 3KW / 5KW / 200W / 100AH" 
                        className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-bold text-xs text-slate-800" 
                      />
                    </div>
                  </div>

                  {/* Public Description Text Box */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Product Public Description (বিস্তারিত বিবরণী)</label>
                    <textarea 
                      value={descriptionText} 
                      onChange={(e) => setDescriptionText(e.target.value)}
                      placeholder="পাবলিক ক্যাটালগ পেজে প্যানেল বা ইনভার্টারের বিবরণী হিসেবে দেখানোর জন্য তথ্য..." 
                      rows="4"
                      className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-semibold text-xs text-slate-800 leading-relaxed"
                    />
                  </div>

                  {/* Catalog PDF Link / Upload option */}
                  <div className="border-t border-slate-100 pt-5 space-y-3">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">১. ক্যাটালগ PDF ফাইল</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input 
                          type="text" 
                          value={pdfUrl} 
                          onChange={(e) => setPdfUrl(e.target.value)}
                          placeholder="সরাসরি PDF লিঙ্ক দিন (যেমন: https://...)" 
                          className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-semibold text-xs text-slate-800" 
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="cursor-pointer border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors p-3.5 rounded-xl text-center text-xs font-bold text-slate-500 relative min-h-[50px] flex items-center justify-center">
                          {uploadingPdf ? '⏳ PDF আপলোড হচ্ছে...' : '📤 PDF ফাইল আপলোড করুন'}
                          <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" disabled={uploadingPdf} />
                        </label>
                      </div>
                    </div>
                    {pdfUrl && (
                      <div className="p-3 bg-[#ea3838]/5 border border-[#ea3838]/10 rounded-xl flex items-center justify-between text-[11px] font-bold text-[#ea3838]">
                        <span className="truncate max-w-[80%]">📄 সংযুক্ত PDF: {pdfUrl}</span>
                        <button type="button" onClick={() => setPdfUrl('')} className="text-red-500 hover:text-red-700">✕ মুছে ফেলুন</button>
                      </div>
                    )}
                  </div>

                  {/* Catalog Poster Image Link / Upload option */}
                  <div className="border-t border-slate-100 pt-5 space-y-3">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">২. ক্যাটালগ পোস্টার ইমেজ</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input 
                          type="text" 
                          value={catalogImageUrl} 
                          onChange={(e) => setCatalogImageUrl(e.target.value)}
                          placeholder="ইমেজের সরাসরি লিঙ্ক দিন (যেমন: https://...)" 
                          className="w-full p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#ea3838]/10 font-semibold text-xs text-slate-800" 
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="cursor-pointer border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors p-3.5 rounded-xl text-center text-xs font-bold text-slate-500 relative min-h-[50px] flex items-center justify-center">
                          {uploadingCatalogImg ? '⏳ আপলোড হচ্ছে...' : '📤 ইমেজ ফাইল আপলোড করুন'}
                          <input type="file" accept="image/*" onChange={handleCatalogImageUpload} className="hidden" disabled={uploadingCatalogImg} />
                        </label>
                      </div>
                    </div>
                    {catalogImageUrl && (
                      <div className="p-3 bg-[#ea3838]/5 border border-[#ea3838]/10 rounded-xl flex items-center justify-between text-[11px] font-bold text-[#ea3838]">
                        <span className="truncate max-w-[80%]">🖼️ সংযুক্ত ইমেজ: {catalogImageUrl}</span>
                        <button type="button" onClick={() => setCatalogImageUrl('')} className="text-red-500 hover:text-red-700">✕ মুছে ফেলুন</button>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>

        </div>

        {/* Right Column: Image Preview and Publish Action */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Main Thumbnail Uploader Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm space-y-5">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">প্রোডাক্ট থাম্বনেইল</h3>
            
            <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50 flex flex-col items-center justify-center p-6 min-h-[220px] relative overflow-hidden group">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Thumbnail Preview" className="h-44 w-full object-contain mix-blend-multiply transition-transform group-hover:scale-105" />
                  <button 
                    type="button" 
                    onClick={() => setImageUrl('')} 
                    className="absolute top-4 right-4 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-red-650 transition-colors"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <label className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center py-6 hover:bg-slate-100/50 transition-colors rounded-[2.5rem]">
                  <div className="text-4xl mb-2 opacity-25">{uploadingImage ? '⏳' : '📤'}</div>
                  <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
                    {uploadingImage ? 'আপলোড হচ্ছে...' : 'ক্লিক করে আপলোড দিন'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" disabled={uploadingImage} />
                </label>
              )}

              {uploadingImage && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea3838]"></div>
                </div>
              )}
            </div>

            <input 
              type="text" 
              value={imageUrl} 
              readOnly 
              placeholder=" থাম্বনেইল ছবির সরাসরি লিঙ্ক" 
              className="w-full p-3 bg-red-50/30 border border-[#ea3838]/10 rounded-2xl outline-none text-[10px] font-medium text-slate-500" 
            />
          </div>

          {/* Trigger Publish Submit Button */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#ea3838] hover:bg-red-600 text-white py-4 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {loading ? 'প্রসেসিং হচ্ছে...' : (pageMode === 'create' ? '🚀 প্রোডাক্ট পাবলিশ করুন' : '💾 আপডেট সেভ করুন')}
            </button>
            {pageMode === 'edit' && (
              <button 
                type="button" 
                onClick={resetForm}
                className="w-full bg-slate-100 hover:bg-slate-250 text-slate-700 py-3 rounded-xl font-black text-xs transition-all mt-3 active:scale-95"
              >
                ✕ বাতিল করুন
              </button>
            )}
          </div>

        </div>

      </form>
    </div>
  );
};

export default ProductEntry;