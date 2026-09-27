import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

// Helper for date formatting
const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 })
    .format(amount || 0)
    .replace('BDT', '৳');
};

const ProductBrand = () => {
  // Brand selection & list
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandMetadataMap, setBrandMetadataMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Raw database tables
  const [rawProducts, setRawProducts] = useState([]);
  const [rawChalans, setRawChalans] = useState([]);
  const [rawSerials, setRawSerials] = useState([]);
  const [siteSettings, setSiteSettings] = useState(null);

  // Filters
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'month', 'year', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchModel, setSearchModel] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'models', 'houses', 'sales', 'serials'

  // Add/Edit Brand Modal
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [brandFormName, setBrandFormName] = useState('');
  const [brandFormOrigin, setBrandFormOrigin] = useState('');
  const [brandFormDesc, setBrandFormDesc] = useState('');
  const [brandFormLogo, setBrandFormLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch site settings for custom brand metadata
      const { data: settingsData } = await supabase.from('site_settings').select('*').single();
      let metaMap = {};
      let customBrandList = [];
      if (settingsData) {
        setSiteSettings(settingsData);
        if (settingsData.footer_image_url && settingsData.footer_image_url.startsWith('{')) {
          try {
            const parsed = JSON.parse(settingsData.footer_image_url);
            if (parsed.brand_metadata) {
              metaMap = parsed.brand_metadata;
              setBrandMetadataMap(parsed.brand_metadata);
            }
            if (parsed.custom_brands && Array.isArray(parsed.custom_brands)) {
              customBrandList = parsed.custom_brands;
            }
          } catch (e) {
            console.error('Failed to parse settings metadata:', e);
          }
        }
      }

      // 2. Fetch all products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      const prods = productsData || [];
      setRawProducts(prods);

      // Extract unique brand names from products and custom brands
      const dbBrands = prods.map(p => p.name ? p.name.trim() : '').filter(Boolean);
      const combinedBrands = Array.from(new Set([...dbBrands, ...customBrandList])).sort((a, b) => 
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
      setBrands(combinedBrands);

      // 3. Fetch chalans with items
      const { data: chalansData } = await supabase
        .from('chalans')
        .select(`
          id,
          chalan_no,
          bill_no,
          house,
          status,
          created_at,
          customer_name,
          phone,
          is_in_house,
          transfer_to,
          customers(name, phone),
          chalan_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            products(id, name, model, category, house)
          )
        `)
        .order('created_at', { ascending: false });
      
      setRawChalans(chalansData || []);

      // 4. Fetch inverter serials
      const { data: serialsData } = await supabase
        .from('inv_sl')
        .select('*')
        .order('created_at', { ascending: false });
      
      setRawSerials(serialsData || []);

    } catch (err) {
      console.error('Error fetching brand data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Upload brand logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `brand_logo_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('product image')
        .upload(fileName, file);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('product image')
        .getPublicUrl(fileName);

      setBrandFormLogo(publicUrl);
    } catch (err) {
      console.error(err);
      alert('ব্র্যান্ড লোগো আপলোড করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Save brand manually
  const handleSaveBrand = async (e) => {
    e.preventDefault();
    const name = brandFormName.trim();
    if (!name) {
      return alert('দয়া করে ব্র্যান্ডের নাম লিখুন!');
    }

    setSavingBrand(true);
    try {
      let existingPayload = {};
      if (siteSettings?.footer_image_url && siteSettings.footer_image_url.startsWith('{')) {
        try {
          existingPayload = JSON.parse(siteSettings.footer_image_url);
        } catch (e) {
          console.error(e);
        }
      }

      const existingBrands = existingPayload.custom_brands || [];
      const updatedBrands = Array.from(new Set([...existingBrands, name]));

      const existingMeta = existingPayload.brand_metadata || {};
      const updatedMeta = {
        ...existingMeta,
        [name.toLowerCase()]: {
          name,
          origin: brandFormOrigin.trim(),
          description: brandFormDesc.trim(),
          logo: brandFormLogo.trim() || existingMeta[name.toLowerCase()]?.logo || '',
          updated_at: new Date().toISOString()
        }
      };

      const finalPayload = {
        ...existingPayload,
        custom_brands: updatedBrands,
        brand_metadata: updatedMeta
      };

      const finalSettings = {
        ...siteSettings,
        footer_image_url: JSON.stringify(finalPayload)
      };

      const { error } = await supabase.from('site_settings').upsert([finalSettings]);
      if (error) throw error;

      setSiteSettings(finalSettings);
      setBrandMetadataMap(updatedMeta);
      if (!brands.includes(name)) {
        setBrands(prev => [...prev, name].sort((a, b) => a.localeCompare(b)));
      }
      setSelectedBrand(name);
      setShowAddBrandModal(false);
      setBrandFormName('');
      setBrandFormOrigin('');
      setBrandFormDesc('');
      setBrandFormLogo('');
      alert('✅ ব্র্যান্ড সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err) {
      console.error(err);
      alert('ব্র্যান্ড সংরক্ষণ করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setSavingBrand(false);
    }
  };

  // Open edit modal for active brand
  const openEditActiveBrand = () => {
    if (!selectedBrand) return;
    const meta = brandMetadataMap[selectedBrand.toLowerCase()] || {};
    setBrandFormName(selectedBrand);
    setBrandFormOrigin(meta.origin || '');
    setBrandFormDesc(meta.description || '');
    setBrandFormLogo(meta.logo || '');
    setShowAddBrandModal(true);
  };

  // Helper date boundary calculation
  const dateRange = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return { start, end };
    }
    if (dateFilter === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { start, end };
    }
    if (dateFilter === 'year') {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
      return { start, end };
    }
    if (dateFilter === 'custom' && startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
      const end = new Date(`${endDate}T23:59:59.999Z`).getTime();
      return { start, end };
    }
    return { start: 0, end: Infinity };
  }, [dateFilter, startDate, endDate]);

  // Filter products for the selected brand
  const brandProducts = useMemo(() => {
    if (!selectedBrand) return [];
    return rawProducts.filter(p => (p.name || '').trim().toLowerCase() === selectedBrand.trim().toLowerCase());
  }, [selectedBrand, rawProducts]);

  // Aggregate distinct models of the brand
  const brandModels = useMemo(() => {
    if (!brandProducts.length) return [];
    const modelMap = new Map();

    brandProducts.forEach(p => {
      const key = `${p.category || 'General'}_${p.model || 'Standard'}`.toLowerCase();
      if (!modelMap.has(key)) {
        modelMap.set(key, {
          category: p.category || 'General',
          model: p.model || 'Standard',
          unit_price: p.unit_price || 0,
          image_url: p.image_url || '',
          volt: p.volt || '',
          watt: p.watt || '',
          description: p.description || '',
          headOfficeStock: 0,
          showroomStock: 0,
          totalStock: 0,
          productIds: []
        });
      }
      const item = modelMap.get(key);
      item.productIds.push(p.id);
      const stock = parseInt(p.stock_quantity) || 0;
      if (p.house === 'Showroom') {
        item.showroomStock += stock;
      } else {
        item.headOfficeStock += stock;
      }
      item.totalStock += stock;
      if (p.unit_price && !item.unit_price) item.unit_price = p.unit_price;
      if (p.image_url && !item.image_url) item.image_url = p.image_url;
    });

    return Array.from(modelMap.values()).sort((a, b) => 
      (a.model || '').localeCompare(b.model || '', undefined, { numeric: true })
    );
  }, [brandProducts]);

  // Sales records for the selected brand
  const brandSalesData = useMemo(() => {
    if (!selectedBrand) return { transactions: [], totalQtySold: 0, totalSalesAmount: 0, houseSales: {} };

    const transactions = [];
    let totalQtySold = 0;
    let totalSalesAmount = 0;
    const houseSales = {
      'Head Office': { qty: 0, amount: 0, billsCount: 0 },
      'Showroom': { qty: 0, amount: 0, billsCount: 0 }
    };

    const targetBrandLower = selectedBrand.trim().toLowerCase();

    rawChalans.forEach(ch => {
      const chTime = new Date(ch.created_at).getTime();
      const inDateRange = chTime >= dateRange.start && chTime <= dateRange.end;

      const isPaid = ch.status === 'paid';
      const isTransfer = ch.is_in_house === true || String(ch.is_in_house).toLowerCase() === 'true';

      if (ch.chalan_items && Array.isArray(ch.chalan_items)) {
        ch.chalan_items.forEach(item => {
          const itemBrand = item.products?.name ? item.products.name.trim().toLowerCase() : '';
          
          if (itemBrand === targetBrandLower) {
            const qty = item.quantity || 0;
            const unitPrice = item.unit_price || (item.products?.unit_price || 0);
            const lineTotal = item.total_price || (qty * unitPrice);
            const house = ch.house || 'Head Office';

            if (isPaid && inDateRange && !isTransfer) {
              totalQtySold += qty;
              totalSalesAmount += lineTotal;

              if (!houseSales[house]) {
                houseSales[house] = { qty: 0, amount: 0, billsCount: 0 };
              }
              houseSales[house].qty += qty;
              houseSales[house].amount += lineTotal;
              houseSales[house].billsCount += 1;

              transactions.push({
                id: item.id,
                chalanId: ch.id,
                chalanNo: ch.chalan_no || 'N/A',
                billNo: ch.bill_no || 'N/A',
                date: ch.created_at,
                customerName: ch.customer_name || ch.customers?.name || 'Walk-in',
                phone: ch.phone || ch.customers?.phone || 'N/A',
                house: house,
                productName: `${item.products?.name || selectedBrand} - ${item.products?.model || ''}`,
                category: item.products?.category || 'General',
                model: item.products?.model || '',
                quantity: qty,
                unitPrice: unitPrice,
                totalPrice: lineTotal,
                status: ch.status
              });
            } else if (inDateRange) {
              // Non-paid or transfer items logged for complete tracking
              transactions.push({
                id: item.id,
                chalanId: ch.id,
                chalanNo: ch.chalan_no || 'N/A',
                billNo: ch.bill_no || 'N/A',
                date: ch.created_at,
                customerName: isTransfer ? `Transfer to ${ch.transfer_to || 'Other'}` : (ch.customer_name || ch.customers?.name || 'Pending'),
                phone: ch.phone || ch.customers?.phone || 'N/A',
                house: house,
                productName: `${item.products?.name || selectedBrand} - ${item.products?.model || ''}`,
                category: item.products?.category || 'General',
                model: item.products?.model || '',
                quantity: qty,
                unitPrice: unitPrice,
                totalPrice: lineTotal,
                status: ch.status,
                isTransfer
              });
            }
          }
        });
      }
    });

    return {
      transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
      totalQtySold,
      totalSalesAmount,
      houseSales
    };
  }, [selectedBrand, rawChalans, dateRange]);

  // Model-wise performance with combined sales
  const modelStats = useMemo(() => {
    if (!brandModels.length) return [];
    
    return brandModels.map(m => {
      let soldQty = 0;
      let salesAmount = 0;

      brandSalesData.transactions.forEach(t => {
        if (!t.isTransfer && t.status === 'paid' && t.model.toLowerCase() === m.model.toLowerCase() && t.category.toLowerCase() === m.category.toLowerCase()) {
          soldQty += t.quantity;
          salesAmount += t.totalPrice;
        }
      });

      return {
        ...m,
        soldQty,
        salesAmount
      };
    });
  }, [brandModels, brandSalesData]);

  // Serials for this brand
  const brandSerials = useMemo(() => {
    if (!selectedBrand) return [];
    const targetBrandLower = selectedBrand.trim().toLowerCase();
    return rawSerials.filter(s => {
      const bName = (s.brand || '').trim().toLowerCase();
      return bName === targetBrandLower;
    });
  }, [selectedBrand, rawSerials]);

  // Stock Totals
  const stockSummary = useMemo(() => {
    let headOfficeStock = 0;
    let showroomStock = 0;
    let totalStock = 0;
    let totalValuation = 0;

    brandProducts.forEach(p => {
      const q = parseInt(p.stock_quantity) || 0;
      const price = parseFloat(p.unit_price) || 0;
      totalStock += q;
      totalValuation += (q * price);

      if (p.house === 'Showroom') {
        showroomStock += q;
      } else {
        headOfficeStock += q;
      }
    });

    return { headOfficeStock, showroomStock, totalStock, totalValuation };
  }, [brandProducts]);

  // Filtered Model List for Table
  const filteredModels = useMemo(() => {
    return modelStats.filter(m => {
      const matchCat = categoryFilter === 'all' || m.category === categoryFilter;
      const matchSearch = !searchModel.trim() || 
        m.model.toLowerCase().includes(searchModel.toLowerCase()) || 
        m.category.toLowerCase().includes(searchModel.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [modelStats, categoryFilter, searchModel]);

  // Categories present in this brand
  const brandCategories = useMemo(() => {
    return Array.from(new Set(brandModels.map(m => m.category))).filter(Boolean);
  }, [brandModels]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!selectedBrand) return;

    // 1. Summary Sheet
    const summaryData = [
      { Parameter: 'Brand Name', Value: selectedBrand },
      { Parameter: 'Total Models', Value: brandModels.length },
      { Parameter: 'Total Units Sold', Value: brandSalesData.totalQtySold },
      { Parameter: 'Total Sales Revenue (BDT)', Value: brandSalesData.totalSalesAmount },
      { Parameter: 'Total Stock Available', Value: stockSummary.totalStock },
      { Parameter: 'Head Office Stock', Value: stockSummary.headOfficeStock },
      { Parameter: 'Showroom Stock', Value: stockSummary.showroomStock },
      { Parameter: 'Estimated Stock Valuation (BDT)', Value: stockSummary.totalValuation },
      { Parameter: 'Head Office Sales (BDT)', Value: brandSalesData.houseSales['Head Office']?.amount || 0 },
      { Parameter: 'Showroom Sales (BDT)', Value: brandSalesData.houseSales['Showroom']?.amount || 0 },
      { Parameter: 'Report Generated At', Value: new Date().toLocaleString() }
    ];

    // 2. Models Sheet
    const modelsData = modelStats.map(m => ({
      Category: m.category,
      Model: m.model,
      'Unit Price (BDT)': m.unit_price,
      'Head Office Stock': m.headOfficeStock,
      'Showroom Stock': m.showroomStock,
      'Total Stock': m.totalStock,
      'Units Sold': m.soldQty,
      'Sales Revenue (BDT)': m.salesAmount,
      Status: m.totalStock > 0 ? 'In Stock' : 'Out of Stock'
    }));

    // 3. Transactions Sheet
    const salesData = brandSalesData.transactions.map(t => ({
      'Date': formatDate(t.date),
      'Bill No': t.billNo,
      'Chalan No': t.chalanNo,
      'Customer': t.customerName,
      'Phone': t.phone,
      'Warehouse': t.house,
      'Category': t.category,
      'Model': t.model,
      'Quantity': t.quantity,
      'Unit Price': t.unitPrice,
      'Total Price': t.totalPrice,
      'Status': t.status
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsModels = XLSX.utils.json_to_sheet(modelsData);
    const wsSales = XLSX.utils.json_to_sheet(salesData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Brand Summary');
    XLSX.utils.book_append_sheet(wb, wsModels, 'Models & Stock');
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Log');

    XLSX.writeFile(wb, `${selectedBrand}_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Brand Metadata helper
  const currentBrandMeta = selectedBrand ? (brandMetadataMap[selectedBrand.toLowerCase()] || {}) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-[#f8fafc]">
      
      {/* 🌟 Top Header & Actions */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ea3838] to-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Product Brand <span className="text-slate-400 text-lg font-bold">/ প্রোডাক্ট ব্র্যান্ড</span>
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                Manage brand catalog, housewise inventory distribution, and sales analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchAllData();
            }}
            disabled={refreshing}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95"
            title="Refresh database records"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'আপডেট হচ্ছে...' : 'রিফ্রেশ'}</span>
          </button>

          <button
            onClick={() => {
              setBrandFormName('');
              setBrandFormOrigin('');
              setBrandFormDesc('');
              setBrandFormLogo('');
              setShowAddBrandModal(true);
            }}
            className="px-5 py-2.5 bg-[#ea3838] hover:bg-red-600 text-white rounded-xl font-black text-xs sm:text-sm transition-all shadow-md shadow-red-500/25 flex items-center gap-2 active:scale-95 ml-auto md:ml-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ নতুন ব্র্যান্ড যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* 🏷️ Brand Selection Bar / Quick Chips */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ea3838] animate-pulse"></span>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Select Brand / ব্র্যান্ড নির্বাচন করুন ({brands.length})
            </h2>
          </div>
          {selectedBrand && (
            <button
              onClick={() => setSelectedBrand(null)}
              className="text-xs font-bold text-slate-400 hover:text-[#ea3838] transition-colors"
            >
              ✕ ডিসিলেক্ট করুন
            </button>
          )}
        </div>

        {brands.length === 0 && !loading ? (
          <div className="text-center py-8 text-slate-400 font-bold text-sm">
            কোনো ব্র্যান্ড পাওয়া যায়নি। উপরে "+ নতুন ব্র্যান্ড যোগ করুন" বাটনে ক্লিক করে ব্র্যান্ড যোগ করুন।
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {brands.map(b => {
              const isSelected = selectedBrand === b;
              const meta = brandMetadataMap[b.toLowerCase()] || {};
              const count = rawProducts.filter(p => (p.name || '').toLowerCase() === b.toLowerCase()).length;
              
              return (
                <button
                  key={b}
                  onClick={() => setSelectedBrand(isSelected ? null : b)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative group ${
                    isSelected 
                      ? 'bg-gradient-to-br from-red-50 to-orange-50 border-[#ea3838] shadow-md shadow-red-500/10 ring-2 ring-[#ea3838]/20' 
                      : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 overflow-hidden ${
                      isSelected ? 'bg-[#ea3838] text-white' : 'bg-white text-slate-700 shadow-sm border border-slate-200'
                    }`}>
                      {meta.logo ? (
                        <img src={meta.logo} alt={b} className="w-full h-full object-cover" />
                      ) : (
                        b.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className={`font-black text-sm truncate ${isSelected ? 'text-[#ea3838]' : 'text-slate-800'}`}>
                      {b}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>{count} models</span>
                    {isSelected && (
                      <span className="text-[10px] bg-[#ea3838] text-white px-2 py-0.5 rounded-full font-black">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 🧭 Main Content Area */}
      {!selectedBrand ? (
        /* 📭 Initial / Empty State Before Selecting a Brand */
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200/80 flex flex-col items-center justify-center min-h-[420px]">
          <div className="w-20 h-20 rounded-3xl bg-red-50 text-[#ea3838] flex items-center justify-center mb-5 text-3xl shadow-inner border border-red-100">
            🏷️
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-2">
            একটি ব্র্যান্ড নির্বাচন করুন
          </h2>
          <p className="text-slate-500 font-medium text-sm max-w-md mb-6 leading-relaxed">
            ব্র্যান্ডের মোট বিক্রয়, পরিমাণ, গুদামভিত্তিক (Head Office vs Showroom) স্টক তথ্য এবং মডেল বিবরণ দেখতে ওপরের তালিকা থেকে একটি ব্র্যান্ড বেছে নিন।
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {brands.slice(0, 5).map(b => (
              <button
                key={b}
                onClick={() => setSelectedBrand(b)}
                className="px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-[#ea3838] hover:border-red-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-all"
              >
                {b} →
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* 📊 Detailed Brand View When a Brand is Selected */
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          
          {/* 👑 Selected Brand Hero Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-[#ea3838]/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-black text-2xl shadow-xl overflow-hidden shrink-0 border-2 border-white/20">
                  {currentBrandMeta?.logo ? (
                    <img src={currentBrandMeta.logo} alt={selectedBrand} className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="bg-gradient-to-br from-[#ea3838] to-red-600 bg-clip-text text-transparent">
                      {selectedBrand.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{selectedBrand}</h2>
                    {currentBrandMeta?.origin && (
                      <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-slate-300 border border-white/10">
                        📍 {currentBrandMeta.origin}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-black border border-red-500/30">
                      {brandModels.length} Models
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 max-w-xl line-clamp-2">
                    {currentBrandMeta?.description || `${selectedBrand} solar equipment and electronics brand catalog overview.`}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={openEditActiveBrand}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs sm:text-sm backdrop-blur-md transition-all flex items-center gap-2 border border-white/10"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>ব্র্যান্ড এডিট</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>এক্সেল এক্সপোর্ট (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Date Range Filter Toolbar inside Hero */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400">সময়কাল ফিল্টার:</span>
                {[
                  { id: 'all', label: 'সর্বকাল (All Time)' },
                  { id: 'month', label: 'চলতি মাস' },
                  { id: 'year', label: 'চলতি বছর' },
                  { id: 'today', label: 'আজ' },
                  { id: 'custom', label: 'কাস্টম ডেট' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDateFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      dateFilter === tab.id
                        ? 'bg-[#ea3838] text-white shadow-md shadow-red-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/10">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent text-white text-xs px-2 py-1 outline-none font-bold"
                  />
                  <span className="text-slate-400 text-xs">থেকে</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent text-white text-xs px-2 py-1 outline-none font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 📈 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Sales Revenue */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Total Sales Amount</span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  ৳
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                {formatCurrency(brandSalesData.totalSalesAmount)}
              </h3>
              <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
                <span>✓</span> পরিশোধিত বিলসমূহ থেকে
              </p>
            </div>

            {/* Card 2: Quantity Sold */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Quantity Sold</span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                  📦
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                {brandSalesData.totalQtySold} <span className="text-sm text-slate-400 font-bold">পিস</span>
              </h3>
              <p className="text-xs font-bold text-blue-600 mt-2 flex items-center gap-1">
                মোট বিক্রিত পণ্যের পরিমাণ
              </p>
            </div>

            {/* Card 3: Total Stock Available */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Current In-Stock</span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                  🏬
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                {stockSummary.totalStock} <span className="text-sm text-slate-400 font-bold">পিস</span>
              </h3>
              <p className="text-xs font-bold text-amber-600 mt-2">
                মূল্য: {formatCurrency(stockSummary.totalValuation)}
              </p>
            </div>

            {/* Card 4: Total Models / Products */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Active Models</span>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
                  ⚡
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                {brandModels.length} <span className="text-sm text-slate-400 font-bold">মডেল</span>
              </h3>
              <p className="text-xs font-bold text-purple-600 mt-2">
                {brandCategories.join(', ') || 'Various Categories'}
              </p>
            </div>
          </div>

          {/* 🏢 Housewise (Warehouse) Information Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Housewise Breakdown / গুদামভিত্তিক তথ্য
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Comparison between Head Office and Showroom inventory and sales performance
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Head Office Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-md">
                      HO
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">Head Office</h4>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">প্রধান কার্যালয় ও কেন্দ্রীয় গুদাম</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-slate-200/80 text-slate-700 font-bold text-xs rounded-full">
                    গুদাম ১
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">স্টক পরিমাণ</span>
                    <span className="text-xl font-black text-slate-900">{stockSummary.headOfficeStock}</span>
                    <span className="text-xs text-slate-400 font-bold ml-1">পিস</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">বিক্রিত পরিমাণ</span>
                    <span className="text-xl font-black text-blue-600">{brandSalesData.houseSales['Head Office']?.qty || 0}</span>
                    <span className="text-xs text-slate-400 font-bold ml-1">পিস</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">মোট বিক্রয় (হেড অফিস)</span>
                    <span className="text-xl font-black text-emerald-600">{formatCurrency(brandSalesData.houseSales['Head Office']?.amount || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Showroom Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-red-50/50 to-orange-50/40 border border-red-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ea3838] text-white flex items-center justify-center font-black text-sm shadow-md shadow-red-500/20">
                      SR
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">Showroom (নওয়াবপুর)</h4>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">শো-রুম ও ডিরেক্ট সেলস কাউন্টার</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-[#ea3838] font-bold text-xs rounded-full">
                    গুদাম ২
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-white p-3.5 rounded-xl border border-red-100/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">স্টক পরিমাণ</span>
                    <span className="text-xl font-black text-slate-900">{stockSummary.showroomStock}</span>
                    <span className="text-xs text-slate-400 font-bold ml-1">পিস</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-red-100/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">বিক্রিত পরিমাণ</span>
                    <span className="text-xl font-black text-blue-600">{brandSalesData.houseSales['Showroom']?.qty || 0}</span>
                    <span className="text-xs text-slate-400 font-bold ml-1">পিস</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-red-100/80 col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">মোট বিক্রয় (শো-রুম)</span>
                    <span className="text-xl font-black text-emerald-600">{formatCurrency(brandSalesData.houseSales['Showroom']?.amount || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 📑 Detail Tabs (Models, Recent Sales, Serials) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            {/* Tab Selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                {[
                  { id: 'models', label: `মডেল ও স্টক (${brandModels.length})`, icon: '⚡' },
                  { id: 'sales', label: `বিক্রয় ও চালান লগ (${brandSalesData.transactions.length})`, icon: '📄' },
                  { id: 'serials', label: `ইনভার্টার সিরিয়াল ও ওয়ারেন্টি (${brandSerials.length})`, icon: '🔢' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id === 'models' ? 'overview' : t.id)}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 ${
                      (activeTab === 'overview' && t.id === 'models') || activeTab === t.id
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-650'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Sub-Filters for Models tab */}
              {(activeTab === 'overview' || activeTab === 'models') && (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#ea3838]"
                  >
                    <option value="all">সকল ক্যাটাগরি</option>
                    {brandCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="মডেল সার্চ..."
                      value={searchModel}
                      onChange={e => setSearchModel(e.target.value)}
                      className="px-3 py-2 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#ea3838] w-40 sm:w-48"
                    />
                    <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Tab 1: Models & Stock Breakdown */}
            {(activeTab === 'overview' || activeTab === 'models') && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black text-[11px] uppercase tracking-wider border-y border-slate-100">
                      <th className="py-3 px-4">মডেল ও ক্যাটাগরি</th>
                      <th className="py-3 px-4">রেগুলার MRP</th>
                      <th className="py-3 px-4 text-center">Head Office</th>
                      <th className="py-3 px-4 text-center">Showroom</th>
                      <th className="py-3 px-4 text-center">মোট স্টক</th>
                      <th className="py-3 px-4 text-center">বিক্রিত পরিমাণ</th>
                      <th className="py-3 px-4 text-right">মোট বিক্রয়মূল্য</th>
                      <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {filteredModels.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                          কোনো মডেল পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      filteredModels.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {m.image_url ? (
                                <img src={m.image_url} alt={m.model} className="w-9 h-9 rounded-lg object-cover border border-slate-200" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs">
                                  📦
                                </div>
                              )}
                              <div>
                                <span className="font-black text-slate-900 block">{m.model}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{m.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-black text-slate-800">
                            {formatCurrency(m.unit_price)}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                            {m.headOfficeStock}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                            {m.showroomStock}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-slate-900">
                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg">
                              {m.totalStock}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-blue-600">
                            {m.soldQty}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                            {formatCurrency(m.salesAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {m.totalStock > 0 ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[11px] font-black">
                                In Stock
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-[11px] font-black">
                                Out of Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: Sales & Challan History */}
            {activeTab === 'sales' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black text-[11px] uppercase tracking-wider border-y border-slate-100">
                      <th className="py-3 px-4">তারিখ</th>
                      <th className="py-3 px-4">বিল / চালান</th>
                      <th className="py-3 px-4">গ্রাহক</th>
                      <th className="py-3 px-4">মডেল</th>
                      <th className="py-3 px-4 text-center">গুদাম</th>
                      <th className="py-3 px-4 text-center">পরিমাণ</th>
                      <th className="py-3 px-4 text-right">দর</th>
                      <th className="py-3 px-4 text-right">মোট টাকা</th>
                      <th className="py-3 px-4 text-center">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {brandSalesData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                          এই সময়ে কোনো বিক্রয় রেকর্ড পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      brandSalesData.transactions.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-semibold">
                            {formatDate(t.date)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-black text-slate-900 block">#{t.billNo !== 'N/A' ? t.billNo : t.chalanNo}</span>
                            {t.chalanNo !== 'N/A' && t.billNo !== 'N/A' && (
                              <span className="text-[10px] text-slate-400">Chl: #{t.chalanNo}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-black text-slate-800 block">{t.customerName}</span>
                            <span className="text-[10px] text-slate-400">{t.phone}</span>
                          </td>
                          <td className="py-3 px-4 font-black text-slate-900">
                            {t.model}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              t.house === 'Showroom' ? 'bg-red-50 text-[#ea3838]' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {t.house}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-black text-blue-600">
                            {t.quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-600">
                            {formatCurrency(t.unitPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600">
                            {formatCurrency(t.totalPrice)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              t.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                              t.status === 'hold' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Serial Numbers & Warranty Tracking */}
            {activeTab === 'serials' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black text-[11px] uppercase tracking-wider border-y border-slate-100">
                      <th className="py-3 px-4">সিরিয়াল নাম্বার</th>
                      <th className="py-3 px-4">মডেল</th>
                      <th className="py-3 px-4">ক্যাটাগরি</th>
                      <th className="py-3 px-4 text-center">গুদাম</th>
                      <th className="py-3 px-4">চালান নং</th>
                      <th className="py-3 px-4">বিল নং</th>
                      <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {brandSerials.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                          এই ব্র্যান্ডের কোনো সিরিয়াল নাম্বার এন্ট্রি পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      brandSerials.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-black text-slate-900">
                            {s.serial_no}
                          </td>
                          <td className="py-3 px-4 font-black text-slate-800">
                            {s.model || 'Standard'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {s.category || 'Inverter'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                              {s.house || 'Head Office'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono">
                            {s.chalan_no || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono">
                            {s.bill_no || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              s.status === 'sold' || s.bill_no ? 'bg-emerald-50 text-emerald-600' :
                              s.status === 'serviced' ? 'bg-blue-50 text-blue-600' :
                              s.status === 'broken' ? 'bg-red-50 text-red-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {s.status || (s.bill_no ? 'Sold' : 'In Stock')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 🪄 Modal: Add / Edit Brand Manually */}
      {showAddBrandModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ea3838] flex items-center justify-center text-xl font-black">
                  🏷️
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {brandFormName && brands.includes(brandFormName) ? 'ব্র্যান্ড এডিট করুন' : 'নতুন ব্র্যান্ড যোগ করুন'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">Add or update brand information</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBrandModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Brand Name / ব্র্যান্ডের নাম *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: SolarOn, Inhenergy, LEFN"
                  value={brandFormName}
                  onChange={e => setBrandFormName(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-[#ea3838] focus:bg-white text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Country of Origin / মূল দেশ
                </label>
                <input
                  type="text"
                  placeholder="যেমন: Germany, China, Japan"
                  value={brandFormOrigin}
                  onChange={e => setBrandFormOrigin(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-[#ea3838] focus:bg-white text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Brand Logo / ব্র্যান্ড লোগো
                </label>
                <div className="flex items-center gap-3">
                  {brandFormLogo ? (
                    <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0 overflow-hidden relative group">
                      <img src={brandFormLogo} alt="Logo preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setBrandFormLogo('')}
                        className="absolute inset-0 bg-slate-900/70 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <label className="flex-1 cursor-pointer">
                    <div className="p-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-center transition-all">
                      <span className="text-xs font-bold text-slate-650">
                        {uploadingLogo ? 'লোগো আপলোড হচ্ছে...' : '📁 লোগো ছবি নির্বাচন করুন'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Description / সংক্ষিপ্ত বিবরণ
                </label>
                <textarea
                  rows={3}
                  placeholder="ব্র্যান্ড সম্পর্কে কিছু লিখুন..."
                  value={brandFormDesc}
                  onChange={e => setBrandFormDesc(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-[#ea3838] focus:bg-white text-sm transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddBrandModal(false)}
                  className="px-5 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-sm transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingBrand || uploadingLogo}
                  className="px-6 py-3 bg-[#ea3838] hover:bg-red-600 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-red-500/25 active:scale-95"
                >
                  {savingBrand ? 'সংরক্ষণ হচ্ছে...' : 'ব্র্যান্ড সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductBrand;
