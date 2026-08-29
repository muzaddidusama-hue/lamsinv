import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import lamsLogo from '../assets/lams-logo.webp';
import solarOnInverter from '../assets/solar-on-inverter.webp';
import inhenergyImg from '../assets/inhenergy.webp';
import solarPanel12v from '../assets/solar-panel-12v.webp';
import solarPanel24v from '../assets/solar-panel-24v.webp';
import productsImg from '../assets/products-image.webp';
import solarOn3600Img from '../assets/solaron-3600.webp';
import OptimizedImage from './OptimizedImage';

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

// Smart wattage parser
const parseSmartWattage = (input) => {
  if (input === null || input === undefined || input === '') return null;
  const str = String(input).toLowerCase().trim();
  // Extract numeric part and unit (kw, w, va)
  const match = str.match(/([\d.]+)\s*(kw|w|va)?/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2];
  if (isNaN(num)) return null;

  if (unit === 'kw') {
    return num * 1000;
  } else if (unit === 'w' || unit === 'va') {
    return num;
  } else {
    // Smart auto-detection for numbers without unit
    // If num < 40, assume kW (e.g. 3.2 -> 3200W, 12 -> 12000W)
    // Otherwise, assume Watts (e.g. 50 -> 50W, 550 -> 550W)
    if (num < 40) {
      return num * 1000;
    }
    return num;
  }
};

// Resolve wattage from product fields
const getProductWattageVal = (p) => {
  if (p.watt) {
    const parsed = parseSmartWattage(p.watt);
    if (parsed !== null) return parsed;
  }
  if (p.model) {
    const parsed = parseSmartWattage(p.model);
    if (parsed !== null) return parsed;
  }
  return null;
};

const AnimatedCounter = ({ target, duration = 1500, trigger = false }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) {
      setCount(0);
      return;
    }
    let start = 0;
    const end = parseInt(target, 10);
    if (isNaN(end) || end === 0) {
      setCount(0);
      return;
    }
    
    const totalSteps = 50;
    const stepTime = duration / totalSteps;
    const increment = end / totalSteps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target, duration, trigger]);

  return <span>{count}</span>;
};

