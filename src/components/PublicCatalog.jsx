import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const sortModelsByCapacity = (modelsArray) => {
  const parseCapacity = (modelName) => {
    const match = modelName.match(/([\d.]+)\s*(va|w|kw)/i);
    if (!match) return Infinity; 
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'kw') return value * 1000;
    return value;
  };
  return modelsArray.sort((a, b) => {
    const capA = parseCapacity(a);
    const capB = parseCapacity(b);
    if (capA !== capB) return capA - capB; 
    return a.localeCompare(b); 
  });
};

const PublicCatalog = ({ onAdminClick }) => {
  const [products, setProducts] = useState([]);
  const [siteSettings, setSiteSettings] = useState({}); 
  const [landingConfig, setLandingConfig] = useState({
    about_profile_title: 'Brief Company Profile',
    about_profile_text: "Founded in 2010, Lams Power has established itself as a trusted leader and pioneer in Bangladesh's renewable energy sector. We specialize in the import, marketing, and distribution of top-tier solar equipment, driven by a steadfast commitment to promoting sustainable and green energy solutions nationwide. Over the past decade, we have dedicated ourselves to accelerating the transition to clean energy by ensuring that consumers have access to the most reliable and efficient solar technologies available.",
    about_quality_title: 'Operations & Quality Assurance',
    about_quality_text: "At Lams Power, quality is at the core of our operations. We maintain a comprehensive and carefully curated catalog of advanced solar technology, specializing in high-efficiency solar panels and cutting-edge inverters from globally recognized brands. We are committed to delivering superior-quality equipment to our consumers by maintaining a dedicated green warehouse, ensuring that our supply chain and storage facilities meet strict environmental and safety compliance standards.",
    category_images: {
      "Hybrid Inverter": "https://i.postimg.cc/NfbsgbhR/Solar-On-Inverter.png",
      "On Grid Inverter": "https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/Inhenergy.png",
      "Solar Panel 12V": "https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/1777361937927_kup74h.png",
      "Solar Panel 24V": "https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/1777361856220_dmal4.png"
    },
    featured_keys: [],
    featured_text: 'Currently SolarOn 3600VA and 6200VA are our new arrival products',
    featured_custom_images: {},
    featured_banner_title: 'Premium Solar Solutions',
    featured_banner_desc: 'Experience top-tier quality solar equipment manufactured under strict environmental and safety compliance standards.',
    featured_banner_image_url: '',
    actual_footer_image: 'https://i.postimg.cc/bvTWjG7T/Propducts-Image.png'
  });
  const [loading, setLoading] = useState(true);
  const [selectedModalProduct, setSelectedModalProduct] = useState(null);
  
  // ল্যান্ডিং পেজ ট্যাব স্টেট: 'home', 'products', 'contact'
  const [activeTab, setActiveTab] = useState('home');
  // প্রোডাক্ট ক্যাটাগরি ফিল্টার স্টেট
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  // প্রোডাক্ট সার্চ স্টেট
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: prodData } = await supabase.from('products').select('*');
      setProducts(prodData || []);
      
      const { data: settingsData } = await supabase.from('site_settings').select('*').single();
      if (settingsData) {
        setSiteSettings(settingsData);
        
        // footer_image_url কলামে থাকা JSON রিড ও সেটিং করা
        if (settingsData.footer_image_url && settingsData.footer_image_url.startsWith('{')) {
          try {
            const parsed = JSON.parse(settingsData.footer_image_url);
            setLandingConfig(prev => ({
              ...prev,
              ...parsed
            }));
          } catch (e) {
            console.error("Error parsing landing settings:", e);
            if (settingsData.footer_image_url) {
              setLandingConfig(prev => ({ ...prev, actual_footer_image: settingsData.footer_image_url }));
            }
          }
        } else if (settingsData.footer_image_url) {
          setLandingConfig(prev => ({ ...prev, actual_footer_image: settingsData.footer_image_url }));
        }
      }
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const categories = ["Hybrid Inverter", "On-grid Inverter", "Solar Panel - 12 Volt", "Solar Panel - 24 Volt"];
  
  const getGroupedProducts = (catProds) => {
    const groups = {};

    catProds.forEach(p => {
      if (!groups[p.name]) {
        groups[p.name] = { name: p.name, image_url: p.image_url, modelsData: {} };
      }

      if (!groups[p.name].modelsData[p.model]) {
        groups[p.name].modelsData[p.model] = { 
            stock_quantity: 0, 
            hasInStockToggle: false, 
            isUpcoming: false 
        };
      }

      groups[p.name].modelsData[p.model].stock_quantity += (Number(p.stock_quantity) || 0);

      const avail = p.availability ? p.availability.trim().toLowerCase() : '';
      if (avail === 'in stock') {
          groups[p.name].modelsData[p.model].hasInStockToggle = true;
      } else if (avail === 'upcoming') {
          groups[p.name].modelsData[p.model].isUpcoming = true;
      }
    });

    return Object.values(groups).map(group => {
      const inStock = [];
      const upcoming = [];

      Object.entries(group.modelsData).forEach(([modelName, data]) => {
        if (data.hasInStockToggle && data.stock_quantity > 0) {
          inStock.push(modelName);
        } else if (data.isUpcoming) {
          upcoming.push(modelName);
        }
      });

      if (inStock.length === 0 && upcoming.length === 0) return null;

      return {
        name: group.name,
        image_url: group.image_url,
        inStock: sortModelsByCapacity(inStock),
        upcoming: sortModelsByCapacity(upcoming)
      };
    }).filter(Boolean);
  };

  const handleModelClick = (brandName, modelName) => {
    const matchProduct = products.find(p => p.name === brandName && p.model === modelName);
    if (matchProduct) {
      setSelectedModalProduct(matchProduct);
    }
  };
  // হোমপেজে ড্রাইভ করার জন্য ক্যাটাগরি ম্যাপিং
  const getDisplayCategoryName = (c) => {
    if (c === 'Solar Panel - 12 Volt') return 'Solar Panel 12V';
    if (c === 'Solar Panel - 24 Volt') return 'Solar Panel 24V';
    if (c === 'On-grid Inverter') return 'On Grid Inverter';
    return c;
  };

  // ১2V ব্র্যান্ডস
  const twelveVoltBrands = ['powerland', 'sunland', 'sunland extreme'];

  const getFilteredProductsForList = (cat) => {
    return products.filter(p => {
      if (p.is_hidden || (p.house !== 'Head Office' && p.house !== 'Showroom')) return false;
      const pNameLower = p.name ? p.name.toLowerCase().trim() : '';
      const pCatLower = p.category ? p.category.toLowerCase().trim() : '';

      // কাস্টম সার্চ ফিল্টার
      if (productSearch) {
        const searchStr = `${p.name} ${p.model} ${p.category}`.toLowerCase();
        if (!searchStr.includes(productSearch.toLowerCase())) return false;
      }

      if (cat === 'Solar Panel - 12 Volt') {
        return pCatLower === 'solar panel' && twelveVoltBrands.includes(pNameLower);
      }
      if (cat === 'Solar Panel - 24 Volt') {
        return pCatLower === 'solar panel' && !twelveVoltBrands.includes(pNameLower);
      }
      return p.category === cat;
    });
  };
  // নিউ অ্যারাইভাল প্রোডাক্টস লোড (ইনভার্টারগুলো একসাথে প্রথমে গ্রুপ করা থাকবে)
  const getFeaturedProductsList = () => {
    const uniqueKeys = new Set(landingConfig.featured_keys || []);
    const list = [];
    const seenUnique = new Set();

    products.forEach(p => {
      const cat = p.category ? p.category.trim() : '';
      const name = p.name ? p.name.trim() : '';
      const model = p.model ? p.model.trim() : '';
      const key = `${cat}|${name}|${model}`;

      if (uniqueKeys.has(key) && !seenUnique.has(key)) {
        seenUnique.add(key);
        list.push(p);
      }
    });

    // সর্টিং লজিক: ইনভার্টার ক্যাটাগরিগুলো (Hybrid Inverter, On-grid Inverter) সবার প্রথমে থাকবে
    return list.sort((a, b) => {
      const isAInverter = (a.category || '').toLowerCase().includes('inverter');
      const isBInverter = (b.category || '').toLowerCase().includes('inverter');
      if (isAInverter && !isBInverter) return -1;
      if (!isAInverter && isBInverter) return 1;
      // একই ক্যাটাগরি হলে নাম ও মডেল অনুযায়ী স্বাভাবিক সর্ট হবে
      if (a.category !== b.category) return (a.category || '').localeCompare(b.category || '');
      if (a.name !== b.name) return (a.name || '').localeCompare(b.name || '');
      return (a.model || '').localeCompare(b.model || '');
    });
  };

  const featuredProducts = getFeaturedProductsList();

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
      </div>
      <p className="text-slate-500 font-black tracking-widest text-sm uppercase animate-pulse" style={{ fontFamily: "'Inter', sans-serif" }}>
        Loading LAMS Power...
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white relative flex flex-col" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* 🏛️ প্রিমিয়াম স্লিক নেভিগেশন বার */}
      <header className="bg-white/85 backdrop-blur-md py-4 px-6 md:px-12 shadow-sm sticky top-0 z-50 border-b border-slate-100/60">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <img src="https://i.postimg.cc/2S35fVxS/Lams-Logo.png" alt="Lams Logo" className="h-10 md:h-12 object-contain" />
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">
              LAMS <span className="text-orange-500">POWER</span>
            </h1>
          </div>

          {/* মেনু লিঙ্ক */}
          <nav className="flex items-center gap-6 md:gap-10 font-bold text-xs uppercase tracking-widest text-slate-500">
            <button 
              onClick={() => setActiveTab('home')} 
              className={`hover:text-orange-500 transition-colors pb-1 border-b-2 ${activeTab === 'home' ? 'text-slate-900 border-orange-500' : 'border-transparent'}`}
            >
              Home
            </button>
            <button 
              onClick={() => { setActiveTab('products'); setProductCategoryFilter('All'); }} 
              className={`hover:text-orange-500 transition-colors pb-1 border-b-2 ${activeTab === 'products' ? 'text-slate-900 border-orange-500' : 'border-transparent'}`}
            >
              Products
            </button>
            <button 
              onClick={() => setActiveTab('contact')} 
              className={`hover:text-orange-500 transition-colors pb-1 border-b-2 ${activeTab === 'contact' ? 'text-slate-900 border-orange-500' : 'border-transparent'}`}
            >
              Contact Us
            </button>
          </nav>

          {/* এডমিন লগইন বাটন */}
          <button 
            onClick={onAdminClick}
            className="border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95"
          >
            Portal Login
          </button>
        </div>
      </header>

      {/* ---------------- ভিউ ১: হোমপেজ ---------------- */}
      {activeTab === 'home' && (
        <div className="animate-in fade-in duration-300 flex-1 flex flex-col">
          
          {/* স্লিক হিরো ব্যানার */}
          <section className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white py-20 px-6 md:px-12 text-center relative overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px]"></div>
            <div className="max-w-4xl mx-auto space-y-6 relative z-10">
              <span className="text-[10px] font-black tracking-widest uppercase bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full border border-orange-500/35">
                Pioneers of Green Technology
              </span>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                Empowering Bangladesh with <span className="text-orange-500">Sustainable</span> Solar Energy
              </h2>
              <p className="text-slate-400 font-semibold text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                Importing and distributing world-class high-efficiency Solar Inverters and premium Solar Panels since 2010.
              </p>
              <div className="pt-4">
                <button 
                  onClick={() => setActiveTab('products')} 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all duration-200"
                >
                  Explore Catalog
                </button>
              </div>
            </div>
          </section>

          {/* নিউ অ্যারাইভাল (New Arrival) সেকশন */}
          {featuredProducts.length > 0 && (
            <section className="py-16 px-6 md:px-12 max-w-[1400px] mx-auto w-full">
              <div className="text-center mb-10">
                <span className="text-[10px] font-black tracking-widest uppercase text-orange-500">Fresh Stock Highlight</span>
                <h3 className="text-3xl font-black text-slate-900 mt-1">New Arrivals</h3>
                {landingConfig.featured_text && (
                  <p className="text-slate-500 font-semibold text-xs md:text-sm mt-2 max-w-xl mx-auto leading-relaxed">
                    {landingConfig.featured_text}
                  </p>
                )}
                <div className="h-1 w-12 bg-orange-500 rounded-full mx-auto mt-3"></div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {featuredProducts.map((p, i) => {
                  const key = `${p.category ? p.category.trim() : ''}|${p.name ? p.name.trim() : ''}|${p.model ? p.model.trim() : ''}`;
                  const customImg = landingConfig.featured_custom_images?.[key];
                  const displayImg = (customImg && customImg.trim() !== '') ? customImg : p.image_url;

                  return (
                    <div 
                      key={i} 
                      onClick={() => handleModelClick(p.name, p.model)}
                      className="bg-white rounded-2xl border border-slate-100 p-3 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center text-center group"
                    >
                      <div className="w-full bg-slate-50 rounded-xl aspect-[4/3] mb-2 flex items-center justify-center p-2 overflow-hidden relative">
                        <span className="absolute top-2 left-2 text-[7px] font-black px-1.5 py-0.5 rounded-full bg-orange-500 text-white uppercase tracking-widest shadow-sm">
                          New
                        </span>
                        {displayImg ? (
                          <img src={displayImg} alt={p.name} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="text-2xl">📦</div>
                        )}
                      </div>
                      <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">{p.category}</span>
                      <h4 className="font-bold text-slate-900 text-xs mt-1 truncate w-full">{p.name} — {p.model}</h4>
                      <p className="text-orange-500 font-bold text-[9px] mt-0.5">বিস্তারিত বিবরণ দেখুন →</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {/* 🌟 ফিচারড প্রোডাক্ট ব্যানার সেকশন (Sleek Showcase Layout) */}
          {(landingConfig.featured_banner_title || landingConfig.featured_banner_desc || landingConfig.featured_banner_image_url) && (
            <section className="py-16 px-6 md:px-12 bg-white w-full border-t border-b border-slate-100">
              <div className="max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                                {/* ব্যানার ইমেজ পার্ট (মোবাইলে সবার উপরে থাকবে, ডেক্সটপে ডান পাশে, ব্যাকগ্রাউন্ড বক্স ছাড়া সরাসরি ইমেজ দেখাবে যার নিজস্ব শ্যাডো থাকবে) */}
                                {landingConfig.featured_banner_image_url && (
                                  <div className="lg:col-span-6 flex justify-center order-1 lg:order-2 self-center w-full">
                                    <img 
                                      src={landingConfig.featured_banner_image_url} 
                                      alt="Featured Product Banner" 
                                      className="max-h-[500px] w-auto h-auto object-contain rounded-[2rem] shadow-[0_15px_30px_-5px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.25)] hover:scale-[1.02] transition-all duration-500" 
                                    />
                                  </div>
                                )}

                {/* টেক্সট পার্ট (মোবাইলে নিচে থাকবে, ডেক্সটপে বাম পাশে) */}
                <div className="lg:col-span-6 space-y-6 order-2 lg:order-1">
                  {landingConfig.featured_banner_title && (
                    <h3 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                      {landingConfig.featured_banner_title}
                    </h3>
                  )}
                  {landingConfig.featured_banner_desc && (
                    <p className="text-slate-600 font-semibold text-sm md:text-base leading-relaxed whitespace-pre-line">
                      {landingConfig.featured_banner_desc}
                    </p>
                  )}
                  <div className="pt-2">
                    <button 
                      onClick={() => setActiveTab('products')} 
                      className="bg-slate-900 hover:bg-orange-500 text-white px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all duration-300 shadow-md"
                    >
                      View Catalog
                    </button>
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* ৪টি ক্যাটাগরি সেকশন (Solar Panel 12V হাইলাইট সহ) */}
          <section className="bg-slate-50 py-16 px-6 md:px-12 w-full">
            <div className="max-w-[1400px] mx-auto">
              <div className="text-center mb-12">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Core Portfolio</span>
                <h3 className="text-3xl font-black text-slate-900 mt-1">Our Specialties</h3>
                <div className="h-1 w-12 bg-orange-500 mx-auto mt-3"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {categories.map((c) => {
                  const displayCat = getDisplayCategoryName(c);
                  const is12V = displayCat === 'Solar Panel 12V';
                                    // ডিফল্ট অথেন্টিক ইমেজ সেট করা হলো
                                    let defaultImg = "https://i.postimg.cc/2S35fVxS/Lams-Logo.png";
                                    if (displayCat === 'Hybrid Inverter') defaultImg = "https://i.postimg.cc/NfbsgbhR/Solar-On-Inverter.png";
                                    else if (displayCat === 'On Grid Inverter') defaultImg = "https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/Inhenergy.png";
                                    else if (displayCat === 'Solar Panel 12V') defaultImg = "https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/1777361937927_kup74h.png";
                                    else if (displayCat === 'Solar Panel 24V') defaultImg = "https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/1777361856220_dmal4.png";
                  
                                    // কাস্টমাইজড বা সেভ করা ইমেজ যদি ডিফল্ট লোগো হয় বা ফাকা থাকে, তবে অথেন্টিক প্রোডাক্ট ইমেজটি দেখাবে
                                    const configuredImg = landingConfig.category_images?.[displayCat];
                                    const catImage = (!configuredImg || configuredImg === "https://i.postimg.cc/2S35fVxS/Lams-Logo.png" || configuredImg.trim() === '')
                                      ? defaultImg
                                      : configuredImg;
                  
                  return (
                    <div 
                      key={c}
                      className={`bg-white rounded-[2.5rem] p-6 border shadow-sm flex flex-col justify-between items-center transition-all duration-300 relative overflow-hidden group ${
                        is12V 
                          ? 'border-orange-200 ring-2 ring-orange-500/10 shadow-orange-100/50 shadow-md' 
                          : 'border-slate-100'
                      }`}
                    >
                      {is12V && (
                        <span className="absolute top-4 right-4 bg-orange-500 text-white font-black text-[8px] uppercase px-3 py-1 rounded-full tracking-widest shadow-sm z-10">
                          ✨ LAMS OWN BRAND
                        </span>
                      )}

                      <div className="w-full">
                        <div className="w-full bg-slate-50/50 rounded-[2rem] aspect-[4/3] mb-6 flex items-center justify-center p-4 overflow-hidden relative">
                          <img src={catImage} alt={displayCat} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                        </div>

                        <h4 className="text-2xl font-black text-slate-900 tracking-tight text-center mb-2">
                          {displayCat}
                        </h4>
                        
                        {is12V ? (
                          <p className="text-slate-500 font-semibold text-xs text-center leading-relaxed mb-4 px-2">
                            LAMS Power's premium panels manufactured directly under our strict banners (Powerland, Sunland & Sunland Extreme).
                          </p>
                        ) : (
                          <p className="text-slate-400 font-semibold text-xs text-center leading-relaxed mb-4 px-2">
                            Imported from leading global brands with quality assurance checks.
                          </p>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                          setActiveTab('products');
                          setProductCategoryFilter(c);
                        }}
                        className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-200 active:scale-95 ${
                          is12V 
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20' 
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        Explore Products
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* আমাদের পরিচিতি (About Us) সেকশন */}
          <section className="py-20 px-6 md:px-12 max-w-[1300px] mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
              <div className="lg:col-span-5 space-y-4">
                <span className="text-[10px] font-black tracking-widest uppercase text-orange-500">Who We Are</span>
                <h3 className="text-4xl font-black text-slate-900 leading-tight">
                  About LAMS Power
                </h3>
                <div className="h-1.5 w-16 bg-orange-500 rounded-full"></div>
                
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider pt-4 leading-loose">
                  Established in 2010<br />
                  Bangladesh's Trusted Green Partner
                </p>
              </div>

              <div className="lg:col-span-7 space-y-8">
                
                {/* প্রোফাইল পার্ট */}
                <div className="space-y-3 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    {landingConfig.about_profile_title}
                  </h4>
                  <p className="text-slate-600 text-sm font-semibold leading-relaxed">
                    {landingConfig.about_profile_text}
                  </p>
                </div>

                {/* কোয়ালিটি পার্ট */}
                <div className="space-y-3 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                    {landingConfig.about_quality_title}
                  </h4>
                  <p className="text-slate-600 text-sm font-semibold leading-relaxed">
                    {landingConfig.about_quality_text}
                  </p>
                </div>

              </div>
            </div>
          </section>

        </div>
      )}

      {/* ---------------- ভিউ ২: ক্যাটালগ প্রোডাক্টস ---------------- */}
      {activeTab === 'products' && (
        <div className="animate-in fade-in duration-300 flex-1 bg-slate-50 py-10 px-4 lg:px-8">
          <div className="max-w-[1500px] mx-auto space-y-8">
            
            {/* সার্চ ও ক্যাটাগরি ফিল্টার বার */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-6 justify-between items-center">
              
              {/* ক্যাটাগরি ফিল্টার বাটনসমূহ */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start w-full lg:w-auto">
                <button 
                  onClick={() => setProductCategoryFilter('All')} 
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                    productCategoryFilter === 'All' 
                      ? 'bg-slate-950 text-white shadow-md' 
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  All Products
                </button>
                {categories.map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setProductCategoryFilter(cat)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                      productCategoryFilter === cat 
                        ? 'bg-slate-950 text-white shadow-md' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {getDisplayCategoryName(cat)}
                  </button>
                ))}
              </div>

              {/* লাইভ সার্চ ইনপুট */}
              <div className="w-full lg:w-80 relative">
                <input 
                  type="text" 
                  placeholder="🔍 প্রোডাক্ট সার্চ করুন..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

            </div>

            {/* ফিল্টারড ক্যাটাগরি তালিকা */}
            <div className="space-y-16">
              {categories
                .filter(cat => productCategoryFilter === 'All' || productCategoryFilter === cat)
                .map((cat) => {
                  const displayCat = getDisplayCategoryName(cat);
                  const is12V = displayCat === 'Solar Panel 12V';
                  const catProds = getFilteredProductsForList(cat);
                  const grouped = getGroupedProducts(catProds);
                  
                  if (grouped.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-8">
                      <div className="flex items-center gap-4">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight pl-3 border-l-4 border-slate-950">
                          {displayCat}
                        </h2>
                        {is12V && (
                          <span className="bg-orange-500/10 text-orange-600 font-black text-[9px] uppercase tracking-wider px-3 py-1 rounded-full">
                            Manufactured Under LAMS banner
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {grouped.map((brand, index) => (
                          <div 
                            key={index} 
                            className={`bg-white rounded-[2.5rem] p-6 border shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300 group ${
                              is12V ? 'border-orange-100/60 shadow-orange-100/10' : 'border-slate-100'
                            }`}
                          >
                            <div className="w-full">
                              <div className="w-full bg-slate-50/50 rounded-[2rem] aspect-[4/3] mb-6 flex items-center justify-center p-4 overflow-hidden">
                                {brand.image_url ? (
                                  <img src={brand.image_url} alt={brand.name} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                  <div className="text-4xl">📦</div>
                                )}
                              </div>

                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                                  {brand.name}
                                </h3>
                                {is12V && (
                                  <span className="text-[8px] font-black uppercase text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                    Own Brand
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3 pt-2">
                              {/* ইন স্টক মডেল তালিকা */}
                              {brand.inStock.length > 0 && (
                                <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl text-center">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block mb-2">✓ In Stock Models</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    {brand.inStock.map((model) => (
                                      <button 
                                        key={model}
                                        onClick={() => handleModelClick(brand.name, model)}
                                        className="bg-white hover:bg-emerald-550 border border-emerald-100 text-emerald-700 p-2 rounded-xl text-xs font-black transition-all shadow-sm truncate h-10 flex items-center justify-center"
                                      >
                                        {model}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* আপকামিং মডেল তালিকা */}
                              {brand.upcoming.length > 0 && (
                                <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl text-center">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 block mb-2">⏳ Coming Soon</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    {brand.upcoming.map((model) => (
                                      <button 
                                        key={model}
                                        onClick={() => handleModelClick(brand.name, model)}
                                        className="bg-white hover:bg-amber-550 border border-amber-100 text-amber-700 p-2 rounded-xl text-xs font-black transition-all shadow-sm truncate h-10 flex items-center justify-center"
                                      >
                                        {model}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>

          </div>
        </div>
      )}

      {/* ---------------- ভিউ ৩: কন্ট্যাক্ট পেজ ---------------- */}
      {activeTab === 'contact' && (
        <div className="animate-in fade-in duration-300 flex-1 bg-slate-50 py-16 px-6 md:px-12 w-full">
          <div className="max-w-[1200px] mx-auto space-y-12">
            <div className="text-center">
              <span className="text-[10px] font-black tracking-widest uppercase text-orange-500">Get In Touch</span>
              <h3 className="text-4xl font-black text-slate-900 mt-1">Contact LAMS Power</h3>
              <div className="h-1.5 w-16 bg-orange-500 rounded-full mx-auto mt-3"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* কর্পোরেট অফিস */}
              {siteSettings.contact_address && (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl">
                    🏢
                  </div>
                  <h4 className="text-lg font-black text-slate-900">Corporate Office</h4>
                  <p className="text-slate-500 text-sm font-semibold leading-relaxed">
                    {siteSettings.contact_address}
                  </p>
                </div>
              )}

              {/* নবাবপুর শোরুম */}
              {siteSettings.contact_showroom && (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl">
                    🏪
                  </div>
                  <h4 className="text-lg font-black text-slate-900">Showroom Address</h4>
                  <p className="text-slate-500 text-sm font-semibold leading-relaxed">
                    {siteSettings.contact_showroom}
                  </p>
                </div>
              )}

              {/* ফোন এবং ইমেইল */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl">
                  📞
                </div>
                <h4 className="text-lg font-black text-slate-900">Connect With Us</h4>
                
                <div className="space-y-4 w-full">
                  {siteSettings.contact_hotline && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Hotline</span>
                      <a href={`tel:${siteSettings.contact_hotline}`} className="text-orange-500 font-black text-base hover:underline">{siteSettings.contact_hotline}</a>
                    </div>
                  )}
                  {siteSettings.contact_numbers && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Sales / Office Phone</span>
                      <p className="text-slate-700 font-black text-sm whitespace-pre-line leading-relaxed">
                        {siteSettings.contact_numbers.split(', ').join('\n')}
                      </p>
                    </div>
                  )}
                  {siteSettings.contact_email && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">E-mail</span>
                      <a href={`mailto:${siteSettings.contact_email}`} className="text-slate-900 font-bold hover:underline">{siteSettings.contact_email}</a>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 🎯 মডাল উইন্ডো */}
      {selectedModalProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 border shadow-2xl relative animate-in zoom-in-95 duration-300">
            
            <button 
              onClick={() => setSelectedModalProduct(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-all flex items-center justify-center text-xl"
            >
              ✕
            </button>

            <div className="border-b pb-4 mb-5">
              <span className="text-[10px] font-black tracking-widest bg-orange-100 text-orange-600 px-3.5 py-1 rounded-full uppercase">
                {selectedModalProduct.category}
              </span>
              <h3 className="text-3xl font-black text-slate-900 mt-2 text-center">{selectedModalProduct.name}</h3>
              <p className="text-lg font-black text-orange-600 mt-1 text-center">মডেল/ক্ষমতা: {selectedModalProduct.model}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">লোড ভোল্টেজ</span>
                <span className="text-2xl font-black text-slate-800">{selectedModalProduct.volt || 'পাওয়া যায়নি'}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">লোড ওয়াট</span>
                <span className="text-2xl font-black text-slate-800">{selectedModalProduct.watt || 'পাওয়া যায়নি'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1 text-center">প্রোডাক্ট পরিচিতি ও টেকনিক্যাল বিবরণ</span>
              <div className="bg-slate-50 p-5 rounded-2xl border text-base text-slate-800 leading-relaxed font-semibold max-h-48 overflow-y-auto custom-scrollbar">
                {selectedModalProduct.description ? (
                  <p className="whitespace-pre-line">{selectedModalProduct.description}</p>
                ) : (
                  <p className="text-slate-400 italic text-center">বিবরণ এখনো যুক্ত করা হয়নি</p>
                )}
              </div>
            </div>

            <button 
              onClick={() => setSelectedModalProduct(null)}
              className="w-full mt-6 bg-slate-900 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-md transition-colors shadow-lg"
            >
              বন্ধ করুন
            </button>

          </div>
        </div>
      )}

      {/* 🏛️ স্লিক মিনিমাল ফুটার */}
      <footer className="bg-slate-900 text-white py-12 px-6 border-t border-slate-800 mt-auto">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h5 className="text-lg font-black text-orange-500 tracking-tighter uppercase">LAMS POWER</h5>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">© {new Date().getFullYear()} Lams Power. All Rights Reserved.</p>
          </div>
          
          {landingConfig.actual_footer_image && (
            <div className="max-w-[200px] opacity-75 hover:opacity-100 transition-opacity">
              <img src={landingConfig.actual_footer_image} alt="LAMS Energy Partner" className="max-h-12 object-contain" />
            </div>
          )}
        </div>
      </footer>

    </div>
  );
};

export default PublicCatalog;