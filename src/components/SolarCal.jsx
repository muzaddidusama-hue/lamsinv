import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import lamsLogo from '../assets/lams-logo.webp';
import { supabase } from '../supabaseClient';

// Inverter Table with specific Model Suggestions as requested
export const INVERTER_TABLE = [
  { va: 900,  load: 450,  panel: 500,  model: 'Talegent SunMate-900',  brand: 'Talegent' },
  { va: 1150, load: 800,  panel: 800,  model: 'SolarOn SunMate-1150', brand: 'SolarOn' },
  { va: 1450, load: 1300, panel: 1300, model: 'SolarOn SunMate-1450', brand: 'SolarOn' },
  { va: 1650, load: 1350, panel: 1600, model: 'SolarOn SunMate-1650', brand: 'SolarOn' },
  { va: 2000, load: 1600, panel: 2000, model: 'SolarOn SunMate-2000', brand: 'SolarOn' },
  { va: 2500, load: 2000, panel: 2500, model: 'SolarOn SunMate-2500', brand: 'SolarOn' },
  { va: 3000, load: 2500, panel: 2500, model: 'SolarOn SunMate-3000', brand: 'SolarOn' },
  { va: 3600, load: 3000, panel: 3000, model: 'SolarOn SunMate-3600', brand: 'SolarOn' },
  { va: 4500, load: 3800, panel: 3800, model: 'Jarrett JXM4.5',       brand: 'Jarrett' },
  { va: 6200, load: 5000, panel: 5000, model: 'SolarOn SunMate-6200', brand: 'SolarOn' },
  { va: 6500, load: 5800, panel: 5800, model: 'Jarrett JXM6.5',       brand: 'Jarrett' }
];

export const PRESETS = [
  { key: 'light', watt: 20, en: 'Light', bn: 'লাইট' },
  { key: 'fan', watt: 100, en: 'Fan', bn: 'ফ্যান' },
  { key: 'wifi', watt: 20, en: 'WiFi Router', bn: 'ওয়াইফাই রাউটার' },
  { key: 'tv', watt: 50, en: 'TV', bn: 'টিভি', noteEn: 'Standard size 32-inch estimated load', noteBn: 'স্ট্যান্ডার্ড সাইজ ৩২ ইঞ্চি আনুমানিক লোড' },
  { key: 'custom', watt: 0, en: 'Custom Appliance', bn: 'কাস্টম যন্ত্রপাতি' }
];

