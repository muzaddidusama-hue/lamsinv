import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

// Modern SVG Icons
const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const ApiEndpointsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Pre-defined System API endpoints catalog
const SYSTEM_APIS = [
  {
    id: 'telegram_webhook',
    controllerId: 'telegram_webhook',
    category: 'messaging',
    categoryLabel: 'টেলিগ্রাম ও হোয়াটসঅ্যাপ',
    method: 'POST',
    path: '/api/telegram/webhook',
    title: 'টেলিগ্রাম ইনকামিং বট ওয়েবহুক (Telegram Bot Webhook)',
    description: 'টেলিগ্রামের ব্যবহারকারী যখন বটকে /stock, /low, বা যেকোনো প্রোডাক্টের নাম লিখে মেসেজ দেয়, এই ওয়েবহুক স্বয়ংক্রিয়ভাবে রিপ্লাই করে।',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'LAMS_InvBot_15963_UbhMuzaddid17'
    },
    samplePayload: {
      update_id: 10001,
      message: {
        chat: { id: 8657367736 },
        text: '/stock'
      }
    }
  },
  {
    id: 'telegram_search',
    controllerId: 'telegram_search',
    category: 'messaging',
    categoryLabel: 'টেলিগ্রাম ও হোয়াটসঅ্যাপ',
    method: 'GET',
    path: '/api/telegram/search?q=solaron',
    title: 'প্রোডাক্ট সার্চ এপিআই (Telegram Product Search API)',
    description: 'ব্র্যান্ড বা মডেল নাম দিয়ে ইনভেন্টরি থেকে রিয়েল-টাইম স্টক, ক্যাটাগরি ও প্রাইস সার্চ করার এপিআই।',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: null
  },
  {
    id: 'telegram_stock',
    controllerId: 'telegram_stock',
    category: 'messaging',
    categoryLabel: 'টেলিগ্রাম ও হোয়াটসঅ্যাপ',
    method: 'GET',
    path: '/api/telegram/stock',
    title: 'টেলিগ্রাম লাইভ স্টক রিপোর্ট (Live Telegram Stock API)',
    description: 'ইনভেন্টরি থেকে সকল প্রোডাক্টের বর্তমান স্টক হিসেব করে লাইভ রিপোর্ট তৈরি করে এবং স্বয়ংক্রিয়ভাবে টেলিগ্রামে পাঠিয়ে দেয়।',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: {
      filter: 'low',
      threshold: 5,
      send: true
    }
  },
  {
    id: 'notify_unified',
    controllerId: 'notify_all',
    category: 'messaging',
    categoryLabel: 'টেলিগ্রাম ও হোয়াটসঅ্যাপ',
    method: 'POST',
    path: '/api/notify',
    title: 'ইউনিফাইড নোটিফিকেশন ব্রডকাস্ট (Telegram & WhatsApp)',
    description: 'এক কলেই টেলিগ্রাম বট এবং হোয়াটসঅ্যাপ ক্লাউড এপিআইতে নোটিফিকেশন মেসেজ পাঠায়।',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: {
      platform: 'all',
      message: '⚠️ <b>স্টক অ্যালার্ট:</b> SolarOn 3600VA ইনভার্টার স্টক ৫ পিসের নিচে নেমেছে!'
    }
  },
  {
    id: 'notify_telegram',
    controllerId: 'notify_telegram',
    category: 'messaging',
    categoryLabel: 'টেলিগ্রাম ও হোয়াটসঅ্যাপ',
    method: 'POST',
    path: '/api/notify/telegram',
    title: 'টেলিগ্রাম মেসেজ ডিসপ্যাচ (Telegram Bot API)',
    description: 'টেলিগ্রাম বট, গ্রুপ অথবা চ্যানেলে এইচটিএমএল/মার্কডাউন ফরম্যাট করা মেসেজ পাঠায়।',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: {
      message: '🧾 <b>নতুন বিল তৈরি:</b> #INV-2026-9021\n<b>গ্রাহক:</b> মেসার্স সান পাওয়ার\n<b>মোট টাকা:</b> ৳৮৫,০০০'
    }
  },
  {
    id: 'notify_whatsapp',
    controllerId: 'notify_whatsapp',
    category: 'messaging',
    categoryLabel: 'টেলিগ্রাম ও হোয়াটসঅ্যাপ',
    method: 'POST',
    path: '/api/notify/whatsapp',
    title: 'হোয়াটসঅ্যাপ ক্লাউড এপিআই (Meta WhatsApp API)',
    description: 'মেটা গ্রাফ এপিআই (Graph API v20.0) ব্যবহার করে সরাসরি গ্রাহক বা ম্যানেজারের হোয়াটসঅ্যাপ নম্বরে বার্তা পাঠায়।',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: {
      to: '8801712345678',
      message: 'Lams Power: আপনার ইনভয়েস #INV-2026-9021 কনফার্ম করা হয়েছে। ধন্যবাদ!'
    }
  },
  {
    id: 'notify_status',
    controllerId: null,
    category: 'messaging',
    categoryLabel: 'টেলিগ্রাম ও হোয়াটসঅ্যাপ',
    method: 'GET',
    path: '/api/notify/status',
    title: 'নোটিফিকেশন সার্ভিস স্ট্যাটাস (Health Check)',
    description: 'টেলিগ্রাম টোকেন, চ্যাট আইডি এবং হোয়াটসঅ্যাপ ক্রেডেনশিয়াল কনফিগারেশন স্ট্যাটাস চেক করে।',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: null
  },
  {
    id: 'query_cache',
    controllerId: 'query_cache',
    category: 'database',
    categoryLabel: 'ডাটাবেস ও ক্যাশিং',
    method: 'GET',
    path: '/api/query?url={SUPABASE_REST_URL}',
    title: 'রেডিস ক্যাশ প্রক্সি কোয়েরি (Redis Cache Proxy)',
    description: 'সুপাবেস ডাটাবেসের ডাটা মেমরি বা রেডিস স্টোরে ক্যাশ করে হাই-স্পিড কোয়েরি ডেলিভারি নিশ্চিত করে।',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: null
  },
  {
    id: 'cache_invalidate',
    controllerId: 'cache_invalidate',
    category: 'database',
    categoryLabel: 'ডাটাবেস ও ক্যাশিং',
    method: 'POST',
    path: '/api/invalidate?table={TABLE_NAME}',
    title: 'রেডিস ক্যাশ পার্জ / ইনভ্যালিডেশন (Purge Cache)',
    description: 'নির্দিষ্ট টেবিলের (যেমন products, chalans) ক্যাশ করা ডাটা মুছে ফেলে ফ্রেশ ডাটা লোড করায়।',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: null
  },
  {
    id: 'supabase_products',
    controllerId: null,
    category: 'inventory',
    categoryLabel: 'ইনভেন্টরি ও প্রোডাক্টস',
    method: 'GET',
    path: '/rest/v1/products?select=id,name,model,brand,price,current_stock',
    title: 'প্রোডাক্ট ডিরেক্টরি কোয়েরি (Products REST API)',
    description: 'লাইভ ইনভেন্টরি থেকে সকল প্রোডাক্ট, বর্তমান স্টক ও বিক্রয়মূল্যের তালিকা সংগ্রহ করার এপিআই।',
    headers: {
      'apikey': 'SUPABASE_ANON_KEY',
      'Authorization': 'Bearer SUPABASE_ANON_KEY'
    },
    samplePayload: null
  },
  {
    id: 'supabase_chalans',
    controllerId: null,
    category: 'inventory',
    categoryLabel: 'ইনভেন্টরি ও প্রোডাক্টস',
    method: 'GET',
    path: '/rest/v1/chalans?select=id,chalan_no,bill_no,customer_name,total_amount,created_at&limit=20',
    title: 'চালান ও ইনভয়েস কোয়েরি (Invoices REST API)',
    description: 'সাম্প্রতিক চালান ও সেলস বিলের তালিকা ফিল্টারিং ও সার্চ করার এপিআই।',
    headers: {
      'apikey': 'SUPABASE_ANON_KEY',
      'Authorization': 'Bearer SUPABASE_ANON_KEY'
    },
    samplePayload: null
  }
];

