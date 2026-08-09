import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const FrontEndCustom = () => {
  const [activeTab, setActiveTab] = useState('site_info'); // site_info, about_categories, featured_products, featured_banner, product_details
  const [loading, setLoading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // সাইট সেটিংস কাঁচা ডাটা
  const [siteSettings, setSiteSettings] = useState({
    header_name: '', footer_image_url: '', contact_address: '',
    contact_showroom: '', contact_numbers: '', contact_hotline: '', contact_email: ''
  });

  // ল্যান্ডিং পেজ কাস্টমাইজেশন কন্টেন্ট স্টেটস (footer_image_url কলামে JSON হিসেবে সেভ হবে)
  const [aboutProfileTitle, setAboutProfileTitle] = useState('Brief Company Profile');
  const [aboutProfileText, setAboutProfileText] = useState(
    "Founded in 2010, Lams Power has established itself as a trusted leader and pioneer in Bangladesh's renewable energy sector. We specialize in the import, marketing, and distribution of top-tier solar equipment, driven by a steadfast commitment to promoting sustainable and green energy solutions nationwide. Over the past decade, we have dedicated ourselves to accelerating the transition to clean energy by ensuring that consumers have access to the most reliable and efficient solar technologies available."
  );
  
  const [aboutQualityTitle, setAboutQualityTitle] = useState('Operations & Quality Assurance');
  const [aboutQualityText, setAboutQualityText] = useState(
    "At Lams Power, quality is at the core of our operations. We maintain a comprehensive and carefully curated catalog of advanced solar technology, specializing in high-efficiency solar panels and cutting-edge inverters from globally recognized brands. We are committed to delivering superior-quality equipment to our consumers by maintaining a dedicated green warehouse, ensuring that our supply chain and storage facilities meet strict environmental and safety compliance standards."
  );

  const [categoryImages, setCategoryImages] = useState({
    "Hybrid Inverter": "https://i.postimg.cc/NfbsgbhR/Solar-On-Inverter.png",
    "On Grid Inverter": "https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/Inhenergy.png",
    "Solar Panel 12V": "https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/1777361937927_kup74h.png",
    "Solar Panel 24V": "https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/1777361856220_dmal4.png"
  });

  const [actualFooterImage, setActualFooterImage] = useState('https://i.postimg.cc/bvTWjG7T/Propducts-Image.png');
  
  // নিউ অ্যারাইভাল ট্যাব স্টেটস
  const [featuredKeys, setFeaturedKeys] = useState([]); // "category|name|model" ফরম্যাটে
  const [featuredText, setFeaturedText] = useState('Currently SolarOn 3600VA and 6200VA are our new arrival products');
  const [featuredCustomImages, setFeaturedCustomImages] = useState({}); // uniqueKey -> customImageUrl

  // ফিচারড প্রোডাক্ট ব্যানার স্টেটস
  const [featuredBannerTitle, setFeaturedBannerTitle] = useState('Premium Solar Solutions');
  const [featuredBannerDesc, setFeaturedBannerDesc] = useState('Experience top-tier quality solar equipment manufactured under strict environmental and safety compliance standards.');
  const [featuredBannerImageUrl, setFeaturedBannerImageUrl] = useState('');

  // স্লাইডার ইমেজ স্টেটস
  const [sliderImages, setSliderImages] = useState([]);
  const [uploadingSlider, setUploadingSlider] = useState(false);

  // প্রোডাক্ট এডিটর স্টেটস (Tab 5: প্রোডাক্ট বিবরণী এডিটর)
  const [uniqueProducts, setUniqueProducts] = useState([]);
  const [selectedProductKey, setSelectedProductKey] = useState(''); 
  const [productForm, setProductForm] = useState({ volt: '', watt: '', description: '', pdf_url: '', catalog_image_url: '' });
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // প্রোডাক্ট সার্চ ফিল্টার (নতুন আগমন টগল করার সুবিধার জন্য)
  const [featuredSearchTerm, setFeaturedSearchTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // ১. সাইট সেটিংস লোড
      const { data: settings } = await supabase.from('site_settings').select('*').single();
      if (settings) {
        setSiteSettings(settings);

        // footer_image_url যদি JSON ফরম্যাটে স্টোর করা থাকে, তবে পার্স করে কাস্টম ফিল্ডে সেট করা হবে
        if (settings.footer_image_url && settings.footer_image_url.startsWith('{')) {
          try {
            const parsed = JSON.parse(settings.footer_image_url);
            if (parsed.about_profile_title) setAboutProfileTitle(parsed.about_profile_title);
            if (parsed.about_profile_text) setAboutProfileText(parsed.about_profile_text);
            if (parsed.about_quality_title) setAboutQualityTitle(parsed.about_quality_title);
            if (parsed.about_quality_text) setAboutQualityText(parsed.about_quality_text);
            if (parsed.category_images) setCategoryImages({ ...categoryImages, ...parsed.category_images });
            if (parsed.featured_keys) setFeaturedKeys(parsed.featured_keys);
            if (parsed.featured_text) setFeaturedText(parsed.featured_text);
            if (parsed.featured_custom_images) setFeaturedCustomImages(parsed.featured_custom_images);
            if (parsed.featured_banner_title) setFeaturedBannerTitle(parsed.featured_banner_title);
            if (parsed.featured_banner_desc) setFeaturedBannerDesc(parsed.featured_banner_desc);
            if (parsed.featured_banner_image_url) setFeaturedBannerImageUrl(parsed.featured_banner_image_url);
            if (parsed.actual_footer_image) setActualFooterImage(parsed.actual_footer_image);
            if (parsed.slider_images) setSliderImages(parsed.slider_images);
          } catch (jsonErr) {
            console.error("JSON Parsing Error:", jsonErr);
            setActualFooterImage(settings.footer_image_url);
          }
        } else if (settings.footer_image_url) {
          setActualFooterImage(settings.footer_image_url);
        }
      }

      // ২. প্রোডাক্টস লোড করে ইউনিক প্রোডাক্টস বের করা
      const { data: prods } = await supabase.from('products').select('*').order('name', { ascending: true });
      if (prods) {
        const seen = new Set();
        const uniqueList = [];

        prods.forEach(p => {
          const cat = p.category ? p.category.trim() : '';
          const name = p.name ? p.name.trim() : '';
          const model = p.model ? p.model.trim() : '';
          const uniqueKey = `${cat}|${name}|${model}`;

          if (!seen.has(uniqueKey) && uniqueKey !== '||' && cat !== 'Lithium Battery') {
            seen.add(uniqueKey);

            let parsedText = p.description || '';
            let parsedPdfUrl = '';
            let parsedCatalogImageUrl = '';
            if (p.description && p.description.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(p.description);
                parsedText = parsed.text || '';
                parsedPdfUrl = parsed.pdf_url || '';
                parsedCatalogImageUrl = parsed.catalog_image_url || '';

                // Fallback for old catalog_url format
                if (parsed.catalog_url) {
                  if (/\.pdf/i.test(parsed.catalog_url)) {
                    if (!parsedPdfUrl) parsedPdfUrl = parsed.catalog_url;
                  } else {
                    if (!parsedCatalogImageUrl) parsedCatalogImageUrl = parsed.catalog_url;
                  }
                }
              } catch (e) {
                console.error("Error parsing description JSON:", e);
              }
            }

            uniqueList.push({
              uniqueKey,
              category: p.category,
              name: p.name,
              model: p.model,
              volt: p.volt || '',
              watt: p.watt || '',
              description: parsedText,
              pdf_url: parsedPdfUrl,
              catalog_image_url: parsedCatalogImageUrl
            });
          }
        });

        setUniqueProducts(uniqueList);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleProductSelectChange = (e) => {
    const key = e.target.value;
    setSelectedProductKey(key);

    if (!key) {
      setProductForm({ volt: '', watt: '', description: '', pdf_url: '', catalog_image_url: '' });
      return;
    }

    const targetProd = uniqueProducts.find(p => p.uniqueKey === key);
    if (targetProd) {
      setProductForm({
        volt: targetProd.volt,
        watt: targetProd.watt,
        description: targetProd.description,
        pdf_url: targetProd.pdf_url || '',
        catalog_image_url: targetProd.catalog_image_url || ''
      });
    }
  };

  // ব্যানার ইমেজ আপলোড হ্যান্ডলার (Supabase-এ সরাসরি ফাইল আপলোড করবে)
  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `featured_banner_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product image')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product image')
        .getPublicUrl(filePath);

      setFeaturedBannerImageUrl(publicUrl);
    } catch (error) {
      console.error(error);
      alert('ব্যানার ইমেজ আপলোড করতে সমস্যা হয়েছে: ' + error.message);
    } finally {
      setUploadingBanner(false);
    }
  };

  // ক্যাটালগ PDF আপলোড হ্যান্ডলার
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPdf(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `product_catalog_pdf_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product image')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product image')
        .getPublicUrl(filePath);

      setProductForm(prev => ({
        ...prev,
        pdf_url: publicUrl
      }));
      alert('✅ PDF ক্যাটালগ সফলভাবে আপলোড হয়েছে!');
    } catch (error) {
      console.error(error);
      alert('PDF আপলোড করতে সমস্যা হয়েছে: ' + error.message);
    } finally {
      setUploadingPdf(false);
    }
  };

  // ক্যাটালগ ইমেজ আপলোড হ্যান্ডলার
  const handleCatalogImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `product_catalog_img_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product image')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product image')
        .getPublicUrl(filePath);

      setProductForm(prev => ({
        ...prev,
        catalog_image_url: publicUrl
      }));
      alert('✅ ক্যাটালগ ইমেজ সফলভাবে আপলোড হয়েছে!');
    } catch (error) {
      console.error(error);
      alert('ক্যাটালগ ইমেজ আপলোড করতে সমস্যা হয়েছে: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const getMergedPayload = (updatedSliders) => {
    let existing = {};
    if (siteSettings.footer_image_url && siteSettings.footer_image_url.startsWith('{')) {
      try {
        existing = JSON.parse(siteSettings.footer_image_url);
      } catch (e) {
        console.error("Error parsing existing footer_image_url JSON:", e);
      }
    }
    return {
      ...existing,
      about_profile_title: aboutProfileTitle,
      about_profile_text: aboutProfileText,
      about_quality_title: aboutQualityTitle,
      about_quality_text: aboutQualityText,
      category_images: categoryImages,
      featured_keys: featuredKeys,
      featured_text: featuredText,
      featured_custom_images: featuredCustomImages,
      featured_banner_title: featuredBannerTitle,
      featured_banner_desc: featuredBannerDesc,
      featured_banner_image_url: featuredBannerImageUrl,
      actual_footer_image: actualFooterImage,
      slider_images: updatedSliders || sliderImages
    };
  };

  // স্লাইডার ইমেজ আপলোড হ্যান্ডলার
  const handleSliderImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingSlider(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `slider_image_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product image')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product image')
        .getPublicUrl(filePath);

      const updatedSliders = [...sliderImages, publicUrl];
      setSliderImages(updatedSliders);
      
      // Auto save
      const finalSettings = {
        ...siteSettings,
        footer_image_url: JSON.stringify(getMergedPayload(updatedSliders))
      };

      const { error } = await supabase.from('site_settings').upsert([finalSettings]);
      if (error) throw error;
      setSiteSettings(finalSettings);
      
      alert('✅ স্লাইডার ইমেজ সফলভাবে আপলোড ও সেভ হয়েছে!');
    } catch (error) {
      console.error(error);
      alert('স্লাইডার ইমেজ আপলোড করতে সমস্যা হয়েছে: ' + error.message);
    } finally {
      setUploadingSlider(false);
    }
  };

  // স্লাইডার ইমেজ ডিলিট হ্যান্ডলার
  const handleDeleteSliderImage = async (urlToDelete) => {
    const confirmDelete = window.confirm("আপনি কি এই স্লাইডার ইমেজটি ডিলিট করতে চান?");
    if (!confirmDelete) return;

    try {
      // Storage থেকে ডিলিট করার চেষ্টা করি
      try {
        const urlParts = urlToDelete.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await supabase.storage.from('product image').remove([fileName]);
      } catch (storageErr) {
        console.error("Storage delete error:", storageErr);
      }

      const updatedSliders = sliderImages.filter(url => url !== urlToDelete);
      setSliderImages(updatedSliders);

      // Auto save
      const finalSettings = {
        ...siteSettings,
        footer_image_url: JSON.stringify(getMergedPayload(updatedSliders))
      };

      const { error } = await supabase.from('site_settings').upsert([finalSettings]);
      if (error) throw error;
      setSiteSettings(finalSettings);

      alert('🗑️ স্লাইডার ইমেজ ডিলিট করা হয়েছে!');
    } catch (error) {
      console.error(error);
      alert('ডিলিট করতে সমস্যা হয়েছে: ' + error.message);
    }
  };

  // সম্পূরক কাস্টম ডাটা ও সেটিংস একসাথে ডাটাবেজে সেভ করার মেথড
  const saveAllSettings = async (updatedSettingsObject) => {
    setLoading(true);
    try {
      const finalSettings = {
        ...siteSettings,
        ...updatedSettingsObject,
        footer_image_url: JSON.stringify(getMergedPayload())
      };

      const { error } = await supabase.from('site_settings').upsert([finalSettings]);
      if (error) throw error;
      
      setSiteSettings(finalSettings);
      alert("✅ সাইটের ডিজাইন এবং কাস্টম তথ্য সফলভাবে আপডেট হয়েছে!");
    } catch (err) {
      console.error(err);
      alert("সংরক্ষণ করতে সমস্যা হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  // সাইট ইনফো ট্যাব সাবমিট
  const handleSaveSiteInfo = (e) => {
    e.preventDefault();
    saveAllSettings({});
  };

  // নতুন আগমন প্রোডাক্ট টগল
  const handleToggleFeatured = (key) => {
    if (featuredKeys.includes(key)) {
      setFeaturedKeys(featuredKeys.filter(k => k !== key));
    } else {
      setFeaturedKeys([...featuredKeys, key]);
    }
  };

  // প্রোডাক্ট বিবরণী সেভ লজিক
  const handleSaveProductSpecs = async (e) => {
    e.preventDefault();
    if (!selectedProductKey) return alert("দয়া করে একটি প্রোডাক্ট সিলেক্ট করুন!");
    
    setLoading(true);
    const [category, name, model] = selectedProductKey.split('|');

    const descriptionJson = JSON.stringify({
      text: productForm.description,
      pdf_url: productForm.pdf_url,
      catalog_image_url: productForm.catalog_image_url
    });

    try {
      const { error } = await supabase
        .from('products')
        .update({
          volt: productForm.volt,
          watt: productForm.watt,
          description: descriptionJson
        })
        .eq('category', category)
        .eq('name', name)
        .eq('model', model);

      if (error) throw error;
      
      alert(`🎉 ${name} [${model}] এর বিবরণ সকল হাউজ বা লোকেশনে একসাথে আপডেট হয়েছে!`);
      
      setUniqueProducts(prev => prev.map(p => 
        p.uniqueKey === selectedProductKey ? { ...p, ...productForm } : p
      ));
    } catch (err) {
      console.error(err);
      alert("ত্রুটি হয়েছে: " + err.message);
    }
    setLoading(false);
  };

  // নতুন আগমন সার্চ ফিল্টারিং
  const filteredUniqueProducts = uniqueProducts.filter(p => 
    `${p.name} ${p.model} ${p.category}`.toLowerCase().includes(featuredSearchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* নেভিগেশন ট্যাব মেনু */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('site_info')}
          className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${activeTab === 'site_info' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          ⚙️ সাইট সাধারণ তথ্য (Site Info)
        </button>
        <button 
          onClick={() => setActiveTab('image_slider')}
          className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${activeTab === 'image_slider' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          🖼️ প্রোডাক্ট স্লাইডার (Image Slider)
        </button>
        <button 
          onClick={() => setActiveTab('about_categories')}
          className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${activeTab === 'about_categories' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          📝 আমাদের পরিচিতি ও ক্যাটাগরি ছবি
        </button>
        
        
      </div>

      {/* ---------------- ট্যাব ১: সাইটের সাধারণ তথ্য ---------------- */}
      {activeTab === 'site_info' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-200">
          <h2 className="text-xl font-black text-slate-800 mb-6">পাবলিক কন্টেন্ট এবং যোগাযোগ সেটিংস</h2>
          <form onSubmit={handleSaveSiteInfo} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Header Title (সাইটের নাম)</label>
                <input type="text" value={siteSettings.header_name || ''} onChange={e => setSiteSettings({...siteSettings, header_name: e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Footer Image URL (ফুটার ইমেজ)</label>
                <input type="text" value={actualFooterImage || ''} onChange={e => setActualFooterImage(e.target.value)} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Corporate Office Address (কর্পোরেট অফিস)</label>
              <textarea value={siteSettings.contact_address || ''} onChange={e => setSiteSettings({...siteSettings, contact_address: e.target.value})} rows="2" className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Showroom Address (শোরুম)</label>
              <textarea value={siteSettings.contact_showroom || ''} onChange={e => setSiteSettings({...siteSettings, contact_showroom: e.target.value})} rows="2" className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contact Numbers (কমা দিয়ে লিখুন)</label>
                <input type="text" value={siteSettings.contact_numbers || ''} onChange={e => setSiteSettings({...siteSettings, contact_numbers: e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hotline (হটলাইন)</label>
                <input type="text" value={siteSettings.contact_hotline || ''} onChange={e => setSiteSettings({...siteSettings, contact_hotline: e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">E-mail (ইমেইল)</label>
                <input type="email" value={siteSettings.contact_email || ''} onChange={e => setSiteSettings({...siteSettings, contact_email: e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-md hover:bg-orange-600 transition-colors shadow-lg active:scale-95">
              {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'পাবলিশ করুন (Publish Info)'}
            </button>
          </form>
        </div>
      )}

      {/* ---------------- ট্যাব: প্রোডাক্ট ইমেজ স্লাইডার এডিটর ---------------- */}
      {activeTab === 'image_slider' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-200 space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-800">🖼️ হোম পেজ প্রোডাক্ট ইমেজ স্লাইডার (Image Slider)</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">এখানে আপলোড করা ছবিগুলো হোম পেজে স্লাইডার হিসেবে ৩ সেকেন্ড পরপর দেখা যাবে।</p>
          </div>

          {/* Upload Widget */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 text-center">
            <span className="text-3xl block mb-2">📸</span>
            <label className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-xs md:text-sm hover:bg-slate-800 cursor-pointer active:scale-95 transition-all shadow-md inline-block">
              {uploadingSlider ? 'আপলোড হচ্ছে...' : 'নতুন স্লাইডার ইমেজ আপলোড করুন'}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleSliderImageUpload} 
                className="hidden" 
                disabled={uploadingSlider}
              />
            </label>
          </div>

          {/* Slider List Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sliderImages && sliderImages.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl border overflow-hidden shadow-sm aspect-video bg-slate-50 flex items-center justify-center p-1">
                <img src={url} alt={`Slider ${idx + 1}`} className="max-w-full max-h-full object-contain" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <button 
                    onClick={() => handleDeleteSliderImage(url)}
                    className="bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-lg shadow-md hover:bg-red-700 transition-all active:scale-95"
                  >
                    🗑️ ডিলিট
                  </button>
                </div>
              </div>
            ))}
            {(!sliderImages || sliderImages.length === 0) && (
              <div className="col-span-full text-center py-10 text-slate-400 font-bold italic">
                কোনো স্লাইডার ছবি যোগ করা হয়নি।
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- ট্যাব ২: আমাদের পরিচিতি ও ক্যাটাগরি ছবি ---------------- */}
      {activeTab === 'about_categories' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-200">
          <h2 className="text-xl font-black text-slate-800 mb-6">আমাদের পরিচিতি (About Us) ও ক্যাটাগরি ব্যানার ইমেজেস</h2>
          <form onSubmit={handleSaveSiteInfo} className="space-y-6">
            
            {/* পরিচিতি সেকশন */}
            <div className="space-y-4 border-b pb-6 border-slate-100">
              <h3 className="text-sm font-black text-orange-500 uppercase tracking-wider">১. হোমপেজ পরিচিতি টেক্সট (About Us)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Company Profile Section Title</label>
                  <input type="text" value={aboutProfileTitle} onChange={e => setAboutProfileTitle(e.target.value)} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operations & Quality Section Title</label>
                  <input type="text" value={aboutQualityTitle} onChange={e => setAboutQualityTitle(e.target.value)} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Company Profile Content (পরিচিতি বিবরণ)</label>
                <textarea value={aboutProfileText} onChange={e => setAboutProfileText(e.target.value)} rows="4" className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operations & Quality Content (অপারেশন ও কোয়ালিটি বিবরণ)</label>
                <textarea value={aboutQualityText} onChange={e => setAboutQualityText(e.target.value)} rows="4" className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed" />
              </div>
            </div>

            {/* ৪টি ক্যাটাগরির ইমেজ URL */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-orange-500 uppercase tracking-wider">২. চারটি ক্যাটাগরি কার্ডের ইমেজ URL</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hybrid Inverter Image URL</label>
                  <input type="text" value={categoryImages["Hybrid Inverter"] || ''} onChange={e => setCategoryImages({...categoryImages, "Hybrid Inverter": e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">On Grid Inverter Image URL</label>
                  <input type="text" value={categoryImages["On Grid Inverter"] || ''} onChange={e => setCategoryImages({...categoryImages, "On Grid Inverter": e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Solar Panel 12V Image URL</label>
                  <input type="text" value={categoryImages["Solar Panel 12V"] || ''} onChange={e => setCategoryImages({...categoryImages, "Solar Panel 12V": e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Solar Panel 24V Image URL</label>
                  <input type="text" value={categoryImages["Solar Panel 24V"] || ''} onChange={e => setCategoryImages({...categoryImages, "Solar Panel 24V": e.target.value})} className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-md hover:bg-orange-600 transition-colors shadow-lg active:scale-95">
              {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'পরিচিতি ও ক্যাটাগরি ছবি পাবলিশ করুন'}
            </button>
          </form>
        </div>
      )}

      
    </div>
  );
};

export default FrontEndCustom;