const PublicCatalog = ({ onAdminClick }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [siteSettings, setSiteSettings] = useState({});
  const [currentSliderIdx, setCurrentSliderIdx] = useState(0);
  const counterRef = useRef(null);
  const [isCounterVisible, setIsCounterVisible] = useState(false);
  const [landingConfig, setLandingConfig] = useState({
    about_profile_title: 'Brief Company Profile',
    about_profile_text: "Founded in 2010, Lams Power has established itself as a trusted leader and pioneer in Bangladesh's renewable energy sector. We specialize in the import, marketing, and distribution of top-tier solar equipment, driven by a steadfast commitment to promoting sustainable and green energy solutions nationwide.",
    about_quality_title: 'Operations & Quality Assurance',
    about_quality_text: "At Lams Power, quality is at the core of our operations. We maintain a comprehensive and carefully curated catalog of advanced solar technology, specializing in high-efficiency solar panels and cutting-edge inverters from globally recognized brands.",
    category_images: {
      "Hybrid Inverter": solarOnInverter,
      "On Grid Inverter": inhenergyImg,
      "Solar Panel 12V": solarPanel12v,
      "Solar Panel 24V": solarPanel24v
    },
    featured_keys: [],
    featured_text: 'Currently SolarOn 3600VA and 6200VA are our new arrival products',
    featured_custom_images: {},
    featured_banner_title: 'Premium Solar Solutions',
    featured_banner_desc: 'Experience top-tier quality solar equipment manufactured under strict environmental and safety compliance standards.',
    featured_banner_image_url: '',
    actual_footer_image: productsImg
  });
  const [loading, setLoading] = useState(true);
  const [selectedModalProduct, setSelectedModalProduct] = useState(null);
  
  // Navigation tabs: 'home', 'products', 'contact'
  const [activeTab, setActiveTab] = useState('home');
  // Category selection under products tab: 'All' or specific categories
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  // Catalog Live Search state
  const [productSearch, setProductSearch] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [minWattInput, setMinWattInput] = useState('');
  const [maxWattInput, setMaxWattInput] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Interactive specs card showcase queue and hover state
  const [showcaseQueue, setShowcaseQueue] = useState([]);
  const [isShowcaseHovered, setIsShowcaseHovered] = useState(false);

  // Autoplay states for Regular Use Collections
  const [regularUseIndices, setRegularUseIndices] = useState({
    "Hybrid Inverter": 0,
    "On-grid Inverter": 0,
    "Solar Panel - 12 Volt": 0,
    "Solar Panel - 24 Volt": 0
  });
  const [isRegularUseHovered, setIsRegularUseHovered] = useState(false);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .or('is_hidden.is.null,is_hidden.eq.false')
        .in('house', ['Head Office', 'Showroom']);
      setProducts(prodData || []);
      
      const { data: settingsData } = await supabase.from('site_settings').select('*').single();
      if (settingsData) {
        setSiteSettings(settingsData);
        
        if (settingsData.footer_image_url && settingsData.footer_image_url.startsWith('{')) {
          try {
            const parsed = JSON.parse(settingsData.footer_image_url);
            setLandingConfig(prev => ({
              ...prev,
              ...parsed
            }));
          } catch (e) {
            console.error("Error parsing landing settings:", e);
            if (settingsData.footer_image_url) {
              setLandingConfig(prev => ({ ...prev, actual_footer_image: settingsData.footer_image_url }));
            }
          }
        } else if (settingsData.footer_image_url) {
          setLandingConfig(prev => ({ ...prev, actual_footer_image: settingsData.footer_image_url }));
        }
      }
      
      setLoading(false);
    };
    fetchData();
  }, []);

  // SEO Update
  useEffect(() => {
    if (siteSettings.header_name) {
      document.title = `${siteSettings.header_name} | Premium Solar Energy Solutions`;
    }
  }, [siteSettings]);

  useEffect(() => {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    const descText = landingConfig.about_profile_text || "Lams Power is a trusted pioneer in Bangladesh's renewable energy sector.";
    metaDesc.setAttribute('content', descText.substring(0, 160));
  }, [landingConfig.about_profile_text]);

  // Image Slider timer
  useEffect(() => {
    if (!landingConfig?.slider_images || landingConfig.slider_images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSliderIdx((prev) => (prev + 1) % landingConfig.slider_images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [landingConfig?.slider_images]);

  // Intersection observer for animated counter
  useEffect(() => {
    if (loading || !counterRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsCounterVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(counterRef.current);
    return () => observer.disconnect();
  }, [loading]);

  const categories = [
    "Hybrid Inverter",
    "On-grid Inverter",
    "Solar Panel - 12 Volt",
    "Solar Panel - 24 Volt"
  ];
  
  const twelveVoltBrands = ['powerland', 'sunland', 'sunland extreme'];

  // De-duplicate products by category + name + model, summing their stock quantity
  const getDeDuplicatedProductsList = (rawProducts) => {
    const map = {};

    rawProducts.forEach(p => {
      if (p.is_hidden || (p.house !== 'Head Office' && p.house !== 'Showroom')) return;
      
      const cat = p.category ? p.category.trim() : '';
      const name = p.name ? p.name.trim() : '';
      const model = p.model ? p.model.trim() : '';
      const key = `${cat}|${name}|${model}`;

      if (!map[key]) {
        map[key] = {
          ...p,
          stock_quantity: 0,
          availabilities: new Set()
        };
      } else {
        if (p.image_url) {
          const currentImg = map[key].image_url || '';
          const newImg = p.image_url || '';
          if (newImg.includes('supabase.co') && !currentImg.includes('supabase.co')) {
            map[key].image_url = newImg;
          } else if (!currentImg && newImg) {
            map[key].image_url = newImg;
          }
        }
      }

      map[key].stock_quantity += Number(p.stock_quantity) || 0;
      if (p.availability) {
        map[key].availabilities.add(p.availability.trim().toLowerCase());
      }
    });

    return Object.values(map).map(p => {
      let finalAvailability = 'out of stock';
      if (p.availabilities.has('in stock')) {
        finalAvailability = 'in stock';
      } else if (p.availabilities.has('upcoming')) {
        finalAvailability = 'upcoming';
      }
      
      return {
        ...p,
        availability: finalAvailability
      };
    });
  };

  // Filter individual models with stock quantity >= 10 and no duplicates
  const getFilteredProductsList = (cat) => {
    const deDuplicated = getDeDuplicatedProductsList(products);

    return deDuplicated.filter(p => {
      // Stock quantity check: Must have at least 10 pcs in stock across all houses (except Jarrett in Hybrid Inverter)
      const isJarrettHybrid = p.category === 'Hybrid Inverter' && p.name?.toLowerCase().trim() === 'jarrett';
      if (!isJarrettHybrid && Number(p.stock_quantity) < 10) return false;

      const pNameLower = p.name ? p.name.toLowerCase().trim() : '';
      const pCatLower = p.category ? p.category.toLowerCase().trim() : '';

      // Live search filter matching name, model, category, volt, or watt
      if (productSearch) {
        const searchStr = `${p.name} ${p.model} ${p.category} ${p.volt || ''} ${p.watt || ''}`.toLowerCase();
        if (!searchStr.includes(productSearch.toLowerCase())) return false;
      }

      // 1. Category check
      let matchesCat = false;
      if (cat === 'Solar Panel - 12 Volt') {
        matchesCat = pCatLower === 'solar panel' && twelveVoltBrands.includes(pNameLower);
      } else if (cat === 'Solar Panel - 24 Volt') {
        matchesCat = pCatLower === 'solar panel' && !twelveVoltBrands.includes(pNameLower);
      } else {
        matchesCat = p.category === cat;
      }
      if (!matchesCat) return false;

      // 2. Brand check
      if (selectedBrands.length > 0) {
        if (!selectedBrands.includes(pNameLower)) return false;
      }

      // 3. Watt/kW range check
      const minVal = parseSmartWattage(minWattInput);
      const maxVal = parseSmartWattage(maxWattInput);
      if (minVal !== null || maxVal !== null) {
        const prodWattVal = getProductWattageVal(p);
        if (prodWattVal === null) {
          return false; // User entered range but product wattage cannot be resolved, so hide it
        }
        if (minVal !== null && prodWattVal < minVal) return false;
        if (maxVal !== null && prodWattVal > maxVal) return false;
      }

      return true;
    });
  };

  const getSortedProductsList = (cat) => {
    const list = getFilteredProductsList(cat);
    // Sort products logically by brand name, then model capacity
    return list.sort((a, b) => {
      if (a.name !== b.name) return (a.name || '').localeCompare(b.name || '');
      const capA = parseFloat(a.model.match(/([\d.]+)/)?.[1] || 0);
      const capB = parseFloat(b.model.match(/([\d.]+)/)?.[1] || 0);
      return capA - capB;
    });
  };

  // Group products by brand/name subsection
  const groupProductsByBrand = (prods) => {
    const groups = {};
    prods.forEach(p => {
      const brandName = p.name ? p.name.trim() : 'Other Brand';
      if (!groups[brandName]) {
        groups[brandName] = [];
      }
      groups[brandName].push(p);
    });
    return Object.entries(groups).map(([brandName, brandProds]) => ({
      brandName,
      brandProds
    })).sort((a, b) => a.brandName.localeCompare(b.brandName));
  };

  // Get active product details for the interactive portfolio specs card
  const getShowcaseProduct = (categoryName) => {
    const catProds = getSortedProductsList(categoryName);
    if (catProds.length > 0) {
      return catProds[0];
    }
    // Fallbacks if database is empty
    let fallbackImg = solarOnInverter;
    let fallbackModel = "6200VA";
    let fallbackVolt = "48V";
    let fallbackWatt = "6200W";
    let fallbackName = "SolarOn";

    if (categoryName.includes("On-grid")) {
      fallbackImg = inhenergyImg;
      fallbackModel = "10 kW";
      fallbackVolt = "230V";
      fallbackWatt = "10000W";
      fallbackName = "Inhenergy";
    } else if (categoryName.includes("12 Volt")) {
      fallbackImg = solarPanel12v;
      fallbackModel = "150W";
      fallbackVolt = "12V";
      fallbackWatt = "150W";
      fallbackName = "Powerland";
    } else if (categoryName.includes("24 Volt")) {
      fallbackImg = solarPanel24v;
      fallbackModel = "400W";
      fallbackVolt = "24V";
      fallbackWatt = "400W";
      fallbackName = "Sunland";
    }

    return {
      category: categoryName,
      name: fallbackName,
      model: fallbackModel,
      image_url: fallbackImg,
      volt: fallbackVolt,
      watt: fallbackWatt,
      availability: 'in stock',
      description: 'LAMS premium technology designed for high durability and performance.'
    };
  };

  // Extract de-duplicated list once for featured SolarOn items lookup
  const deDuplicatedProducts = getDeDuplicatedProductsList(products);

  const solarOn3600 = deDuplicatedProducts.find(p => p.name?.toLowerCase().includes('solaron') && p.model?.includes('3600')) || {
    name: 'SolarOn',
    model: '3600VA',
    image_url: solarOn3600Img,
    volt: '24V',
    watt: '3600W',
    availability: 'in stock',
    description: 'High efficiency SolarOn 3600VA hybrid inverter.'
  };

  // Generate 8-10 models list from database for the autoplay switcher
  const getShowcaseModelsList = () => {
    const targetBrands = [
      'Inhenergy',
      'JFY',
      'SolarOn',
      'AE Solar',
      'LEFN',
      'Powerland',
      'Sunland',
      'Sunland Extreme'
    ];

    const inStock = deDuplicatedProducts.filter(p => Number(p.stock_quantity) >= 10);

    const fallbacks = {
      'inhenergy': { category: "On-grid Inverter", name: "Inhenergy", model: "10 kW", image_url: inhenergyImg, volt: "230V", watt: "10000W", availability: "in stock", description: "Inhenergy 10kW On-grid inverter." },
      'jfy': { category: "On-grid Inverter", name: "JFY", model: "3000TL", image_url: inhenergyImg, volt: "550VDC", watt: "4500W", availability: "in stock", description: "JFY 3000TL On-grid inverter." },
      'solaron': { category: "Hybrid Inverter", name: "SolarOn", model: "3600VA", image_url: solarOn3600Img, volt: "24V", watt: "3600W", availability: "in stock", description: "High efficiency SolarOn 3600VA hybrid inverter." },
      'ae solar': { category: "Solar Panel - 24 Volt", name: "AE Solar", model: "400W", image_url: solarPanel24v, volt: "24V", watt: "400W", availability: "in stock", description: "AE Solar 24V Premium Panel." },
      'lefn': { category: "Solar Panel - 24 Volt", name: "LEFN", model: "380W", image_url: solarPanel24v, volt: "24V", watt: "380W", availability: "in stock", description: "LEFN 24V High Performance Panel." },
      'powerland': { category: "Solar Panel - 12 Volt", name: "Powerland", model: "150W", image_url: solarPanel12v, volt: "12V", watt: "150W", availability: "in stock", description: "Powerland 12V Solar Panel." },
      'sunland': { category: "Solar Panel - 12 Volt", name: "Sunland", model: "200W", image_url: solarPanel12v, volt: "12V", watt: "200W", availability: "in stock", description: "Sunland 12V Solar Panel." },
      'sunland extreme': { category: "Solar Panel - 24 Volt", name: "Sunland Extreme", model: "400W", image_url: solarPanel24v, volt: "24V", watt: "400W", availability: "in stock", description: "Sunland Extreme 24V Solar Panel." }
    };

    const finalModels = [];

    targetBrands.forEach(brand => {
      // 1. Try to find in-stock models (stock >= 10)
      let brandProds = inStock.filter(p => p.name?.toLowerCase().trim() === brand.toLowerCase());
      
      // 2. If none, search the entire database deduplicated list (even if stock < 10)
      if (brandProds.length === 0) {
        brandProds = deDuplicatedProducts.filter(p => p.name?.toLowerCase().trim() === brand.toLowerCase());
      }
      
      if (brandProds.length > 0) {
        const randomIdx = Math.floor(Math.random() * brandProds.length);
        finalModels.push(brandProds[randomIdx]);
      } else {
        finalModels.push(fallbacks[brand.toLowerCase()]);
      }
    });

    return finalModels;
  };

  // Initialize showcaseQueue once products are fetched
  useEffect(() => {
    if (products.length === 0) return;
    const pool = getShowcaseModelsList();
    if (pool.length >= 5) {
      setShowcaseQueue(pool.slice(0, 5));
    } else {
      setShowcaseQueue(pool);
    }
  }, [products]);

  // Autoplay conveyor-belt effect (Shifts out top model, appends a new brand model at the 5th position)
  useEffect(() => {
    if (showcaseQueue.length === 0 || isShowcaseHovered) return;

    const interval = setInterval(() => {
      setShowcaseQueue(prevQueue => {
        if (prevQueue.length < 5) return prevQueue;

        const pool = getShowcaseModelsList();
        const nextQueue = prevQueue.slice(1);

        // Find brands not in nextQueue to ensure no more than 1 model of the same product/brand
        const currentBrands = nextQueue.map(p => p.name?.toLowerCase().trim());
        const candidates = pool.filter(p => !currentBrands.includes(p.name?.toLowerCase().trim()));

        let newItem = null;
        if (candidates.length > 0) {
          newItem = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          newItem = pool[Math.floor(Math.random() * pool.length)];
        }

        return [...nextQueue, newItem];
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [showcaseQueue.length, isShowcaseHovered]);

  const handleShowcaseItemClick = (idx) => {
    if (idx === 0) return;
    setShowcaseQueue(prevQueue => {
      const clickedItem = prevQueue[idx];
      const rest = prevQueue.filter((_, i) => i !== idx);
      return [clickedItem, ...rest];
    });
  };

  const activeShowcaseProduct = showcaseQueue[0] || {
    category: "Hybrid Inverter",
    name: "SolarOn",
    model: "3600VA",
    image_url: "https://i.postimg.cc/NfbsgbhR/Solar-On-Inverter.png",
    volt: "24V",
    watt: "3600W",
    availability: "in stock",
    description: "High efficiency SolarOn 3600VA hybrid inverter."
  };

  // Autoplay conveyor-belt effect for Regular Use Collections
  useEffect(() => {
    if (products.length === 0 || isRegularUseHovered) return;

    const interval = setInterval(() => {
      setRegularUseIndices(prev => {
        const next = { ...prev };
        categories.forEach(c => {
          const list = getSortedProductsList(c);
          const len = list.length;
          if (len > 1) {
            next[c] = (prev[c] + 1) % len;
          } else {
            next[c] = 0;
          }
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [products, isRegularUseHovered]);

  const getRegularUseShowcaseProduct = (categoryName) => {
    const list = getSortedProductsList(categoryName);
    if (list.length > 0) {
      const idx = regularUseIndices[categoryName] || 0;
      const activeIdx = idx < list.length ? idx : 0;
      return list[activeIdx];
    }
    return getShowcaseProduct(categoryName);
  };

  // Dynamic clean display mapping
  const getDisplayCategoryName = (c) => {
    if (c === 'Solar Panel - 12 Volt') return 'Solar Panel 12V';
    if (c === 'Solar Panel - 24 Volt') return 'Solar Panel 24V';
    if (c === 'On-grid Inverter') return 'On Grid Inverter';
    return c;
  };

  // Helper to get all brands available in the selected category
  const getAvailableBrandsForCategory = () => {
    const deDuplicated = getDeDuplicatedProductsList(products);
    // Filter by stock and category (but NOT by brand or wattage range)
    const filtered = deDuplicated.filter(p => {
      const isJarrettHybrid = p.category === 'Hybrid Inverter' && p.name?.toLowerCase().trim() === 'jarrett';
      if (!isJarrettHybrid && Number(p.stock_quantity) < 10) return false;

      const pNameLower = p.name ? p.name.toLowerCase().trim() : '';
      const pCatLower = p.category ? p.category.toLowerCase().trim() : '';

      // Live search filter matching name, model, category, volt, or watt
      if (productSearch) {
        const searchStr = `${p.name} ${p.model} ${p.category} ${p.volt || ''} ${p.watt || ''}`.toLowerCase();
        if (!searchStr.includes(productSearch.toLowerCase())) return false;
      }

      // Category check
      if (productCategoryFilter !== 'All') {
        let matchesCat = false;
        if (productCategoryFilter === 'Solar Panel - 12 Volt') {
          matchesCat = pCatLower === 'solar panel' && twelveVoltBrands.includes(pNameLower);
        } else if (productCategoryFilter === 'Solar Panel - 24 Volt') {
          matchesCat = pCatLower === 'solar panel' && !twelveVoltBrands.includes(pNameLower);
        } else {
          matchesCat = p.category === productCategoryFilter;
        }
        if (!matchesCat) return false;
      }

      return true;
    });

    // Extract unique brands
    const brands = [...new Set(filtered.map(p => p.name ? p.name.trim() : '').filter(Boolean))].sort();
    return brands;
  };

  const getBrandCount = (brandName) => {
    const deDuplicated = getDeDuplicatedProductsList(products);
    return deDuplicated.filter(p => {
      // Stock quantity check
      const isJarrettHybrid = p.category === 'Hybrid Inverter' && p.name?.toLowerCase().trim() === 'jarrett';
      if (!isJarrettHybrid && Number(p.stock_quantity) < 10) return false;

      const pNameLower = p.name ? p.name.toLowerCase().trim() : '';
      if (pNameLower !== brandName.toLowerCase().trim()) return false;

      // Category check
      if (productCategoryFilter !== 'All') {
        const pCatLower = p.category ? p.category.toLowerCase().trim() : '';
        let matchesCat = false;
        if (productCategoryFilter === 'Solar Panel - 12 Volt') {
          matchesCat = pCatLower === 'solar panel' && twelveVoltBrands.includes(pNameLower);
        } else if (productCategoryFilter === 'Solar Panel - 24 Volt') {
          matchesCat = pCatLower === 'solar panel' && !twelveVoltBrands.includes(pNameLower);
        } else {
          matchesCat = p.category === productCategoryFilter;
        }
        if (!matchesCat) return false;
      }
      return true;
    }).length;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (productCategoryFilter !== 'All') count++;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (minWattInput.trim() !== '') count++;
    if (maxWattInput.trim() !== '') count++;
    return count;
  };

  const clearAllFilters = () => {
    setProductCategoryFilter('All');
    setSelectedBrands([]);
    setMinWattInput('');
    setMaxWattInput('');
  };

  const handleBrandToggle = (brandName) => {
    const brandLower = brandName.toLowerCase().trim();
    setSelectedBrands(prev => {
      if (prev.includes(brandLower)) {
        return prev.filter(b => b !== brandLower);
      } else {
        return [...prev, brandLower];
      }
    });
  };

  const FiltersPanel = ({ isMobile = false }) => {
    const availableBrands = getAvailableBrandsForCategory();

    return (
      <div className={`bg-white rounded-[2.5rem] border border-slate-200/50 p-6 shadow-sm text-left ${isMobile ? '' : 'w-full'}`}>
        
        {/* Filter Title / Header */}
        <div className="flex justify-between items-center pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-[#0f172a] uppercase tracking-tight font-['Outfit']">
              Filters
            </span>
            {getActiveFiltersCount() > 0 && (
              <span className="bg-[#ea3838] text-white text-[10px] font-black px-2 py-0.5 rounded-full font-['Outfit']">
                {getActiveFiltersCount()}
              </span>
            )}
          </div>
          {getActiveFiltersCount() > 0 && (
            <button 
              onClick={clearAllFilters} 
              className="text-xs font-black text-[#ea3838] hover:underline hover:text-[#ea3838]/80 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Section 1: Categories */}
        <div className="space-y-3 mb-6">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-['Outfit']">
            Category
          </h4>
          <div className="flex flex-col gap-1.5">
            <button 
              onClick={() => setProductCategoryFilter('All')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-between ${
                productCategoryFilter === 'All' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>All Categories</span>
              <span className="text-[9px] opacity-75 font-bold">
                {getDeDuplicatedProductsList(products).filter(p => {
                  const isJarrettHybrid = p.category === 'Hybrid Inverter' && p.name?.toLowerCase().trim() === 'jarrett';
                  return isJarrettHybrid || Number(p.stock_quantity) >= 10;
                }).length}
              </span>
            </button>
            {categories.map((cat) => {
              const displayCat = getDisplayCategoryName(cat);
              const isActive = productCategoryFilter === cat;
              const catCount = getDeDuplicatedProductsList(products).filter(p => {
                const isJarrettHybrid = p.category === 'Hybrid Inverter' && p.name?.toLowerCase().trim() === 'jarrett';
                if (!isJarrettHybrid && Number(p.stock_quantity) < 10) return false;
                const pNameLower = p.name ? p.name.toLowerCase().trim() : '';
                const pCatLower = p.category ? p.category.toLowerCase().trim() : '';
                if (cat === 'Solar Panel - 12 Volt') {
                  return pCatLower === 'solar panel' && twelveVoltBrands.includes(pNameLower);
                }
                if (cat === 'Solar Panel - 24 Volt') {
                  return pCatLower === 'solar panel' && !twelveVoltBrands.includes(pNameLower);
                }
                return p.category === cat;
              }).length;

              return (
                <button 
                  key={cat}
                  onClick={() => setProductCategoryFilter(cat)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-between ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{displayCat}</span>
                  <span className="text-[9px] opacity-75 font-bold">{catCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Brands */}
        <div className="space-y-3 mb-6">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-['Outfit']">
            Brand
          </h4>
          {availableBrands.length === 0 ? (
            <p className="text-xs text-slate-400 italic pl-1">No brands found</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableBrands.map((brand) => {
                const brandLower = brand.toLowerCase().trim();
                const isSelected = selectedBrands.includes(brandLower);
                const count = getBrandCount(brand);

                return (
                  <button 
                    key={brand}
                    onClick={() => handleBrandToggle(brand)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 border ${
                      isSelected 
                        ? 'bg-[#ea3838] border-[#ea3838] text-white shadow-sm' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{brand}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Capacity Range */}
        <div className="space-y-4">
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-['Outfit'] mb-2">
              Capacity Range
            </h4>
            <div className="flex gap-2 items-center">
              <input 
                type="text" 
                placeholder="Min (e.g. 50W)" 
                value={minWattInput}
                onChange={(e) => setMinWattInput(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input 
                type="text" 
                placeholder="Max (e.g. 6.2kW)" 
                value={maxWattInput}
                onChange={(e) => setMaxWattInput(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-1.5 font-bold leading-normal">
              💡 Smart detection parses kW (e.g. 3.2) or Watts (e.g. 550).
            </p>
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-['Outfit']">
              Quick presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button 
                onClick={() => { setMinWattInput('50W'); setMaxWattInput('150W'); }}
                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-250 text-slate-600 px-2.5 py-1 rounded-lg transition-colors"
              >
                50W - 150W
              </button>
              <button 
                onClick={() => { setMinWattInput('400W'); setMaxWattInput('600W'); }}
                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-250 text-slate-600 px-2.5 py-1 rounded-lg transition-colors"
              >
                400W - 600W
              </button>
              <button 
                onClick={() => { setMinWattInput('3kW'); setMaxWattInput('6kW'); }}
                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-250 text-slate-600 px-2.5 py-1 rounded-lg transition-colors"
              >
                3kW - 6kW
              </button>
              <button 
                onClick={() => { setMinWattInput('10kW'); setMaxWattInput('15kW'); }}
                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-250 text-slate-600 px-2.5 py-1 rounded-lg transition-colors"
              >
                10kW - 15kW
              </button>
            </div>
          </div>
        </div>

      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-t-[#ea3838] animate-spin"></div>
      </div>
      <p className="text-slate-500 font-bold tracking-widest text-xs uppercase animate-pulse" style={{ fontFamily: "'Outfit', sans-serif" }}>
        Loading LAMS Power...
      </p>
    </div>
  );

  const uniqueBrands = [...new Set(deDuplicatedProducts.map(p => p.name ? p.name.trim() : '').filter(Boolean))];
  const uniqueModels = [...new Set(deDuplicatedProducts.map(p => `${p.name?.trim() || ''}|${p.model?.trim() || ''}`).filter(b => b && b !== '|'))];
  const totalBrands = uniqueBrands.length || 4;
  const totalModels = uniqueModels.length || 18;

  const hasMatchingProducts = categories.some(cat => getSortedProductsList(cat).length > 0);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#374151] flex flex-col antialiased selection:bg-[#ea3838]/10 selection:text-[#ea3838]" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
      
      {/* 🏛| PREMIUM BLUR NAVIGATION HEADER WITH SUPABASE SITE LOGO */}
      <header className="bg-[#f3f4f6]/70 backdrop-blur-xl py-4.5 px-6 md:px-12 sticky top-0 z-50 transition-all border-b border-slate-200/50">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <img 
              src={lamsLogo} 
              alt="Lams Power Logo" 
              className="h-10 md:h-11 object-contain" 
            />
            <h1 className="text-xl font-black text-[#0f172a] tracking-tight uppercase font-['Outfit'] hidden sm:block">
              Lams<span className="text-[#ea3838] font-black">Power</span>
            </h1>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2.5 sm:gap-6 md:gap-8 font-bold text-[10px] sm:text-xs uppercase tracking-widest text-slate-500 ml-auto sm:mx-auto">
            <button 
              onClick={() => setActiveTab('home')} 
              className={`hover:text-[#ea3838] transition-colors pb-1 border-b-2 font-black ${activeTab === 'home' ? 'text-[#0f172a] border-[#ea3838]' : 'border-transparent'}`}
            >
              Home
            </button>
            <span className="text-slate-300 font-normal">|</span>
            <button 
              onClick={() => { setActiveTab('products'); setProductCategoryFilter('All'); }} 
              className={`hover:text-[#ea3838] transition-colors pb-1 border-b-2 font-black ${activeTab === 'products' ? 'text-[#0f172a] border-[#ea3838]' : 'border-transparent'}`}
            >
              Products
            </button>
            <span className="text-slate-300 font-normal">|</span>
            <button 
              onClick={() => setActiveTab('contact')} 
              className={`hover:text-[#ea3838] transition-colors pb-1 border-b-2 font-black ${activeTab === 'contact' ? 'text-[#0f172a] border-[#ea3838]' : 'border-transparent'}`}
            >
              Contact Us
            </button>
            <span className="text-slate-300 font-normal">|</span>
            <button 
              onClick={() => navigate('/solarcal')} 
              className="bg-gradient-to-r from-[#ea3838] to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-3.5 py-1.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-md shadow-red-500/20 active:scale-95 flex items-center gap-1.5"
            >
              <span>☀️</span>
              <span>Solar Calculator</span>
            </button>
          </nav>

          {/* Portal Access */}
          <div className="hidden sm:flex items-center gap-4">
            <button 
              onClick={onAdminClick}
              className="bg-white border border-slate-200 hover:border-[#ea3838] text-slate-700 hover:text-[#ea3838] px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-sm active:scale-95 flex items-center gap-2"
            >
              <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[8px] font-black">👤</div>
              Login
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- VIEW 1: HOME PAGE ---------------- */}
      {activeTab === 'home' && (
        <div className="animate-in fade-in duration-300 flex-1 flex flex-col gap-16 pb-16">
          
          {/* ⚡ BANNER HERO SECTION - SINGLE FLOATING SOLARON 3600VA IMAGE WITH SPECIFICATIONS */}
          <section className="px-6 md:px-12 max-w-[1400px] mx-auto w-full pt-8">
            <div className="bg-[#eaecf0] rounded-[3rem] p-8 md:p-16 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12 min-h-[580px] shadow-sm">
              {/* Back panels */}
              <div className="absolute top-0 right-0 w-[45%] h-full bg-slate-300/20 rounded-[3rem] -skew-x-12 origin-top pointer-events-none" />
              
              {/* Image Showcase Column - Placed first (on top) in mobile, second in desktop */}
              <div className="relative z-10 flex items-center justify-center w-full lg:w-1/2 min-h-[300px] order-1 lg:order-2">
                <div className="w-80 h-80 md:w-96 md:h-96 rounded-full bg-slate-300/40 absolute blur-2xl opacity-60 z-0 animate-pulse" />
                <OptimizedImage 
                  src={solarOn3600.image_url} 
                  alt="SolarOn 3600VA Inverter" 
                  className="max-h-[340px] md:max-h-[440px] w-auto object-contain z-10 animate-float drop-shadow-[0_25px_35px_rgba(0,0,0,0.15)] hover:scale-[1.03] transition-all duration-700 cursor-pointer" 
                  onClick={() => setSelectedModalProduct(solarOn3600)}
                  width={500}
                />
              </div>

              {/* Left Content Column - Placed second (below) in mobile, first in desktop */}
              <div className="max-w-xl space-y-6 z-10 text-left flex flex-col justify-center order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 bg-white/80 px-4 py-1.5 rounded-full border border-slate-200/50 shadow-sm self-start">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ea3838] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ea3838]"></span>
                  </span>
                  <span className="text-[10px] font-black tracking-widest uppercase text-[#ea3838] font-['Outfit']">
                    Premium Hybrid Showcase
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-[#0f172a] font-['Outfit']">
                  SolarOn Series <br />
                  <span className="text-[#ea3838] relative inline-block">
                    3600 & 6200
                    <span className="absolute left-0 bottom-0.5 w-full h-1.5 bg-[#ea3838]/20 rounded-full"></span>
                  </span>
                </h2>

                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  Premium technology equipped with state-of-the-art power conversion features:
                </p>

                {/* Grid of features from the provided screenshot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white/45 p-6 rounded-[2rem] border border-slate-200/60 shadow-inner">
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-[#374151]">
                    <span className="text-[#ea3838] font-black text-sm">✓</span>
                    <span>Lithium battery auto-restart function</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-[#374151]">
                    <span className="text-[#ea3838] font-black text-sm">✓</span>
                    <span>Can function without battery</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-[#374151]">
                    <span className="text-[#ea3838] font-black text-sm">✓</span>
                    <span>Utility/PV charging voltage adjustable</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-[#374151]">
                    <span className="text-[#ea3838] font-black text-sm">✓</span>
                    <span>CT anti-back flow function support</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-[#374151]">
                    <span className="text-[#ea3838] font-black text-sm">✓</span>
                    <span>PF1.0 High efficiency, lower consumption</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-[#374151]">
                    <span className="text-[#ea3838] font-black text-sm">✓</span>
                    <span>PV generation fed into grid supported</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-[#374151]">
                    <span className="text-[#ea3838] font-black text-sm">✓</span>
                    <span>Communication: external WIFI module</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-[#374151]">
                    <span className="text-[#ea3838] font-black text-sm">✓</span>
                    <span>BMS function for lithium battery</span>
                  </div>
                </div>

                {/* Explore Action button */}
                <div className="flex items-center gap-4 pt-2">
                  <button 
                    onClick={() => { setActiveTab('products'); setProductCategoryFilter('Hybrid Inverter'); }} 
                    className="w-13 h-13 rounded-full bg-[#ea3838] hover:bg-[#d62828] text-white flex items-center justify-center text-lg font-black shadow-xl shadow-[#ea3838]/20 transition-all hover:scale-105 active:scale-95"
                  >
                    →
                  </button>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Explore Hybrid Series</span>
                </div>
              </div>

            </div>
          </section>

          {/* 🖼️ DYNAMIC 3D CARD CAROUSEL SLIDER */}
          {landingConfig?.slider_images && landingConfig.slider_images.length > 0 && (
            <section className="py-6 px-6 md:px-12 max-w-[1400px] mx-auto w-full flex flex-col items-center">
              <div className="text-center mb-8">
                <span className="text-[10px] font-black tracking-widest uppercase text-[#ea3838] font-['Outfit']">Premium Showcase</span>
                <h3 className="text-2xl md:text-3xl font-black text-[#0f172a] mt-1 font-['Outfit']">Visual Portfolio</h3>
                <div className="h-1 w-12 bg-[#ea3838] rounded-full mx-auto mt-2"></div>
              </div>

              <div className="relative w-full max-w-4xl h-[320px] md:h-[550px] flex items-center justify-center group bg-transparent">
                {landingConfig.slider_images.map((url, idx) => {
                  const total = landingConfig.slider_images.length;
                  const diff = (idx - currentSliderIdx + total) % total;
                  let normDiff = diff;
                  if (normDiff > total / 2) normDiff -= total;

                  let transformStyle = 'translateX(0) scale(0.9)';
                  let opacityStyle = 0;
                  let zIndexStyle = 0;
                  let pointerEventsStyle = 'none';

                  if (isMobile) {
                    if (idx === currentSliderIdx) {
                      transformStyle = 'translateX(0) scale(1)';
                      opacityStyle = 1;
                      zIndexStyle = 30;
                      pointerEventsStyle = 'auto';
                    }
                  } else {
                    if (normDiff === 0) {
                      transformStyle = 'translateX(0) scale(1)';
                      opacityStyle = 1;
                      zIndexStyle = 30;
                      pointerEventsStyle = 'auto';
                    } else if (normDiff === -1) {
                      transformStyle = 'translateX(-40%) scale(0.78)';
                      opacityStyle = 0.55;
                      zIndexStyle = 20;
                      pointerEventsStyle = 'auto';
                    } else if (normDiff === 1) {
                      transformStyle = 'translateX(40%) scale(0.78)';
                      opacityStyle = 0.55;
                      zIndexStyle = 20;
                      pointerEventsStyle = 'auto';
                    } else if (normDiff === -2) {
                      transformStyle = 'translateX(-75%) scale(0.6)';
                      opacityStyle = 0.3;
                      zIndexStyle = 10;
                      pointerEventsStyle = 'auto';
                    } else if (normDiff === 2) {
                      transformStyle = 'translateX(75%) scale(0.6)';
                      opacityStyle = 0.3;
                      zIndexStyle = 10;
                      pointerEventsStyle = 'auto';
                    }
                  }

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        if (!isMobile && normDiff !== 0 && normDiff >= -2 && normDiff <= 2) {
                          setCurrentSliderIdx(idx);
                        }
                      }}
                      style={{
                        transform: transformStyle,
                        opacity: opacityStyle,
                        zIndex: zIndexStyle,
                        pointerEvents: pointerEventsStyle,
                        cursor: !isMobile && normDiff !== 0 ? 'pointer' : 'default'
                      }}
                      className="absolute inset-0 transition-all duration-[800ms] ease-out flex items-center justify-center p-2"
                    >
                      <OptimizedImage 
                        src={url} 
                        alt={`Slider ${idx + 1}`} 
                        className="h-full w-auto max-w-full object-contain rounded-[2.5rem] shadow-[0_20px_45px_-10px_rgba(0,0,0,0.12)] border border-slate-200 bg-white p-3 hover:scale-[1.01] transition-transform duration-500" 
                        width={800}
                      />
                    </div>
                  );
                })}
                
                {/* Arrow Nav */}
                <button 
                  onClick={() => setCurrentSliderIdx((prev) => (prev - 1 + landingConfig.slider_images.length) % landingConfig.slider_images.length)}
                  className="absolute left-2 md:left-6 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 duration-300 z-40 border border-slate-200/50"
                >
                  &larr;
                </button>
                <button 
                  onClick={() => setCurrentSliderIdx((prev) => (prev + 1) % landingConfig.slider_images.length)}
                  className="absolute right-2 md:right-6 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 duration-300 z-40 border border-slate-200/50"
                >
                  &rarr;
                </button>

                {/* Dot Indicators */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                  {landingConfig.slider_images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSliderIdx(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${idx === currentSliderIdx ? 'w-5 bg-[#ea3838]' : 'w-2 bg-slate-300'}`}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 🕒 DRIVING FORCE IN GREEN ENERGY SECTION */}
          <section className="py-8 px-6 md:px-12 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Text description */}
            <div className="lg:col-span-6 space-y-6 text-left order-2 lg:order-1">
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-['Outfit']">Our Legacy</span>
              <h3 className="text-3xl md:text-5xl font-black text-[#0f172a] leading-tight font-['Outfit']">
                Driving force in solar energy industry over <span className="text-[#ea3838]">16 years</span>
              </h3>
              <p className="text-slate-500 font-semibold text-xs leading-relaxed uppercase tracking-wider">
                ESTABLISHED IN 2010 • COMPLIANT SUPPLY CHAIN • BANGLADESH PIONEERS
              </p>
              <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-lg">
                {landingConfig.about_profile_text || "Lams Power has established itself as Bangladesh's trusted partner in importing the most efficient and heavy-duty green technologies. We manage strict warehouse standards to guarantee product lifespan."}
              </p>
              
              <div className="pt-2">
                <button 
                  onClick={() => { setActiveTab('products'); setProductCategoryFilter('All'); }}
                  className="w-14 h-14 rounded-full bg-[#ea3838] hover:bg-[#d62828] text-white flex items-center justify-center text-xl font-black shadow-xl shadow-[#ea3838]/20 transition-all hover:scale-105 active:scale-95 duration-300"
                >
                  →
                </button>
              </div>
            </div>

            {/* Overlapping capsules image showcase (mimicking vertical capsule design) */}
            <div className="lg:col-span-6 flex items-center justify-center h-[420px] relative w-full order-1 lg:order-2">
              {/* Capsule Left */}
              <div className="w-[110px] h-[240px] rounded-[5rem] overflow-hidden border-[6px] border-white shadow-lg rotate-[-6deg] absolute left-6 md:left-16 hover:scale-105 transition-all duration-500 hover:rotate-0 hover:z-30 group">
                <OptimizedImage 
                  src="https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?w=500&auto=format&fit=crop&q=80" 
                  alt="Solar Panels Array" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  width={200}
                />
              </div>

              {/* Capsule Center */}
              <div className="w-[160px] h-[340px] rounded-[7rem] overflow-hidden border-[6px] border-white shadow-2xl absolute z-25 hover:scale-105 transition-all duration-500 hover:rotate-[-2deg] group">
                <OptimizedImage 
                  src="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&auto=format&fit=crop&q=80" 
                  alt="Eco Factory Warehouse" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  width={300}
                />
              </div>

              {/* Capsule Right */}
              <div className="w-[120px] h-[270px] rounded-[6rem] overflow-hidden border-[6px] border-white shadow-lg rotate-[6deg] absolute right-6 md:right-16 hover:scale-105 transition-all duration-500 hover:rotate-0 hover:z-30 group">
                <OptimizedImage 
                  src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=500&auto=format&fit=crop&q=80" 
                  alt="Inverter Installations" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  width={200}
                />
              </div>
            </div>
          </section>

          {/* 🌟 INTERACTIVE PORTFOLIO SPECS CARD SECTION (Autoplay switcher cycling 8-10 models) */}
          <section 
            onMouseEnter={() => setIsShowcaseHovered(true)}
            onMouseLeave={() => setIsShowcaseHovered(false)}
            className="py-12 px-6 md:px-12 bg-[#eaecf0] rounded-[3.5rem] max-w-[1400px] mx-auto w-full border border-slate-300/40"
          >
            <div className="text-center mb-10">
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-['Outfit']">Portfolio Grid</span>
              <h3 className="text-2xl md:text-3xl font-black text-[#0f172a] mt-1 font-['Outfit']">Our top collections</h3>
              <div className="h-1 w-12 bg-[#ea3838] rounded-full mx-auto mt-2"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Side: Active Model Dynamic Specs Card */}
              <div className="lg:col-span-7 bg-white rounded-[2.5rem] p-6 md:p-8 shadow-md border border-slate-200/50 flex flex-col justify-between hover:scale-[1.005] transition-all duration-300 group">
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Specifications fields */}
                  <div className="space-y-6 w-full md:w-1/2 text-left">
                    <div>
                      <span className="text-[9px] font-bold bg-[#ea3838]/10 text-[#ea3838] px-3.5 py-1 rounded-full uppercase tracking-widest font-['Outfit']">
                        {getDisplayCategoryName(activeShowcaseProduct.category)}
                      </span>
                      <h4 className="text-3xl font-black text-[#0f172a] mt-3 font-['Outfit']">
                        {activeShowcaseProduct.name}
                      </h4>
                      <p className="text-slate-400 text-xs font-bold uppercase mt-0.5 tracking-wider">Model: {activeShowcaseProduct.model}</p>
                    </div>

                    {/* Specifications List */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center text-[#ea3838] font-bold">⚡</div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Rated Voltage</span>
                          <span className="text-[#0f172a] font-extrabold text-sm font-['Outfit']">{activeShowcaseProduct.volt || 'Auto Detect'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center text-[#ea3838] font-bold">☀️</div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Rated Wattage</span>
                          <span className="text-[#0f172a] font-extrabold text-sm font-['Outfit']">{activeShowcaseProduct.watt || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center text-[#ea3838] font-bold">🛡️</div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Eco Compliance</span>
                          <span className="text-[#0f172a] font-extrabold text-xs tracking-wide">Green Certified</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Showcase Product Image */}
                  <div className="w-full md:w-1/2 aspect-square flex items-center justify-center p-4 bg-[#f3f4f6]/50 rounded-3xl overflow-hidden relative">
                    <OptimizedImage 
                      src={activeShowcaseProduct.image_url} 
                      alt={activeShowcaseProduct.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-md"
                      width={400}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 mt-6 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Availability</span>
                    <span className="text-[#0f172a] font-extrabold text-xs font-['Outfit'] capitalize">{activeShowcaseProduct.availability || 'In Stock'}</span>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedModalProduct(activeShowcaseProduct)}
                    className="px-6 py-3 bg-[#ea3838] hover:bg-[#d62828] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-[#ea3838]/10 active:scale-95 transition-all duration-200"
                  >
                    View Specs Details
                  </button>
                </div>

              </div>

              {/* Right Side: Autoplay conveyor-belt list of 4 unique brand models */}
              <div className="lg:col-span-5 flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar text-left">
                {showcaseQueue.map((p, idx) => {
                  const isActive = idx === 0;
                  const displayCat = getDisplayCategoryName(p.category);

                  return (
                    <div 
                      key={idx}
                      onClick={() => handleShowcaseItemClick(idx)}
                      className={`bg-white p-4 rounded-[2rem] border transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 group ${
                        isActive 
                          ? 'border-[#ea3838] ring-2 ring-[#ea3838]/10 shadow-md' 
                          : 'border-slate-200/60 shadow-sm hover:border-slate-350'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                          isActive ? 'bg-[#ea3838] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-[#ea3838] group-hover:text-white'
                        }`}>
                          {isActive ? '✓' : idx + 1}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#0f172a] text-sm md:text-base font-['Outfit'] leading-tight font-black">
                            {p.name} {p.model}
                          </h4>
                          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                            {displayCat}
                          </span>
                        </div>
                      </div>

                      {/* Row Thumbnail */}
                      <div className="w-12 h-12 bg-[#f3f4f6] rounded-xl flex items-center justify-center p-2 overflow-hidden shrink-0 border border-slate-100 group-hover:scale-105 transition-transform duration-500">
                        <OptimizedImage 
                          src={p.image_url} 
                          alt={p.name} 
                          className="w-full h-full object-contain"
                          width={60}
                          quality={75}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </section>

          {/* 📊 INVENTORY NUMBERS BANNER */}
          <section ref={counterRef} className="py-16 px-6 md:px-12 bg-slate-900 text-white w-full relative overflow-hidden rounded-[3rem] max-w-[1400px] mx-auto border border-slate-800">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] opacity-5 [background-size:16px_16px] pointer-events-none" />
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#ea3838]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-[1200px] mx-auto text-center space-y-6 relative z-10">
              <span className="text-[10px] font-black tracking-widest uppercase text-[#ea3838] font-['Outfit']">Inventory Volume</span>
              <h3 className="text-xl md:text-3xl font-black tracking-tight leading-normal max-w-2xl mx-auto font-['Outfit']">
                Distributing <span className="text-[#ea3838] text-3xl md:text-5xl inline-block px-1.5"><AnimatedCounter target={totalBrands} trigger={isCounterVisible} /></span> Brands and <span className="text-[#ea3838] text-3xl md:text-5xl inline-block px-1.5"><AnimatedCounter target={totalModels} trigger={isCounterVisible} /></span> Models of High-Efficiency green equipment.
              </h3>
              <div className="h-1 w-12 bg-[#ea3838] rounded-full mx-auto mt-2"></div>
            </div>
          </section>

          {/* 📦 REGULAR USE CARD GRID (Featured In stock Highlights) */}
          <section 
            onMouseEnter={() => setIsRegularUseHovered(true)}
            onMouseLeave={() => setIsRegularUseHovered(false)}
            className="px-6 md:px-12 max-w-[1400px] mx-auto w-full"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
              <div className="text-left">
                <span className="text-[10px] font-black tracking-widest uppercase text-[#ea3838] font-['Outfit']">Regular Use Collections</span>
                <h3 className="text-2xl md:text-3xl font-black text-[#0f172a] mt-1 font-['Outfit']">Our collections for your regular use</h3>
                <div className="h-1 w-12 bg-[#ea3838] rounded-full mt-2"></div>
              </div>

              {/* Pill Badge equivalent to red circle link */}
              <button 
                onClick={() => { setActiveTab('products'); setProductCategoryFilter('All'); }} 
                className="bg-[#ea3838] hover:bg-[#d62828] text-white px-7 py-3 rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all duration-200 shadow-md"
              >
                View Full Catalog
              </button>
            </div>

            {/* Split cards list showing top product model of each section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((c) => {
                const displayCat = getDisplayCategoryName(c);
                const showProd = getRegularUseShowcaseProduct(c);

                return (
                  <div 
                    key={c}
                    onClick={() => setSelectedModalProduct(showProd)}
                    className="bg-white rounded-[2.5rem] p-5 border border-slate-200/50 hover:shadow-xl hover:border-slate-350 transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:-translate-y-1.5"
                  >
                    <div>
                      {/* Image placeholder with big rounding */}
                      <div className="w-full bg-[#f3f4f6]/60 rounded-[2rem] aspect-[4/3] mb-4.5 flex items-center justify-center p-4 overflow-hidden border border-slate-100/50">
                        <OptimizedImage 
                          src={showProd.image_url} 
                          alt={showProd.name} 
                          className="w-full h-full object-contain group-hover:scale-106 group-hover:rotate-[0.5deg] transition-all duration-500" 
                          width={300}
                        />
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-['Outfit']">{displayCat}</span>
                        <h4 className="font-extrabold text-[#0f172a] text-base mt-1 group-hover:text-[#ea3838] transition-colors leading-tight font-['Outfit']">
                          {showProd.name} {showProd.model}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Volt: {showProd.volt || 'Auto'}</span>
                      {/* Black round check button from screenshot */}
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-sm group-hover:bg-[#ea3838] group-hover:scale-105 active:scale-95 transition-all duration-200">
                        ✓
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      )}

      {/* ---------------- VIEW 2: PRODUCTS PAGE ---------------- */}
      {activeTab === 'products' && (
        <div className="animate-in fade-in duration-300 flex-1 py-10 px-4 lg:px-8">
          <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8">
            
            {/* Desktop Filters Sidebar (hidden on mobile, shown on lg) */}
            <div className="hidden lg:block w-72 shrink-0 self-start sticky top-24">
              <FiltersPanel />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-8">
              
              {/* Search Bar / Row */}
              <div className="bg-white p-4 rounded-[2.5rem] border border-slate-200/50 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                {/* Live Search input */}
                <div className="w-full sm:flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="🔍 Search product brand, model, specs..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Filter controls row */}
                <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                  {/* Mobile Filters Toggle Button */}
                  <button 
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className={`lg:hidden px-4.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
                      showMobileFilters || getActiveFiltersCount() > 0
                        ? 'bg-[#ea3838] text-white shadow-md' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ⚙️ Filters {getActiveFiltersCount() > 0 ? `(${getActiveFiltersCount()})` : ''}
                  </button>

                  {/* Clear all filters button */}
                  {getActiveFiltersCount() > 0 && (
                    <button 
                      onClick={clearAllFilters}
                      className="px-4.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Filters dropdown panel */}
              {showMobileFilters && (
                <div className="lg:hidden animate-in slide-in-from-top-4 duration-200">
                  <FiltersPanel isMobile={true} />
                </div>
              )}

              {/* Hierarchical sections list with brand subsection groupings */}
              <div className="space-y-16 text-left">
                {hasMatchingProducts ? (
                  categories
                    .filter(cat => productCategoryFilter === 'All' || productCategoryFilter === cat)
                    .map((cat) => {
                      const displayCat = getDisplayCategoryName(cat);
                      const is12V = displayCat === 'Solar Panel 12V';
                      const catProds = getSortedProductsList(cat);

                      if (catProds.length === 0) return null;

                      // Group sorted models by their brand/name dynamically
                      const brandGroups = groupProductsByBrand(catProds);

                      return (
                        <div key={cat} className="space-y-8 animate-in fade-in duration-300">
                          
                          {/* Section Category Header */}
                          <div className="flex items-center gap-4 text-left border-l-4 border-[#ea3838] pl-4">
                            <div>
                              <h2 className="text-2xl md:text-3xl font-black text-[#0f172a] uppercase tracking-tight font-['Outfit']">
                                {displayCat}
                              </h2>
                              {is12V && (
                                <span className="text-[#ea3838] font-extrabold text-[9px] uppercase tracking-wider block mt-0.5">
                                  LAMS Power Banner Own Brand
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Brand Groups iteration */}
                          <div className="space-y-10 pl-2">
                            {brandGroups.map(({ brandName, brandProds }) => (
                              <div key={brandName} className="space-y-5">
                                
                                {/* Brand Sub Header */}
                                <div className="flex items-center gap-2.5 pb-1">
                                  <span className="w-2 h-2 rounded-full bg-[#ea3838]"></span>
                                  <h3 className="text-lg font-black text-[#0f172a] tracking-tight font-['Outfit'] uppercase">
                                    {brandName}
                                  </h3>
                                  <span className="text-[9px] text-slate-400 font-extrabold bg-[#eaecf0] px-2 py-0.5 rounded-full font-['Outfit']">
                                    {brandProds.length} {brandProds.length === 1 ? 'Model' : 'Models'}
                                  </span>
                                </div>

                                {/* Grid of individual split cards of this brand: two products in a row on mobile */}
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                                  {brandProds.map((prod, idx) => {
                                    const hasStock = (prod.availability || '').trim().toLowerCase() === 'in stock';
                                    const isUpcoming = (prod.availability || '').trim().toLowerCase() === 'upcoming';
                                    
                                    return (
                                      <div 
                                        key={idx}
                                        onClick={() => setSelectedModalProduct(prod)}
                                        className={`bg-white rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-5 border shadow-sm hover:shadow-xl hover:border-slate-350 transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:-translate-y-1.5 ${
                                          is12V ? 'border-orange-100/50 hover:border-orange-350/60' : 'border-slate-200/50'
                                        }`}
                                      >
                                        <div>
                                          {/* Aspect 4/3 image wrapper with scale/rotation animation */}
                                          <div className="w-full bg-[#f3f4f6]/60 rounded-[1.25rem] sm:rounded-[2rem] aspect-[4/3] mb-3 sm:mb-4.5 flex items-center justify-center p-2 sm:p-4 overflow-hidden border border-slate-100/50 relative">
                                            
                                            {/* Availability/Stock badge */}
                                            <span className={`absolute top-2 sm:top-3.5 left-2 sm:left-3.5 text-[7px] sm:text-[8px] font-black px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full uppercase tracking-wider z-10 shadow-sm ${
                                              hasStock ? 'bg-emerald-500 text-white' : isUpcoming ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                                            }`}>
                                              {prod.availability || 'In Stock'}
                                            </span>

                                            {prod.image_url ? (
                                              <OptimizedImage 
                                                src={prod.image_url} 
                                                alt={prod.name} 
                                                className="w-full h-full object-contain group-hover:scale-106 group-hover:rotate-[0.5deg] transition-all duration-500 drop-shadow-sm" 
                                                width={250}
                                              />
                                            ) : (
                                              <div className="text-2xl sm:text-4xl select-none">📦</div>
                                            )}
                                          </div>

                                          <div className="text-left px-1">
                                            <span className="text-[7px] sm:text-[8px] font-black uppercase text-slate-400 tracking-widest font-['Outfit']">
                                              {displayCat}
                                            </span>
                                            <h3 className="text-xs sm:text-base font-black text-[#0f172a] mt-1 truncate leading-tight font-['Outfit']">
                                              {prod.name}
                                            </h3>
                                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-0.5">Model: {prod.model}</p>
                                          </div>
                                        </div>

                                        {/* Specifications Summary row on card face */}
                                        <div className="border-t border-slate-100 pt-2.5 sm:pt-4 mt-2.5 sm:mt-4 flex items-center justify-between">
                                          <div className="text-left">
                                            <span className="text-[7px] sm:text-[8px] text-slate-400 font-extrabold uppercase tracking-wider block">Voltage / Wattage</span>
                                            <span className="text-[9px] sm:text-xs font-black text-slate-700 font-['Outfit']">
                                              {prod.volt || 'Auto'} / {prod.watt || 'N/A'}
                                            </span>
                                          </div>
                                          
                                          {/* Red icon arrow on click */}
                                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] sm:text-xs font-black shadow-sm group-hover:bg-[#ea3838] group-hover:scale-105 transition-all duration-200">
                                            →
                                          </div>
                                        </div>

                                      </div>
                                    );
                                  })}
                                </div>

                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-200/50 shadow-sm space-y-4 max-w-lg mx-auto mt-8 flex flex-col items-center">
                    <div className="text-5xl">🔍</div>
                    <h3 className="text-xl font-black text-slate-800 font-['Outfit']">No Matching Products</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      We couldn't find any products matching your current combination of filters. Try clearing your filters or adjusting your search term.
                    </p>
                    <button 
                      onClick={clearAllFilters}
                      className="px-6 py-3 bg-[#ea3838] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#ea3838]/90 transition-all duration-200 shadow-md"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ---------------- VIEW 3: CONTACT PAGE ---------------- */}
      {activeTab === 'contact' && (
        <div className="animate-in fade-in duration-300 flex-1 py-16 px-6 md:px-12 max-w-[1400px] mx-auto w-full">
          <div className="space-y-12">
            <div className="text-center">
              <span className="text-[10px] font-black tracking-widest uppercase text-[#ea3838] font-['Outfit']">Get In Touch</span>
              <h3 className="text-3xl md:text-4xl font-black text-[#0f172a] mt-1 font-['Outfit']">Contact LAMS Power</h3>
              <div className="h-1 w-12 bg-[#ea3838] rounded-full mx-auto mt-2"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Corporate Office Card */}
              {siteSettings.contact_address && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm flex flex-col items-center text-center space-y-4 hover:scale-[1.01] transition-transform duration-300">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-inner">
                    🏢
                  </div>
                  <h4 className="text-lg font-black text-[#0f172a] font-['Outfit']">Corporate Office</h4>
                  <p className="text-slate-555 text-sm font-semibold leading-relaxed">
                    {siteSettings.contact_address}
                  </p>
                </div>
              )}

              {/* Showroom Card */}
              {siteSettings.contact_showroom && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm flex flex-col items-center text-center space-y-4 hover:scale-[1.01] transition-transform duration-300">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-inner">
                    🏪
                  </div>
                  <h4 className="text-lg font-black text-[#0f172a] font-['Outfit']">Showroom Address</h4>
                  <p className="text-slate-555 text-sm font-semibold leading-relaxed">
                    {siteSettings.contact_showroom}
                  </p>
                </div>
              )}

              {/* Connect details Card */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm flex flex-col items-center text-center space-y-5 hover:scale-[1.01] transition-transform duration-300">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-inner">
                  📞
                </div>
                <h4 className="text-lg font-black text-[#0f172a] font-['Outfit']">Connect With Us</h4>
                
                <div className="space-y-4 w-full text-center">
                  {siteSettings.contact_hotline && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Hotline</span>
                      <a href={`tel:${siteSettings.contact_hotline}`} className="text-[#ea3838] font-black text-base hover:underline">{siteSettings.contact_hotline}</a>
                    </div>
                  )}
                  {siteSettings.contact_numbers && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Sales / Office Phone</span>
                      <p className="text-slate-700 font-extrabold text-xs whitespace-pre-line leading-relaxed">
                        {siteSettings.contact_numbers.split(', ').join('\n')}
                      </p>
                    </div>
                  )}
                  {siteSettings.contact_email && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">E-mail Address</span>
                      <a href={`mailto:${siteSettings.contact_email}`} className="text-slate-900 font-semibold hover:underline text-xs">{siteSettings.contact_email}</a>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 🎯 SPECIFICATIONS MODAL WINDOW */}
      {selectedModalProduct && (() => {
        let parsedDescText = '';
        let pdfUrl = '';
        let catalogImageUrl = '';
        const desc = selectedModalProduct.description || '';
        
        if (desc.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(desc);
            parsedDescText = parsed.text || '';
            pdfUrl = parsed.pdf_url || '';
            catalogImageUrl = parsed.catalog_image_url || '';

            if (parsed.catalog_url) {
              if (/\.pdf/i.test(parsed.catalog_url)) {
                if (!pdfUrl) pdfUrl = parsed.catalog_url;
              } else {
                if (!catalogImageUrl) catalogImageUrl = parsed.catalog_url;
              }
            }
          } catch (e) {
            parsedDescText = desc;
          }
        } else {
          parsedDescText = desc;
        }

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              
              <button 
                onClick={() => setSelectedModalProduct(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 text-slate-505 font-black hover:bg-slate-200 transition-all flex items-center justify-center text-lg z-50 shadow-inner"
              >
                ✕
              </button>

              <div className="overflow-y-auto pr-1 flex-1 space-y-6 mt-4">
                <div className="border-b pb-4 mb-4 text-center">
                  <span className="text-[9px] font-black tracking-widest bg-[#ea3838]/10 text-[#ea3838] px-3.5 py-1.2 rounded-full uppercase font-['Outfit']">
                    {getDisplayCategoryName(selectedModalProduct.category)}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-[#0f172a] mt-3 font-['Outfit'] leading-tight">{selectedModalProduct.name}</h3>
                  <p className="text-base font-extrabold text-[#ea3838] mt-1 font-['Outfit']">Model/Capacity: {selectedModalProduct.model}</p>
                </div>

                {/* Specs layout grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#f3f4f6]/60 p-4 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Load Voltage</span>
                    <span className="text-xl font-black text-slate-800 font-['Outfit']">{selectedModalProduct.volt || 'Auto Detect'}</span>
                  </div>
                  <div className="bg-[#f3f4f6]/60 p-4 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Load Wattage</span>
                    <span className="text-xl font-black text-slate-800 font-['Outfit']">{selectedModalProduct.watt || 'N/A'}</span>
                  </div>
                </div>

                {parsedDescText && (
                  <div className="space-y-2 text-left">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1 text-center font-['Outfit']">Product description & details</span>
                    <div className="bg-[#f3f4f6]/60 p-5 rounded-2xl border border-slate-200/50 text-sm text-slate-700 leading-relaxed font-medium max-h-48 overflow-y-auto">
                      <p className="whitespace-pre-line">{parsedDescText}</p>
                    </div>
                  </div>
                )}

                {(catalogImageUrl || pdfUrl) && (
                  <div className={`space-y-4 ${parsedDescText ? 'mt-5 pt-4 border-t border-slate-100' : ''}`}>
                    {catalogImageUrl && (
                      <div className="flex flex-col items-center animate-in fade-in duration-200">
                        <div className="w-full mb-3 rounded-2xl overflow-hidden border border-slate-200">
                          <OptimizedImage 
                            src={catalogImageUrl} 
                            alt="Product Catalog" 
                            className="w-full h-auto max-h-60 object-contain bg-slate-55 mx-auto"
                            width={500}
                          />
                        </div>
                        <a 
                          href={catalogImageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#ea3838] hover:bg-[#d62828] text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md active:scale-95 duration-200"
                        >
                          🖼️ View Image Catalog
                        </a>
                      </div>
                    )}

                    {pdfUrl && (
                      <div className="flex flex-col items-center animate-in fade-in duration-200">
                        <a 
                          href={pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-[#ea3838] text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md active:scale-95 duration-200"
                        >
                          📄 Download Catalog PDF
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSelectedModalProduct(null)}
                className="w-full mt-6 bg-slate-900 hover:bg-[#ea3838] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg shrink-0 active:scale-[0.98]"
              >
                Close View
              </button>

            </div>
          </div>
        );
      })()}

      {/* 🏛️ SLATE MINIMAL FOOTER WITH LOGO */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 md:px-12 border-t border-slate-800 mt-auto rounded-t-[3rem]">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left space-y-2 flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <img 
                src={lamsLogo} 
                alt="Lams Power Logo" 
                className="h-8 object-contain filter invert opacity-90" 
              />
              <h5 className="text-lg font-black text-white tracking-tighter uppercase font-['Outfit']">Lams<span className="text-[#ea3838]">Power</span></h5>
            </div>
            <p className="text-[10px] text-slate-555 font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} Lams Power. All Rights Reserved.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 sm:gap-8 text-xs font-bold uppercase tracking-widest text-slate-555">
            <button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">Home</button>
            <button onClick={() => { setActiveTab('products'); setProductCategoryFilter('All'); }} className="hover:text-white transition-colors">Store</button>
            <button onClick={() => navigate('/solarcal')} className="text-[#ea3838] font-black hover:text-white transition-colors flex items-center gap-1">☀️ Solar Calculator</button>
            <button onClick={() => navigate('/error-codes')} className="hover:text-white transition-colors">Error Guide</button>
            <button onClick={() => setActiveTab('contact')} className="hover:text-white transition-colors">Contact</button>
            <button onClick={onAdminClick} className="hover:text-white transition-colors text-[#ea3838]">Portal</button>
          </div>

          {landingConfig.actual_footer_image && (
            <div className="max-w-[540px] w-full opacity-80 hover:opacity-100 transition-opacity flex justify-center md:justify-end">
              <OptimizedImage src={landingConfig.actual_footer_image} alt="LAMS Energy Partner" className="max-h-36 w-auto object-contain filter invert opacity-95" width={500} />
            </div>
          )}
        </div>
      </footer>

    </div>
  );
};

export default PublicCatalog;