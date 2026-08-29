import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import PublicCatalog from './components/PublicCatalog';

const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Login = lazy(() => import('./components/Login'));

// Lazy load admin view components
const Dashboard = lazy(() => import('./components/Dashboard'));
const BillingSystem = lazy(() => import('./components/BillingSystem'));
const ChalanManager = lazy(() => import('./components/ChalanManager'));
const BillManager = lazy(() => import('./components/BillManager'));
const NawabpurBilling = lazy(() => import('./components/NawabpurBilling'));
const FalseBilling = lazy(() => import('./components/FalseBilling'));
const Reports = lazy(() => import('./components/Reports'));
const ProductEntry = lazy(() => import('./components/ProductEntry'));
const StockManagement = lazy(() => import('./components/StockManagement'));
const FrontEndCustom = lazy(() => import('./components/FrontEndCustom'));
const SmartUpload = lazy(() => import('./components/SmartUpload'));
const ReturnManager = lazy(() => import('./components/ReturnManager'));
const ServiceManager = lazy(() => import('./components/ServiceManager')); 
const UserManagement = lazy(() => import('./components/UserManagement'));
const LabelPrint = lazy(() => import('./components/LabelPrint'));
const BrokenManager = lazy(() => import('./components/BrokenManager'));
const ResellerOfferPublic = lazy(() => import('./components/ResellerOfferPublic'));
const ResellerOfferAdmin = lazy(() => import('./components/ResellerOfferAdmin'));
const InverterErrorCodes = lazy(() => import('./components/InverterErrorCodes'));
const SolarCal = lazy(() => import('./components/SolarCal'));

// 🌐 Public catalog page wrapper that handles navigation to login
const PublicCatalogWrapper = () => {
  const navigate = useNavigate();
  return <PublicCatalog onAdminClick={() => navigate('/login')} />;
};

// 🔒 Protected admin layout component
const AdminLayout = ({ isAdmin, userRole, userName, onLogout, loadingSession }) => {
  const location = useLocation();

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-955 flex flex-col items-center justify-center gap-4 text-white">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
        </div>
        <p className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Session...</p>
      </div>
    );
  }

  if (!isAdmin) {
    // Redirect to login page and save the attempted pathname
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <AdminPanel onLogout={onLogout} currentUserRole={userRole} currentUserName={userName} />;
};

