import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import lamsLogo from '../assets/lams-logo.webp';
import { supabase } from '../supabaseClient';

export const INVERTER_ERRORS = [
  {
    code: 'E00',
    searchKeys: ['e00', 'e0', 'ac voltage low', 'গ্রিড', 'ভোল্টেজ লো', 'পিডিবি', 'আরইবি', 'voltage low'],
    name: 'AC Voltage Low',
    category: 'grid',
    severity: 'warning', // 'info' | 'warning' | 'danger' | 'reserved'
    cause: 'গ্রিড (পিডিবি/আরইবি) ভোল্টেজ ইনভার্টারের নির্ধারিত সীমার চেয়ে কমে গেছে। এলাকায় ভোল্টেজ ড্রপ বা এসি ক্যাবল অনেক লম্বা ও চিকন হলে এমন হয়।',
    solution: 'গ্রিড ভোল্টেজ মাপুন। এসি ক্যাবলের সাইজ ঠিক আছে কি না চেক করুন। গ্রিড ভোল্টেজ স্বাভাবিক হলে অটোমেটিক সমাধান হবে।',
    urgency: 'গ্রিড ভোল্টেজ পর্যবেক্ষণ',
    icon: '🔌'
  },
  {
    code: 'E01',
    searchKeys: ['e01', 'e1', 'ac voltage high', 'গ্রিড', 'ভোল্টেজ হাই', 'ট্রান্সফরমার', 'overvoltage', 'voltage high'],
    name: 'AC Voltage High',
    category: 'grid',
    severity: 'warning',
    cause: 'গ্রিড ভোল্টেজ ইনভার্টারের ম্যাক্সিমাম লিমিট (সাধারণত 270V+) পার হয়ে গেছে। ট্রান্সফরমারের কাছাকাছি সাইট হলে এই সমস্যা বেশি হয়।',
    solution: 'গ্রিডের ওভার-ভোল্টেজ চেক করুন। ইনভার্টারের সেটিংসে গিয়ে AC Voltage-এর আপার লিমিট কিছুটা বাড়িয়ে দেওয়া যেতে পারে।',
    urgency: 'সেটিংস অ্যাডজাস্টমেন্ট',
    icon: '⚡'
  },
  {
    code: 'E02',
    searchKeys: ['e02', 'e2', 'ac freq low', 'ফ্রিকোয়েন্সি', 'frequency low', '50hz', 'জেনারেটর'],
    name: 'AC Freq Low',
    category: 'grid',
    severity: 'warning',
    cause: 'গ্রিডের ফ্রিকোয়েন্সি স্ট্যান্ডার্ড (50Hz) থেকে অনেক কমে গেছে। মূলত গ্রিডের জেনারেটরে বড় কোনো ফল্ট হলে এমন হয়।',
    solution: 'ইনভার্টারের সেটিংসে ফ্রিকোয়েন্সি রেঞ্জ চেক করুন। এটি সাধারণত গ্রিড স্ট্যাবল হলে নিজে থেকেই ঠিক হয়ে যায়।',
    urgency: 'স্বয়ংক্রিয় রিকভারি',
    icon: '〰️'
  },
  {
    code: 'E03',
    searchKeys: ['e03', 'e3', 'ac freq high', 'ফ্রিকোয়েন্সি', 'frequency high', 'grid frequency'],
    name: 'AC Freq High',
    category: 'grid',
    severity: 'warning',
    cause: 'গ্রিডের ফ্রিকোয়েন্সি অনেক বেড়ে গেছে।',
    solution: 'সেটিংসে ফ্রিকোয়েন্সি রেঞ্জ চেক করুন। গ্রিড স্ট্যাবল হওয়ার জন্য অপেক্ষা করুন।',
    urgency: 'স্বয়ংক্রিয় রিকভারি',
    icon: '〰️'
  },
  {
    code: 'E04',
    searchKeys: ['e04', 'e4', 'bus volt low', 'বাস ভোল্টেজ', 'ক্যাপাসিটর', 'dc bus', 'voltage drop'],
    name: 'Bus Volt Low',
    category: 'power',
    severity: 'warning',
    cause: 'ইনভার্টারের ভেতরের ডিসি বাস ক্যাপাসিটরে চার্জ কমে গেছে। সোলার প্যানেল থেকে হঠাৎ ভোল্টেজ ড্রপ করলে বা গ্রিড ফল্ট হলে এমন হয়।',
    solution: 'ডিসি সুইচ (DC Switch) অফ করে কয়েক মিনিট পর ইনভার্টার রিস্টার্ট করুন।',
    urgency: 'রিস্টার্ট ও ডিসি চেক',
    icon: '🔋'
  },
  {
    code: 'E05',
    searchKeys: ['e05', 'e5', 'bus volt high', 'বাস ভোল্টেজ হাই', 'স্পাইক', 'মাদারবোর্ড', 'dc bus high'],
    name: 'Bus Volt High',
    category: 'danger',
    severity: 'danger',
    cause: 'ভেতরের বাস ক্যাপাসিটরে ভোল্টেজ মাত্রাতিরিক্ত বেড়ে গেছে। হঠাৎ লোড বন্ধ হয়ে গেলে বা গ্রিড থেকে স্পাইক আসলে এটি হয়।',
    solution: 'ডিসি সুইচ অফ করে ইনভার্টার রিস্টার্ট করুন। বারবার হলে মাদারবোর্ড চেক করতে হবে।',
    urgency: 'উচ্চ ভোল্টেজ ঝুঁকি',
    icon: '💥'
  },
  {
    code: 'E06',
    searchKeys: ['e06', 'e6', 'imbalance bus', 'বাস ব্যালেন্স', 'ক্যাপাসিটর', 'hardware fault'],
    name: 'Imbalance Bus',
    category: 'hardware',
    severity: 'warning',
    cause: 'ইনভার্টারের ভেতরের পজিটিভ এবং নেগেটিভ বাস ক্যাপাসিটরের ভোল্টেজ ব্যালেন্স হারিয়েছে। এটি সাধারণত হার্ডওয়্যার ফেইলিওর নির্দেশ করে।',
    solution: 'ইনভার্টার রিস্টার্ট করে দেখুন। ঠিক না হলে ম্যানুফ্যাকচারারের সার্ভিসে পাঠাতে হবে।',
    urgency: 'সার্ভিস সেন্টারে যোগাযোগ',
    icon: '⚖️'
  },
  {
    code: 'E07',
    searchKeys: ['e07', 'e7', 'iso low', 'ইনসুলেশন', 'mc4', 'আর্থিং লিকেজ', 'insulation', 'leakage'],
    name: 'ISO Low',
    category: 'danger',
    severity: 'danger',
    cause: 'ইনসুলেশন রেজিস্ট্যান্স ফল্ট। সোলার প্যানেলের তারের কভার লিক হয়ে বডির সাথে লেগে গেলে বা বৃষ্টিতে কানেক্টরে পানি ঢুকলে আর্থিং লিকেজ হয়।',
    solution: 'মাল্টিমিটার দিয়ে প্যানেলের পজিটিভ/নেগেটিভ এবং আর্থিংয়ের মাঝের রেজিস্ট্যান্স মাপুন। লিক হওয়া তার বা MC4 কানেক্টর পরিবর্তন করুন।',
    urgency: 'জরুরি তার/MC4 পরিবর্তন',
    icon: '🌧️'
  },
  {
    code: 'E08',
    searchKeys: ['e08', 'e8', 'dc curr high', 'অ্যাম্পিয়ার', 'current high', 'প্যারালাল', 'শর্ট সার্কিট'],
    name: 'DC Curr High',
    category: 'danger',
    severity: 'danger',
    cause: 'সোলার প্যানেল থেকে আসা অ্যাম্পিয়ার (Current) ইনভার্টারের লিমিট ক্রস করেছে অথবা ভেতরে শর্ট সার্কিট হয়েছে।',
    solution: 'স্ট্রিংয়ে ভুল করে বেশি অ্যাম্পিয়ারের প্যানেল প্যারালাল করা হয়েছে কি না চেক করুন।',
    urgency: 'প্যানেল কনফিগারেশন চেক',
    icon: '📈'
  },
  {
    code: 'E09',
    searchKeys: ['e09', 'e9', 'high hw invert', 'igbt', 'আইজিবিটি', 'পাওয়ার ব্রিজ', 'hardware'],
    name: 'High Hw Invert',
    category: 'hardware',
    severity: 'warning',
    cause: 'ইনভার্টারের ভেতরের আইজিবিটি (IGBT) বা পাওয়ার ব্রিজে হার্ডওয়্যার লেভেলে অতিরিক্ত কারেন্ট ফ্লো হয়েছে।',
    solution: 'রিস্টার্ট করে দেখুন। সমাধান না হলে হার্ডওয়্যার রিপেয়ার প্রয়োজন।',
    urgency: 'হার্ডওয়্যার সার্ভিসিং',
    icon: '⚙️'
  },
  {
    code: 'E10',
    searchKeys: ['e10', 'invert i high', 'ওভারলোড', 'শর্ট সার্কিট', 'output current', 'overload'],
    name: 'Invert I High',
    category: 'power',
    severity: 'warning',
    cause: 'ইনভার্টার থেকে আউটপুটে অতিরিক্ত কারেন্ট যাচ্ছে (এসি ওভারলোড বা শর্ট সার্কিট)।',
    solution: 'এসি লাইনে কোনো শর্ট সার্কিট আছে কি না চেক করুন। অতিরিক্ত লোড কমান।',
    urgency: 'লোড ও শর্ট সার্কিট চেক',
    icon: '⚠️'
  },
  {
    code: 'E11',
    searchKeys: ['e11', 'invert dci high', 'dc leak', 'ফিল্টার', 'কারেন্ট সেন্সর', 'dci'],
    name: 'Invert DCI High',
    category: 'hardware',
    severity: 'warning',
    cause: 'এসি লাইনে ডাইরেক্ট কারেন্ট (DC) লিক হয়ে চলে যাচ্ছে। ইনভার্টারের ভেতরের ফিল্টার বা কারেন্ট সেন্সর নষ্ট হলে এমন হয়।',
    solution: 'এটি হার্ডওয়্যার ইস্যু, ম্যানুফ্যাকচারারের সাথে যোগাযোগ করুন।',
    urgency: 'ম্যানুফ্যাকচারার সাপোর্ট',
    icon: '🛠️'
  },
  {
    code: 'E12',
    searchKeys: ['e12', 'env t high', 'তাপমাত্রা', 'temperature', 'গরম', 'overheat', 'cooling'],
    name: 'Env T High',
    category: 'temperature',
    severity: 'warning',
    cause: 'পরিবেশের তাপমাত্রা বা ইনভার্টারের চারপাশের তাপমাত্রা অনেক বেশি (সাধারণত ৬০° সে. এর উপরে)।',
    solution: 'ইনভার্টারের চারপাশে বাতাস চলাচলের ব্যবস্থা করুন। সরাসরি রোদে থাকলে ছায়ায় স্থাপন করুন।',
    urgency: 'ভেন্টিলেশন ব্যবস্থা করুন',
    icon: '☀️'
  },
  {
    code: 'E13',
    searchKeys: ['e13', 'radiator heat', 'হিটসিংক', 'কুলিং ফ্যান', 'fan', 'heatsink', 'ধুলো'],
    name: 'Radiator Heat',
    category: 'temperature',
    severity: 'warning',
    cause: 'হিটসিংক অতিরিক্ত গরম হয়ে গেছে। কুলিং ফ্যান নষ্ট হলে বা ফ্যানে প্রচুর ধুলো জমলে এটি হয়।',
    solution: 'ইনভার্টারের পেছনের হিটসিংক পরিষ্কার করুন এবং কুলিং ফ্যান ঘুরছে কি না চেক করুন।',
    urgency: 'ফ্যান ও হিটসিংক ক্লিন করুন',
    icon: '🌡️'
  },
  {
    code: 'E14',
    searchKeys: ['e14', 'ac relay err', 'রিলে', 'relay', 'কন্টাক্ট পয়েন্ট', 'মাদারবোর্ড'],
    name: 'AC Relay Err',
    category: 'hardware',
    severity: 'warning',
    cause: 'ভেতরের এসি রিলে ঠিকমতো অন/অফ হতে পারছে না, বা রিলের কন্টাক্ট পয়েন্ট পুড়ে আটকে গেছে।',
    solution: 'রিস্টার্ট করার পরও এই এরর থাকলে মাদারবোর্ডের রিলে পরিবর্তন করতে হবে।',
    urgency: 'রিলে পরিবর্তন প্রয়োজন',
    icon: '🔄'
  },
  {
    code: 'E15',
    searchKeys: ['e15', 'pv voltage low', 'প্যানেল ভোল্টেজ', 'রোদ কম', 'স্টার্টিং ভোল্টেজ', 'voltage low'],
    name: 'PV Voltage Low',
    category: 'power',
    severity: 'info',
    cause: 'প্যানেল থেকে পর্যাপ্ত ভোল্টেজ আসছে না। রোদ খুব কম থাকলে বা সিরিজে প্যানেল সংখ্যা কম হলে এটি দেখায়।',
    solution: 'স্ট্রিং ভোল্টেজ চেক করুন। এটি ইনভার্টারের স্টার্টিং ভোল্টেজের চেয়ে বেশি হতে হবে।',
    urgency: 'স্বাভাবিক (রোদ বাড়লে ঠিক হবে)',
    icon: '⛅'
  },
  {
    code: 'E16',
    searchKeys: ['e16', 'remote off', 'রিমোট', 'অ্যাপ', 'command', 'remote'],
    name: 'Remote Off',
    category: 'system',
    severity: 'info',
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

      // Match code exactly or partially (e.g. "e00", "00", "e16", "16", "e24", "e27")
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
            আপনার ইনভার্টারের ডিসপ্লেতে প্রদর্শিত এরর কোডটি (যেমন: E00, E01, E07, E16, E20, E27 ইত্যাদি) সার্চ করুন। কারণ এবং দ্রুত সমাধান জেনে নিন।
          </p>

          {/* Interactive Search Bar */}
          <div className="pt-3 max-w-2xl mx-auto">
            <div className="relative flex items-center shadow-lg shadow-slate-200/50 rounded-2xl bg-white border-2 border-slate-200 focus-within:border-[#ea3838] focus-within:ring-4 focus-within:ring-red-100 transition-all">
              <span className="pl-4 pr-2 text-slate-400 text-lg">🔍</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="এরর কোড বা কীওয়ার্ড লিখুন (যেমন: E00, E07, E16, E27, GFCI, ভোল্টেজ)..."
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
              {['E00', 'E01', 'E04', 'E07', 'E08', 'E12', 'E15', 'E16', 'E20', 'E27', 'E32'].map(code => (
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
              <span>{hasSearch ? '🔍 সার্চ ফলাফল' : '📋 ইনভার্টার এরর কোড তালিকা (E00 - E32)'}</span>
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
              { id: 'grid', label: '🔌 গ্রিড ও এসি' },
              { id: 'power', label: '🔋 পাওয়ার ও ডিসি' },
              { id: 'danger', label: '⚠️ বিপদজনক' },
              { id: 'hardware', label: '⚙️ হার্ডওয়্যার' },
              { id: 'sensor', label: '🔍 সেন্সর ফল্ট' },
              { id: 'temperature', label: '🌡️ তাপমাত্রা' },
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
              /* No search results found state (e.g. searching invalid code) */
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-5 shadow-sm max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-red-50 text-[#ea3838] flex items-center justify-center text-3xl mx-auto">
                  🔍
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800">
                    কোনো এরর তথ্য পাওয়া যায়নি
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    "<span className="font-bold text-slate-800">{searchQuery}</span>" কোড বা বিবরণটি পাওয়া যায়নি। সঠিক কোড (যেমন: E00, E01, E07, E16, E20, E27) লিখুন অথবা নিচের বোতামে ক্লিক করে সম্পূর্ণ তালিকা দেখুন।
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
                {hasSearch ? 'সারসংক্ষেপ টেবিল ভিউ' : 'সম্পূর্ণ ইনভার্টার এরর কোড তালিকা (ক্রমিক E00 - E32)'}
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
