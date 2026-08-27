import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import lamsLogo from '../assets/lams-logo.webp';
import { supabase } from '../supabaseClient';

export const INVERTER_ERRORS = [
  {
    code: 'E16',
    searchKeys: ['e16', 'remote off', 'রিমোট', 'অ্যাপ', 'command', 'remote'],
    name: 'Remote Off',
    category: 'system',
    severity: 'info', // 'info' | 'warning' | 'danger' | 'reserved'
    cause: 'ইনভার্টারে রিমোট কন্ট্রোল, ডাটা লগার বা অ্যাপ থেকে কমান্ড দিয়ে বন্ধ করে রাখা হয়েছে।',
    solution: 'অ্যাপ বা ওয়েব পোর্টাল থেকে কমান্ড চেক করে ইনভার্টারটি অন করুন।',
    urgency: 'স্বাভাবিক (Normal)',
    icon: '📱'
  },
  {
    code: 'E17',
    searchKeys: ['e17', 'reserved', 'রিজার্ভড'],
    name: 'Reserved',
    category: 'reserved',
    severity: 'reserved',
    cause: '(ম্যানুফ্যাকচারারদের ইন্টারনাল কাজের জন্য রাখা)',
    solution: 'প্রযোজ্য নয়।',
    urgency: 'প্রযোজ্য নয়',
    icon: '🔒'
  },
  {
    code: 'E18',
    searchKeys: ['e18', 'spi error', 'spi', 'dsp', 'mcu', 'চিপ', 'কমিউনিকেশন', 'communication'],
    name: 'SPI Error',
    category: 'communication',
    severity: 'warning',
    cause: 'ইনভার্টারের ইন্টারনাল চিপ (DSP এবং MCU) এর মাঝে ডেটা ট্রান্সফার বা কমিউনিকেশন ফেইল করেছে।',
    solution: 'ডিসি সুইচ অফ করে পুরোপুরি রিস্টার্ট দিন। ঠিক না হলে কন্ট্রোল বোর্ড রিপেয়ার করতে হবে।',
    urgency: 'জরুরি রিস্টার্ট প্রয়োজন',
    icon: '⚡'
  },
  {
    code: 'E19',
    searchKeys: ['e19', 'reserved', 'রিজার্ভড'],
    name: 'Reserved',
    category: 'reserved',
    severity: 'reserved',
    cause: '(ম্যানুফ্যাকচারারদের ইন্টারনাল কাজের জন্য রাখা)',
    solution: 'প্রযোজ্য নয়।',
    urgency: 'প্রযোজ্য নয়',
    icon: '🔒'
  },
  {
    code: 'E20',
    searchKeys: ['e20', 'gfci high', 'gfci', 'গ্রাউন্ড ফল্ট', 'আর্থিং', 'লিকেজ', 'leakage', 'ground fault'],
    name: 'GFCI High',
    category: 'danger',
    severity: 'danger',
    cause: 'গ্রাউন্ড ফল্ট। সিস্টেমে লিকেজ কারেন্টের পরিমাণ অনেক বেড়ে গেছে (মানুষের শক খাওয়ার ঝুঁকি থাকে)।',
    solution: 'ইনভার্টারের এসি এবং ডিসি আর্থিং সঠিকভাবে করা হয়েছে কি না চেক করুন। তার কোনো স্থানে লিকেজ বা শর্ট আছে কি না পরীক্ষা করুন।',
    urgency: 'উচ্চ ঝুঁকি (Shock Hazard)',
    icon: '⚠️'
  },
  {
    code: 'E21',
    searchKeys: ['e21', 'gfci chk error', 'gfci check', 'gfci chk', 'সেন্সর', 'sensor'],
    name: 'GFCI Chk Error',
    category: 'sensor',
    severity: 'warning',
    cause: 'জিএফসিআই (GFCI) সেন্সর নিজেই নিজের ইন্টারনাল টেস্টে ফেইল করেছে।',
    solution: 'এটি সেন্সর বা বোর্ডের সমস্যা। ম্যানুফ্যাকচারারের সাথে যোগাযোগ করুন।',
    urgency: 'টেকনিক্যাল সার্ভিস প্রয়োজন',
    icon: '🔍'
  },
  {
    code: 'E22',
    searchKeys: ['e22', 'vol not same', 'ভোল্টেজ', 'voltage', 'সেফটি সেন্সর', 'sensor'],
    name: 'Vol Not Same',
    category: 'sensor',
    severity: 'warning',
    cause: 'ভেতরের দুইটা আলাদা সেফটি সেন্সরের মাপা এসি ভোল্টেজের রিডিং মিলছে না।',
    solution: 'ইনভার্টার রিস্টার্ট করুন। বারবার হলে সেন্সর ফল্ট, সার্ভিসিং প্রয়োজন।',
    urgency: 'রিস্টার্ট ও পর্যবেক্ষণ',
    icon: '⚖️'
  },
  {
    code: 'E23',
    searchKeys: ['e23', 'curr not same', 'কারেন্ট', 'current', 'সেফটি সেন্সর', 'sensor'],
    name: 'Curr Not Same',
    category: 'sensor',
    severity: 'warning',
    cause: 'ভেতরের দুইটা আলাদা সেফটি সেন্সরের মাপা কারেন্টের রিডিং মিলছে না।',
    solution: 'ইনভার্টার রিস্টার্ট করুন। বারবার হলে সেন্সর ফল্ট, সেন্সর রিপ্লেস করতে হবে।',
    urgency: 'রিস্টার্ট ও পর্যবেক্ষণ',
    icon: '⚖️'
  },
  {
    code: 'E24-E25',
    searchKeys: ['e24', 'e25', 'e24-e25', 'reserved', 'রিজার্ভড'],
    name: 'Reserved',
    category: 'reserved',
    severity: 'reserved',
    cause: '(ম্যানুফ্যাকচারারদের ইন্টারনাল কাজের জন্য রাখা)',
    solution: 'প্রযোজ্য নয়।',
    urgency: 'প্রযোজ্য নয়',
    icon: '🔒'
  },
  {
    code: 'E26',
    searchKeys: ['e26', 'soft start err', 'soft start', 'ক্যাপাসিটর', 'প্রি-চার্জ', 'capacitor', 'pre charge'],
    name: 'Soft Start Err',
    category: 'power',
    severity: 'warning',
    cause: 'ইনভার্টার চালু হওয়ার সময় ভেতরের ক্যাপাসিটরগুলো সেফলি প্রি-চার্জ হতে পারেনি।',
    solution: 'ডিসি ইনপুট ভোল্টেজ স্ট্যাবল আছে কি না চেক করুন এবং রিস্টার্ট দিন।',
    urgency: 'ভোল্টেজ চেক প্রয়োজন',
    icon: '🔌'
  },
  {
    code: 'E27',
    searchKeys: ['e27', 'pv voltage high', 'pv voltage', 'সোলার প্যানেল', 'ভোল্টেজ হাই', 'overvoltage', 'high voltage'],
    name: 'PV Voltage High',
    category: 'danger',
    severity: 'danger',
    cause: 'সোলার প্যানেলের স্ট্রিং ভোল্টেজ ইনভার্টারের ম্যাক্সিমাম ডিসি লিমিট ক্রস করেছে। (খুবই বিপজ্জনক, ইনভার্টার ব্লাস্ট হতে পারে)।',
    solution: 'দ্রুত ডিসি সুইচ অফ করুন! সিরিজে প্যানেল সংখ্যা কমিয়ে ভোল্টেজ লিমিটের মধ্যে আনুন।',
    urgency: 'মারাত্মক বিপজ্জনক (Immediate Action Required)',
    icon: '🚨'
  },
  {
    code: 'E28-E31',
    searchKeys: ['e28', 'e29', 'e30', 'e31', 'e28-e31', 'reserved', 'রিজার্ভড'],
    name: 'Reserved',
    category: 'reserved',
    severity: 'reserved',
    cause: '(ম্যানুফ্যাকচারারদের ইন্টারনাল কাজের জন্য রাখা)',
    solution: 'প্রযোজ্য নয়।',
    urgency: 'প্রযোজ্য নয়',
    icon: '🔒'
  },
  {
    code: 'E32',
    searchKeys: ['e32', 'dsp comm error', 'dsp comm', 'dsp', 'মেইন বোর্ড', 'মাদারবোর্ড', 'motherboard'],
    name: 'DSP Comm Error',
    category: 'hardware',
    severity: 'warning',
    cause: 'ডিজিটাল সিগন্যাল প্রসেসর (DSP) এবং মেইন বোর্ডের মধ্যে কমিউনিকেশন পুরোপুরি লস হয়েছে।',
    solution: 'ডিসি সুইচ অফ করে রিস্টার্ট দিন। ঠিক না হলে মাদারবোর্ডে বড় ধরনের সমস্যা হয়েছে বুঝতে হবে।',
    urgency: 'মাদারবোর্ড সার্ভিসিং',
    icon: '💻'
  }
];

