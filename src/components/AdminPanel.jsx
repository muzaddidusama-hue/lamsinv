import React, { useState, Suspense } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';

// Modern Minimal SVG Icons for Sidebar - styled to match MatDash (lavender/indigo color schemes)
const DashboardIcon = () => (
  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ScanIcon = () => (
  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ProductIcon = () => (
  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const BillingIcon = () => (
  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ServiceIcon = () => (
  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ReportIcon = () => (
  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CustomIcon = () => (
  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5 text-red-500 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const AdminPanel = ({ onLogout, currentUserRole, currentUserName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Filter menu items by role and set paths
  const menuItems = [
    { id: 'dashboard', path: '/dashboard', icon: <DashboardIcon />, label: 'ড্যাশবোর্ড (Dashboard)' },
    { id: 'smart_scan', path: '/scan', icon: <ScanIcon />, label: 'স্মার্ট স্ক্যানার (AI)' },
    {
      id: 'product_section', 
      icon: <ProductIcon />, 
      label: 'প্রোডাক্ট',
      isDropdown: true,
      subItems: [
        { id: 'product_entry', path: '/product-entry', label: 'প্রোডাক্ট এন্ট্রি ও বিবরণ' },
        { id: 'stock_management', path: '/stock', label: 'স্টক ম্যানেজমেন্ট' },
        { id: 'broken', path: '/broken', label: 'ব্রোকেন প্রোডাক্ট (Broken)' },
        { id: 'label_print', path: '/label-print', label: 'লেবেল প্রিন্ট' },
      ]
    },
    {
      id: 'bill_section', 
      icon: <BillingIcon />, 
      label: 'বিল সেকশন',
      isDropdown: true,
      subItems: [
        { id: 'billing', path: '/billing', label: 'চালান ও বিলিং (হেড অফিস)' },
        { id: 'nawabpur_billing', path: '/challan/nawabpur', label: 'ডিরেক্ট বিলিং (নওয়াবপুর)' },
        { id: 'chalans', path: '/challans', label: 'পেমেন্ট ও চালান' },
        { id: 'bills', path: '/bills', label: 'বিল ও চালানের তালিকা' },
        { id: 'false_billing', path: '/false-billing', label: 'ফলস বিল/চালান' },
        { id: 'return_manager', path: '/return-manager', label: 'প্রোডাক্ট রিটার্ন (Return)' },
      ]
    },
    { id: 'service_manager', path: '/service', icon: <ServiceIcon />, label: 'ইনভার্টার সার্ভিস (Service)' }, 
    { id: 'reports', path: '/reports', icon: <ReportIcon />, label: 'রিপোর্ট (Reports)' },
    
    ...((currentUserRole === 'Admin' || currentUserRole === 'CEO') ? [
      { id: 'frontend_custom', path: '/frontend-custom', icon: <CustomIcon />, label: 'পাবলিক পেজ এডিট' },
      { id: 'user_management', path: '/user-management', icon: <UsersIcon />, label: 'এমপ্লয়ী এক্সেস কন্ট্রোল' }
    ] : [])
  ];

  const handleMenuClick = (item) => {
    if (item.isDropdown) {
      setOpenSubMenu(openSubMenu === item.id ? '' : item.id);
    } else {
      navigate(item.path);
      setOpenSubMenu(''); 
      setIsMobileMenuOpen(false);
    }
  };

  const handleSubMenuClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // Check if current page is inside a dropdown menu to keep it highlighted
  const isDropdownActive = (item) => {
    if (!item.isDropdown) return false;
    return item.subItems.some(sub => sub.path === currentPath);
  };

  return (
    <div className="flex h-screen bg-[#f4f6fa] font-sans antialiased">
      
      {/* desktop sidebar - light styled premium MatDash layout */}
      <aside className="hidden md:flex flex-col w-72 bg-white h-full border-r border-slate-200/80 z-20 transition-all duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 sticky top-0 bg-white z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20">
            L
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">LAMS POWER</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ERP SYSTEM</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar">
          {/* Main items */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-400/80 uppercase tracking-widest px-3 mb-2">Navigation</p>
            {menuItems.map((item) => {
              const isActive = (!item.isDropdown && currentPath === item.path) || isDropdownActive(item);
              const isSubOpen = openSubMenu === item.id || isDropdownActive(item);
              
              return (
                <div key={item.id} className="space-y-1">
                  <button 
                    onClick={() => handleMenuClick(item)} 
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-violet-50 text-violet-600 shadow-sm shadow-violet-100' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xl transition-colors ${isActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        {item.icon}
                      </span>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                    {item.isDropdown && (
                      <span className={`text-[9px] transition-transform duration-300 ${isSubOpen ? 'rotate-180 text-violet-600' : 'text-slate-400'}`}>▼</span>
                    )}
                  </button>

                  {item.isDropdown && isSubOpen && (
                    <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-slate-100 pl-4 animate-in slide-in-from-top-2 duration-300">
                      {item.subItems.map((subItem) => {
                        const isSubActive = currentPath === subItem.path;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => handleSubMenuClick(subItem.path)}
                            className={`text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 group/sub ${
                              isSubActive 
                                ? 'text-violet-600 bg-violet-50/50' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full transition-all ${isSubActive ? 'bg-violet-600 scale-125' : 'bg-slate-300 group-hover/sub:bg-slate-400'}`}></span>
                            {subItem.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer Account info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-750 flex items-center justify-center font-bold text-sm shadow-inner uppercase">
              {currentUserName.charAt(0)}
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-800 truncate">{currentUserName}</p>
              <p className="text-[9px] font-bold text-violet-600 uppercase tracking-widest">{currentUserRole}</p>
            </div>
          </div>
          <button 
            onClick={onLogout} 
            title="Log Out"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogoutIcon />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto h-full relative flex flex-col">
        
        {/* Top Header Bar - Premium visual elements from reference picture */}
        <header className="bg-white border-b border-slate-200/80 p-4 px-6 md:px-8 flex justify-between items-center z-10 sticky top-0 shadow-sm shadow-slate-100/50">
          {/* Search bar & quick links */}
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full hidden sm:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input 
                type="text" 
                placeholder="Search resources, bills, chalans..." 
                className="w-full bg-[#f4f6fa] border-0 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[10px] font-bold text-slate-400 uppercase">
                ⌘K
              </span>
            </div>
          </div>

          {/* Action elements on right side of header */}
          <div className="flex items-center gap-4">
            
            {/* Command palette icon button */}
            <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" title="Command Palette">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>

            {/* Dark mode switch toggle (visual only) */}
            <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" title="Dark Mode">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            {/* Notifications Bell with dot indicator */}
            <div className="relative">
              <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" title="Notifications">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>
            </div>

            {/* Language dropdown (visual flag 🇬🇧) */}
            <button className="p-2 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors" title="Language">
              <span className="text-base leading-none">🇬🇧</span>
            </button>

            <span className="h-6 w-px bg-slate-200 hidden sm:inline-block"></span>

            {/* User Dropdown matching top right of MatDash image */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-xl transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-650 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md shadow-indigo-605/10">
                  {currentUserName.charAt(0)}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-black text-slate-700 leading-none">{currentUserName}</p>
                  <p className="text-[9px] text-slate-400 font-bold tracking-wider mt-0.5">{currentUserRole}</p>
                </div>
                <span className="text-[8px] text-slate-400 hidden md:block">▼</span>
              </button>

              {showProfileDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowProfileDropdown(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-30 py-2 animate-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-black text-slate-800">{currentUserName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{currentUserRole}</p>
                    </div>
                    <button 
                      onClick={() => { setShowProfileDropdown(false); onLogout(); }} 
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      🚪 লগআউট (Log Out)
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Content Render Area */}
        <div className="p-4 md:p-8 pb-28 md:pb-8 flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center p-12 gap-3 min-h-[300px]">
              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin"></div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">লোডিং হচ্ছে...</span>
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Mobile Floating Actions Menu (FAB) */}
      <div className="md:hidden">
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}
        {isMobileMenuOpen && (
          <div className="fixed bottom-24 right-6 bg-white p-2 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 min-w-[260px] animate-in slide-in-from-bottom-4 duration-300 border border-slate-100 max-h-[70vh] overflow-y-auto">
            <div className="p-3 border-b border-slate-100 mb-1 sticky top-0 bg-white">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Menu Options</p>
            </div>
            {menuItems.map((item) => {
              const isSubOpen = openSubMenu === item.id || isDropdownActive(item);
              const isActive = (!item.isDropdown && currentPath === item.path) || isDropdownActive(item);

              return (
                <div key={item.id}>
                  <button 
                    onClick={() => handleMenuClick(item)}
                    className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
                      isActive ? 'bg-violet-50 text-violet-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.isDropdown && (
                      <span className={`text-xs text-slate-400 transition-transform duration-300 ${isSubOpen ? 'rotate-180 text-violet-600' : ''}`}>▼</span>
                    )}
                  </button>
                  {item.isDropdown && isSubOpen && (
                    <div className="ml-10 mt-1 flex flex-col gap-1 border-l-2 border-slate-100 pl-2 mb-2 animate-in slide-in-from-top-2 duration-200">
                      {item.subItems.map((subItem) => (
                        <button
                          key={subItem.id}
                          onClick={() => handleSubMenuClick(subItem.path)}
                          className={`text-left px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                            currentPath === subItem.path ? 'bg-slate-100 text-slate-800' : 'text-slate-550 hover:bg-slate-50'
                          }`}
                        >
                          {subItem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-[0_10px_25px_rgba(124,58,237,0.3)] z-50 transition-all duration-300 active:scale-90 ${isMobileMenuOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-violet-600 text-white hover:bg-violet-750'}`}>
          {isMobileMenuOpen ? '✕' : '⋮'}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;