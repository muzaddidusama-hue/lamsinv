import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PublicCatalog = ({ onAdminClick }) => {
  const [products, setProducts] = useState([]);
  const [siteSettings, setSiteSettings] = useState({}); 
  const [loading, setLoading] = useState(true);

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

  const categories = ["Hybrid Inverter", "On-grid Inverter", "Solar Panel", "Lithium Battery"];
  
  const getGroupedProducts = (catProds) => {
    const groups = {};
    catProds.forEach(p => {
      if (!groups[p.name]) {
        groups[p.name] = { name: p.name, image_url: p.image_url, inStock: [], outOfStock: [], upcoming: [] };
      }
      let status = p.availability; 
      if (p.stock_quantity <= 0) status = 'out of stock';
      
      if (status === 'out of stock') groups[p.name].outOfStock.push(p.model);
      else if (status === 'upcoming') groups[p.name].upcoming.push(p.model);
      else groups[p.name].inStock.push(p.model);
    });
    return Object.values(groups);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400 italic">লোড হচ্ছে...</div>;

  return (
    <div className="min-h-screen bg-[#F4F5F7]" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      <header className="bg-white py-4 px-6 shadow-sm sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-[1400px] mx-auto flex items-center justify-center gap-4">
          <img src="https://i.postimg.cc/2S35fVxS/Lams-Logo.png" alt="Lams Logo" className="h-10 lg:h-14 object-contain" />
          <h1 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tighter uppercase">
            {siteSettings.header_name || 'Lams Power Inventory'}
          </h1>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-4 lg:px-8 mt-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          <main className="flex-1 order-1 lg:order-2">
            {categories.map(cat => {
              const catProds = products.filter(p => p.category === cat && !p.is_hidden);
              const grouped = getGroupedProducts(catProds);
              if (grouped.length === 0) return null;

              return (
                <div key={cat} className="mb-16">
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-800 mb-8 border-l-8 border-slate-900 pl-4">{cat}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
                    {grouped.map((brand, index) => (
                      <div key={index} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-50 group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col items-center">
                        <div className="w-full bg-[#F0F2F5] rounded-[2rem] aspect-[4/3] mb-6 flex items-center justify-center p-6 overflow-hidden">
                          <img src={brand.image_url} alt={brand.name} className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-110" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">{brand.name}</h3>
                        <div className="w-full space-y-2">
                          {brand.inStock.length > 0 && (
                            <div className="w-full bg-[#009A66] text-white py-3 px-4 rounded-xl font-bold text-center text-sm">In Stock: {brand.inStock.join(', ')}</div>
                          )}
                          {brand.outOfStock.length > 0 && (
                            <div className="w-full bg-[#990000] text-white py-3 px-4 rounded-xl font-bold text-center text-sm">Out of Stock: {brand.outOfStock.join(', ')}</div>
                          )}
                          {brand.upcoming.length > 0 && (
                            <div className="w-full bg-[#deb100] text-white py-3 px-4 rounded-xl font-bold text-center text-sm">Coming Soon: {brand.upcoming.join(', ')}</div>
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

              <div className="space-y-4 text-sm text-slate-600 leading-relaxed font-medium">
                {siteSettings.contact_address && (
                  <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Office</p>
                    <p>{siteSettings.contact_address}</p>
                  </div>
                )}
                {siteSettings.contact_showroom && (
                  <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Showroom</p>
                    <p>{siteSettings.contact_showroom}</p>
                  </div>
                )}
                {siteSettings.contact_numbers && (
                  <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Contact</p>
                    <p className="whitespace-pre-line">{siteSettings.contact_numbers.split(', ').join('\n')}</p>
                  </div>
                )}
                {siteSettings.contact_hotline && (
                  <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Hotline</p>
                    <p className="text-orange-600 font-bold">{siteSettings.contact_hotline}</p>
                  </div>
                )}
                {siteSettings.contact_email && (
                  <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">E-mail</p>
                    <p className="text-slate-900 underline">{siteSettings.contact_email}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

        </div>
      </div>

      <footer className="mt-10 bg-white border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto py-6 px-6 flex flex-col items-center gap-4">
          {siteSettings.footer_image_url && (
            <img src={siteSettings.footer_image_url} alt="Featured Products" className="w-full max-w-4xl object-contain opacity-90" />
          )}
          <button 
            onClick={onAdminClick} 
            className="text-[9px] font-black text-slate-300 hover:text-slate-900 transition-colors uppercase tracking-[0.4em]"
          >
            Staff Access
          </button>
        </div>
      </footer>
    </div>
  );
};

export default PublicCatalog;