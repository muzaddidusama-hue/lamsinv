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
  const [loading, setLoading] = useState(true);
  const [selectedModalProduct, setSelectedModalProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: prodData } = await supabase.from('products').select('*');
      setProducts(prodData || []);
      
      const { data: settingsData } = await supabase.from('site_settings').select('*').single();
      if (settingsData) setSiteSettings(settingsData);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const categories = ["Hybrid Inverter", "On-grid Inverter", "Solar Panel - 12 Volt", "Solar Panel - 24 Volt", "Lithium Battery"];
  
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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-500 text-xl italic">로드 হচ্ছে...</div>;

  return (
    <div className="min-h-screen bg-[#F4F5F7] relative" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      <header className="bg-white py-5 px-6 shadow-sm sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-[1400px] mx-auto flex items-center justify-center gap-4">
          <img src="https://i.postimg.cc/2S35fVxS/Lams-Logo.png" alt="Lams Logo" className="h-12 lg:h-16 object-contain" />
          <h1 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tighter uppercase">
            {siteSettings.header_name || 'Lams Power Inventory'}
          </h1>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-4 lg:px-8 mt-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          <main className="flex-1 order-1 lg:order-2">
            {categories.map(cat => {
              const twelveVoltBrands = ['powerland', 'sunland', 'sunland extreme'];

              const catProds = products.filter(p => {
                if (p.is_hidden || (p.house !== 'Head Office' && p.house !== 'Showroom')) return false;
                const pNameLower = p.name ? p.name.toLowerCase().trim() : '';
                const pCatLower = p.category ? p.category.toLowerCase().trim() : '';

                if (cat === 'Solar Panel - 12 Volt') {
                  return pCatLower === 'solar panel' && twelveVoltBrands.includes(pNameLower);
                }
                if (cat === 'Solar Panel - 24 Volt') {
                  return pCatLower === 'solar panel' && !twelveVoltBrands.includes(pNameLower);
                }
                return p.category === cat;
              });

              const grouped = getGroupedProducts(catProds);
              if (grouped.length === 0) return null;

              return (
                <div key={cat} className="mb-16">
                  <h2 className="text-3xl lg:text-4xl font-black text-slate-800 mb-8 border-l-8 border-slate-900 pl-4">{cat}</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
                    {grouped.map((brand, index) => (
                      <div key={index} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-50 group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col items-center">
                        
                        <div className="w-full bg-[#F0F2F5] rounded-[2rem] aspect-[4/3] mb-6 flex items-center justify-center p-6 overflow-hidden">
                          <img src={brand.image_url} alt={brand.name} className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-110" />
                        </div>
                        
                        <h3 className="text-4xl font-black text-slate-900 mb-6 tracking-tight text-center">{brand.name}</h3>
                        
                        <div className="w-full space-y-4">
                          
                          {/* 🟢 ইন স্টক কন্ডিশন সেকশন */}
                          {brand.inStock.length > 0 && (
                            <div className="w-full bg-[#009A66] text-white p-4 rounded-2xl font-bold border shadow-sm">
                              <p className="opacity-90 mb-3 uppercase tracking-wider text-[11px] font-black text-center">✓ In Stock</p>
                              
                              {/* 🛠️ ফিক্সড গ্রিড: ২-কলাম হবে এবং আইটেমগুলো সেন্টারে জাস্টিফাই হবে */}
                              <div className="grid grid-cols-2 gap-2 justify-items-center justify-center w-full">
                                {brand.inStock.map((model, idx) => {
                                  // যদি টোটাল বাটন বিজোড় হয় (যেমন ৩ বা ৫ টা) এবং এটিই শেষ বাটন হয়
                                  const isLastOdd = brand.inStock.length % 2 !== 0 && idx === brand.inStock.length - 1;
                                  return (
                                    <button 
                                      key={model} 
                                      onClick={() => handleModelClick(brand.name, model)} 
                                      className={`bg-white text-[#009A66] hover:bg-slate-100 p-2.5 rounded-xl text-sm font-black transition-all shadow-sm active:scale-95 text-center truncate h-11 flex items-center justify-center ${
                                        isLastOdd ? 'col-span-2 w-44 mx-auto' : 'w-full'
                                      }`}
                                    >
                                      {model}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* 🟡 আপকামিং সেকশন */}
                          {brand.upcoming.length > 0 && (
                            <div className="w-full bg-[#deb100] text-white p-4 rounded-2xl font-bold border shadow-sm">
                              <p className="opacity-90 mb-3 uppercase tracking-wider text-[11px] font-black text-center">⏳ Coming Soon</p>
                              
                              <div className="grid grid-cols-2 gap-2 justify-items-center justify-center w-full">
                                {brand.upcoming.map((model, idx) => {
                                  const isLastOdd = brand.upcoming.length % 2 !== 0 && idx === brand.upcoming.length - 1;
                                  return (
                                    <button 
                                      key={model} 
                                      onClick={() => handleModelClick(brand.name, model)} 
                                      className={`bg-white text-[#b38f00] hover:bg-slate-100 p-2.5 rounded-xl text-sm font-black transition-all shadow-sm active:scale-95 text-center truncate h-11 flex items-center justify-center ${
                                        isLastOdd ? 'col-span-2 w-44 mx-auto' : 'w-full'
                                      }`}
                                    >
                                      {model}
                                    </button>
                                  );
                                })}
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
          </main>

          <aside className="w-full lg:w-80 shrink-0 order-2 lg:order-1">
            <div className="lg:sticky lg:top-28 bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-50 space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900">LAMS POWER</h2>
                <div className="h-1 w-12 bg-orange-500 rounded-full"></div>
              </div>

              <div className="space-y-4 text-base text-slate-700 leading-relaxed font-semibold">
                {siteSettings.contact_address && (
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Office</p>
                    <p>{siteSettings.contact_address}</p>
                  </div>
                )}
                {siteSettings.contact_showroom && (
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Showroom</p>
                    <p>{siteSettings.contact_showroom}</p>
                  </div>
                )}
                {siteSettings.contact_numbers && (
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p>
                    <p className="whitespace-pre-line">{siteSettings.contact_numbers.split(', ').join('\n')}</p>
                  </div>
                )}
                {siteSettings.contact_hotline && (
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Hotline</p>
                    <p className="text-orange-600 font-black text-lg">{siteSettings.contact_hotline}</p>
                  </div>
                )}
                {siteSettings.contact_email && (
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</p>
                    <p className="text-slate-900 underline">{siteSettings.contact_email}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

        </div>
      </div>

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
              <span className="text-[11px] font-black tracking-widest bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase">
                {selectedModalProduct.category}
              </span>
              <h3 className="text-3xl font-black text-slate-900 mt-2 text-center">{selectedModalProduct.name}</h3>
              <p className="text-lg font-black text-orange-600 mt-1 text-center">মডেল/ক্ষমতা: {selectedModalProduct.model}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">লোড ভোল্টেজ</span>
                <span className="text-2xl font-black text-slate-800">{selectedModalProduct.volt || 'পাওয়া যায়নি'}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-1">লোড ওয়াট</span>
                <span className="text-2xl font-black text-slate-800">{selectedModalProduct.watt || 'পাওয়া যায়নি'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block px-1 text-center">প্রোডাক্ট পরিচিতি ও টেকনিক্যাল বিবরণ</span>
              <div className="bg-slate-50 p-5 rounded-2xl border text-base text-slate-800 leading-relaxed font-semibold max-h-48 overflow-y-auto custom-scrollbar">
                {selectedModalProduct.description ? (
                  <p className="whitespace-pre-line text-center">{selectedModalProduct.description}</p>
                ) : (
                  <p className="italic text-slate-400 text-center py-4">এই মডেলটির জন্য কোনো অতিরিক্ত বিবরণ এখনো এন্ট্রি করা হয়নি।</p>
                )}
              </div>
            </div>

            <button 
              onClick={() => setSelectedModalProduct(null)}
              className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-base tracking-wide transition-all shadow-lg"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      <footer className="mt-10 bg-white border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto py-6 px-6 flex flex-col items-center gap-4">
          {siteSettings.footer_image_url && (
            <img src={siteSettings.footer_image_url} alt="Featured Products" className="w-full max-w-4xl object-contain opacity-90" />
          )}
          <button onClick={onAdminClick} className="text-[9px] font-black text-slate-300 hover:text-slate-900 transition-colors uppercase tracking-[0.4em]">
            Staff Access
          </button>
        </div>
      </footer>
    </div>
  );
};

export default PublicCatalog;