const STORAGE_KEY = 'lams_api_keys_storage';

export default function ApiManager() {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'keys', 'generator', 'tester'
  const [copiedId, setCopiedId] = useState(null);

  // Status state
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // API Controller & Gatekeeper state
  const [controllerRegistry, setControllerRegistry] = useState({});
  const [togglingApiId, setTogglingApiId] = useState(null);

  // API Directory search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    role: 'Full Access (Read/Write/Notify)',
    expiry: 'never'
  });
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);

  // Code Generator state
  const [selectedApiId, setSelectedApiId] = useState(SYSTEM_APIS[0].id);
  const [selectedLanguage, setSelectedLanguage] = useState('curl'); // 'curl', 'javascript', 'python', 'nodejs'
  const [generatorCustomKey, setGeneratorCustomKey] = useState('');

  // Live Tester state
  const [testEndpoint, setTestEndpoint] = useState('/api/notify/status');
  const [testMethod, setTestMethod] = useState('GET');
  const [testPayload, setTestPayload] = useState('{}');
  const [testHeaders, setTestHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [testResponse, setTestResponse] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testDuration, setTestDuration] = useState(null);

  // Load API keys and Controller Status on mount
  useEffect(() => {
    loadStoredApiKeys();
    checkConnectionStatus();
    fetchControllerStatus();
  }, []);

  const loadStoredApiKeys = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setApiKeys(JSON.parse(stored));
      } else {
        const defaultKeys = [
          {
            id: 'key_1',
            name: 'Primary Telegram Alert Key',
            key: 'lams_live_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            role: 'Notifications Only (Telegram/WhatsApp)',
            expiry: 'never',
            status: 'active',
            createdAt: new Date().toISOString()
          }
        ];
        setApiKeys(defaultKeys);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultKeys));
      }
    } catch (err) {
      console.error('Error loading API keys:', err);
    }
  };

  const saveApiKeys = (keys) => {
    setApiKeys(keys);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } catch (err) {
      console.error('Error saving API keys:', err);
    }
  };

  const checkConnectionStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/notify/status');
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data);
      } else {
        setConnectionStatus({ error: `HTTP ${res.status}` });
      }
    } catch (err) {
      setConnectionStatus({ error: err.message });
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchControllerStatus = async () => {
    try {
      const res = await fetch('/api/control/status');
      if (res.ok) {
        const data = await res.json();
        if (data.registry) {
          setControllerRegistry(data.registry);
        }
      }
    } catch (err) {
      console.error('Failed to fetch API controller status:', err);
    }
  };

  // Toggle API on/off through controller
  const handleToggleApiStatus = async (apiId) => {
    const currentStatus = controllerRegistry[apiId]?.enabled ?? true;
    const newStatus = !currentStatus;
    setTogglingApiId(apiId);

    try {
      const res = await fetch('/api/control/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiId, enabled: newStatus })
      });

      const data = await res.json();
      if (data.success) {
        setControllerRegistry((prev) => ({
          ...prev,
          [apiId]: {
            ...prev[apiId],
            enabled: newStatus
          }
        }));

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: newStatus ? 'success' : 'warning',
          title: newStatus ? 'এপিআই সক্রিয় (Enabled) করা হয়েছে' : 'এপিআই বন্ধ (Disabled) করা হয়েছে',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        Swal.fire({ icon: 'error', title: 'টগল করতে সমস্যা হয়েছে', text: data.error });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'কন্ট্রোলার এরর', text: err.message });
    } finally {
      setTogglingApiId(null);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate new API Key
  const handleGenerateKey = (e) => {
    e.preventDefault();
    if (!newKeyForm.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'অনুগ্রহ করে এপিআই কী-এর নাম লিখুন' });
      return;
    }

    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const fullKey = `lams_live_${randomHex}`;

    const newKeyObj = {
      id: `key_${Date.now()}`,
      name: newKeyForm.name.trim(),
      key: fullKey,
      role: newKeyForm.role,
      expiry: newKeyForm.expiry,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const updated = [newKeyObj, ...apiKeys];
    saveApiKeys(updated);

    setNewlyCreatedKey(fullKey);
    setNewKeyForm({ name: '', role: 'Full Access (Read/Write/Notify)', expiry: 'never' });

    Swal.fire({
      icon: 'success',
      title: 'নতুন API Key সফলভাবে তৈরি হয়েছে!',
      text: 'কী-টি কপি করে নিরাপদ স্থানে সংরক্ষণ করুন।',
      confirmButtonColor: '#ea3838'
    });
  };

  // Revoke/Delete Key
  const handleDeleteKey = (id, name) => {
    Swal.fire({
      title: `"${name}" বাতিল করতে চান?`,
      text: 'এই এপিআই কী ব্যবহার করে চলমান যেকোনো সংযোগ বন্ধ হয়ে যাবে।',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ea3838',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'হ্যাঁ, বাতিল করুন',
      cancelButtonText: 'না'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = apiKeys.filter((k) => k.id !== id);
        saveApiKeys(updated);
        Swal.fire({
          icon: 'success',
          title: 'কী বাতিল করা হয়েছে',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  // Toggle Key Status (Active / Disabled)
  const handleToggleStatus = (id) => {
    const updated = apiKeys.map((k) => {
      if (k.id === id) {
        return { ...k, status: k.status === 'active' ? 'disabled' : 'active' };
      }
      return k;
    });
    saveApiKeys(updated);
  };

  // Switch to Tester Tab with pre-filled endpoint
  const openInTester = (api) => {
    setTestEndpoint(api.path);
    setTestMethod(api.method);
    if (api.samplePayload) {
      setTestPayload(JSON.stringify(api.samplePayload, null, 2));
    } else {
      setTestPayload('{}');
    }
    setActiveTab('tester');
  };

  // Execute Live API Test
  const handleRunApiTest = async () => {
    setTestLoading(true);
    setTestResponse(null);
    const startTime = performance.now();

    try {
      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(testHeaders || '{}');
      } catch (e) {
        parsedHeaders = { 'Content-Type': 'application/json' };
      }

      const options = {
        method: testMethod,
        headers: parsedHeaders
      };

      if (['POST', 'PUT', 'PATCH'].includes(testMethod.toUpperCase()) && testPayload.trim()) {
        options.body = testPayload;
      }

      const res = await fetch(testEndpoint, options);
      const endTime = performance.now();
      setTestDuration(Math.round(endTime - startTime));

      let bodyData;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        bodyData = await res.json();
      } else {
        bodyData = await res.text();
      }

      setTestResponse({
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        data: bodyData
      });

      // Refresh controller metrics after call
      fetchControllerStatus();
    } catch (err) {
      const endTime = performance.now();
      setTestDuration(Math.round(endTime - startTime));
      setTestResponse({
        status: 0,
        statusText: 'Network / Client Error',
        ok: false,
        data: { error: err.message }
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Filtered APIs in Directory
  const filteredApis = SYSTEM_APIS.filter((api) => {
    const matchesCategory = selectedCategory === 'all' || api.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      api.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const currentGenApi = SYSTEM_APIS.find((a) => a.id === selectedApiId) || SYSTEM_APIS[0];
  const activeKeyForCode = generatorCustomKey || (apiKeys[0]?.key || 'YOUR_LAMS_API_KEY');

  // Generate code snippet
  const generateSnippet = () => {
    const fullUrl = `${window.location.origin}${currentGenApi.path}`;
    const payloadStr = currentGenApi.samplePayload ? JSON.stringify(currentGenApi.samplePayload, null, 2) : '';

    if (selectedLanguage === 'curl') {
      if (currentGenApi.method === 'GET') {
        return `curl -X GET "${fullUrl}" \\
  -H "Authorization: Bearer ${activeKeyForCode}" \\
  -H "Content-Type: application/json"`;
      }
      return `curl -X POST "${fullUrl}" \\
  -H "Authorization: Bearer ${activeKeyForCode}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(currentGenApi.samplePayload || {})}'`;
    }

    if (selectedLanguage === 'javascript') {
      if (currentGenApi.method === 'GET') {
        return `const response = await fetch("${fullUrl}", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${activeKeyForCode}",
    "Content-Type": "application/json"
  }
});
const data = await response.json();
console.log(data);`;
      }
      return `const response = await fetch("${fullUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${activeKeyForCode}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${payloadStr || '{}'})
});
const data = await response.json();
console.log(data);`;
    }

    if (selectedLanguage === 'python') {
      if (currentGenApi.method === 'GET') {
        return `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${activeKeyForCode}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
print(response.json())`;
      }
      return `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${activeKeyForCode}",
    "Content-Type": "application/json"
}
payload = ${JSON.stringify(currentGenApi.samplePayload || {}, null, 4)}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`;
    }

    if (selectedLanguage === 'nodejs') {
      return `import axios from 'axios';

const url = "${fullUrl}";
const headers = {
  "Authorization": "Bearer ${activeKeyForCode}",
  "Content-Type": "application/json"
};

${currentGenApi.method === 'GET' 
  ? `const res = await axios.get(url, { headers });` 
  : `const payload = ${payloadStr || '{}'};
const res = await axios.post(url, payload, { headers });`}

console.log(res.data);`;
    }

    return '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#ea3838]/5 to-red-600/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>

        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ea3838]/10 text-[#ea3838] text-xs font-black uppercase tracking-wider">
            <ApiEndpointsIcon />
            API Management & Gatekeeper
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            API ডিরেক্টরি ও রেসপন্স কন্ট্রোলার
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-semibold max-w-2xl">
            টেলিগ্রাম বট, হোয়াটসঅ্যাপ ক্লাউড এপিআই, ইনভেন্টরি ক্যাশ ও ডাটাবেস এপিআই জেনারেট, অ্যাক্টিভ/ডিজেবল এবং লাইভ টেস্ট করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-5 py-3 rounded-2xl bg-[#ea3838] hover:bg-red-600 text-white font-black text-xs md:text-sm shadow-lg shadow-[#ea3838]/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <KeyIcon />
            + নতুন API Key তৈরি করুন
          </button>
          <button
            onClick={() => {
              checkConnectionStatus();
              fetchControllerStatus();
            }}
            disabled={loadingStatus}
            className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-2"
            title="রিফ্রেশ স্ট্যাটাস"
          >
            <span className={loadingStatus ? 'animate-spin' : ''}>🔄</span>
            {loadingStatus ? 'চেক হচ্ছে...' : 'কানেকশন চেক'}
          </button>
        </div>
      </div>

      {/* 2. Connection Health & Controller Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Telegram Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Telegram Bot</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">টেলিগ্রাম নোটিফায়ার</h4>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 ${
              connectionStatus?.telegram?.configured
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connectionStatus?.telegram?.configured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            {connectionStatus?.telegram?.configured ? 'কানেক্টেড' : 'টোকেন প্রয়োজন'}
          </span>
        </div>

        {/* WhatsApp Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Meta WhatsApp</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">ক্লাউড এপিআই</h4>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 ${
              connectionStatus?.whatsapp?.configured
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connectionStatus?.whatsapp?.configured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            {connectionStatus?.whatsapp?.configured ? 'কানেক্টেড' : 'টোকেন প্রয়োজন'}
          </span>
        </div>

        {/* Gatekeeper Controller Status Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">API Gatekeeper</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">রেসপন্স কন্ট্রোলার</h4>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            সক্রিয় (Active)
          </span>
        </div>

        {/* Generated Keys Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Keys</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">সংরক্ষিত এপিআই কী</h4>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-900 text-white">
            {apiKeys.filter((k) => k.status === 'active').length} টি সক্রিয়
          </span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-5 py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'directory'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ApiEndpointsIcon />
          ১. API ডিরেক্টরি ও কন্ট্রোলার (Directory & Toggles)
        </button>

        <button
          onClick={() => setActiveTab('keys')}
          className={`px-5 py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'keys'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <KeyIcon />
          ২. এপিআই কী জেনারেটর ({apiKeys.length})
        </button>

        <button
          onClick={() => setActiveTab('generator')}
          className={`px-5 py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'generator'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CodeIcon />
          ৩. কোড ও cURL জেনারেটর
        </button>

        <button
          onClick={() => setActiveTab('tester')}
          className={`px-5 py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tester'
              ? 'bg-[#ea3838] text-white shadow-md shadow-[#ea3838]/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <PlayIcon />
          ৪. লাইভ API টেস্টার (Console)
        </button>
      </div>

      {/* 4. Tab 1: API Directory with Interactive Live Switch Controller */}
      {activeTab === 'directory' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="এপিআই নাম বা পাথ খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#ea3838] focus:ring-2 focus:ring-[#ea3838]/10"
              />
              <span className="absolute left-3.5 top-3 text-slate-400 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'সকল এপিআই' },
                { id: 'messaging', label: 'টেলিগ্রাম ও হোয়াটসঅ্যাপ' },
                { id: 'database', label: 'ডাটাবেস ও ক্যাশিং' },
                { id: 'inventory', label: 'ইনভেন্টরি REST' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-[#ea3838] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredApis.map((api) => {
              const fullUrl = `${window.location.origin}${api.path}`;
              const isCopied = copiedId === api.id;
              const hasController = !!api.controllerId;
              const isEnabled = hasController ? (controllerRegistry[api.controllerId]?.enabled ?? true) : true;
              const reqStats = hasController ? controllerRegistry[api.controllerId] : null;

              return (
                <div
                  key={api.id}
                  className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between group ${
                    isEnabled
                      ? 'border-slate-200/80 shadow-xs hover:shadow-md'
                      : 'border-red-200 bg-red-50/20 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {api.categoryLabel}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {/* Live Gatekeeper Response Switch */}
                        {hasController ? (
                          <button
                            onClick={() => handleToggleApiStatus(api.controllerId)}
                            disabled={togglingApiId === api.controllerId}
                            className={`px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                              isEnabled
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                                : 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                            }`}
                            title="ক্লিক করে এই এপিআই-এর রেসপন্স চালু বা বন্ধ করুন"
                          >
                            <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            {togglingApiId === api.controllerId ? 'আপডেট হচ্ছে...' : (isEnabled ? 'রেসপন্স: অন (Active)' : 'রেসপন্স: বন্ধ (Off)')}
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            স্ট্যাটিক
                          </span>
                        )}

                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            api.method === 'POST'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {api.method}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-slate-800 leading-snug group-hover:text-[#ea3838] transition-colors">
                      {api.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {api.description}
                    </p>

                    {/* Path & Copy Box */}
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <code className="text-[11px] font-mono font-bold text-slate-700 truncate select-all">
                        {api.path}
                      </code>
                      <button
                        onClick={() => handleCopy(fullUrl, api.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                        title="সম্পূর্ণ URL কপি করুন"
                      >
                        {isCopied ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>

                    {/* Stats & Payload info */}
                    {reqStats && (
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 bg-slate-100/60 p-2 rounded-xl">
                        <span>📊 মোট কল: <b className="text-slate-800">{reqStats.requestsCount || 0}</b></span>
                        <span>🚫 ব্লকড: <b className={reqStats.blockedCount > 0 ? 'text-red-600' : 'text-slate-800'}>{reqStats.blockedCount || 0}</b></span>
                      </div>
                    )}

                    {api.samplePayload && (
                      <div className="pt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Sample JSON Payload:
                        </span>
                        <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-32 custom-scrollbar">
                          {JSON.stringify(api.samplePayload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setSelectedApiId(api.id);
                        setActiveTab('generator');
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                    >
                      <CodeIcon />
                      কোড স্নsnippet দেখুন
                    </button>
                    <button
                      onClick={() => openInTester(api)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-[#ea3838] text-white text-xs font-black transition-colors flex items-center gap-1.5"
                    >
                      <PlayIcon />
                      টেস্ট করুন
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Tab 2: Generated Keys & Tokens */}
      {activeTab === 'keys' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800">সংরক্ষিত API Keys তালিকা</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  বাহ্যিক অ্যাপ্লিকেশন, টেলিগ্রাম বট বা মোবাইল অ্যাপ্লিকেশনের জন্য ব্যবহৃত সিক্রেট কি-সমূহ।
                </p>
              </div>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#ea3838] hover:bg-red-600 text-white font-black text-xs flex items-center gap-2 self-start sm:self-auto"
              >
                <KeyIcon />
                + নতুন কী তৈরি করুন
              </button>
            </div>

            {/* Keys Table */}
            {apiKeys.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold text-xs">
                কোনো API Key তৈরি করা হয়নি। "নতুন কী তৈরি করুন" বাটনে ক্লিক করুন।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">কী নাম ও পারপাস</th>
                      <th className="py-3 px-4">API Key Token</th>
                      <th className="py-3 px-4">অনুমতি (Permissions)</th>
                      <th className="py-3 px-4">তৈরির তারিখ</th>
                      <th className="py-3 px-4">স্ট্যাটাস</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {apiKeys.map((k) => {
                      const isCopied = copiedId === k.id;
                      return (
                        <tr key={k.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-black text-slate-800">
                            {k.name}
                          </td>
                          <td className="py-4 px-4 font-mono">
                            <div className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-lg">
                              <span className="font-bold text-slate-700">
                                {k.key.substring(0, 16)}••••••••
                              </span>
                              <button
                                onClick={() => handleCopy(k.key, k.id)}
                                className="text-slate-400 hover:text-slate-900"
                                title="সম্পূর্ণ কী কপি করুন"
                              >
                                {isCopied ? <CheckIcon /> : <CopyIcon />}
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                              {k.role}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-500 font-semibold text-[11px]">
                            {new Date(k.createdAt).toLocaleDateString('bn-BD', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleToggleStatus(k.id)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                                k.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-500 line-through'
                              }`}
                              title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন"
                            >
                              {k.status === 'active' ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleDeleteKey(k.id, k.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="কী ডিলিট / বাতিল করুন"
                            >
                              <TrashIcon />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Tab 3: Code & cURL Generator */}
      {activeTab === 'generator' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-800">ইন্টারেক্টিভ কোড ও cURL জেনারেটর</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                আপনার প্রয়োজন অনুযায়ী ভাষা ও এপিআই নির্বাচন করে সরাসরি কপি করার মতো কোড সংগ্রহ করুন।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  টার্গেট এপিআই রুট নির্বাচন করুন
                </label>
                <select
                  value={selectedApiId}
                  onChange={(e) => setSelectedApiId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 outline-none focus:border-[#ea3838]"
                >
                  {SYSTEM_APIS.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.method}] {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  প্রোগ্রামিং ল্যাঙ্গুয়েজ
                </label>
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: 'curl', label: 'cURL' },
                    { id: 'javascript', label: 'JavaScript' },
                    { id: 'python', label: 'Python' },
                    { id: 'nodejs', label: 'Node.js' }
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                        selectedLanguage === lang.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  API Key (অথবা ডিফল্ট নির্বাচন)
                </label>
                <select
                  value={generatorCustomKey}
                  onChange={(e) => setGeneratorCustomKey(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 outline-none focus:border-[#ea3838]"
                >
                  <option value="">-- প্রথম সক্রিয় কী ব্যবহার করুন --</option>
                  {apiKeys.map((k) => (
                    <option key={k.id} value={k.key}>
                      {k.name} ({k.key.substring(0, 14)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generated Code Output Box */}
            <div className="relative">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 rounded-t-2xl border-b border-slate-700">
                <span className="text-[11px] font-mono font-bold text-slate-300">
                  {selectedLanguage.toUpperCase()} Snippet
                </span>
                <button
                  onClick={() => handleCopy(generateSnippet(), 'snippet_copy')}
                  className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedId === 'snippet_copy' ? <CheckIcon /> : <CopyIcon />}
                  {copiedId === 'snippet_copy' ? 'কপি হয়েছে' : 'কোড কপি করুন'}
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-emerald-400 rounded-b-2xl font-mono text-xs overflow-x-auto leading-relaxed custom-scrollbar">
                {generateSnippet()}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab 4: Live API Tester (Console) */}
      {activeTab === 'tester' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-800">লাইভ API টেস্টার ও কনসোল</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                যেকোনো এপিআই রুট সরাসরি ব্রাউজার থেকে কল করে লাইভ রেসপন্স যাচাই করুন।
              </p>
            </div>

            {/* URL Input Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={testMethod}
                onChange={(e) => setTestMethod(e.target.value)}
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 font-black text-xs sm:w-28 outline-none focus:border-[#ea3838]"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={testEndpoint}
                  onChange={(e) => setTestEndpoint(e.target.value)}
                  placeholder="/api/notify বা যেকোনো এপিআই পাথ"
                  className="w-full p-3 pl-4 rounded-2xl border border-slate-200 text-xs font-mono font-bold outline-none focus:border-[#ea3838]"
                />
              </div>

              <button
                onClick={handleRunApiTest}
                disabled={testLoading}
                className="px-6 py-3 rounded-2xl bg-[#ea3838] hover:bg-red-600 text-white font-black text-xs md:text-sm shadow-lg shadow-[#ea3838]/20 transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
              >
                <PlayIcon />
                {testLoading ? 'পাঠানো হচ্ছে...' : 'রিকোয়েস্ট পাঠান'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Request Payload Editor */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Request Payload (JSON Body):
                </label>
                <textarea
                  rows={10}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs border border-slate-700 outline-none focus:border-[#ea3838] custom-scrollbar"
                  placeholder="{\n  &quot;message&quot;: &quot;Hello world&quot;\n}"
                />
              </div>

              {/* Live Response Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Response Output:
                  </label>
                  {testResponse && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          testResponse.ok
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        Status: {testResponse.status} {testResponse.statusText}
                      </span>
                      {testDuration !== null && (
                        <span className="text-[10px] font-bold text-slate-400">
                          ⏱️ {testDuration} ms
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 h-[240px] overflow-y-auto overflow-x-auto custom-scrollbar select-all">
                    {testResponse
                      ? JSON.stringify(testResponse.data, null, 2)
                      : '// "রিকোয়েস্ট পাঠান" বাটনে ক্লিক করলে রেসপন্স এখানে দেখা যাবে।'}
                  </pre>
                  {testResponse && (
                    <button
                      onClick={() => handleCopy(JSON.stringify(testResponse.data, null, 2), 'resp_copy')}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                      title="রেসপন্স কপি করুন"
                    >
                      {copiedId === 'resp_copy' ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Generate Key Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <KeyIcon />
                নতুন API Key তৈরি করুন
              </h3>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setNewlyCreatedKey(null);
                }}
                className="text-slate-400 hover:text-slate-900 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {newlyCreatedKey ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <p className="text-xs font-bold leading-relaxed mb-2">
                    ✅ আপনার নতুন API Key প্রস্তুত! এটি কেবল এখনই পূর্ণাঙ্গরূপে দেখতে পাবেন। পরবর্তীতে নিরাপত্তার কারণে এর শেষাংশ গোপন থাকবে।
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-emerald-300 font-mono text-xs font-bold select-all break-all text-slate-800 flex items-center justify-between gap-2">
                    <span>{newlyCreatedKey}</span>
                    <button
                      onClick={() => handleCopy(newlyCreatedKey, 'modal_key_copy')}
                      className="px-2.5 py-1 rounded-lg bg-[#ea3838] text-white text-xs font-bold shrink-0"
                    >
                      {copiedId === 'modal_key_copy' ? 'কপি হয়েছে!' : 'কপি করুন'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setNewlyCreatedKey(null);
                    setActiveTab('keys');
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider"
                >
                  সম্পন্ন হয়েছে
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateKey} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    কী নাম / পারপাস (Purpose)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: Telegram Notification Hook, Mobile Scanner App"
                    value={newKeyForm.name}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#ea3838]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    অনুমতি লেভেল (Permissions)
                  </label>
                  <select
                    value={newKeyForm.role}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, role: e.target.value })}
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#ea3838]"
                  >
                    <option value="Full Access (Read/Write/Notify)">Full Access (Read / Write / Notify)</option>
                    <option value="Notifications Only (Telegram/WhatsApp)">Notifications Only (Telegram & WhatsApp)</option>
                    <option value="Read Only (Inventory/Products)">Read Only (Inventory & Products)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    মেয়াদ (Expiration)
                  </label>
                  <select
                    value={newKeyForm.expiry}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, expiry: e.target.value })}
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#ea3838]"
                  >
                    <option value="never">মেয়াদহীন (Never Expires)</option>
                    <option value="30_days">৩০ দিন (30 Days)</option>
                    <option value="90_days">৯০ দিন (90 Days)</option>
                    <option value="1_year">১ বছর (1 Year)</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-[#ea3838] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#ea3838]/20"
                  >
                    জেনারেট করুন
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
