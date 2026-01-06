import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Search, ChevronDown, Clock, TrendingUp, Package } from 'lucide-react';
import apiService from '../../lib/api';
import { PRODUCT_CATEGORIES, getCategoryLabel } from '../../lib/constants/categories';

/**
 * ProminentSearchBar - Alibaba-style large central search bar
 * 
 * This component creates a prominent search section similar to Alibaba's design:
 * - Large, full-width search input with rounded corners
 * - Prominent orange/primary colored search button
 * - Optional category dropdown (can be extended)
 * - Fully responsive design that matches page layout width
 * - Placed below the main navigation for maximum visibility
 */
export default function ProminentSearchBar({ className = "" }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Search suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Refs for managing focus and clicks
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Categories from shared constants
  const categories = [
    { value: '', label: 'All Categories' },
    ...PRODUCT_CATEGORIES
  ];

  // Debug log to check categories
  console.log('Categories loaded:', categories);

  // Fuzzy matching function for handling typos (Levenshtein distance)
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length;
  };

  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Enhanced fuzzy search function
  const fuzzyMatchSuggestions = (query, suggestions) => {
    if (!query || query.length < 2) return [];

    let queryLower = query.toLowerCase().trim();
    
    // Apply typo corrections
    Object.keys(typoCorrections).forEach(typo => {
      if (queryLower.includes(typo)) {
        queryLower = queryLower.replace(typo, typoCorrections[typo]);
      }
    });

    const matches = [];

    suggestions.forEach(suggestion => {
      const name = suggestion.name.toLowerCase();
      const words = name.split(' ');
      const keywords = suggestion.keywords || [];
      
      let bestScore = 0;
      let matchType = 'fuzzy';

      // 1. Check for exact substring match (highest priority)
      if (name.includes(queryLower)) {
        bestScore = 1.0;
        matchType = 'exact';
      }
      // 2. Check corrected query after typo fix
      else if (queryLower !== query.toLowerCase() && name.includes(queryLower)) {
        bestScore = 0.95;
        matchType = 'typo_corrected';
      }
      // 3. Check individual words
      else {
        words.forEach(word => {
          if (word.includes(queryLower)) {
            bestScore = Math.max(bestScore, 0.9);
          } else {
            const similarity = calculateSimilarity(queryLower, word);
            if (similarity >= 0.6) {
              bestScore = Math.max(bestScore, similarity * 0.8);
            }
          }
        });

        // 4. Check keywords if available
        keywords.forEach(keyword => {
          if (keyword.includes(queryLower)) {
            bestScore = Math.max(bestScore, 0.85);
          } else {
            const similarity = calculateSimilarity(queryLower, keyword);
            if (similarity >= 0.7) {
              bestScore = Math.max(bestScore, similarity * 0.7);
            }
          }
        });

        // 5. Check overall string similarity
        const overallSimilarity = calculateSimilarity(queryLower, name);
        if (overallSimilarity >= 0.5) {
          bestScore = Math.max(bestScore, overallSimilarity * 0.6);
        }

        // 6. Handle common variations (plurals, etc.)
        const singularQuery = queryLower.endsWith('s') ? queryLower.slice(0, -1) : queryLower + 's';
        if (name.includes(singularQuery)) {
          bestScore = Math.max(bestScore, 0.85);
        }
      }
      
      if (bestScore >= 0.4) { // Lower threshold to catch more typos
        matches.push({ 
          ...suggestion, 
          score: bestScore, 
          matchType,
          correctedQuery: queryLower !== query.toLowerCase() ? queryLower : null
        });
      }
    });

    // Sort by score (highest first) and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  };

  // Common typo corrections and variations
  const typoCorrections = {
    'clipppers': 'clippers',
    'clippersss': 'clippers',
    'clipperss': 'clippers',
    'clippperss': 'clippers',
    'cliper': 'clipper',
    'clipers': 'clippers',
    'clippper': 'clipper',
    'trimer': 'trimmer',
    'trimmers': 'trimmer',
    'trimmmmer': 'trimmer',
    'headfones': 'headphones',
    'headfone': 'headphone',
    'smartfone': 'smartphone',
    'smartfones': 'smartphones'
  };

  // Fallback suggestions for when API is unavailable or no results
  const fallbackSuggestions = [
    { name: 'hair clippers', category: 'Beauty & Personal Care', company: { name: 'Beauty Supply Co' }, keywords: ['clipper', 'clip', 'hair cut', 'barber'] },
    { name: 'hair trimmer', category: 'Beauty & Personal Care', company: { name: 'Grooming Tech' }, keywords: ['trim', 'grooming', 'beard'] },
    { name: 'hair cutting machine', category: 'Beauty & Personal Care', company: { name: 'Professional Tools' }, keywords: ['cutting', 'machine', 'professional'] },
    { name: 'electric hair clipper', category: 'Beauty & Personal Care', company: { name: 'Electric Tools' }, keywords: ['electric', 'cordless', 'rechargeable'] },
    { name: 'professional barber clippers', category: 'Beauty & Personal Care', company: { name: 'Barber Supply' }, keywords: ['professional', 'barber', 'salon'] },
    { name: 'bluetooth headphones', category: 'Electronics', company: { name: 'Tech Supplier' }, keywords: ['wireless', 'audio', 'music'] },
    { name: 'led lights', category: 'Electronics', company: { name: 'LED Solutions' }, keywords: ['lighting', 'bulb', 'lamp'] },
    { name: 'face masks', category: 'Health & Beauty', company: { name: 'Safety First' }, keywords: ['protection', 'safety', 'medical'] },
    { name: 'smartphones', category: 'Electronics', company: { name: 'Mobile Tech' }, keywords: ['mobile', 'phone', 'android', 'iphone'] },
    { name: 'furniture', category: 'Home & Garden', company: { name: 'Home Decor Co' }, keywords: ['home', 'decor', 'chair', 'table'] }
  ];

  // Fetch search suggestions from API based on existing products
  const getSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    
    try {
      // Try to get suggestions from API first
      const response = await apiService.getSearchSuggestions(query, 8);
      
      if (response && response.data && response.data.length > 0) {
        // Apply fuzzy matching to API results as well
        const fuzzyMatches = fuzzyMatchSuggestions(query, response.data);
        setSuggestions(fuzzyMatches);
        setShowSuggestions(true);
      } else {
        // Fallback to local fuzzy matching if no API results
        const fuzzyMatches = fuzzyMatchSuggestions(query, fallbackSuggestions);
        setSuggestions(fuzzyMatches);
        setShowSuggestions(fuzzyMatches.length > 0);
      }
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      
      // Fallback to local fuzzy matching on API error
      const fuzzyMatches = fuzzyMatchSuggestions(query, fallbackSuggestions);
      setSuggestions(fuzzyMatches);
      setShowSuggestions(fuzzyMatches.length > 0);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Debounce effect for search suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getSuggestions(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedSuggestionIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Select a suggestion
  const selectSuggestion = (suggestion) => {
    const searchTerm = suggestion.name || suggestion.text;
    setSearchQuery(searchTerm);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // Perform search with selected suggestion
    const params = new URLSearchParams();
    params.set('q', searchTerm);
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory);
    }
    console.log('Selected suggestion:', searchTerm, 'with category:', selectedCategory);
    router.push(`/buyer/search?${params.toString()}`);
  };

  // Handle company name click - redirect to manufacturer's website
  const handleCompanyClick = (e, suggestion) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('=== COMPANY CLICK DEBUG ===');
    console.log('Full suggestion object:', suggestion);
    console.log('Company object:', suggestion.company);
    
    // Check if company has a website URL
    if (suggestion.company && suggestion.company.website) {
      // Check if it's a storefront URL (internal) or external website
      const websiteUrl = suggestion.company.website;
      
      console.log('Company clicked:', suggestion.company.name);
      console.log('Website URL:', websiteUrl);
      console.log('Current location:', window.location.href);
      
      if (websiteUrl.includes('/store/')) {
        // It's an internal storefront - use Next.js router to navigate
        const storefrontPath = websiteUrl.split('/store/')[1];
        const targetUrl = `/store/${storefrontPath}`;
        console.log('Navigating to storefront:', targetUrl);
        console.log('Using window.location.href');
        
        // Use window.location for public pages to ensure proper navigation
        window.location.href = targetUrl;
      } else {
        // It's an external website - open in new tab
        console.log('Opening external website in new tab');
        window.open(websiteUrl, '_blank', 'noopener,noreferrer');
      }
    } else if (suggestion.company && suggestion.company.id) {
      // Fallback: redirect to company profile page if no website
      // OLD LOGIC (kept for reference but not used):
      // router.push(`/buyer/company/${suggestion.company.id}`);
      
      // For now, if no website, show alert
      console.log('Company website not available for:', suggestion.company.name);
      console.warn('No website URL found!');
    }
    
    setShowSuggestions(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) {
      // Apply typo correction to the search query automatically
      let correctedQuery = searchQuery.trim().toLowerCase();
      
      // Apply specific typo corrections first
      Object.keys(typoCorrections).forEach(typo => {
        if (correctedQuery.includes(typo)) {
          correctedQuery = correctedQuery.replace(typo, typoCorrections[typo]);
        }
      });
      
      // Apply pattern-based corrections for repeated letters
      correctedQuery = correctedQuery
        // Fix repeated 's' at end: "clippersss" -> "clippers"
        .replace(/(\w+)s{2,}$/g, '$1s')
        // Fix repeated 'p': "clipppper" -> "clipper" 
        .replace(/(\w*)p{3,}(\w*)/g, '$1pp$2')
        // Fix repeated 'l': "clillper" -> "clipper"
        .replace(/(\w*)l{3,}(\w*)/g, '$1ll$2')
        // Fix repeated 'm': "trimmmmer" -> "trimmer"
        .replace(/(\w*)m{3,}(\w*)/g, '$1mm$2');
      
      // Use the corrected query for search
      const finalQuery = correctedQuery;
      
      // Track the search
      try {
        const filters = selectedCategory && selectedCategory !== 'all' ? { category: selectedCategory } : null;
        await apiService.trackProductSearch(finalQuery, 0, filters);
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.debug('Search tracking failed:', error);
      }
      
      // Construct search URL with category filter if not "All Categories"
      const params = new URLSearchParams();
      params.set('q', finalQuery);
      if (selectedCategory && selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }
      console.log('Searching for:', finalQuery, '(original:', searchQuery.trim(), ') with category:', selectedCategory);
      router.push(`/buyer/search?${params.toString()}`);
    }
  };

  return (
    <div className={`bg-gradient-to-r from-primary-50 to-primary-100 py-4 md:py-6 lg:py-8 ${className}`}>
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Search Section Title */}
        <div className="text-center mb-4 md:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 mb-2">
            Find Products & Suppliers
          </h1>
          <p className="text-secondary-600 text-sm sm:text-base">
            Discover millions of products from verified suppliers worldwide
          </p>
        </div>

        {/* Main Search Bar - Alibaba Style */}
        <div className="w-full max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex bg-white rounded-md md:rounded-lg shadow-medium border border-secondary-200 overflow-hidden">
              {/* Category Dropdown */}
              <div className="relative z-50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Category button clicked!', showCategoryDropdown); // Debug log
                    setShowCategoryDropdown(!showCategoryDropdown);
                  }}
                  className="flex items-center px-2 md:px-4 py-3 md:py-4 text-secondary-700 hover:bg-secondary-50 border-r border-secondary-200 min-w-0 whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 relative z-50"
                  style={{ userSelect: 'none' }}
                >
                  <span className="text-xs md:text-sm font-medium truncate max-w-[80px] sm:max-w-none pointer-events-none">
                    {selectedCategory ? getCategoryLabel(selectedCategory) : 'All Categories'}
                  </span>
                  <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2 flex-shrink-0 pointer-events-none transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Category Dropdown Menu */}
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-secondary-200 rounded-b-lg shadow-xl z-[70] max-h-60 overflow-y-auto min-w-[200px]">
                    {categories.map((category) => (
                      <button
                        key={category.value || 'all'}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Category selected:', category); // Debug log
                          setSelectedCategory(category.value);
                          setShowCategoryDropdown(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 focus:bg-primary-50 focus:text-primary-700 transition-colors duration-150 cursor-pointer"
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Input */}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => searchQuery.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search for products, suppliers..."
                className="flex-1 px-2 md:px-4 py-3 md:py-4 text-sm md:text-base focus:outline-none focus:ring-0 border-0 min-w-0"
                autoComplete="off"
              />

              {/* Search Button - Primary Blue Theme */}
              <button
                type="submit"
                className="px-4 md:px-8 py-3 md:py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <div className="flex items-center space-x-1 md:space-x-2">
                  <Search className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Search</span>
                </div>
              </button>
            </div>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 bg-white border border-secondary-200 rounded-b-lg shadow-medium z-50 max-h-80 overflow-y-auto"
              >
                {isLoadingSuggestions ? (
                  <div className="px-4 py-3 text-center text-secondary-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      <span>Searching...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {suggestions.some(s => s.matchType === 'typo_corrected') && (
                      <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-sm text-blue-800">
                        <span className="font-medium">Showing results for corrected spelling</span>
                      </div>
                    )}
                    {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`w-full text-left px-4 py-3 hover:bg-secondary-50 border-b border-secondary-100 last:border-b-0 transition-colors ${
                        index === selectedSuggestionIndex ? 'bg-primary-50 border-primary-200' : ''
                      }`}
                    >
                      <div 
                        className="flex items-center space-x-3 cursor-pointer"
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        <div className="flex-shrink-0">
                          <Package className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="text-secondary-900 font-medium truncate">
                                {suggestion.name || suggestion.text}
                              </span>
                              {suggestion.matchType === 'typo_corrected' && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full flex-shrink-0">
                                  Showing results for corrected spelling
                                </span>
                              )}
                              {suggestion.matchType === 'fuzzy' && suggestion.score && suggestion.score < 0.8 && (
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full flex-shrink-0">
                                  Did you mean?
                                </span>
                              )}
                              {suggestion.category && (
                                <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full flex-shrink-0">
                                  {suggestion.category}
                                </span>
                              )}
                            </div>
                            {suggestion.company && (
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-secondary-500">by</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCompanyClick(e, suggestion)}
                                  className="text-xs text-primary-600 hover:text-primary-700 hover:underline font-medium truncate"
                                  title={suggestion.company.website ? `Visit ${suggestion.company.name}'s website` : `View ${suggestion.company.name}`}
                                >
                                  {suggestion.company.name}
                                </button>
                              </div>
                            )}
                            {suggestion.price && (
                              <span className="text-xs text-primary-600 font-medium">
                                ${parseFloat(suggestion.price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-1">
                          {suggestion.matchType === 'fuzzy' && (
                            <span className="text-xs text-orange-500">✨</span>
                          )}
                          <Search className="w-3 h-3 text-secondary-300" />
                        </div>
                      </div>
                    </div>
                  ))}
                  </>
                )}
              </div>
            )}
          </form>

          {/* Popular Searches - Optional Enhancement */}
          <div className="mt-3 md:mt-4 text-center">
            <p className="text-xs md:text-sm text-secondary-500 mb-1 md:mb-2">Popular searches:</p>
            <div className="flex flex-wrap justify-center gap-1 md:gap-2">
              {['LED Lights', 'Face Masks', 'Solar Panels', 'Smartphones', 'Furniture'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term);
                    const params = new URLSearchParams();
                    params.set('q', term);
                    router.push(`/buyer/search?${params.toString()}`);
                  }}
                  className="px-3 py-1 text-xs bg-white text-secondary-600 rounded-full border border-secondary-200 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showCategoryDropdown || showSuggestions) && (
        <div
          className="fixed inset-0 z-[20]"
          onClick={(e) => {
            console.log('Backdrop clicked'); // Debug log
            setShowCategoryDropdown(false);
            setShowSuggestions(false);
          }}
        />
      )}
    </div>
  );
}