const TRANSLATIONS = {
  en: {
    title: 'Solar Load Calculator - SolarCal',
    subtitle: 'Accurate sizing for Solar Panels, Inverters, and Batteries',
    lang_label: 'Language',
    role: 'Guest',
    appliances_title: 'Connected Appliances',
    appliances_info: 'Add appliances with rated wattage and quantities used during day and night.',
    col_appliance: 'Appliance',
    col_load: 'Load (W)',
    col_qty_day: 'Day Qty',
    col_qty_night: 'Night Qty',
    add_appliance: '+ Add Appliance',
    clear_all: 'Clear All',
    total_load_label: 'Total Connected Load:',
    system_settings: 'System Configuration',
    backup_hours_label: 'Backup Hours (for Off-grid / Night)',
    backup_hours_note: 'Required battery backup time in hours',
    system_voltage: 'System Voltage',
    system_voltage_note: 'Battery capacity (Ah) calculated for selected voltage',
    hybrid_mode: 'Operation Mode',
    day: 'Daytime only',
    night: 'Night-only',
    daynight: 'Day + Night',
    results_title: 'Calculated System Requirements',
    day_load_label: 'Daytime Load',
    night_load_label: 'Nighttime Load',
    total_connected_load: 'Total Connected Load',
    solar_panel_required: 'Solar Panel Required',
    battery_li: 'Battery (Lithium-ion)',
    battery_lead: 'Battery (Lead-acid)',
    recommended_inverter: 'Recommended Inverter Capacity',
    suggested_model: 'Suggested Inverter Model',
    custom_name_placeholder: 'Custom name',
    qty_placeholder: 'Qty',
    no_appliances: 'No appliances added. Click "+ Add Appliance" to get started.',
    copy_summary: 'Copy Estimate',
    copied: 'Copied!',
    print_sheet: 'Print Estimate',
    back_to_home: 'Homepage',
    back_to_dashboard: 'Back to Dashboard',
    modes_summary: 'Choose your desired usage mode to get customized sizing recommendations.',
    whatsapp_share: 'Inquire on WhatsApp',
    spec_summary: 'Estimated Summary'
  },
  bn: {
    title: 'সোলার লোড ক্যালকুলেটর - সোলারক্যাল',
    subtitle: 'সোলার প্যানেল, ইনভার্টার মডেল এবং ব্যাটারি সাইজিংয়ের সহজ সমাধান',
    lang_label: 'ভাষা',
    role: 'অতিথি',
    appliances_title: 'যন্ত্রপাতির তালিকা ও লোড',
    appliances_info: 'যন্ত্রপাতির ওয়াট এবং দিনে ও রাতে ব্যবহারের পরিমাণ যোগ করুন।',
    col_appliance: 'যন্ত্রপাতি',
    col_load: 'লোড (W)',
    col_qty_day: 'দিনে ব্যবহারের সংখ্যা',
    col_qty_night: 'রাতে ব্যবহারের সংখ্যা',
    add_appliance: '+ যন্ত্রপাতি যোগ করুন',
    clear_all: 'সব মুছুন',
    total_load_label: 'সর্বমোট কানেক্টেড লোড:',
    system_settings: 'সিস্টেম কনফিগারেশন',
    backup_hours_label: 'ব্যাকআপ সময় (অফ-গ্রিড / রাতের জন্য)',
    backup_hours_note: 'কত ঘন্টা ব্যাটারি ব্যাকআপ প্রয়োজন? (ঘন্টায়)',
    system_voltage: 'সিস্টেম ভোল্টেজ',
    system_voltage_note: 'ব্যাটারি অ্যাম্পিয়ার-আওয়ার (Ah) সিস্টেম ভোল্টেজের ভিত্তিতে নির্ধারিত',
    hybrid_mode: 'ব্যবহারের সময়কাল / মোড',
    day: 'শুধুমাত্র দিনে (Day only)',
    night: 'শুধুমাত্র রাতে (Night only)',
    daynight: 'দিন + রাত (Day + Night)',
    results_title: 'প্রয়োজনীয় সিস্টেম সাইজিং ও ফলাফল',
    day_load_label: 'দিনের লোড',
    night_load_label: 'রাতের লোড',
    total_connected_load: 'মোট সংযুক্ত লোড',
    solar_panel_required: 'সোলার প্যানেল প্রয়োজন',
    battery_li: 'ব্যাটারি (লিথিয়াম-আয়ন)',
    battery_lead: 'ব্যাটারি (লিড-অ্যাসিড)',
    recommended_inverter: 'প্রস্তাবিত ইনভার্টার ক্যাপাসিটি',
    suggested_model: 'প্রস্তাবিত ইনভার্টার মডেল',
    custom_name_placeholder: 'যন্ত্রপাতির নাম',
    qty_placeholder: 'পরিমাণ',
    no_appliances: 'কোনো যন্ত্রপাতি যোগ করা হয়নি। "+ যন্ত্রপাতি যোগ করুন" বোতামে চাপুন।',
    copy_summary: 'ক্যালকুলেশন কপি করুন',
    copied: 'কপি হয়েছে!',
    print_sheet: 'প্রিন্ট এস্টিমেট',
    back_to_home: 'হোমপেজ',
    back_to_dashboard: 'ড্যাশবোর্ডে ফিরে যান',
    modes_summary: 'আপনার পছন্দসই ব্যবহারের মোড বেছে নিন যাতে নির্ভুল রিকমেন্ডেশন পাওয়া যায়।',
    whatsapp_share: 'হোয়াটসঅ্যাপে ইনকোয়ারি',
    spec_summary: 'এস্টিমেট সারাংশ'
  }
};

