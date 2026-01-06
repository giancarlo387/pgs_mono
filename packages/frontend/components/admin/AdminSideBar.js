import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard,
  Users, 
  Building2, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  MessageSquare,
  FileText,
  Settings,
  Shield,
  HelpCircle,
  BarChart3,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AdminSideBar({ isOpen, onClose }) {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    commerce: false,
    financial: false,
    communication: false,
    system: false
  });

  // Auto-expand section based on current route
  useEffect(() => {
    const pathname = router.pathname;
    
    // Check which section should be expanded based on current route
    if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/companies') || 
        pathname.startsWith('/admin/agents') || pathname.startsWith('/admin/verifications')) {
      setExpandedSections(prev => ({ ...prev, users: true }));
    } else if (pathname.startsWith('/admin/products') || pathname.startsWith('/admin/orders')) {
      setExpandedSections(prev => ({ ...prev, commerce: true }));
    } else if (pathname.startsWith('/admin/payments') || pathname.startsWith('/admin/stripe')) {
      setExpandedSections(prev => ({ ...prev, financial: true }));
    } else if (pathname.startsWith('/admin/chat') || pathname.startsWith('/admin/inquiries')) {
      setExpandedSections(prev => ({ ...prev, communication: true }));
    } else if (pathname.startsWith('/admin/config') || pathname.startsWith('/admin/api') || 
               pathname.startsWith('/admin/security') || pathname.startsWith('/admin/performance')) {
      setExpandedSections(prev => ({ ...prev, system: true }));
    }
  }, [router.pathname]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/admin', 
      icon: LayoutDashboard,
      exact: true
    },
    { 
      name: 'Users & Companies',
      icon: Users,
      section: 'users',
      children: [
        { name: 'User Management', href: '/admin/users' },
        { name: 'Company Management', href: '/admin/companies' },
        { name: 'Agent Management', href: '/admin/agents' },
        { name: 'Verification Queue', href: '/admin/verifications' }
      ]
    },
    { 
      name: 'Commerce',
      icon: Package,
      section: 'commerce',
      children: [
        { name: 'Products & Catalog', href: '/admin/products' },
        { name: 'Orders & Transactions', href: '/admin/orders' },
      ]
    },
    { 
      name: 'Financial',
      icon: DollarSign,
      section: 'financial',
      children: [
        { name: 'Payment Ledger', href: '/admin/payments' },
        { name: 'Stripe Management', href: '/admin/stripe' }
      ]
    },
    { 
      name: 'Communication',
      icon: MessageSquare,
      section: 'communication',
      children: [
        { name: 'Chat Monitoring', href: '/admin/chat' },
        { name: 'Contact Inquiries', href: '/admin/inquiries' },
      ]
    },
    { 
      name: 'Analytics', 
      href: '/admin/analytics', 
      icon: BarChart3 
    },
    { 
      name: 'Product Analytics', 
      href: '/admin/product-analytics', 
      icon: BarChart3 
    }
  ];

  const isActive = (href, exact = false) => {
    if (exact) {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  const isSectionActive = (children) => {
    return children?.some(child => router.pathname.startsWith(child.href));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-secondary-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-primary-600 to-primary-700 border-b border-primary-800">
            <div className="flex items-center space-x-2">
              <img src="/pgs2.png" className="h-8 w-auto" alt="PGS Admin" />
              <div>
                <div className="text-white font-bold text-sm">PGS Admin</div>
                <div className="text-primary-200 text-xs">Control Panel</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedSections[item.section];
              const sectionActive = hasChildren && isSectionActive(item.children);

              if (hasChildren) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleSection(item.section)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                        ${sectionActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={`
                              block px-3 py-2 text-sm rounded-lg transition-colors duration-200
                              ${isActive(child.href)
                                ? 'bg-primary-100 text-primary-700 font-medium'
                                : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                              }
                            `}
                            onClick={onClose}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                    ${isActive(item.href, item.exact)
                      ? 'bg-primary-100 text-primary-700 border-l-4 border-primary-600'
                      : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                    }
                  `}
                  onClick={onClose}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section - Admin Info */}
          <div className="p-4 border-t border-secondary-200 bg-gradient-to-r from-primary-50 to-blue-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-secondary-900 truncate">
                  Admin Panel
                </p>
                <p className="text-xs text-primary-600 font-medium">
                  Super Administrator
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
