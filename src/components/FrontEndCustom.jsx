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

  // প্রোডাক্ট এডিটর স্টেটস (Tab 5: প্রোডাক্ট বিবরণী এডিটর)
  const [uniqueProducts, setUniqueProducts] = useState([]);
  const [selectedProductKey, setSelectedProductKey] = useState(''); 
  const [productForm, setProductForm] = useState({ volt: '', watt: '', description: '' });

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
            uniqueList.push({
              uniqueKey,
              category: p.category,
              name: p.name,
              model: p.model,
              volt: p.volt || '',
              watt: p.watt || '',
              description: p.description || ''
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
      setProductForm({ volt: '', watt: '', description: '' });
      return;
    }

    const targetProd = uniqueProducts.find(p => p.uniqueKey === key);
    if (targetProd) {
      setProductForm({
        volt: targetProd.volt,
        watt: targetProd.watt,
        description: targetProd.description
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

  // সম্পূরক কাস্টম ডাটা ও সেটিংস একসাথে ডাটাবেজে সেভ করার মেথড
  const saveAllSettings = async (updatedSettingsObject) => {
    setLoading(true);
    try {
      const customPayload = {
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
        actual_footer_image: actualFooterImage
      };

      const finalSettings = {
        ...siteSettings,
        ...updatedSettingsObject,
        footer_image_url: JSON.stringify(customPayload)
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

    try {
      const { error } = await supabase
        .from('products')
        .update({
          volt: productForm.volt,
          watt: productForm.watt,
          description: productForm.description
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
          onClick={() => setActiveTab('about_categories')}
          className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${activeTab === 'about_categories' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          📝 আমাদের পরিচিতি ও ক্যাটাগরি ছবি
        </button>
        <button 
          onClick={() => setActiveTab('featured_products')}
          className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${activeTab === 'featured_products' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          ⭐ নতুন আগমন টগল (New Arrivals)
        </button>
        <button 
          onClick={() => setActiveTab('featured_banner')}
          className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${activeTab === 'featured_banner' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          ⭐ ফিচারড প্রোডাক্ট ব্যানার (Featured Product)
        </button>
        <button 
          onClick={() => setActiveTab('product_details')}
          className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${activeTab === 'product_details' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          📦 প্রোডাক্ট বিবরণী এডিটর
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

      {/* ---------------- ট্যাব ৩: নতুন আগমন টগল (New Arrivals) ---------------- */}
      {activeTab === 'featured_products' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-200">
          <h2 className="text-xl font-black text-slate-800 mb-2">হোমপেজের নতুন আগমন (New Arrivals) প্রোডাক্টস ও সেকশন বিবরণ</h2>
          <p className="text-xs text-slate-400 mb-6">হোমপেজের নিউ অ্যারাইভাল সেকশনের টাইটেল/সাবটাইটেল এডিট করুন এবং প্রোডাক্ট কার্ড টগল করে কাস্টম ইমেজ সেট করুন।</p>
          
          <div className="space-y-6">
            
            <div className="space-y-1 border-b pb-6 border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">নিউ অ্যারাইভাল সেকশন পরিচিতি টেক্সট (Featured Text/Subtitle)</label>
              <textarea 
                value={featuredText} 
                onChange={e => setFeaturedText(e.target.value)} 
                rows="2" 
                placeholder="নিউ অ্যারাইভাল সেকশনের নিচে দেখানোর জন্য সংক্ষিপ্ত পরিচিতি বা অফার..."
                className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed" 
              />
            </div>

            <h3 className="text-sm font-black text-orange-500 uppercase tracking-wider">প্রোডাক্ট টগল এবং কাস্টম ইমেজ এডিট</h3>
            <input 
              type="text" 
              placeholder="🔍 প্রোডাক্ট সার্চ করুন..."
              value={featuredSearchTerm}
              onChange={e => setFeaturedSearchTerm(e.target.value)}
              className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900"
            />

            <div className="border rounded-2xl max-h-[450px] overflow-y-auto custom-scrollbar divide-y bg-slate-50/50">
              {filteredUniqueProducts.length > 0 ? filteredUniqueProducts.map(p => {
                const isFeatured = featuredKeys.includes(p.uniqueKey);
                return (
                  <div key={p.uniqueKey} className="p-4 flex flex-col gap-3 hover:bg-white transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 uppercase tracking-wider">{p.category}</span>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">{p.name} — {p.model}</h4>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => handleToggleFeatured(p.uniqueKey)}
                        className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                          isFeatured 
                            ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25 active:scale-95' 
                            : 'bg-white border text-slate-500 hover:text-slate-700 active:scale-95'
                        }`}
                      >
                        {isFeatured ? '★ Featured ON' : '☆ Featured OFF'}
                      </button>
                    </div>

                    {isFeatured && (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                        <label className="text-[9px] font-bold text-slate-500 block mb-1">কাস্টম ব্যানার ইমেজ URL (ঐচ্ছিক - ডিফল্ট প্রোডাক্ট ইমেজের পরিবর্তে ক্যাটালগ কার্ডে এটি দেখাবে)</label>
                        <input 
                          type="text" 
                          placeholder="https://images.unsplash.com/..." 
                          value={featuredCustomImages[p.uniqueKey] || ''}
                          onChange={e => setFeaturedCustomImages({
                            ...featuredCustomImages,
                            [p.uniqueKey]: e.target.value
                          })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-orange-500 text-slate-800"
                        />
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="p-8 text-center text-slate-400 italic">কোনো প্রোডাক্ট পাওয়া যায়নি</div>
              )}
            </div>

            <button 
              onClick={() => saveAllSettings({})}
              disabled={loading} 
              className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-md hover:bg-orange-600 transition-colors shadow-lg active:scale-95"
            >
              {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'পাবলিশ করুন (নতুন আগমন ও কাস্টম ইমেজ আপডেট)'}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- ট্যাব ৪: ফিচারড প্রোডাক্ট ব্যানার (Featured Product Banner) ---------------- */}
      {activeTab === 'featured_banner' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-200">
          <h2 className="text-xl font-black text-slate-800 mb-2">ফিচারড প্রোডাক্ট ব্যানার (Featured Product)</h2>
          <p className="text-xs text-slate-400 mb-6">হোমপেজে দেখানোর জন্য একটি বিশেষ ফিচারড প্রোডাক্টের টাইটেল, বিবরণ এবং ব্যানার ইমেজ আপলোড করুন।</p>

          <form onSubmit={handleSaveSiteInfo} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ফিচারড টাইটেল (Featured Title)</label>
              <input 
                type="text" 
                value={featuredBannerTitle} 
                onChange={e => setFeaturedBannerTitle(e.target.value)} 
                placeholder="যেমন: Experience the Power of LAMS" 
                className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ফিচারড বিবরণ (Description Text Box)</label>
              <textarea 
                value={featuredBannerDesc} 
                onChange={e => setFeaturedBannerDesc(e.target.value)} 
                rows="4" 
                placeholder="ফিচারড প্রোডাক্ট বা সেকশনের বিস্তারিত টেক্সট এখানে লিখুন..."
                className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed" 
              />
            </div>

            {/* ইমেজ আপলোডার (স্টোরেজে ফাইল আপলোড হবে) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">ফিচারড ব্যানার ইমেজ (Supabase-এ আপলোড হবে)</label>
              
              <div className="border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 flex flex-col items-center justify-center p-6 min-h-[220px] relative overflow-hidden group">
                {featuredBannerImageUrl ? (
                  <>
                    <img src={featuredBannerImageUrl} alt="Banner Preview" className="h-40 w-full object-contain mix-blend-multiply transition-transform group-hover:scale-105" />
                    <button 
                      type="button" 
                      onClick={() => setFeaturedBannerImageUrl('')} 
                      className="absolute top-4 right-4 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center hover:bg-slate-100 transition-colors rounded-[2rem] py-6">
                    <div className="text-4xl mb-2 opacity-25">{uploadingBanner ? '⏳' : '📤'}</div>
                    <span className="text-slate-500 font-black text-xs uppercase tracking-widest">
                      {uploadingBanner ? 'আপলোড হচ্ছে...' : 'ক্লিক করে ব্যানার আপলোড দিন'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={uploadingBanner} />
                  </label>
                )}

                {uploadingBanner && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  </div>
                )}
              </div>

              <input 
                type="text" 
                value={featuredBannerImageUrl} 
                readOnly 
                placeholder="আপলোড করা ইমেজের লিঙ্ক এখানে অটোমেটিক আসবে" 
                className="w-full p-3 bg-orange-50 border border-orange-100 rounded-2xl outline-none text-[10px] font-medium text-slate-500" 
              />
            </div>

            <button type="submit" disabled={loading || uploadingBanner} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-md hover:bg-orange-600 transition-colors shadow-lg active:scale-95">
              {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'ফিচারড ব্যানার ও টেক্সট পাবলিশ করুন'}
            </button>
          </form>
        </div>
      )}

      {/* ---------------- ট্যাব ৫: প্রোডাক্ট বিবরণী এডিটর ---------------- */}
      {activeTab === 'product_details' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-in fade-in duration-200">
          <h2 className="text-xl font-black text-slate-800 mb-2">প্রোডাক্ট ডেসক্রিপশন ও ক্যাপাসিটি প্যারামিটার এন্ট্রি</h2>
          <p className="text-xs text-slate-400 mb-6">ড্রপডাউন থেকে নির্দিষ্ট মডেল বেছে নিয়ে তার ভোল্টেজ, ওয়াট এবং ক্যাটালগ বিবরণ সেট করুন (একসাথে সকল হাউজে আপডেট হবে)।</p>
          
          <form onSubmit={handleSaveProductSpecs} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">১. প্রোডাক্ট এবং মডেল সিলেক্ট করুন</label>
              <select 
                value={selectedProductKey} 
                onChange={handleProductSelectChange}
                className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">প্রোডাক্ট বেছে নিন...</option>
                {uniqueProducts.map(p => (
                  <option key={p.uniqueKey} value={p.uniqueKey}>
                    [{p.category}] — {p.name} — {p.model}
                  </option>
                ))}
              </select>
            </div>

            {selectedProductKey && (
              <div className="space-y-5 animate-in slide-in-from-top-3 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">লোড ভোল্টেজ (Volt)</label>
                    <input 
                      type="text" 
                      name="volt"
                      value={productForm.volt}
                      onChange={e => setProductForm({...productForm, volt: e.target.value})}
                      placeholder="উদা: 12V / 24V / 230V" 
                      className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-950" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">লোড ওয়াট (Watt / Capacity)</label>
                    <input 
                      type="text" 
                      name="watt"
                      value={productForm.watt}
                      onChange={e => setProductForm({...productForm, watt: e.target.value})}
                      placeholder="উদা: 50W / 200W / 3KW" 
                      className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-950" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">বিস্তারিত বিবরণ (Description)</label>
                  <textarea 
                    name="description"
                    value={productForm.description}
                    onChange={e => setProductForm({...productForm, description: e.target.value})}
                    placeholder="পাবলিক পেজে দেখানোর জন্য প্রোডাক্টের বিস্তারিত টেকনিক্যাল ডেটা বা বিবরণ এখানে লিখুন..."
                    rows="4" 
                    className="w-full p-3.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-950" 
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full h-14 bg-orange-600 text-white rounded-2xl font-black text-md hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20">
                  {loading ? 'আপডেট হচ্ছে...' : '💾 এই মডেলের বিবরণ ক্যাটালগে সেভ করুন'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default FrontEndCustom;