const SolarCal = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState('bn');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copied, setCopied] = useState(false);

  // Core Calculator States
  const [mode, setMode] = useState('daynight'); // 'day' | 'night' | 'daynight'
  const [backupHours, setBackupHours] = useState(4);
  const [systemVoltage, setSystemVoltage] = useState(24);
  
  const [appliances, setAppliances] = useState([
    { id: 1, presetKey: 'light', name: 'লাইট', watt: 20, qtyDay: 1, qtyNight: 1 },
    { id: 2, presetKey: 'fan', name: 'ফ্যান', watt: 100, qtyDay: 1, qtyNight: 1 },
    { id: 3, presetKey: 'tv', name: 'টিভি', watt: 50, qtyDay: 1, qtyNight: 1 },
    { id: 4, presetKey: 'wifi', name: 'ওয়াইফাই রাউটার', watt: 20, qtyDay: 1, qtyNight: 1 }
  ]);

  const t = (key) => TRANSLATIONS[lang][key] || key;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsLoggedIn(true);
    });
    document.title = `${t('title')} - Lams Power`;
  }, [lang]);

  // Sync preset names on language change
  const handleLangChange = (newLang) => {
    setLang(newLang);
    setAppliances(prev => prev.map(a => {
      if (a.presetKey && a.presetKey !== 'custom') {
        const preset = PRESETS.find(p => p.key === a.presetKey);
        if (preset) {
          return { ...a, name: newLang === 'bn' ? preset.bn : preset.en };
        }
      }
      return a;
    }));
  };

  // Add new appliance row
  const handleAddAppliance = () => {
    const newId = Date.now();
    setAppliances(prev => [
      ...prev,
      { id: newId, presetKey: 'custom', name: '', watt: 0, qtyDay: 1, qtyNight: 0 }
    ]);
  };

  // Remove appliance
  const handleRemoveAppliance = (id) => {
    setAppliances(prev => prev.filter(a => a.id !== id));
  };

  // Clear all
  const handleClearAll = () => {
    if (window.confirm(lang === 'bn' ? 'আপনি কি সব যন্ত্রপাতি মুছে ফেলতে চান?' : 'Are you sure you want to clear all appliances?')) {
      setAppliances([]);
    }
  };

  // Change preset selection
  const handlePresetChange = (id, presetKey) => {
    const preset = PRESETS.find(p => p.key === presetKey);
    if (!preset) return;

    setAppliances(prev => prev.map(a => {
      if (a.id === id) {
        if (presetKey === 'custom') {
          return { ...a, presetKey: 'custom', name: '', watt: 0 };
        }
        return {
          ...a,
          presetKey: presetKey,
          name: lang === 'bn' ? preset.bn : preset.en,
          watt: preset.watt
        };
      }
      return a;
    }));
  };

  // Update field value
  const handleUpdateAppliance = (id, field, value) => {
    setAppliances(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  // ----------------------------------------------------
  // CALCULATION LOGIC (Matching exact user specifications)
  // ----------------------------------------------------
  const calculations = useMemo(() => {
    const rawDayLoad = appliances.reduce((sum, a) => sum + (Number(a.watt || 0) * (Number(a.qtyDay) || 0)), 0);
    const rawNightLoad = appliances.reduce((sum, a) => sum + (Number(a.watt || 0) * (Number(a.qtyNight) || 0)), 0);

    const dayLoad = mode === 'night' ? 0 : rawDayLoad;
    const nightLoad = mode === 'day' ? 0 : rawNightLoad;
    const totalLoad = dayLoad + nightLoad;

    const offgridPanelForLoad = (loadW, hours) => {
      if (!loadW || !hours) return 0;
      return Math.ceil((loadW * hours * 2) / 4.5);
    };

    const batteryBaseAhForLoad = (loadW, hours, volt) => {
      if (!loadW || !hours || !volt) return 0;
      return Number(((loadW * hours) / volt).toFixed(2));
    };

    let panelRequired = 0;
    if (mode === 'day') {
      panelRequired = dayLoad > 0 ? Math.ceil(dayLoad / 0.6) : 0;
    } else if (mode === 'night') {
      panelRequired = offgridPanelForLoad(nightLoad, backupHours);
    } else {
      const dayPart = dayLoad > 0 ? Math.ceil(dayLoad / 0.6) : 0;
      const nightPart = offgridPanelForLoad(nightLoad, backupHours);
      panelRequired = dayPart + nightPart;
    }

    const baseAh = batteryBaseAhForLoad(nightLoad, backupHours, systemVoltage);
    const battLiAh = baseAh === 0 ? 0 : Number((baseAh * 1.15).toFixed(1));
    const battLeadAh = baseAh === 0 ? 0 : Number((baseAh * 2.0).toFixed(1));

    // Match inverter from table
    let suggestedInverter = null;
    if (panelRequired > 0) {
      suggestedInverter = INVERTER_TABLE.find(e => panelRequired <= e.panel) || INVERTER_TABLE[INVERTER_TABLE.length - 1];
    }

    return {
      dayLoad,
      nightLoad,
      totalLoad,
      panelRequired,
      battLiAh,
      battLeadAh,
      suggestedInverter
    };
  }, [appliances, mode, backupHours, systemVoltage]);

  // Copy calculations to clipboard
  const handleCopySummary = () => {
    const text = `☀️ LAMS POWER SOLAR LOAD ESTIMATE (${mode.toUpperCase()})
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 মোট কানেক্টেড লোড: ${calculations.totalLoad} W
🔹 দিনের লোড: ${calculations.dayLoad} W
🔹 রাতের লোড: ${calculations.nightLoad} W
🔹 ব্যাকআপ সময়: ${backupHours} ঘণ্টা (${systemVoltage}V System)
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ প্রয়োজনীয় সোলার প্যানেল: ${calculations.panelRequired} W
🔋 ব্যাটারি (Li-ion): ${calculations.battLiAh} Ah
🔋 ব্যাটারি (Lead-acid): ${calculations.battLeadAh} Ah
🔌 প্রস্তাবিত ইনভার্টার: ${calculations.suggestedInverter ? `${calculations.suggestedInverter.va} VA (${calculations.suggestedInverter.model})` : '0 VA'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 www.lamspower.pro.bd`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hello Lams Power, I used your Solar Calculator. My required panel is ${calculations.panelRequired}W and suggested inverter is ${calculations.suggestedInverter?.model || 'N/A'}. Please provide a quotation.`
    );
    window.open(`https://wa.me/8801700000000?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-['Inter',_'Hind_Siliguri',_sans-serif]">
      
      {/* Top Navbar */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => navigate('/')}>
            <img 
              src={lamsLogo} 
              alt="Lams Power" 
              className="h-9 sm:h-10 w-auto object-contain" 
            />
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tighter uppercase font-['Outfit']">
                Lams<span className="text-[#ea3838]">Power</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-black uppercase tracking-widest bg-red-50 text-[#ea3838] border border-red-100 px-2 py-0.5 rounded-md">
                Solar Calculator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language switch */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => handleLangChange('bn')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  lang === 'bn' ? 'bg-[#ea3838] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                বাংলা
              </button>
              <button
                onClick={() => handleLangChange('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  lang === 'en' ? 'bg-[#ea3838] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>

            {isLoggedIn ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-slate-900 hover:bg-[#ea3838] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <span>📊</span>
                <span>{t('back_to_dashboard')}</span>
              </button>
            ) : (
              <button 
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span>🏠</span>
                <span>{t('back_to_home')}</span>
              </button>
            )}

            <button 
              onClick={() => window.print()}
              title="Print Calculation Sheet"
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all hidden md:flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>{t('print_sheet')}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-slate-100/60 border-b border-slate-200/60 py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 border border-red-200 text-[#ea3838] text-xs font-black uppercase tracking-wider shadow-xs animate-pulse">
            <span>☀️</span>
            <span>সোলার সিস্টেম সাইজিং ইঞ্জিন</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight font-['Outfit']">
            সোলার লোড <span className="text-[#ea3838]">ক্যালকুলেটর</span>
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto">
            {t('subtitle')}
          </p>

          {/* Mode Selector Cards */}
          <div className="pt-3 max-w-2xl mx-auto">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              {t('hybrid_mode')}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { id: 'day', label: t('day'), icon: '☀️', desc: 'Day only' },
                { id: 'night', label: t('night'), icon: '🌙', desc: 'Night only' },
                { id: 'daynight', label: t('daynight'), icon: '🌓', desc: 'Day + Night' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 text-center group ${
                    mode === m.id
                      ? 'border-[#ea3838] bg-red-50/70 text-[#ea3838] shadow-md shadow-red-500/10 scale-[1.02]'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-650'
                  }`}
                >
                  <span className="text-xl sm:text-2xl">{m.icon}</span>
                  <span className="text-xs sm:text-sm font-black">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Appliance Input List & Settings (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* System Configuration Card (When night or daynight is active) */}
            {mode !== 'day' && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="text-lg">⚙️</span>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {t('system_settings')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Backup Hours Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">
                      {t('backup_hours_label')}
                    </label>
                    <div className="relative flex items-center">
                      <input 
                        type="number"
                        min="0.5"
                        step="0.5"
                        max="24"
                        value={backupHours}
                        onChange={(e) => setBackupHours(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#ea3838] focus:ring-2 focus:ring-red-100"
                      />
                      <span className="absolute right-3 text-xs font-bold text-slate-400">ঘণ্টা (Hours)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">{t('backup_hours_note')}</p>
                  </div>

                  {/* System Voltage */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 block">
                      {t('system_voltage')}
                    </label>
                    <select
                      value={systemVoltage}
                      onChange={(e) => setSystemVoltage(Number(e.target.value) || 24)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#ea3838] focus:ring-2 focus:ring-red-100 cursor-pointer"
                    >
                      <option value="12">12 Volt (DC System)</option>
                      <option value="24">24 Volt (Standard Hybrid)</option>
                      <option value="48">48 Volt (High Capacity)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 font-semibold">{t('system_voltage_note')}</p>
                  </div>

                </div>
              </div>
            )}

            {/* Appliances Table Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {t('appliances_title')}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {t('appliances_info')}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('total_load_label')}
                  </span>
                  <span className="text-lg font-black text-[#ea3838] font-['Outfit']">
                    {calculations.totalLoad} W
                  </span>
                </div>
              </div>

              {/* Header Columns */}
              <div className={`grid gap-2 text-[11px] font-black text-slate-400 uppercase tracking-wider px-2 py-1 bg-slate-50 rounded-xl ${
                mode === 'day' 
                  ? 'grid-cols-12' 
                  : mode === 'night' 
                  ? 'grid-cols-12' 
                  : 'grid-cols-12'
              }`}>
                <div className="col-span-5 sm:col-span-5">{t('col_appliance')}</div>
                <div className="col-span-3 sm:col-span-3 text-center">{t('col_load')}</div>
                {mode !== 'night' && <div className={mode === 'day' ? 'col-span-3 text-center' : 'col-span-2 text-center'}>{t('col_qty_day')}</div>}
                {mode !== 'day' && <div className={mode === 'night' ? 'col-span-3 text-center' : 'col-span-2 text-center'}>{t('col_qty_night')}</div>}
                <div className="col-span-1 text-right sm:pr-2"></div>
              </div>

              {/* Appliance Rows */}
              <div className="space-y-2.5">
                {appliances.length > 0 ? (
                  appliances.map((app) => (
                    <div 
                      key={app.id}
                      className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all space-y-2 group"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        
                        {/* Appliance Preset & Name Input */}
                        <div className="col-span-5 sm:col-span-5 flex flex-col sm:flex-row gap-1.5">
                          <select
                            value={app.presetKey || 'custom'}
                            onChange={(e) => handlePresetChange(app.id, e.target.value)}
                            className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#ea3838]"
                          >
                            {PRESETS.map((p) => (
                              <option key={p.key} value={p.key}>
                                {lang === 'bn' ? p.bn : p.en}
                              </option>
                            ))}
                          </select>

                          {app.presetKey === 'custom' && (
                            <input
                              type="text"
                              placeholder={t('custom_name_placeholder')}
                              value={app.name}
                              onChange={(e) => handleUpdateAppliance(app.id, 'name', e.target.value)}
                              className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#ea3838] flex-1"
                            />
                          )}
                        </div>

                        {/* Watt Input */}
                        <div className="col-span-3 sm:col-span-3">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={app.watt}
                              onChange={(e) => handleUpdateAppliance(app.id, 'watt', Math.max(0, Number(e.target.value) || 0))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-800 outline-none focus:border-[#ea3838]"
                            />
                            <span className="absolute right-2 text-[10px] text-slate-400 font-bold hidden sm:inline">W</span>
                          </div>
                        </div>

                        {/* Day Quantity */}
                        {mode !== 'night' && (
                          <div className={mode === 'day' ? 'col-span-3' : 'col-span-2'}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={app.qtyDay}
                              onChange={(e) => handleUpdateAppliance(app.id, 'qtyDay', e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-800 outline-none focus:border-[#ea3838]"
                            />
                          </div>
                        )}

                        {/* Night Quantity */}
                        {mode !== 'day' && (
                          <div className={mode === 'night' ? 'col-span-3' : 'col-span-2'}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={app.qtyNight}
                              onChange={(e) => handleUpdateAppliance(app.id, 'qtyNight', e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-800 outline-none focus:border-[#ea3838]"
                            />
                          </div>
                        )}

                        {/* Remove Button */}
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => handleRemoveAppliance(app.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-black"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>

                      </div>

                      {/* TV Note Helper */}
                      {app.presetKey === 'tv' && (
                        <div className="text-[11px] font-semibold text-slate-500 bg-amber-50/70 border-l-2 border-amber-400 px-3 py-1 rounded-r-lg">
                          💡 {lang === 'bn' ? PRESETS.find(p => p.key === 'tv').noteBn : PRESETS.find(p => p.key === 'tv').noteEn}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    {t('no_appliances')}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddAppliance}
                    className="px-4 py-2.5 bg-[#ea3838] hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    <span>➕</span>
                    <span>{t('add_appliance')}</span>
                  </button>

                  <button
                    onClick={handleClearAll}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    {t('clear_all')}
                  </button>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  <span>মোট আইটেম: <strong>{appliances.length}</strong> টি</span>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Calculations & Inverter Suggestions (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Primary Results Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
              
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#ea3838] to-red-600" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-3 pt-1">
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-['Outfit'] flex items-center gap-2">
                    <span>⚡</span>
                    <span>{t('results_title')}</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {t('spec_summary')}
                  </p>
                </div>

                <button
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1"
                >
                  {copied ? '✅ ' + t('copied') : '📋 ' + t('copy_summary')}
                </button>
              </div>

              {/* Load Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    {t('total_connected_load')}
                  </span>
                  <span className="text-xl font-black text-slate-900 font-['Outfit']">
                    {calculations.totalLoad} <span className="text-xs font-bold text-slate-500">W</span>
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    {t('solar_panel_required')}
                  </span>
                  <span className="text-xl font-black text-[#ea3838] font-['Outfit']">
                    {calculations.panelRequired} <span className="text-xs font-bold text-slate-500">W</span>
                  </span>
                </div>
              </div>

              {/* Day / Night Breakdown */}
              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 space-y-2.5 text-xs">
                {mode !== 'night' && (
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span>☀️</span> {t('day_load_label')}:
                    </span>
                    <span className="text-slate-900 font-black">{calculations.dayLoad} W</span>
                  </div>
                )}

                {mode !== 'day' && (
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span>🌙</span> {t('night_load_label')}:
                    </span>
                    <span className="text-slate-900 font-black">{calculations.nightLoad} W</span>
                  </div>
                )}
              </div>

              {/* Battery Requirements (Hidden in Day mode) */}
              {mode !== 'day' && (
                <div className="space-y-3">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                    🔋 প্রয়োজনীয় ব্যাটারি ক্যাপাসিটি ({systemVoltage}V)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
                        {t('battery_li')}
                      </span>
                      <p className="text-2xl font-black text-emerald-950 font-['Outfit']">
                        {calculations.battLiAh} <span className="text-xs font-bold text-emerald-700">Ah</span>
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
                      <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                        {t('battery_lead')}
                      </span>
                      <p className="text-2xl font-black text-amber-950 font-['Outfit']">
                        {calculations.battLeadAh} <span className="text-xs font-bold text-amber-700">Ah</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 🌟 INVERTER RECOMMENDATION SECTION WITH SPECIFIC MODEL */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-[#ea3838] border border-red-500/30 text-[10px] font-black uppercase tracking-wider">
                    <span>⚡</span>
                    <span>সুপারিশকৃত ইনভার্টার</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {calculations.suggestedInverter ? `${calculations.suggestedInverter.va} VA` : '0 VA'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('suggested_model')}
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                    {calculations.suggestedInverter ? calculations.suggestedInverter.model : 'কোনো লোড নেই'}
                  </h4>
                  {calculations.suggestedInverter && (
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      ব্র্যান্ড: <strong className="text-white">{calculations.suggestedInverter.brand}</strong> | ম্যাক্স লোড: <strong className="text-slate-200">{calculations.suggestedInverter.load}W</strong>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleWhatsAppShare}
                    className="w-full py-3 bg-[#ea3838] hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>💬</span>
                    <span>{t('whatsapp_share')}</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Inverter Capacity Reference Table */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                📊 ইনভার্টার ও সোলার প্যানেল সাইজিং গাইড চার্ট
              </h4>
              
              <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">VA Rating</th>
                      <th className="p-2.5">Max Panel</th>
                      <th className="p-2.5">প্রস্তাবিত মডেল</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {INVERTER_TABLE.map((inv) => {
                      const isSelected = calculations.suggestedInverter?.va === inv.va;
                      return (
                        <tr 
                          key={inv.va}
                          className={isSelected ? 'bg-red-50/80 font-black text-[#ea3838]' : 'hover:bg-slate-50'}
                        >
                          <td className="p-2.5">{inv.va} VA</td>
                          <td className="p-2.5">{inv.panel} W</td>
                          <td className="p-2.5">{inv.model}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 border-t border-slate-900 text-center text-xs mt-auto">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-bold text-slate-300">© {new Date().getFullYear()} Lams Power. All Rights Reserved.</p>
          <p className="text-[11px] text-slate-500">
            Developed by <a href="https://facebook.com/usama.muzaddid" target="_blank" rel="noopener noreferrer" className="text-[#ea3838] font-bold hover:underline">Usama Bin Hasan</a>
          </p>
        </div>
      </footer>

    </div>
  );
};

export default SolarCal;
