import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Plus, Search, Filter, Upload, Grid, List, Trash2, AlertTriangle, Download, FileText, CheckCircle, XCircle, Package2 } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ProductCard from '../../components/products/ProductCard';
import ProductDetailModal from '../../components/products/ProductDetailModal';
import BulkOperations from '../../components/products/BulkOperations';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../lib/api';
import { formatProductForImport } from '../../lib/csvUtils';

export default function Products() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showRFQMatching, setShowRFQMatching] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const [userCompany, setUserCompany] = useState(null);
  
  // Bulk operations state
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAllMode, setSelectAllMode] = useState(false);
  
  // Pagination state - using the same structure as quotes
  const [paginationInfo, setPaginationInfo] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0
  });

  useEffect(() => {
    fetchUserCompany();
  }, []);

  // Initialize state from URL on component mount and fetch data
  useEffect(() => {
    if (router.isReady && isAuthenticated) {
      const { page = 1, per_page = 10, search = '' } = router.query;
      
      const currentPage = parseInt(page);
      const itemsPerPage = parseInt(per_page);
      
      // Only update state if values have actually changed
      if (searchTerm !== search) {
        setSearchTerm(search);
      }
      
      // Update pagination info and fetch data together
      setPaginationInfo(prev => {
        const newPaginationInfo = {
          ...prev,
          current_page: currentPage,
          per_page: itemsPerPage
        };
        
        // Fetch data with the new pagination info
        fetchProductsWithParams(currentPage, itemsPerPage, search);
        
        return newPaginationInfo;
      });
    }
  }, [router.isReady, router.query, isAuthenticated]);

  const updateURL = (params) => {
    const query = { ...router.query, ...params };
    
    // Remove default values to keep URL clean
    if (query.page === 1 || query.page === '1') delete query.page;
    if (query.per_page === 10 || query.per_page === '10') delete query.per_page;
    if (!query.search) delete query.search;
    
    router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const fetchUserCompany = async () => {
    try {
      // Get user's company - assuming user has a company
      const companies = await apiService.getCompanies({ user_id: user?.id });
      if (companies.data && companies.data.length > 0) {
        setUserCompany(companies.data[0]);
      }
    } catch (error) {
      console.error('Error fetching user company:', error);
      setError('Please complete your company profile first');
    }
  };
  
  // Bulk upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);



  const fetchProducts = async () => {
    return fetchProductsWithParams(
      paginationInfo.current_page, 
      paginationInfo.per_page, 
      searchTerm
    );
  };

  const fetchProductsWithParams = async (page, perPage, search) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters for pagination and search
      const params = {
        page: page,
        per_page: perPage
      };
      
      if (search) {
        params.search = search;
      }
      
      const response = await apiService.getProducts(params);
      
      // Handle Laravel pagination response structure
      if (response.data) {
        setProductList(response.data);
        setPaginationInfo(prev => ({
          ...prev,
          current_page: response.current_page,
          last_page: response.last_page,
          per_page: response.per_page,
          total: response.total,
          from: response.from || 0,
          to: response.to || 0
        }));
      } else {
        // Fallback for non-paginated response
        setProductList(response);
        setPaginationInfo(prev => ({
          ...prev,
          current_page: 1,
          last_page: 1,
          total: response.length,
          from: response.length > 0 ? 1 : 0,
          to: response.length
        }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (productId) => {
    const product = productList.find(p => p.id === productId);
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiService.deleteProduct(productToDelete.id);
      setShowDeleteModal(false);
      setProductToDelete(null);
      // Refresh the current page after deletion
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewProduct = (productId) => {
    setSelectedProductId(productId);
    setShowProductDetail(true);
  };

  const handleEditFromModal = (productId) => {
    setShowProductDetail(false);
    router.push(`/products/edit/${productId}`);
  };

  const handleDeleteFromModal = (productId) => {
    setShowProductDetail(false);
    handleDeleteProduct(productId);
  };

  const handlePageChange = (page) => {
    updateURL({ page: page === 1 ? undefined : page });
  };

  const handlePerPageChange = (perPage) => {
    updateURL({ 
      per_page: perPage === 10 ? undefined : perPage, 
      page: undefined 
    });
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    updateURL({ 
      search: value || undefined, 
      page: undefined 
    });
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  // Bulk upload functions
  const downloadTemplate = () => {
    const csvContent = [
      'name,category,price,moq,hs_code,description,specs,origin_country,lead_time,variants',
      'Sample Product,Electronics,25.00,100,8541.10.00,High-quality electronic component,Color: Blue; Weight: 2kg,Philippines,14-21 days,"[{""color"": ""Blue"", ""size"": ""Medium""}, {""color"": ""Red"", ""size"": ""Large""}]"',
      'Another Product,Automotive,15.50,50,8708.99.00,Automotive spare part,Material: Steel; Size: 10cm,Philippines,7-10 days,"[{""material"": ""Steel"", ""finish"": ""Matte""}, {""material"": ""Aluminum"", ""finish"": ""Glossy""}]"'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (file) => {
    if (file && file.type === 'text/csv') {
      setUploadFile(file);
      setUploadResults(null);
    } else {
      alert('Please select a valid CSV file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const product = {};
        headers.forEach((header, index) => {
          product[header] = values[index] || '';
        });
        products.push(product);
      }
    }
    
    return products;
  };

  const uploadCSV = async () => {
    if (!uploadFile) return;

    if (!userCompany) {
      setError('Please complete your company profile first');
      return;
    }

    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const text = await uploadFile.text();
      const products = parseCSV(text);
      
      const results = {
        total: products.length,
        successful: 0,
        failed: 0,
        errors: []
      };
      
      for (let i = 0; i < products.length; i++) {
        try {
          setUploadProgress(((i + 1) / products.length) * 100);
          
          // Validate required fields
          if (!products[i].name || !products[i].category || !products[i].price) {
            throw new Error('Missing required fields: name, category, or price');
          }
          
          // Add company_id from authenticated user
          const productData = {
            ...products[i],
            company_id: userCompany.id 
          };
          
          await apiService.createProduct(productData);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 2, // +2 because of header and 0-based index
            product: products[i].name || `Row ${i + 2}`,
            error: error.message
          });
        }
      }
      
      setUploadResults(results);
      
      // Refresh products list if any were successful
      if (results.successful > 0) {
        await fetchProducts();
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResults({
        total: 0,
        successful: 0,
        failed: 1,
        errors: [{ row: 1, product: 'File', error: 'Failed to parse CSV file' }]
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadResults(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove client-side filtering since we're using server-side search
  const filteredProducts = productList;

  const mockRFQs = [
    {
      id: 1,
      title: "LED Light Fixtures - 1000 units",
      buyer: "ABC Electronics",
      targetPrice: "$20.00",
      quantity: 1000,
      matchScore: 95
    },
    {
      id: 2,
      title: "Automotive Components - Bulk Order",
      buyer: "XYZ Motors",
      targetPrice: "$8.00",
      quantity: 2000,
      matchScore: 87
    }
  ];

  return (
    <>
      <Head>
        <title>Products - SupplierHub</title>
      </Head>

      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-secondary-900">Products</h1>
            <p className="mt-1 text-xs sm:text-sm text-secondary-600">
              Manage your product catalog and listings
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowBulkUpload(true)}
              className="flex-1 sm:flex-initial"
            >
              <Upload className="w-4 h-4 mr-2" />
              <span className="text-sm sm:text-base">Bulk Upload</span>
            </Button>
            <Link href="/products/add" className="flex-1 sm:flex-initial">
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-sm sm:text-base">Add Product</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 sm:space-y-4 lg:space-y-0 gap-3">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 sm:space-x-4 flex-1">
              <div className="relative flex-1 sm:flex-initial sm:min-w-[200px] md:min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <Button variant="outline" className="flex-1 sm:flex-initial">
                <Filter className="w-4 h-4 mr-2" />
                <span className="text-sm sm:text-base">Filters</span>
              </Button>
            </div>
            
            <div className="flex items-center justify-between sm:justify-start space-x-2">
              <span className="text-xs sm:text-sm text-secondary-600">View:</span>
              <div className="flex border border-secondary-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-secondary-600'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-secondary-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </Card>


        {/* Loading State */}
        {loading && (
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-secondary-600">Loading products...</p>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="text-red-800">
              <p className="font-medium">Error loading products</p>
              <p className="text-sm mt-1">{error}</p>
              <button 
                onClick={fetchProducts}
                className="mt-3 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProducts.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-secondary-600">
              {searchTerm ? 'No products found matching your search.' : 'No products found. Add your first product to get started.'}
            </p>
            {!searchTerm && (
              <Link href="/products/add">
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Product
                </Button>
              </Link>
            )}
          </Card>
        )}

        {/* Products Grid/List */}
        {!loading && !error && filteredProducts.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onView={handleViewProduct}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="hidden md:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="hidden sm:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          MOQ
                        </th>
                        <th className="hidden lg:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                      {filteredProducts.map((product) => (
                        <tr 
                          key={product.id} 
                          className="hover:bg-secondary-50 cursor-pointer"
                          onClick={() => handleViewProduct(product.id)}
                        >
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                                {product.image ? (
                                  <img
                                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/${product.image}`}
                                    alt={product.name}
                                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                                    <span className="text-xs font-medium text-secondary-600">
                                      {product.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-2 sm:ml-4 min-w-0">
                                <div className="text-xs sm:text-sm font-medium text-secondary-900 truncate">
                                  {product.name}
                                </div>
                                <div className="text-xs text-secondary-500 truncate hidden sm:block">
                                  {product.hs_code}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-secondary-900">
                            {product.category}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-secondary-900 whitespace-nowrap">
                            {product.price}
                          </td>
                          <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-secondary-900 whitespace-nowrap">
                            {product.moq}
                          </td>
                          <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium">
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewProduct(product.id);
                                }}
                                className="text-xs px-2 py-1"
                              >
                                View
                              </Button>
                              <Link href={`/products/edit/${product.id}`} className="hidden sm:inline-block">
                                <Button variant="outline" size="sm" className="text-xs px-2 py-1">
                                  Edit
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            
            {/* Pagination */}
            {paginationInfo.total > 0 && (
              <Pagination
                currentPage={paginationInfo.current_page}
                lastPage={paginationInfo.last_page}
                total={paginationInfo.total}
                perPage={paginationInfo.per_page}
                from={paginationInfo.from}
                to={paginationInfo.to}
                onPageChange={handlePageChange}
                onPerPageChange={handlePerPageChange}
                showPerPageSelector={true}
                showInfo={true}
              />
            )}
          </>
        )}
      </div>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={showBulkUpload}
        onClose={() => {
          setShowBulkUpload(false);
          resetUpload();
        }}
        title="Bulk Product Upload"
        size="lg"
      >
        <div className="space-y-6">
          {!uploadResults ? (
            <>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  CSV Upload Instructions
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Download our CSV template first</li>
                  <li>• Fill in all required fields (name, category, price)</li>
                  <li>• Maximum 100 products per upload</li>
                  <li>• Images should be uploaded separately</li>
                  <li>• Price format: $25.00 or 25.00</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline"
                  onClick={downloadTemplate}
                  disabled={uploading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Select CSV File
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver 
                    ? 'border-primary-400 bg-primary-50' 
                    : uploadFile 
                    ? 'border-green-400 bg-green-50'
                    : 'border-secondary-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                    <p className="text-sm font-medium text-green-800">
                      {uploadFile.name}
                    </p>
                    <p className="text-xs text-green-600">
                      Ready to upload • {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-secondary-400 mx-auto" />
                    <p className="text-sm text-secondary-600">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <p className="text-xs text-secondary-500">
                      Supports CSV files up to 5MB
                    </p>
                  </div>
                )}
              </div>

              {uploading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-600">Uploading products...</span>
                    <span className="font-medium">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkUpload(false);
                    resetUpload();
                  }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={uploadCSV}
                  disabled={!uploadFile || uploading}
                  className="flex items-center"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Products
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Upload Results */}
              <div className="space-y-4">
                <div className="text-center">
                  {uploadResults.failed === 0 ? (
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  )}
                  <h3 className="text-lg font-medium text-secondary-900 mb-2">
                    Upload Complete
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{uploadResults.total}</div>
                    <div className="text-sm text-blue-800">Total</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{uploadResults.successful}</div>
                    <div className="text-sm text-green-800">Successful</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{uploadResults.failed}</div>
                    <div className="text-sm text-red-800">Failed</div>
                  </div>
                </div>

                {uploadResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-800">Errors:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {uploadResults.errors.map((error, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                          <div className="font-medium text-red-800">
                            Row {error.row}: {error.product}
                          </div>
                          <div className="text-red-600 mt-1">{error.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={resetUpload}
                >
                  Upload More
                </Button>
                <Button
                  onClick={() => {
                    setShowBulkUpload(false);
                    resetUpload();
                  }}
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* RFQ Matching Modal */}
      <Modal
        isOpen={showRFQMatching}
        onClose={() => setShowRFQMatching(false)}
        title="RFQ Matches"
        size="lg"
      >
        <div className="space-y-4">
          {mockRFQs.map((rfq) => (
            <div key={rfq.id} className="p-4 border border-secondary-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-secondary-900">{rfq.title}</h4>
                <span className="text-sm font-medium text-green-600">
                  {rfq.matchScore}% match
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-secondary-600 mb-3">
                <div>Buyer: {rfq.buyer}</div>
                <div>Quantity: {rfq.quantity}</div>
                <div>Target Price: {rfq.targetPrice}</div>
                <div>Match Score: {rfq.matchScore}%</div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm">Send Quote</Button>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        title="Delete Product"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Are you sure you want to delete this product?
              </h3>
              <p className="text-sm text-red-700 mt-1">
                This action cannot be undone. The product will be permanently removed from your catalog.
              </p>
            </div>
          </div>

          {productToDelete && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {productToDelete.image ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/${productToDelete.image}`}
                    alt={productToDelete.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {productToDelete.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-gray-900">{productToDelete.name}</h4>
                  <p className="text-sm text-gray-600">{productToDelete.category}</p>
                  <p className="text-sm text-gray-500">Price: {productToDelete.price}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteProduct}
              disabled={isDeleting}
              className="flex items-center"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Product
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={showProductDetail}
        onClose={() => {
          setShowProductDetail(false);
          setSelectedProductId(null);
        }}
        productId={selectedProductId}
        onEdit={handleEditFromModal}
        onDelete={handleDeleteFromModal}
      />
    </>
  );
}
