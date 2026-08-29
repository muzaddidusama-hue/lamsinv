import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import lamsLogo from '../assets/lams-logo.webp';
import { supabase } from '../supabaseClient';

// Inverter Table with specific Model Suggestions
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
  { key: 'tv', watt: 50, en: 'TV (32")', bn: 'টিভি (৩২")', noteEn: 'Standard size 32-inch estimated load', noteBn: '৩২ ইঞ্চি টিভি আনুমানিক লোড' },
  { key: 'custom', watt: 0, en: 'Custom Appliance', bn: 'কাস্টম যন্ত্রপাতি' }
];

const TRANSLATIONS = {
  en: {
    title: 'Solar Load Calculator',
    subtitle: 'Accurate sizing for Solar Panels, Inverters, and Batteries',
    appliances_title: 'Appliances',
    col_appliance: 'Appliance',
    col_load: 'Watt (W)',
    col_qty_day: 'Day Qty',
    col_qty_night: 'Night Qty',
    add_appliance: '+ Add Appliance',
    clear_all: 'Clear',
    total_load_label: 'Total Load:',
    system_settings: 'System Settings',
    backup_hours_label: 'Backup Hours (Off-grid)',
    backup_hours_note: 'Required battery backup in hours',
    system_voltage: 'System Voltage',
    system_voltage_note: 'Battery Ah based on system voltage',
    day: 'Daytime only',
    night: 'Night-only',
    daynight: 'Day + Night',
    results_title: 'Calculation Summary',
    day_load_label: 'Daytime Load',
    night_load_label: 'Nighttime Load',
    total_connected_load: 'Total Connected Load',
    solar_panel_required: 'Solar Panel Required',
    battery_li: 'Battery (Li-ion)',
    battery_lead: 'Battery (Lead-acid)',
    recommended_inverter: 'Recommended Inverter',
    suggested_model: 'Suggested Inverter Model',
    custom_name_placeholder: 'Appliance name',
    qty_placeholder: '0',
    no_appliances: 'No appliances added. Click "+ Add Appliance" to begin.',
    copy_summary: 'Copy',
    copied: 'Copied!',
    print_sheet: 'Print',
    back_to_home: 'Home',
    back_to_dashboard: 'Dashboard',
    whatsapp_share: 'Inquire on WhatsApp',
    spec_chart: 'Sizing Reference Chart'
  },
  bn: {
    title: 'সোলার লোড ক্যালকুলেটর',
    subtitle: 'সোলার প্যানেল, ইনভার্টার মডেল এবং ব্যাটারি সাইজিংয়ের সহজ সমাধান',
    appliances_title: 'যন্ত্রপাতির তালিকা',
    col_appliance: 'যন্ত্রপাতি',
    col_load: 'ওয়াট (W)',
    col_qty_day: 'দিনের সংখ্যা',
    col_qty_night: 'রাতের সংখ্যা',
    add_appliance: '+ যোগ করুন',
    clear_all: 'মুছুন',
    total_load_label: 'মোট লোড:',
    system_settings: 'সিস্টেম সেটিংস',
    backup_hours_label: 'ব্যাকআপ সময় (ঘন্টা)',
    backup_hours_note: 'কত ঘন্টা ব্যাটারি ব্যাকআপ চান',
    system_voltage: 'সিস্টেম ভোল্টেজ',
    system_voltage_note: 'নির্বাচিত ভোল্টেজের ভিত্তিতে ব্যাটারি Ah',
    day: 'শুধুমাত্র দিনে',
    night: 'শুধুমাত্র রাতে',
    daynight: 'দিন + রাত',
    results_title: 'ক্যালকুলেশন ফলাফল',
    day_load_label: 'দিনের লোড',
    night_load_label: 'রাতের লোড',
    total_connected_load: 'মোট সংযুক্ত লোড',
    solar_panel_required: 'সোলার প্যানেল প্রয়োজন',
    battery_li: 'ব্যাটারি (লিথিয়াম-আয়ন)',
    battery_lead: 'ব্যাটারি (লিড-অ্যাসিড)',
    recommended_inverter: 'প্রস্তাবিত ইনভার্টার',
    suggested_model: 'প্রস্তাবিত ইনভার্টার মডেল',
    custom_name_placeholder: 'যন্ত্রপাতির নাম',
    qty_placeholder: '০',
    no_appliances: 'কোনো যন্ত্রপাতি নেই। "+ যোগ করুন" এ চাপুন।',
    copy_summary: 'কপি',
    copied: 'কপি হয়েছে!',
    print_sheet: 'প্রিন্ট',
    back_to_home: 'হোম',
    back_to_dashboard: 'ড্যাশবোর্ড',
    whatsapp_share: 'হোয়াটসঅ্যাপে ইনকোয়ারি',
    spec_chart: 'ইনভার্টার সাইজিং চার্ট'
  }
};

