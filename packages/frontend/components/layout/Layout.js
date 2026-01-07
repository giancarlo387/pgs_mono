import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { CartProvider } from '../../contexts/CartContext';
import NavBar from './NavBar';
import BuyerNavBar from './BuyerNavBar';
import BuyerGlobalTopNav from './BuyerGlobalTopNav';
import SideBar from './SideBar';
import BuyerSideBar from './BuyerSideBar';
import AgentSideBar from './AgentSideBar';
import AgentNavBar from './AgentNavBar';
import AdminLayout from '../admin/AdminLayout';
import Footer from './Footer';
import ProminentSearchBar from '../common/ProminentSearchBar';
import ImpersonationBanner from '../common/ImpersonationBanner';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  // Check if admin is impersonating
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const impersonating = localStorage.getItem('is_impersonating') === 'true';
      setIsImpersonating(impersonating);
    }
  }, []);

  // Debug logging
  console.log('Layout Debug:', {
    pathname: router.pathname,
    isAuthenticated,
    user,
    usertype: user?.usertype
  });

  // Determine page types and user types BEFORE any hooks
  const isAdminPage = router.pathname.startsWith('/admin');
  const isBuyerUser = user?.usertype === 'buyer';
  const isAgentUser = user?.usertype === 'agent';
  // Fix: /agents is seller's agent management, /agent is agent user pages
  const isAgentPage = (router.pathname.startsWith('/agent') && !router.pathname.startsWith('/agents')) || (isAgentUser && router.pathname === '/chat');
  const isBuyerPage = router.pathname.startsWith('/buyer') || (isBuyerUser && router.pathname === '/chat');
  const isBuyerDashboard = router.pathname === '/buyer';
  const isUnauthenticatedBuyerPage = !isAuthenticated && router.pathname.startsWith('/buyer');
  
  // ALL useEffect hooks MUST be called before any conditional returns
  // Handle admin route protection
  useEffect(() => {
    if (isAdminPage && (!isAuthenticated || user?.usertype !== 'admin')) {
      router.push('/login');
    }
  }, [isAdminPage, isAuthenticated, user, router]);

  // Handle role-based redirects
  useEffect(() => {
    // Prevent buyers from accessing seller portal (but allow storefront access)
    if (isAuthenticated && user?.usertype === 'buyer' && !router.pathname.startsWith('/buyer') && !router.pathname.startsWith('/admin') && !router.pathname.startsWith('/store')) {
      router.push('/buyer');
    }
    // Prevent sellers from accessing buyer portal
    if (isAuthenticated && user?.usertype === 'seller' && router.pathname.startsWith('/buyer')) {
      router.push('/');
    }
    // Prevent agents from accessing seller/buyer portals (except chat)
    if (isAuthenticated && user?.usertype === 'agent' && !router.pathname.startsWith('/agent') && router.pathname !== '/chat' && !router.pathname.startsWith('/profile') && !router.pathname.startsWith('/settings') && !router.pathname.startsWith('/support')) {
      router.push('/agent/dashboard');
    }
  }, [isAuthenticated, user, router.pathname, router]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // NOW we can do conditional returns
  if (isAdminPage) {
    // Show loading while checking authentication
    if (!isAuthenticated || user?.usertype !== 'admin') {
      return (
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-secondary-600">Redirecting...</p>
          </div>
        </div>
      );
    }
    
    // Use admin layout for admin users
    return <AdminLayout>{children}</AdminLayout>;
  }

  // Layout for unauthenticated users
  // Only use minimal layout for login page and agent invitation pages, not for buyer pages
  if (!isAuthenticated && (router.pathname === '/login' || router.pathname.startsWith('/agent/accept-invitation'))) {
    return (
      <div className="min-h-screen bg-secondary-50">
        {children}
      </div>
    );
  }

  // Layout for storefront pages - completely standalone, no nav/sidebar
  if (router.pathname.startsWith('/store/')) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    );
  }

  // Layout for onboarding page (authenticated but no sidenav)
  if (router.pathname === '/onboarding') {
    return (
      <div className="min-h-screen bg-secondary-50">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Determine when to show the prominent search bar (Alibaba-style)
  // Show on main buyer pages but not on detail pages, forms, or specific functionality pages
  const shouldShowProminentSearch = (isBuyerPage || isUnauthenticatedBuyerPage) && (
    router.pathname === '/buyer' || // Homepage
    router.pathname === '/buyer/search' || // Search results page
    router.pathname === '/buyer/suppliers' || // Suppliers listing
    router.pathname.startsWith('/buyer/products') && router.pathname === '/buyer/products' // Products listing (not detail)
  );

  // Layout for search page, product detail pages, and supplier detail pages - no sidebar for better space
  if (router.pathname === '/buyer/search' ||
      router.pathname.startsWith('/buyer/products/') ||
      router.pathname.startsWith('/buyer/suppliers/')) {
    return (
      <CartProvider>
        <div className="min-h-screen bg-secondary-50">
          <div className="sticky top-0 z-50">
            {isImpersonating && <ImpersonationBanner />}
            <BuyerGlobalTopNav onMenuToggle={toggleSidebar} isSidebarOpen={sidebarOpen} />
          </div>
          {/* Prominent Search Bar - Alibaba Style */}
          {shouldShowProminentSearch && <ProminentSearchBar />}
          <div className="flex">
            <BuyerSideBar isOpen={sidebarOpen} onClose={closeSidebar} />
            <div className="flex-1 flex flex-col min-w-0">
              <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
                <div className="w-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
          <Footer />
        </div>
      </CartProvider>
    );
  }

  // Layout for buyer messages page - full height messaging interface
  if (router.pathname === '/buyer/messages') {
    return (
      <CartProvider>
        <div className="min-h-screen bg-secondary-50 flex flex-col">
          <div className="sticky top-0 z-50">
            {isImpersonating && <ImpersonationBanner />}
            <BuyerGlobalTopNav onMenuToggle={toggleSidebar} isSidebarOpen={sidebarOpen} />
          </div>
          <BuyerSideBar isOpen={sidebarOpen} onClose={closeSidebar} />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </CartProvider>
    );
  }

  // Layout for other buyer pages - both global topnav and sidenav
  // Works for both authenticated and unauthenticated users
  // Includes prominent Alibaba-style search bar when appropriate
  if (isBuyerPage || isUnauthenticatedBuyerPage) {
    return (
      <CartProvider>
        <div className="min-h-screen bg-secondary-50">
          <div className="sticky top-0 z-50">
            {isImpersonating && <ImpersonationBanner />}
            <BuyerGlobalTopNav onMenuToggle={toggleSidebar} isSidebarOpen={sidebarOpen} />
          </div>
          {/* Prominent Search Bar - Alibaba Style (on main listing pages) */}
          {shouldShowProminentSearch && <ProminentSearchBar />}
          <div className="flex">
            <BuyerSideBar isOpen={sidebarOpen} onClose={closeSidebar} />
            <div className="flex-1 flex flex-col min-w-0">
              <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
                <div className="w-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
          <Footer />
        </div>
      </CartProvider>
    );
  }

  // Role-based redirect logic - prevent buyers from accessing seller portal
  if (isAuthenticated && user?.usertype === 'buyer' && !router.pathname.startsWith('/buyer') && !router.pathname.startsWith('/admin')) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-secondary-600">Redirecting to buyer portal...</p>
        </div>
      </div>
    );
  }

  // Role-based redirect logic - prevent sellers from accessing buyer portal
  if (isAuthenticated && user?.usertype === 'seller' && router.pathname.startsWith('/buyer')) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-secondary-600">Redirecting to seller portal...</p>
        </div>
      </div>
    );
  }

  // Layout for agent pages - chat-focused portal
  if (isAgentPage) {
    return (
      <div className="min-h-screen bg-secondary-50">
        {isImpersonating && <ImpersonationBanner />}
        <div className="flex">
          <AgentSideBar isOpen={sidebarOpen} onClose={closeSidebar} />
          
          <div className="flex-1 flex flex-col lg:ml-0">
            <AgentNavBar onMenuToggle={toggleSidebar} isSidebarOpen={sidebarOpen} />
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Layout for seller pages (existing functionality)
  return (
    <div className="min-h-screen bg-secondary-50">
      {isImpersonating && <ImpersonationBanner />}
      <div className="flex">
        <SideBar isOpen={sidebarOpen} onClose={closeSidebar} />
        
        <div className="flex-1 flex flex-col lg:ml-0">
          <NavBar onMenuToggle={toggleSidebar} isSidebarOpen={sidebarOpen} />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          
          <Footer />
        </div>
      </div>
    </div>
  );
}
