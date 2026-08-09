import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ResellerOfferAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [siteSettings, setSiteSettings] = useState(null);
  const [heading, setHeading] = useState('');
  const [offerText, setOfferText] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (error) throw error;
      if (data) {
        setSiteSettings(data);
        if (data.footer_image_url && data.footer_image_url.startsWith('{')) {
          try {
            const parsed = JSON.parse(data.footer_image_url);
            setHeading(parsed.reseller_offer_title || '');
            setOfferText(parsed.reseller_offer_text || '');
          } catch (e) {
            console.error("JSON parse error:", e);
          }
        }
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let existingPayload = {};
      if (siteSettings?.footer_image_url && siteSettings.footer_image_url.startsWith('{')) {
        try {
          existingPayload = JSON.parse(siteSettings.footer_image_url);
        } catch (e) {
          console.error(e);
        }
      }

      const updatedPayload = {
        ...existingPayload,
        reseller_offer_title: heading,
        reseller_offer_text: offerText
      };

      const finalSettings = {
        ...siteSettings,
        footer_image_url: JSON.stringify(updatedPayload)
      };

      const { error } = await supabase.from('site_settings').upsert([finalSettings]);
      if (error) throw error;
      
      setSiteSettings(finalSettings);
      alert('✅ রিসেলার অফার সফলভাবে সেভ হয়েছে!');
    } catch (err) {
      console.error("Error saving reseller offer:", err);
      alert('অফার সেভ করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-6 sm:p-10 shadow-xl space-y-8">
        <div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            Reseller Offer Editor
          </span>
          <h2 className="text-3xl font-black text-slate-900 mt-3">রিসেলার অফার পেজ কাস্টমাইজেশন</h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            এখান থেকে রিসেলার অফারের হেডিং এবং বিবরণ পরিবর্তন করতে পারবেন। যা lamspower.pro.bd/reseller-offer লিঙ্কে দেখা যাবে।
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              অফারের শিরোনাম (Heading)
            </label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="যেমন: Exclusive Reseller Deal 2026"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-800"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              অফারের বিস্তারিত বিবরণ (Text Box)
            </label>
            <textarea
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              rows="12"
              placeholder="অফারের বিস্তারিত তথ্য এখানে লিখুন..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-800 leading-relaxed"
              required
            ></textarea>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-orange-600 transition-all active:scale-95 shadow-lg flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  সংরক্ষণ হচ্ছে...
                </>
              ) : (
                'সংরক্ষণ করুন'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResellerOfferAdmin;
