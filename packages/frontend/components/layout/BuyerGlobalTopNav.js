import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Search, 
  Camera, 
  MessageSquare, 
  ShoppingCart, 
  Package, 
  User, 
  ChevronDown,
  Globe,
  MapPin,
  Bell,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import apiService from '../../lib/api';

export default function BuyerGlobalTopNav({ onMenuToggle, isSidebarOpen }) {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [selectedCountry, setSelectedCountry] = useState('Philippines');
  const [messageCount, setMessageCount] = useState(0);
  const [orderCount, setOrderCount] = useState(2);

  const languages = [
    { code: 'EN', name: 'English' },
    { code: 'ZH', name: '中文' },
    { code: 'ES', name: 'Español' },
    { code: 'FR', name: 'Français' }
  ];

  const countries = [
    { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬' }
  ];


  // Fetch unread message count - only for authenticated users
  const fetchUnreadCount = async () => {
    if (!user || !isAuthenticated) return;
    
    try {
      const response = await apiService.getBuyerUnreadCount();
      if (response.success) {
        setMessageCount(response.unread_count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch unread count on component mount and when user changes - only for authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [user, isAuthenticated]);

  // Refresh unread count when navigating to/from messages page
  useEffect(() => {
    if (router.pathname === '/buyer/messages') {
      // When leaving messages page, refresh count
      const handleRouteChange = () => {
        setTimeout(fetchUnreadCount, 500); // Small delay to allow backend to update
      };
      
      router.events.on('routeChangeComplete', handleRouteChange);
      return () => router.events.off('routeChangeComplete', handleRouteChange);
    }
  }, [router.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-secondary-200">
      <div className="w-full px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left - Menu Button (Mobile/Tablet) + Logo */}
          <div className="flex items-center space-x-3">
            {/* Hamburger Menu Button - Only visible on mobile/tablet */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Hamburger clicked, onMenuToggle:', onMenuToggle);
                if (onMenuToggle) {
                  onMenuToggle();
                }
              }}
              className="lg:hidden p-2 rounded-lg text-secondary-600 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 relative z-50"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <Link href="/buyer" className="flex items-center space-x-3">
              <img src="/pgs2.png" className="h-8 w-auto" alt="Pinoy Global Supply" />
              <span className="text-xl font-bold text-secondary-900 hidden sm:block">
                Pinoy Global Supply
              </span>
            </Link>
          </div>

          {/* Center - Spacer (search bar moved to prominent section below) */}
          <div className="flex-1 min-w-0"></div>

          {/* Right - Actions and User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Language Selector */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center space-x-1 px-2 py-1 text-sm text-secondary-600 hover:text-secondary-900 rounded"
              >
                <Globe className="w-4 h-4" />
                <span>{selectedLanguage}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-secondary-200 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setShowLanguageMenu(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Country Selector */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowCountryMenu(!showCountryMenu)}
                className="flex items-center space-x-1 px-2 py-1 text-sm text-secondary-600 hover:text-secondary-900 rounded"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">{selectedCountry}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showCountryMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-secondary-200 z-50">
                  {countries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => {
                        setSelectedCountry(country.name);
                        setShowCountryMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                    >
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Conditional rendering based on authentication status */}
            {isAuthenticated ? (
              <>
                {/* Messages - Authenticated users only */}
                <Link href="/buyer/messages" className="hidden sm:block">
                  <button className="relative p-1 sm:p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    {messageCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {messageCount > 9 ? '9+' : messageCount}
                      </span>
                    )}
                  </button>
                </Link>

                {/* Orders - Authenticated users only */}
                <Link href="/buyer/orders" className="hidden sm:block">
                  <button className="relative p-1 sm:p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                    {orderCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                        {orderCount > 9 ? '9+' : orderCount}
                      </span>
                    )}
                  </button>
                </Link>

                {/* Cart - Authenticated users only */}
                <Link href="/buyer/cart">
                  <button className="relative p-1 sm:p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </button>
                </Link>

                {/* User Menu - Authenticated users only */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-1 p-1 sm:p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs sm:text-sm font-medium text-blue-600">
                        {user?.name?.charAt(0)?.toUpperCase() || 'B'}
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-secondary-200 z-50">
                      <div className="p-4 border-b border-secondary-200">
                        <p className="text-sm font-medium text-secondary-900">
                          {user?.name || 'Buyer Account'}
                        </p>
                        <p className="text-xs text-secondary-500">
                          {user?.email || 'buyer@company.com'}
                        </p>
                      </div>
                      
                      <div className="py-2">
                        <Link href="/buyer/settings/profile">
                          <button className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100">
                            <User className="w-4 h-4" />
                            <span>My Profile</span>
                          </button>
                        </Link>
                        
                        <Link href="/buyer/settings">
                          <button className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100">
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                          </button>
                        </Link>
                        
                        <div className="border-t border-secondary-200 mt-2 pt-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Guest user actions - show login button */}
                <Link href="/login" target="_blank" rel="noopener noreferrer">
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
                    Log In
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showLanguageMenu || showCountryMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowUserMenu(false);
            setShowLanguageMenu(false);
            setShowCountryMenu(false);
          }}
        />
      )}
    </nav>
  );
}