// 🔐 Standalone login page component
const LoginPage = ({ onLoginSuccess, isAdmin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  useEffect(() => {
    if (isAdmin) {
      navigate(from, { replace: true });
    }
  }, [isAdmin, navigate, from]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-2 animate-in zoom-in-95 duration-300">
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 font-bold text-sm p-2 z-50"
        >
          ✕ বাতিল
        </button>
        <Login onLoginSuccess={onLoginSuccess} />
      </div>
    </div>
  );
};

// 🚫 Role-based route guard
const RoleRoute = ({ userRole, allowedRoles, children }) => {
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('Staff');
  const [userName, setUserName] = useState('');
  const [loadingSession, setLoadingSession] = useState(true);

  // 🔴 পাসওয়ার্ড রিকভারি স্টেট
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    // কারেন্ট সেশন চেক
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAdmin(true);
        setUserRole(session.user.user_metadata?.role || 'Staff');
        setUserName(session.user.user_metadata?.name || 'Employee');
      }
      setLoadingSession(false);
    });

    // লাইভ ইভেন্ট ট্র্যাকার
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // পাসওয়ার্ড রিকভারি ইভেন্ট ধরা
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }

      if (session) {
        setIsAdmin(true);
        setUserRole(session.user.user_metadata?.role || 'Staff');
        setUserName(session.user.user_metadata?.name || 'Employee');
      } else {
        setIsAdmin(false);
        setUserRole('Staff');
        setUserName('');
      }
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (user) => {
    setIsAdmin(true);
    setUserRole(user.role);
    setUserName(user.name);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert("সফলভাবে লগআউট হয়েছে!");
  };

  // 🔴 নতুন পাসওয়ার্ড সেভ করার ফাংশন (লিংকে ক্লিক করে আসার পর)
  const handleUpdateRecoveryPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!");

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      alert("✅ সফলভাবে নতুন পাসওয়ার্ড সেট করা হয়েছে!");
      setRecoveryMode(false); // মডাল বন্ধ
      setNewPassword(''); // ফিল্ড রিসেট
    } catch (err) {
      alert("পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে: " + err.message);
    }
    setUpdatingPassword(false);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', 'Hind Siliguri', sans-serif" }}>
        
        {/* পাসওয়ার্ড রিকভারি মডাল (সবার উপরে দেখাবে) */}
        {recoveryMode && (
          <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🔒
              </div>
              <h2 className="text-2xl font-black text-center text-slate-800 mb-2">নতুন পাসওয়ার্ড সেট করুন</h2>
              <p className="text-xs text-center text-slate-500 mb-6 font-bold">আপনার অ্যাকাউন্টের জন্য একটি নতুন এবং শক্তিশালী পাসওয়ার্ড দিন।</p>
              
              <form onSubmit={handleUpdateRecoveryPassword} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
                  <input 
                    type="password" 
                    placeholder="নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর)" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-slate-800" 
                    required
                  />
                </div>
                <button type="submit" disabled={updatingPassword} className="w-full py-4 bg-slate-900 hover:bg-orange-600 text-white rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-wider text-sm mt-2">
                  {updatingPassword ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড সেভ করুন'}
                </button>
              </form>
            </div>
          </div>
        )}

        <Routes>
          {/* Public Page Route */}
          <Route path="/" element={<PublicCatalogWrapper />} />
          <Route path="/reseller-offer" element={<ResellerOfferPublic />} />
          <Route path="/error-codes" element={
            <Suspense fallback={
              <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-700">
                <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#ea3838] animate-spin"></div>
                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Error Guide...</p>
              </div>
            }>
              <InverterErrorCodes />
            </Suspense>
          } />
          <Route path="/inverter-errors" element={
            <Suspense fallback={
              <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-700">
                <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#ea3838] animate-spin"></div>
                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Error Guide...</p>
              </div>
            }>
              <InverterErrorCodes />
            </Suspense>
          } />
          <Route path="/solarcal" element={
            <Suspense fallback={
              <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-700">
                <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#ea3838] animate-spin"></div>
                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Solar Calculator...</p>
              </div>
            }>
              <SolarCal />
            </Suspense>
          } />
          <Route path="/solacal" element={
            <Suspense fallback={
              <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-700">
                <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#ea3838] animate-spin"></div>
                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Solar Calculator...</p>
              </div>
            }>
              <SolarCal />
            </Suspense>
          } />
          <Route path="/solar-calculator" element={
            <Suspense fallback={
              <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-700">
                <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#ea3838] animate-spin"></div>
                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Solar Calculator...</p>
              </div>
            }>
              <SolarCal />
            </Suspense>
          } />

          {/* Login Route */}
          <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} isAdmin={isAdmin} />} />

          {/* Protected Admin Routes Layout */}
          <Route element={<AdminLayout isAdmin={isAdmin} userRole={userRole} userName={userName} onLogout={handleLogout} loadingSession={loadingSession} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan" element={<SmartUpload />} />
            <Route path="/product-entry" element={<ProductEntry />} />
            <Route path="/stock" element={<StockManagement />} />
            <Route path="/broken" element={<BrokenManager />} />
            <Route path="/label-print" element={<LabelPrint />} />
            <Route path="/billing" element={<BillingSystem />} />
            <Route path="/challan/nawabpur" element={<NawabpurBilling />} />
            <Route path="/challans" element={<ChalanManager />} />
            <Route path="/bills" element={<BillManager />} />
            <Route path="/false-billing" element={<FalseBilling />} />
            <Route path="/return-manager" element={<ReturnManager />} />
            <Route path="/service" element={<ServiceManager />} />
            <Route path="/reports" element={<Reports />} />
            
            {/* Admin-only and CEO-only Protected Routes */}
            <Route path="/frontend-custom" element={
              <RoleRoute userRole={userRole} allowedRoles={['Admin', 'CEO']}>
                <FrontEndCustom />
              </RoleRoute>
            } />
            <Route path="/reseller-offer-admin" element={
              <RoleRoute userRole={userRole} allowedRoles={['Admin', 'CEO']}>
                <ResellerOfferAdmin />
              </RoleRoute>
            } />
            <Route path="/user-management" element={
              <RoleRoute userRole={userRole} allowedRoles={['Admin', 'CEO']}>
                <UserManagement />
              </RoleRoute>
            } />
          </Route>

          {/* Redirect any other request back to root landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;