const InverterErrorCodes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || searchParams.get('code') || '';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedModalError, setSelectedModalError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
      }
    });
    document.title = 'ইনভার্টার এরর কোড গাইড - Lams Power';
  }, []);

  // Sync state if URL param changes
  useEffect(() => {
    if (queryParam !== searchQuery) {
      setSearchQuery(queryParam);
    }
  }, [queryParam]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      setSearchParams({ q: val.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleQuickCodeSelect = (code) => {
    const cleanCode = code.startsWith('E') ? code : `E${code}`;
    setSearchQuery(cleanCode);
    setSearchParams({ q: cleanCode });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
    setSelectedCategory('all');
  };

  // Filtered logic
  const filteredErrors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    
    return INVERTER_ERRORS.filter(item => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      if (!q) return true;

      // Match code exactly or partially (e.g. "e16", "16", "e24", "e27")
      const matchesCode = item.code.toLowerCase().includes(q) || 
                          item.searchKeys.some(key => key.includes(q));
      
      const matchesName = item.name.toLowerCase().includes(q);
      const matchesCause = item.cause.toLowerCase().includes(q);
      const matchesSolution = item.solution.toLowerCase().includes(q);

      return matchesCode || matchesName || matchesCause || matchesSolution;
    });
  }, [searchQuery, selectedCategory]);

  const hasSearch = searchQuery.trim().length > 0;

  const copyToClipboard = (errorItem) => {
    const text = `⚠️ LAMS POWER INVERTER ERROR INFO
কোড: ${errorItem.code} (${errorItem.name})
কারন: ${errorItem.cause}
সমাধান ও করনীয়: ${errorItem.solution}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(errorItem.code);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'danger':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            বিপজ্জনক (Critical)
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            সতর্কতা (Warning)
          </span>
        );
      case 'reserved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
            🔒 সিস্টেম রিজার্ভড
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
            ℹ️ নোটিশ (Status)
          </span>
        );
    }
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
              <span className="hidden sm:inline-block ml-2 text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                Error Guide
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-slate-900 hover:bg-[#ea3838] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <span>📊</span>
                <span>ড্যাশবোর্ডে ফিরে যান</span>
              </button>
            ) : (
              <button 
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span>🏠</span>
                <span>হোমপেজ</span>
              </button>
            )}

            <button 
              onClick={() => window.print()}
              title="Print Error Reference Sheet"
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all hidden md:flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>প্রিন্ট গাইড</span>
            </button>
          </div>

        </div>
      </header>

      {/* Hero & Search Banner */}
      <section className="bg-gradient-to-b from-white to-slate-100/60 border-b border-slate-200/60 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[#ea3838] text-xs font-bold uppercase tracking-wider">
            <span>⚡</span>
            <span>ইনভার্টার ট্রাবলশুটিং ও এরর গাইডলাইন</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            ইনভার্টার এরর কোড <span className="text-[#ea3838]">সমাধান পোর্টাল</span>
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto">
            আপনার ইনভার্টারের ডিসপ্লেতে প্রদর্শিত এরর কোডটি (যেমন: E16, E20, E27 ইত্যাদি) সার্চ করুন। কারণ এবং দ্রুত সমাধান জেনে নিন।
          </p>

          {/* Interactive Search Bar */}
          <div className="pt-3 max-w-2xl mx-auto">
            <div className="relative flex items-center shadow-lg shadow-slate-200/50 rounded-2xl bg-white border-2 border-slate-200 focus-within:border-[#ea3838] focus-within:ring-4 focus-within:ring-red-100 transition-all">
              <span className="pl-4 pr-2 text-slate-400 text-lg">🔍</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="এরর কোড বা কীওয়ার্ড লিখুন (যেমন: E16, E27, GFCI, ভোল্টেজ)..."
                className="w-full py-3.5 sm:py-4 px-2 text-sm sm:text-base font-bold text-slate-800 outline-none bg-transparent placeholder-slate-400"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={handleClearSearch}
                  className="mr-3 px-2 py-1 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  ✕ রিসেট
                </button>
              )}
            </div>

            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">জনপ্রিয় সার্চ:</span>
              {['E16', 'E18', 'E20', 'E21', 'E22', 'E23', 'E26', 'E27', 'E32'].map(code => (
                <button
                  key={code}
                  onClick={() => handleQuickCodeSelect(code)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all border ${
                    searchQuery.toUpperCase() === code
                      ? 'bg-[#ea3838] text-white border-[#ea3838] shadow-sm'
                      : 'bg-white text-slate-650 hover:bg-red-50 hover:text-[#ea3838] border-slate-200'
                  }`}
                >
                  {code}
                </button>
              ))}
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="text-xs px-2.5 py-1 rounded-lg font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all border border-slate-300"
                >
                  📋 সবগুলো দেখুন
                </button>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Filter and Count Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>{hasSearch ? '🔍 সার্চ ফলাফল' : '📋 ইনভার্টার এরর কোড তালিকা'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                {filteredErrors.length} টি আইটেম
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {hasSearch 
                ? `"${searchQuery}" এর জন্য বিস্তারিত সমাধান ও বিবরণ নিচে প্রদর্শিত হচ্ছে`
                : 'সকল সোলার ইনভার্টার এরর কোড ও টেকনিক্যাল ট্রাবলশুটিং নির্দেশনা'}
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'সবগুলো' },
              { id: 'danger', label: '⚠️ বিপদজনক' },
              { id: 'sensor', label: '🔍 সেন্সর ফল্ট' },
              { id: 'communication', label: '⚡ কমিউনিকেশন' },
              { id: 'reserved', label: '🔒 রিজার্ভড' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. WHEN SEARCHING: SHOW DETAILED ERROR BREAKDOWN CARDS */}
        {hasSearch && (
          <div className="space-y-6">
            {filteredErrors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredErrors.map((item) => (
                  <div 
                    key={item.code} 
                    className={`bg-white rounded-3xl border-2 p-6 sm:p-7 shadow-xl transition-all relative overflow-hidden flex flex-col justify-between ${
                      item.severity === 'danger' 
                        ? 'border-red-300 shadow-red-500/5' 
                        : item.severity === 'warning'
                        ? 'border-amber-200 shadow-amber-500/5'
                        : 'border-slate-200 shadow-slate-200/50'
                    }`}
                  >
                    {/* Top Severity accent bar */}
                    <div className={`absolute top-0 left-0 right-0 h-2 ${
                      item.severity === 'danger' 
                        ? 'bg-red-500' 
                        : item.severity === 'warning'
                        ? 'bg-amber-500'
                        : item.severity === 'reserved'
                        ? 'bg-slate-300'
                        : 'bg-blue-500'
                    }`} />

                    <div className="space-y-4">
                      
                      {/* Card Header: Code, Name, Severity */}
                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{item.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-['Outfit']">
                                {item.code}
                              </span>
                              {getSeverityBadge(item.severity)}
                            </div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                              {item.name}
                            </h3>
                          </div>
                        </div>

                        <button 
                          onClick={() => copyToClipboard(item)}
                          className="p-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1"
                          title="Copy details"
                        >
                          {copiedCode === item.code ? '✅ কপি হয়েছে!' : '📋 কপি'}
                        </button>
                      </div>

                      {/* Problem / Cause Section */}
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-1.5">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>❓</span>
                          <span>সমস্যার কারণ (Cause)</span>
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                          {item.cause}
                        </p>
                      </div>

                      {/* Solution / Action Section */}
                      <div className={`rounded-2xl p-4 border space-y-1.5 ${
                        item.severity === 'danger'
                          ? 'bg-red-50/70 border-red-200 text-red-950'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      }`}>
                        <p className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          item.severity === 'danger' ? 'text-red-600' : 'text-emerald-700'
                        }`}>
                          <span>🛠️</span>
                          <span>করণীয় ও সমাধান (Solution & Action)</span>
                        </p>
                        <p className="text-xs sm:text-sm font-bold leading-relaxed">
                          {item.solution}
                        </p>
                      </div>

                    </div>

                    {/* Footer Urgency & Modal Open */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-slate-400">
                        লেভেল: <span className="text-slate-700 font-extrabold">{item.urgency}</span>
                      </span>
                      
                      <button 
                        onClick={() => setSelectedModalError(item)}
                        className="text-[#ea3838] hover:text-red-700 font-extrabold flex items-center gap-1 hover:underline"
                      >
                        পূর্ণাঙ্গ তথ্য ➔
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              /* No search results found state (e.g. searching E00) */
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-5 shadow-sm max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-red-50 text-[#ea3838] flex items-center justify-center text-3xl mx-auto">
                  🔍
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800">
                    কোনো এরর তথ্য পাওয়া যায়নি
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    "<span className="font-bold text-slate-800">{searchQuery}</span>" কোড বা বিবরণটি পাওয়া যায়নি। সঠিক কোড (যেমন: E16, E20, E27) লিখুন অথবা নিচের বোতামে ক্লিক করে সম্পূর্ণ তালিকা দেখুন।
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button 
                    onClick={handleClearSearch}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-[#ea3838] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    সম্পূর্ণ তালিকা রিসেট করুন
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. COMPLETE REFERENCE: SHOW FULL STRUCTURED TABLE */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-base font-black text-slate-800">
                {hasSearch ? 'সারসংক্ষেপ টেবিল ভিউ' : 'সম্পূর্ণ ইনভার্টার এরর কোড তালিকা'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                যেকোনো সারিতে ক্লিক করে বিস্তারিত সমাধান ও নির্দেশনা দেখতে পারেন
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                সর্বমোট: {filteredErrors.length} টি এরর কোড
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-4 sm:px-6 w-24">এরর কোড</th>
                  <th className="py-4 px-4 sm:px-6 w-44">এররের নাম</th>
                  <th className="py-4 px-4 sm:px-6">সমস্যার কারণ ও বিবরণ</th>
                  <th className="py-4 px-4 sm:px-6">সমাধান ও করণীয় পদক্ষেপ</th>
                  <th className="py-4 px-4 sm:px-6 text-center w-28">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredErrors.length > 0 ? (
                  filteredErrors.map((item) => (
                    <tr 
                      key={item.code}
                      onClick={() => setSelectedModalError(item)}
                      className={`hover:bg-red-50/40 cursor-pointer transition-colors group ${
                        item.severity === 'danger' ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Code Column */}
                      <td className="py-4 px-4 sm:px-6 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-base font-['Outfit'] group-hover:text-[#ea3838] transition-colors">
                            {item.code}
                          </span>
                        </div>
                      </td>

                      {/* Name Column */}
                      <td className="py-4 px-4 sm:px-6 align-top font-bold text-slate-700">
                        <div className="space-y-1">
                          <div className="text-slate-900 font-black">{item.name}</div>
                          <div>{getSeverityBadge(item.severity)}</div>
                        </div>
                      </td>

                      {/* Cause Column */}
                      <td className="py-4 px-4 sm:px-6 align-top text-slate-650 font-semibold leading-relaxed">
                        {item.cause}
                      </td>

                      {/* Solution Column */}
                      <td className="py-4 px-4 sm:px-6 align-top font-bold text-slate-900 leading-relaxed">
                        <div className={`p-2.5 rounded-xl border ${
                          item.severity === 'danger'
                            ? 'bg-red-50 text-red-900 border-red-100'
                            : item.severity === 'reserved'
                            ? 'bg-slate-50 text-slate-500 border-slate-100 font-normal'
                            : 'bg-emerald-50 text-emerald-950 border-emerald-100'
                        }`}>
                          {item.solution}
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="py-4 px-4 sm:px-6 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => setSelectedModalError(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-[#ea3838] hover:text-white text-slate-700 text-xs font-bold transition-all shadow-xs"
                            title="বিস্তারিত দেখুন"
                          >
                            বিস্তারিত
                          </button>
                          <button 
                            onClick={() => copyToClipboard(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="কপি করুন"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400 italic">
                      কোনো ফলাফল পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Helper */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span className="font-semibold">
              💡 কোনো এরর কোড বুঝতে সমস্যা হলে সাথে সাথে ডিসি সুইচ অফ করুন এবং সার্ভিস সেন্টারে যোগাযোগ করুন।
            </span>
            <span className="text-[11px] text-slate-400 font-bold">
              LAMS Power Technical Support
            </span>
          </div>

        </div>

      </main>

      {/* Detail Modal Dialog */}
      {selectedModalError && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in zoom-in-95 duration-200 border border-slate-100">
            
            {/* Close button */}
            <button 
              onClick={() => setSelectedModalError(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-colors text-sm"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 text-[#ea3838] flex items-center justify-center text-3xl shadow-sm">
                {selectedModalError.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight font-['Outfit']">
                    {selectedModalError.code}
                  </h3>
                  {getSeverityBadge(selectedModalError.severity)}
                </div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  {selectedModalError.name}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  সমস্যার কারণ (Problem Cause)
                </span>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                  {selectedModalError.cause}
                </p>
              </div>

              <div className={`rounded-2xl p-4 border space-y-1 ${
                selectedModalError.severity === 'danger'
                  ? 'bg-red-50 border-red-200 text-red-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}>
                <span className={`text-[10px] font-black uppercase tracking-wider block ${
                  selectedModalError.severity === 'danger' ? 'text-red-600' : 'text-emerald-700'
                }`}>
                  প্রয়োজনীয় পদক্ষেপ ও সমাধান (Action Steps)
                </span>
                <p className="text-sm font-extrabold leading-relaxed">
                  {selectedModalError.solution}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>গুরুত্বপূর্ণ লেভেল: <strong className="text-slate-800">{selectedModalError.urgency}</strong></span>
                <span>টাইপ: <strong className="text-slate-800 capitalize">{selectedModalError.category}</strong></span>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => copyToClipboard(selectedModalError)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {copiedCode === selectedModalError.code ? '✅ কপি করা হয়েছে' : '📋 তথ্য কপি করুন'}
              </button>
              <button
                onClick={() => setSelectedModalError(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-[#ea3838] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 border-t border-slate-900 text-center text-xs mt-auto">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-bold text-slate-300">© {new Date().getFullYear()} Lams Power. All Rights Reserved.</p>
          <p className="text-[11px] text-slate-500">
            এই এরর কোড গাইডটি সোলার টেকনিশিয়ান, ইঞ্জিনিয়ার এবং গ্রাহকদের সুবিধার জন্য প্রস্তুতকৃত।
          </p>
        </div>
      </footer>

    </div>
  );
};

export default InverterErrorCodes;
