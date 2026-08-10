import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import lamsLogo from '../assets/lams-logo.webp';

const ResellerOfferPublic = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState('');
  const [offerText, setOfferText] = useState('');

  useEffect(() => {
    fetchOffer();
  }, []);

  const fetchOffer = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (error) throw error;
      if (data) {
        if (data.footer_image_url && data.footer_image_url.startsWith('{')) {
          try {
            const parsed = JSON.parse(data.footer_image_url);
            setHeading(parsed.reseller_offer_title || 'Exclusive Reseller Offers');
            setOfferText(parsed.reseller_offer_text || 'Stay tuned! Offers are being prepared.');
            
            // Set document title
            document.title = `${parsed.reseller_offer_title || 'Reseller Offer'} - Lams Power`;
          } catch (e) {
            console.error("JSON parse error:", e);
          }
        } else {
          setHeading('Exclusive Reseller Offers');
          setOfferText('Stay tuned! Offers are being prepared.');
        }
      }
    } catch (err) {
      console.error("Error fetching reseller offer:", err);
      setHeading('Exclusive Reseller Offers');
      setOfferText('Unable to load offers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ea3838]"></div>
        <p className="text-slate-400 font-bold text-xs mt-4 animate-pulse">LAMS Power...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col font-['Inter',_sans-serif]">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img 
              src={lamsLogo} 
              alt="Lams Power Logo" 
              className="h-10 w-auto object-contain" 
            />
            <span className="text-xl font-black text-slate-800 tracking-tighter uppercase font-['Outfit']">
              Lams<span className="text-[#ea3838]">Power</span>
            </span>
          </div>

          <button 
            onClick={() => navigate('/')} 
            className="px-5 py-2.5 bg-slate-900 hover:bg-[#ea3838] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <div className="bg-white rounded-[2.5rem] border border-slate-200/50 p-8 sm:p-12 shadow-2xl space-y-8 animate-in slide-in-from-bottom-6 duration-700">
          
          {/* Badge & Title */}
          <div className="text-center space-y-4">
            <span className="inline-block text-[10px] font-black text-[#ea3838] uppercase tracking-widest bg-red-50 border border-red-100 px-4 py-1.5 rounded-full">
              Reseller Program
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none font-['Outfit']">
              {heading}
            </h1>
            <div className="h-1 w-20 bg-[#ea3838] mx-auto rounded-full mt-2"></div>
          </div>

          {/* Description / Content Body */}
          <div className="prose max-w-none text-slate-700 text-sm sm:text-base font-semibold leading-relaxed space-y-6 pt-4 border-t border-slate-100 whitespace-pre-wrap">
            {offerText}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 border-t border-slate-900 text-center text-xs">
        <div className="max-w-6xl mx-auto px-6 space-y-3">
          <p>© {new Date().getFullYear()} Lams Power. All Rights Reserved.</p>
          <p className="text-[10px] text-slate-600">This page is private and confidential for registered resellers.</p>
        </div>
      </footer>
    </div>
  );
};

export default ResellerOfferPublic;