const SolarCal = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState('bn');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // Core Calculator States
  const [mode, setMode] = useState('daynight'); // 'day' | 'night' | 'daynight'
  const [backupHours, setBackupHours] = useState(4);
  const [systemVoltage, setSystemVoltage] = useState(24);
  
  const [appliances, setAppliances] = useState([
    { id: 1, presetKey: 'light', name: 'লাইট', watt: 20, qtyDay: 1, qtyNight: 1 },
    { id: 2, presetKey: 'fan', name: 'ফ্যান', watt: 100, qtyDay: 1, qtyNight: 1 },
    { id: 3, presetKey: 'tv', name: 'টিভি (৩২")', watt: 50, qtyDay: 1, qtyNight: 1 },
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

  const handleAddAppliance = () => {
    const newId = Date.now();
    setAppliances(prev => [
      ...prev,
      { id: newId, presetKey: 'custom', name: '', watt: 0, qtyDay: 1, qtyNight: 0 }
    ]);
  };

  const handleRemoveAppliance = (id) => {
    setAppliances(prev => prev.filter(a => a.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm(lang === 'bn' ? 'সব যন্ত্রপাতি মুছে ফেলতে চান?' : 'Clear all appliances?')) {
      setAppliances([]);
    }
  };

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

  const handleUpdateAppliance = (id, field, value) => {
    setAppliances(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  // ----------------------------------------------------
  // CALCULATION LOGIC
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

  const handleCopySummary = () => {
    const text = `☀️ LAMS POWER SOLAR LOAD ESTIMATE (${mode.toUpperCase()})
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 মোট লোড: ${calculations.totalLoad} W (দিন: ${calculations.dayLoad}W, রাত: ${calculations.nightLoad}W)
🔹 ব্যাকআপ: ${backupHours} ঘণ্টা (${systemVoltage}V)
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ সোলার প্যানেল: ${calculations.panelRequired} W
🔋 ব্যাটারি (Li-ion): ${calculations.battLiAh} Ah | (Lead-acid): ${calculations.battLeadAh} Ah
🔌 প্রস্তাবিত ইনভার্টার: ${calculations.suggestedInverter ? `${calculations.suggestedInverter.va} VA (${calculations.suggestedInverter.model})` : '0 VA'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 www.lamspower.pro.bd`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hello Lams Power, my required solar panel is ${calculations.panelRequired}W and suggested inverter is ${calculations.suggestedInverter?.model || 'N/A'}. Please share a quotation.`
    );
    window.open(`https://wa.me/8801700000000?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-800 flex flex-col font-['Inter',_'Hind_Siliguri',_sans-serif]">
      
      {/* Minimal Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => navigate('/')}>
            <img src={lamsLogo} alt="Lams Power" className="h-8 w-auto object-contain" />
            <span className="text-base font-black text-slate-900 tracking-tight uppercase font-['Outfit']">
              Lams<span className="text-[#ea3838]">Power</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Clean Language Segmented Switch */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => handleLangChange('bn')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  lang === 'bn' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                বাংলা
              </button>
              <button
                onClick={() => handleLangChange('en')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  lang === 'en' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>

            {isLoggedIn ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 bg-slate-900 hover:bg-[#ea3838] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              >
                <span>📊</span>
                <span>{t('back_to_dashboard')}</span>
              </button>
            ) : (
              <button 
                onClick={() => navigate('/')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
              >
                <span>🏠</span>
                <span>{t('back_to_home')}</span>
              </button>
            )}

            <button 
              onClick={() => window.print()}
              title="Print"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all hidden sm:flex"
            >
              🖨️
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Title & Mode Switcher Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>☀️</span>
              <span>{t('title')}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {t('subtitle')}
            </p>
          </div>

          {/* Minimalist Segmented Mode Selector */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl gap-1 text-xs font-bold self-start sm:self-auto">
            {[
              { id: 'day', label: t('day'), icon: '☀️' },
              { id: 'night', label: t('night'), icon: '🌙' },
              { id: 'daynight', label: t('daynight'), icon: '🌓' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  mode === m.id
                    ? 'bg-white text-[#ea3838] shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Workspace 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Appliances & Settings (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* System Settings (Clean inline row when night or daynight is selected) */}
            {mode !== 'day' && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-4 animate-in fade-in duration-200 text-xs">
                
                {/* Backup Hours */}
                <div className="flex-1 space-y-1">
                  <label className="font-bold text-slate-600 block">
                    ⏱️ {t('backup_hours_label')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="0.5"
                      step="0.5"
                      max="24"
                      value={backupHours}
                      onChange={(e) => setBackupHours(Math.max(0, Number(e.target.value) || 0))}
                      className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-[#ea3838]"
                    />
                    <span className="text-slate-400 font-semibold">{lang === 'bn' ? 'ঘণ্টা' : 'Hours'}</span>
                  </div>
                </div>

                {/* System Voltage */}
                <div className="flex-1 space-y-1">
                  <label className="font-bold text-slate-600 block">
                    ⚡ {t('system_voltage')}
                  </label>
                  <select
                    value={systemVoltage}
                    onChange={(e) => setSystemVoltage(Number(e.target.value) || 24)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-[#ea3838] cursor-pointer"
                  >
                    <option value="12">12 Volt</option>
                    <option value="24">24 Volt (Standard)</option>
                    <option value="48">48 Volt</option>
                  </select>
                </div>

              </div>
            )}

            {/* Appliances Box */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-slate-800">{t('appliances_title')}</span>
                  <span className="text-[11px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold">
                    {appliances.length}
                  </span>
                </div>

                <div className="text-xs">
                  <span className="text-slate-400 font-semibold">{t('total_load_label')}</span>
                  <strong className="text-slate-900 ml-1 font-['Outfit'] text-sm">{calculations.totalLoad}W</strong>
                </div>
              </div>

              {/* Table Column Headers */}
              <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider px-4 py-2 border-b border-slate-100 bg-slate-50/30">
                <div className="col-span-5 sm:col-span-5">{t('col_appliance')}</div>
                <div className="col-span-3 sm:col-span-3 text-center">{t('col_load')}</div>
                {mode !== 'night' && <div className={mode === 'day' ? 'col-span-3 text-center' : 'col-span-2 text-center'}>{t('col_qty_day')}</div>}
                {mode !== 'day' && <div className={mode === 'night' ? 'col-span-3 text-center' : 'col-span-2 text-center'}>{t('col_qty_night')}</div>}
                <div className="col-span-1"></div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100 text-xs">
                {appliances.length > 0 ? (
                  appliances.map((app) => (
                    <div key={app.id} className="p-3 hover:bg-slate-50/60 transition-colors">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        
                        {/* Appliance Preset / Name */}
                        <div className="col-span-5 sm:col-span-5 flex flex-col sm:flex-row gap-1">
                          <select
                            value={app.presetKey || 'custom'}
                            onChange={(e) => handlePresetChange(app.id, e.target.value)}
                            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#ea3838]"
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
                              className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#ea3838] flex-1"
                            />
                          )}
                        </div>

                        {/* Wattage */}
                        <div className="col-span-3 sm:col-span-3">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={app.watt}
                            onChange={(e) => handleUpdateAppliance(app.id, 'watt', Math.max(0, Number(e.target.value) || 0))}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 outline-none focus:border-[#ea3838]"
                          />
                        </div>

                        {/* Day Qty */}
                        {mode !== 'night' && (
                          <div className={mode === 'day' ? 'col-span-3' : 'col-span-2'}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={app.qtyDay}
                              onChange={(e) => handleUpdateAppliance(app.id, 'qtyDay', e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 outline-none focus:border-[#ea3838]"
                            />
                          </div>
                        )}

                        {/* Night Qty */}
                        {mode !== 'day' && (
                          <div className={mode === 'night' ? 'col-span-3' : 'col-span-2'}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={app.qtyNight}
                              onChange={(e) => handleUpdateAppliance(app.id, 'qtyNight', e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 outline-none focus:border-[#ea3838]"
                            />
                          </div>
                        )}

                        {/* Delete Button */}
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => handleRemoveAppliance(app.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>

                      </div>

                      {/* TV Note Helper */}
                      {app.presetKey === 'tv' && (
                        <p className="text-[10px] text-slate-400 font-medium mt-1 pl-1">
                          ℹ️ {lang === 'bn' ? PRESETS.find(p => p.key === 'tv').noteBn : PRESETS.find(p => p.key === 'tv').noteEn}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs italic">
                    {t('no_appliances')}
                  </div>
                )}
              </div>

              {/* Bottom Row Actions */}
              <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
                <button
                  onClick={handleAddAppliance}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-[#ea3838] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                >
                  <span>{t('add_appliance')}</span>
                </button>

                {appliances.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-slate-400 hover:text-red-600 font-semibold"
                  >
                    {t('clear_all')}
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* Right Column: Minimal Results & Inverter Suggestion (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Primary Calculation Summary Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {t('results_title')}
                </h3>

                <button
                  onClick={handleCopySummary}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
                >
                  {copied ? '✅ ' + t('copied') : '📋 ' + t('copy_summary')}
                </button>
              </div>

              {/* 2 Main Metrics: Total Load & Panel Required */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('total_connected_load')}
                  </span>
                  <p className="text-xl font-black text-slate-900 font-['Outfit'] mt-0.5">
                    {calculations.totalLoad} <span className="text-xs font-normal text-slate-500">W</span>
                  </p>
                </div>

                <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                    {t('solar_panel_required')}
                  </span>
                  <p className="text-xl font-black text-[#ea3838] font-['Outfit'] mt-0.5">
                    {calculations.panelRequired} <span className="text-xs font-normal text-red-500">W</span>
                  </p>
                </div>
              </div>

              {/* Day / Night Breakdown */}
              <div className="space-y-1.5 text-xs font-semibold text-slate-600 pt-1 border-t border-slate-100">
                {mode !== 'night' && (
                  <div className="flex justify-between">
                    <span>☀️ {t('day_load_label')}:</span>
                    <strong className="text-slate-900">{calculations.dayLoad} W</strong>
                  </div>
                )}
                {mode !== 'day' && (
                  <div className="flex justify-between">
                    <span>🌙 {t('night_load_label')}:</span>
                    <strong className="text-slate-900">{calculations.nightLoad} W</strong>
                  </div>
                )}
              </div>

              {/* Battery Ah Requirements (Only when Night/Daynight mode) */}
              {mode !== 'day' && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    🔋 ব্যাটারি ব্যাকআপ ({systemVoltage}V)
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-700 block">{t('battery_li')}</span>
                      <strong className="text-base font-black text-emerald-950 font-['Outfit']">{calculations.battLiAh} Ah</strong>
                    </div>

                    <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-700 block">{t('battery_lead')}</span>
                      <strong className="text-base font-black text-amber-950 font-['Outfit']">{calculations.battLeadAh} Ah</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Inverter Suggestion Box */}
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>{t('recommended_inverter')}</span>
                  <span>{calculations.suggestedInverter ? `${calculations.suggestedInverter.va} VA` : '0 VA'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-red-400 font-semibold block uppercase">
                    {t('suggested_model')}
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-white">
                    {calculations.suggestedInverter ? calculations.suggestedInverter.model : '—'}
                  </h4>
                </div>

                <button
                  onClick={handleWhatsAppShare}
                  className="w-full py-2 bg-[#ea3838] hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 pt-1 mt-1"
                >
                  <span>💬</span>
                  <span>{t('whatsapp_share')}</span>
                </button>
              </div>

            </div>

            {/* Inverter Sizing Guide Accordion / Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <button 
                onClick={() => setShowChart(!showChart)}
                className="w-full p-3 text-xs font-bold text-slate-700 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span>📊 {t('spec_chart')}</span>
                <span className="text-slate-400">{showChart ? '▲' : '▼'}</span>
              </button>

              {showChart && (
                <div className="border-t border-slate-100 p-2 max-h-52 overflow-y-auto custom-scrollbar text-xs">
                  <table className="w-full text-left">
                    <thead className="text-[10px] text-slate-400 uppercase font-black bg-slate-50">
                      <tr>
                        <th className="p-2">VA</th>
                        <th className="p-2">Max Panel</th>
                        <th className="p-2">Suggested Model</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {INVERTER_TABLE.map((inv) => {
                        const isMatch = calculations.suggestedInverter?.va === inv.va;
                        return (
                          <tr key={inv.va} className={isMatch ? 'bg-red-50 font-bold text-[#ea3838]' : ''}>
                            <td className="p-2">{inv.va} VA</td>
                            <td className="p-2">{inv.panel} W</td>
                            <td className="p-2">{inv.model}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="bg-white border-t border-slate-200/60 py-6 text-center text-xs text-slate-400 mt-auto">
        <p className="font-semibold text-slate-500">© {new Date().getFullYear()} Lams Power. All Rights Reserved.</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Developed by <a href="https://facebook.com/usama.muzaddid" target="_blank" rel="noopener noreferrer" className="text-[#ea3838] font-bold hover:underline">Usama Bin Hasan</a>
        </p>
      </footer>

    </div>
  );
};

export default SolarCal;
