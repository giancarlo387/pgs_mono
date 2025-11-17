import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getImageUrl } from '../../../lib/storefront-api';
import ProductDetailModal from '../../../components/products/ProductDetailModal';

export default function StorefrontPage() {
  const router = useRouter();
  const { slug, page: pageSlug } = router.query;
  
  const [storefront, setStorefront] = useState(null);
  const [page, setPage] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    if (slug && pageSlug) {
      fetchPageData();
    }
  }, [slug, pageSlug]);

  const fetchPageData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch page data (includes storefront)
      const pageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/storefront/${slug}/page/${pageSlug}`);
      if (!pageResponse.ok) throw new Error('Page not found');
      const responseData = await pageResponse.json();
      
      setStorefront(responseData.storefront);
      setPage(responseData.page);

      // Fetch products for the storefront
      const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/storefront/${slug}/products`);
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }

      // Fetch menu items for navigation
      const menuResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/storefront/${slug}/menu`);
      if (menuResponse.ok) {
        const menuData = await menuResponse.json();
        const menuTree = buildMenuTree(menuData);
        setMenuItems(menuTree);
      }

    } catch (err) {
      console.error('Error fetching page:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical menu structure
  const buildMenuTree = (items) => {
    const tree = [];
    const itemMap = {};

    items.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
    });

    items.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      } else {
        tree.push(itemMap[item.id]);
      }
    });

    return tree;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error || !storefront || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
          <p className="text-gray-600 mb-8">{error || 'Page not found'}</p>
          <Link href={`/store/${slug}`}>
            <button className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
              Go to Storefront
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const { company, primary_color } = storefront;

  return (
    <>
      <Head>
        <title>{page.title} - {company.name}</title>
        <meta name="description" content={page.meta_description || company.description} />
        {page.meta_keywords && <meta name="keywords" content={page.meta_keywords} />}
      </Head>

      <div className="min-h-screen bg-white">
        {/* Header Navigation */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          {/* Company Info Bar */}
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <Link href={`/store/${slug}`} className="flex items-center space-x-4 cursor-pointer">
                  {company.logo && (
                    <img 
                      src={getImageUrl(company.logo)} 
                      alt={company.name}
                      className="h-12 w-auto"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                  </div>
                </Link>
                <div className="hidden md:flex items-center space-x-4">
                  <button 
                    className="px-6 py-2 rounded text-white font-semibold hover:opacity-90 transition"
                    style={{ backgroundColor: primary_color }}
                  >
                    Contact Supplier
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="bg-black text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex items-center h-12">
                <div className="flex items-center space-x-8 flex-1">
                  {menuItems && menuItems.length > 0 ? (
                    menuItems.filter(item => item.is_visible).map((item) => {
                      const hasChildren = item.children && item.children.length > 0;
                      const isActive = item.type === 'page' && item.target === pageSlug;
                      
                      return (
                        <div
                          key={item.id}
                          className="relative group"
                          onMouseEnter={() => setOpenDropdown(item.id)}
                          onMouseLeave={() => setOpenDropdown(null)}
                        >
                          {item.type === 'page' ? (
                            <Link
                              href={`/store/${slug}/${item.target}`}
                              className={`text-sm hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer ${isActive ? 'text-orange-400 font-semibold' : ''}`}
                            >
                              {item.label}
                              {hasChildren && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </Link>
                          ) : item.type === 'section' ? (
                            <a
                              href={`/store/${slug}#${item.target}`}
                              className="text-sm hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              {item.label}
                              {hasChildren && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </a>
                          ) : (
                            <a
                              href={item.target}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              {item.label}
                              {hasChildren && (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </a>
                          )}

                          {hasChildren && (
                            <div className={`absolute top-full left-0 mt-0 bg-white text-gray-900 shadow-lg rounded-md min-w-[200px] py-2 transition-all ${
                              openDropdown === item.id ? 'opacity-100 visible' : 'opacity-0 invisible'
                            }`}>
                              {item.children.filter(child => child.is_visible).map((child) => (
                                <div key={child.id}>
                                  {child.type === 'page' ? (
                                    <Link
                                      href={`/store/${slug}/${child.target}`}
                                      className="block px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                                    >
                                      {child.label}
                                    </Link>
                                  ) : child.type === 'section' ? (
                                    <a
                                      href={`/store/${slug}#${child.target}`}
                                      className="block px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                                    >
                                      {child.label}
                                    </a>
                                  ) : (
                                    <a
                                      href={child.target}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                                    >
                                      {child.label}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <Link href={`/store/${slug}`} className="text-sm hover:text-gray-300 transition-colors">
                      Home
                    </Link>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </header>

        {/* Page Content - Render sections from Page Builder */}
        <main>
          {page.sections && page.sections.length > 0 ? (
            <div>
              {page.sections.map((section) => (
                <StorefrontSection 
                  key={section.id} 
                  section={section}
                  primaryColor={primary_color}
                  company={company}
                  products={products}
                />
              ))}
            </div>
          ) : page.content ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="bg-white rounded-lg shadow-md p-8">
                <h1 className="text-4xl font-bold mb-6" style={{ color: primary_color }}>
                  {page.title}
                </h1>
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: page.content }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
              <p className="text-gray-500">No content available for this page yet.</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p>&copy; {new Date().getFullYear()} {company.name}. All rights reserved.</p>
            <p className="text-sm text-gray-400 mt-2">Powered by Pinoy Global Supply</p>
          </div>
        </footer>
      </div>
    </>
  );
}

// Component to render different section types (copied from main storefront)
function StorefrontSection({ section, primaryColor, company, products }) {
  const router = useRouter();
  const { slug } = router.query;
  const { section_type, title, content, images, settings } = section;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Function to get a random product and navigate to it
  const handleImageClick = (e) => {
    e.preventDefault();
    
    // Use products from props first, fallback to company.products
    const availableProducts = products && products.length > 0 ? products : (company?.products || []);
    
    console.log('Available products:', availableProducts.length);
    
    if (availableProducts.length === 0) {
      console.log('No products available');
      return;
    }
    
    // Get random product
    const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
    
    console.log('Selected random product:', randomProduct.name, 'ID:', randomProduct.id);
    
    // Navigate to the product detail page (buyer view)
    router.push(`/buyer/products/${randomProduct.id}`);
  };

  // Fetch featured products if this is a featured_products section
  useEffect(() => {
    if (section_type === 'featured_products') {
      const fetchFeaturedProducts = async () => {
        setLoadingProducts(true);
        const selectedProductIds = settings?.selected_products || [];
        
        if (selectedProductIds.length === 0) {
          setLoadingProducts(false);
          return;
        }
        
        try {
          // Fetch products from the public API
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/storefront/${slug}/products`);
          if (response.ok) {
            const allProducts = await response.json();
            // Filter to only show selected products in the order they were selected
            const displayProducts = selectedProductIds
              .map(id => allProducts.find(p => p.id === id))
              .filter(Boolean); // Remove any null/undefined (deleted products)
            setFeaturedProducts(displayProducts);
          }
        } catch (error) {
          console.error('Error fetching featured products:', error);
        } finally {
          setLoadingProducts(false);
        }
      };
      
      fetchFeaturedProducts();
    }
  }, [section_type, settings, slug]);

  // Auto-advance carousel for hero and slider sections
  useEffect(() => {
    if (section_type === 'hero' && images && images.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % images.length);
      }, 5000);
      return () => clearInterval(timer);
    }
    
    if (section_type === 'slider') {
      const videos = settings?.videos || [];
      const allMedia = [...(images || []), ...videos];
      if (allMedia.length > 1) {
        const timer = setInterval(() => {
          setCurrentSlide((prev) => (prev + 1) % allMedia.length);
        }, 5000);
        return () => clearInterval(timer);
      }
    }
  }, [section_type, images, settings]);

  // Parse images if they're JSON string
  const parsedImages = typeof images === 'string' ? JSON.parse(images) : images;

  if (section_type === 'hero') {
    if (parsedImages && parsedImages.length > 0) {
      return (
        <section className="mb-16 w-full">
          <div className="relative h-96 md:h-[600px] overflow-hidden w-full">
            {parsedImages.map((img, idx) => (
              <div
                key={idx}
                onClick={handleImageClick}
                className={`absolute inset-0 transition-opacity duration-1000 cursor-pointer ${
                  idx === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  backgroundImage: `url(${getImageUrl(img)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center pointer-events-none">
                  {title && (
                    <h2 className="text-4xl md:text-6xl font-bold text-white text-center px-4 drop-shadow-lg">
                      {title}
                    </h2>
                  )}
                </div>
              </div>
            ))}
            
            {parsedImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev - 1 + parsedImages.length) % parsedImages.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-3 transition z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev + 1) % parsedImages.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-3 transition z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            {parsedImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {parsedImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    className={`w-3 h-3 rounded-full transition ${
                      idx === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }
  }

  if (section_type === 'about') {
    return (
      <section className="mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold mb-6">{title || 'About Us'}</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
          </div>
        </div>
      </section>
    );
  }

  if (section_type === 'text') {
    return (
      <section className="mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8">
            {title && <h2 className="text-3xl font-bold mb-6 text-gray-900">{title}</h2>}
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-lg">{content}</p>
          </div>
        </div>
      </section>
    );
  }

  if (section_type === 'gallery' && parsedImages && parsedImages.length > 0) {
    return (
      <section className="mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {title && <h2 className="text-3xl font-bold mb-6">{title}</h2>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {parsedImages.map((img, idx) => (
              <img 
                key={idx}
                src={getImageUrl(img)}
                alt={`Gallery image ${idx + 1}`}
                onClick={handleImageClick}
                className="w-full h-64 object-cover rounded-lg shadow-md hover:shadow-xl transition cursor-pointer transform hover:scale-105"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section_type === 'image' && parsedImages && parsedImages.length > 0) {
    return (
      <section className="mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {title && <h2 className="text-3xl font-bold mb-6">{title}</h2>}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <img 
              src={getImageUrl(parsedImages[0])}
              alt={title || 'Section image'}
              onClick={handleImageClick}
              className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition"
            />
            {content && (
              <div className="p-6">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (section_type === 'slider') {
    const videos = settings?.videos || [];
    const allMedia = [...(parsedImages || []), ...videos];
    
    if (allMedia.length > 0) {
      return (
        <section className="mb-16 w-full">
          <div className="relative h-96 md:h-[600px] overflow-hidden bg-gray-900 w-full">
            {allMedia.map((media, idx) => {
              const isVideo = videos.includes(media);
              
              return (
                <div
                  key={idx}
                  onClick={handleImageClick}
                  className={`absolute inset-0 transition-opacity duration-1000 cursor-pointer ${
                    idx === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {isVideo ? (
                    <video
                      src={getImageUrl(media)}
                      className="w-full h-full object-cover pointer-events-none"
                      autoPlay
                      muted
                      loop
                    />
                  ) : (
                    <div
                      style={{
                        backgroundImage: `url(${getImageUrl(media)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                      className="w-full h-full"
                    />
                  )}
                  
                  {title && title.trim() !== '' && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center pointer-events-none">
                      <h2 className="text-4xl md:text-6xl font-bold text-white text-center px-4 drop-shadow-lg">
                        {title}
                      </h2>
                    </div>
                  )}
                </div>
              );
            })}
            
            {allMedia.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev - 1 + allMedia.length) % allMedia.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-3 transition z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev + 1) % allMedia.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-3 transition z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {allMedia.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(idx);
                      }}
                      className={`w-3 h-3 rounded-full transition ${
                        idx === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      );
    }
  }

  if (section_type === 'products_showcase') {
    // Auto-display products with simple limit
    const availableProducts = products && products.length > 0 ? products : (company?.products || []);
    const productsLimit = settings?.products_limit || 8;
    const displayProducts = productsLimit === 0 ? availableProducts : availableProducts.slice(0, productsLimit);
    
    return (
      <section className="mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">{title || 'Our Products'}</h2>
          {content && (
            <p className="text-gray-700 mb-8">{content}</p>
          )}
          
          {displayProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayProducts.map((product) => {
                // Use getImageUrl helper function to construct proper image URLs
                const productImage = product.main_image 
                  ? getImageUrl(product.main_image)
                  : product.images?.[0]
                    ? getImageUrl(product.images[0])
                    : null;

                return (
                  <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group cursor-pointer" onClick={() => window.open(`/buyer/products/${product.id}`, '_blank')}>
                    <div className="relative w-full h-48 bg-gray-100">
                      {productImage ? (
                        <>
                          <img 
                            src={productImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              console.error('❌ Image failed to load:', productImage);
                              e.target.style.display = 'none';
                              e.target.parentElement.querySelector('.fallback-icon')?.classList.remove('hidden');
                            }}
                          />
                          <div className="fallback-icon hidden w-full h-full absolute inset-0 flex items-center justify-center text-gray-400">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description || product.specs}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg" style={{ color: primaryColor }}>
                          ${product.price}
                        </span>
                        <span className="text-xs text-gray-500">MOQ: {product.moq}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg font-semibold mb-2">No products available</p>
              <p className="text-sm">Add products to your catalog to display them here</p>
            </div>
          )}
          
          {productsLimit > 0 && availableProducts.length > productsLimit && (
            <div className="text-center mt-8">
              <p className="text-gray-700">
                Showing {productsLimit} of {availableProducts.length} products
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (section_type === 'featured_products') {
    // Manual selection of specific products
    if (loadingProducts) {
      return (
        <section className="mb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-3xl font-bold mb-8 text-gray-900">{title || 'Featured Products'}</h2>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
              <p className="text-gray-700 mt-2">Loading products...</p>
            </div>
          </div>
        </section>
      );
    }
    
    return (
      <section className="mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">{title || 'Featured Products'}</h2>
          {content && (
            <p className="text-gray-700 mb-8">{content}</p>
          )}
          
          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} primaryColor={primaryColor} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg font-semibold mb-2">No products selected</p>
              <p className="text-sm">Please select products to feature in the page builder</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Text Section with custom styling
  if (section_type === 'text' || section_type === 'heading') {
    const paddingMap = {
      none: 'py-0',
      small: 'py-6',
      medium: 'py-12',
      large: 'py-20',
      xlarge: 'py-32'
    };

    const paddingClass = paddingMap[settings?.padding] || 'py-12';
    const textColor = settings?.text_color || '#000000';
    const fontSize = settings?.font_size || '16px';
    const textAlign = settings?.text_align || 'left';
    const fontWeight = settings?.font_weight || 'normal';
    const bgColor = settings?.bg_color || 'transparent';
    
    // Background image can come from either images array (first image) or settings.bg_image
    let bgImage = null;
    if (images && images.length > 0) {
      bgImage = getImageUrl(images[0]);
    } else if (settings?.bg_image) {
      bgImage = getImageUrl(settings.bg_image);
    }

    const backgroundStyle = bgImage 
      ? {
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: bgColor !== 'transparent' ? bgColor : undefined
        }
      : {
          backgroundColor: bgColor !== 'transparent' ? bgColor : undefined
        };

    return (
      <section 
        className={`mb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${paddingClass} ${bgImage ? 'relative' : ''}`}
        style={backgroundStyle}
      >
        {bgImage && <div className="absolute inset-0 bg-black bg-opacity-30"></div>}
        <div className={`${bgImage ? 'relative z-10' : ''} max-w-4xl ${textAlign === 'center' ? 'mx-auto' : ''}`}>
          {title && (
            <h2 
              className="text-3xl font-bold mb-6"
              style={{ 
                color: textColor,
                textAlign: textAlign,
                fontWeight: fontWeight
              }}
            >
              {title}
            </h2>
          )}
          {section_type === 'heading' && title && !content && (
            <h2 
              className="text-4xl font-bold mb-4"
              style={{ 
                color: textColor,
                textAlign: textAlign,
                fontWeight: fontWeight
              }}
            >
              {title}
            </h2>
          )}
          {content && (
            <div 
              className="prose prose-lg max-w-none"
              style={{ 
                color: textColor,
                fontSize: fontSize,
                textAlign: textAlign,
                fontWeight: fontWeight
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      </section>
    );
  }

  // Render nothing extra - navigation happens via router.push
  return null;
}

// Component to render individual product card with image carousel
function ProductCard({ product, primaryColor }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.images || [];
  const hasMultipleImages = images.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Use getImageUrl helper function to construct proper image URLs
  const productImage = product.main_image 
    ? getImageUrl(product.main_image)
    : product.images?.[currentImageIndex]
      ? getImageUrl(product.images[currentImageIndex])
      : null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group">
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {productImage ? (
          <>
            <img 
              src={productImage}
              alt={`${product.name} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
              onClick={() => window.open(`/buyer/products/${product.id}`, '_blank')}
              onError={(e) => {
                console.error('❌ Image failed to load:', productImage);
                e.target.style.display = 'none';
                e.target.parentElement.querySelector('.fallback-icon')?.classList.remove('hidden');
              }}
            />
            <div className="fallback-icon hidden w-full h-full absolute inset-0 flex items-center justify-center text-gray-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            {/* Image navigation arrows for multiple images */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            {/* Image counter badge */}
            {hasMultipleImages && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                {currentImageIndex + 1}/{images.length}
              </div>
            )}
            
            {/* Dot indicators for multiple images */}
            {hasMultipleImages && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`w-2 h-2 rounded-full transition ${
                      idx === currentImageIndex 
                        ? 'bg-white' 
                        : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                    }`}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            {product.price && (
              <p className="text-lg font-bold" style={{ color: primaryColor }}>
                ${parseFloat(product.price).toFixed(2)}
              </p>
            )}
          </div>
          <button 
            className="px-4 py-2 rounded text-white text-sm font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: primaryColor }}
            onClick={() => window.open(`/buyer/products/${product.id}`, '_blank')}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
