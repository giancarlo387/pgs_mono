import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Package, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  MessageSquare,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  DollarSign,
  Star,
  ThumbsUp
} from 'lucide-react';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Pagination from '../../../components/common/Pagination';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/common/Toast';
import apiService from '../../../lib/api';

export default function Orders() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Order confirmation and review states
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [reviewingOrder, setReviewingOrder] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
    productQuality: 5,
    deliverySpeed: 5,
    communication: 5
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginationInfo, setPaginationInfo] = useState({
    from: 0,
    to: 0,
    total: 0
  });

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchOrders();
    }
  }, [isAuthenticated, user?.email, currentPage, itemsPerPage, searchTerm, statusFilter, dateFilter]);

  const fetchOrders = async (page = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      // Ensure user email is available
      if (!user?.email) {
        setError('User email not available. Please log in again.');
        return;
      }

      // Build API parameters
      const params = {
        page: page,
        per_page: itemsPerPage
      };

      // Add filters
      if (searchTerm) {
        params.search = searchTerm;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (dateFilter !== 'all') {
        params.date_filter = dateFilter;
      }

      // Fetch orders from API
      const response = await apiService.getBuyerOrders(params);
      
      // Handle Laravel pagination response
      const ordersData = response.data || [];
      const paginationData = {
        current_page: response.current_page || 1,
        last_page: response.last_page || 1,
        per_page: response.per_page || itemsPerPage,
        total: response.total || 0,
        from: response.from || 0,
        to: response.to || 0
      };

      // Transform backend data to match frontend expectations
      const transformedOrders = ordersData.map(order => ({
        id: order.order_number || order.id,
        product_id: order.product_id || null, // Product ID for linking to product details
        supplier: {
          id: order.company?.id || order.company_id,
          name: order.company?.name || 'Unknown Supplier',
          contact_person: order.company?.contact_person || 'N/A',
          phone: order.company?.phone || 'N/A',
          email: order.company?.email || 'N/A'
        },
        items: [
          {
            id: order.id,
            name: order.product_name,
            quantity: order.quantity,
            unit: 'pieces', // Default unit since backend doesn't store this
            unit_price: order.total_amount / order.quantity,
            total_price: order.total_amount,
            product_id: order.product_id || null
          }
        ],
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        order_date: order.created_at,
        expected_delivery: order.estimated_delivery,
        delivery_address: order.shipping_address,
        payment_status: order.payment_status,
        payment_terms: 'Standard Terms', // Default since backend doesn't store this
        tracking_number: null, // Backend doesn't store tracking numbers yet
        notes: order.notes,
        is_confirmed: order.is_confirmed || false,
        reviews: order.reviews || [] // Use reviews array from relationship
      }));

      setOrders(transformedOrders);
      setCurrentPage(paginationData.current_page);
      setTotalPages(paginationData.last_page);
      setItemsPerPage(paginationData.per_page);
      setPaginationInfo({
        from: paginationData.from,
        to: paginationData.to,
        total: paginationData.total
      });

    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleDateFilter = (period) => {
    setDateFilter(period);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePerPageChange = (perPage) => {
    setItemsPerPage(perPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_production': return 'bg-indigo-100 text-indigo-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'in_production': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleConfirmReceipt = async (orderId) => {
    try {
      setConfirmingOrderId(orderId);
      
      // Call API to confirm order receipt
      await apiService.confirmOrderReceipt(orderId);
      
      // Update local state after successful API call
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, is_confirmed: true, status: 'delivered' }
          : order
      ));
      
      // Show success toast notification
      toast.showSuccess(
        'Order Confirmed!',
        'Order receipt confirmed successfully! You can now leave a review.',
        5000
      );
      
    } catch (error) {
      console.error('Error confirming order:', error);
      toast.showError(
        'Confirmation Failed',
        error.message || 'Failed to confirm order receipt. Please try again.',
        5000
      );
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleOpenReview = (order) => {
    setReviewingOrder(order);
    setReviewData({
      rating: 5,
      comment: '',
      productQuality: 5,
      deliverySpeed: 5,
      communication: 5
    });
  };

  const handleCloseReview = () => {
    setReviewingOrder(null);
    setReviewData({
      rating: 5,
      comment: '',
      productQuality: 5,
      deliverySpeed: 5,
      communication: 5
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewingOrder) return;
    
    try {
      // Validate review
      if (!reviewData.comment.trim()) {
        toast.showError(
          'Review Required',
          'Please write a review comment.',
          3000
        );
        return;
      }

      if (reviewData.comment.length < 10) {
        toast.showError(
          'Review Too Short',
          'Please write at least 10 characters.',
          3000
        );
        return;
      }

      // Call API to submit review
      const response = await apiService.submitOrderReview(reviewingOrder.id, reviewData);
      
      // Calculate average rating (same as backend)
      const averageRating = (reviewData.rating + reviewData.productQuality + 
                            reviewData.deliverySpeed + reviewData.communication) / 4;
      
      // Update local state after successful API call - add review to reviews array
      setOrders(orders.map(order => 
        order.id === reviewingOrder.id 
          ? { 
              ...order, 
              reviews: [
                {
                  rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
                  comment: reviewData.comment,
                  created_at: new Date().toISOString(),
                  verified: true
                }
              ]
            }
          : order
      ));
      
      // Show success toast notification
      toast.showSuccess(
        'Review Submitted!',
        'Thank you for your review! It helps other buyers make informed decisions.',
        5000
      );
      handleCloseReview();
      
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.showError(
        'Submission Failed',
        error.message || 'Failed to submit review. Please try again.',
        5000
      );
    }
  };

  const renderStarRating = (rating, onRatingChange = null) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange && onRatingChange(star)}
            disabled={!onRatingChange}
            className={`${onRatingChange ? 'cursor-pointer' : 'cursor-default'} transition-colors`}
          >
            <Star
              className={`w-5 h-5 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>My Orders - Buyer Portal</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">My Orders</h1>
            <p className="mt-1 text-sm text-secondary-600">
              Track and manage your purchase orders
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col space-y-4">
            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Status Filters - Horizontal scrolling on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex space-x-2 min-w-max">
                <button
                  onClick={() => handleStatusFilter('all')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    statusFilter === 'all'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-secondary-600 hover:bg-secondary-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleStatusFilter('pending')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    statusFilter === 'pending'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-secondary-600 hover:bg-secondary-100'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => handleStatusFilter('confirmed')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    statusFilter === 'confirmed'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-secondary-600 hover:bg-secondary-100'
                  }`}
                >
                  Confirmed
                </button>
                <button
                  onClick={() => handleStatusFilter('in_production')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    statusFilter === 'in_production'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-secondary-600 hover:bg-secondary-100'
                  }`}
                >
                  In Production
                </button>
                <button
                  onClick={() => handleStatusFilter('shipped')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    statusFilter === 'shipped'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-secondary-600 hover:bg-secondary-100'
                  }`}
                >
                  Shipped
                </button>
                <button
                  onClick={() => handleStatusFilter('delivered')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    statusFilter === 'delivered'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-secondary-600 hover:bg-secondary-100'
                  }`}
                >
                  Delivered
                </button>
                </div>
              </div>
              
              {/* Date Filter */}
              <div className="w-full sm:w-auto">
                <select
                  value={dateFilter}
                  onChange={(e) => handleDateFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-secondary-600">Loading orders...</p>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="text-red-800">
              <p className="font-medium">Error loading orders</p>
              <p className="text-sm mt-1">{error}</p>
              <button 
                onClick={() => fetchOrders()}
                className="mt-3 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No orders found matching your criteria.' 
                : 'No orders found. Start by browsing products or creating an RFQ to get quotes from suppliers.'}
            </p>
            {!searchTerm && statusFilter === 'all' && dateFilter === 'all' && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                <Link href="/buyer">
                  <Button variant="outline">
                    Browse Products
                  </Button>
                </Link>
                <Link href="/buyer/rfqs/create">
                  <Button>
                    Create RFQ
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        )}

        {/* Orders List */}
        {!loading && !error && orders.length > 0 && (
          <>
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="p-4 sm:p-6">
                  <div className="flex flex-col space-y-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-base sm:text-lg font-medium text-secondary-900">
                          Order {order.id}
                        </h3>
                        <div className={`flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="whitespace-nowrap">{order.status.replace('_', ' ')}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                        <div>
                          <p className="text-xs sm:text-sm text-secondary-600">Supplier</p>
                          <p className="text-sm sm:text-base font-medium text-secondary-900">{order.supplier.name}</p>
                          <p className="text-xs sm:text-sm text-secondary-600">{order.supplier.contact_person}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-secondary-600">Order Date</p>
                          <p className="text-sm sm:text-base font-medium text-secondary-900">{formatDate(order.order_date)}</p>
                          <p className="text-xs sm:text-sm text-secondary-600">Expected: {formatDate(order.expected_delivery)}</p>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mb-4">
                        <p className="text-xs sm:text-sm text-secondary-600 mb-2">Items:</p>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors">
                              {/* Product Image */}
                              <div 
                                className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-secondary-200 rounded-md flex items-center justify-center overflow-hidden cursor-pointer"
                                onClick={() => item.product_id && (window.location.href = `/buyer/products/${item.product_id}`)}
                              >
                                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-secondary-400" />
                              </div>
                              
                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                {item.product_id ? (
                                  <a 
                                    href={`/buyer/products/${item.product_id}`}
                                    className="text-sm sm:text-base font-medium text-secondary-900 hover:text-primary-600 cursor-pointer block truncate"
                                  >
                                    {item.name}
                                  </a>
                                ) : (
                                  <p className="text-sm sm:text-base font-medium text-secondary-900 truncate">{item.name}</p>
                                )}
                                <p className="text-xs sm:text-sm text-secondary-600">
                                  {item.quantity.toLocaleString()} {item.unit} × {formatCurrency(item.unit_price)}
                                </p>
                              </div>
                              
                              {/* Price */}
                              <p className="text-sm sm:text-base font-medium text-secondary-900 flex-shrink-0">
                                {formatCurrency(item.total_price)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <p className="text-secondary-600">Delivery Address</p>
                          <p className="text-secondary-900">{order.delivery_address}</p>
                        </div>
                        {order.tracking_number && (
                          <div>
                            <p className="text-secondary-600">Tracking Number</p>
                            <p className="text-secondary-900 font-mono text-xs sm:text-sm">{order.tracking_number}</p>
                          </div>
                        )}
                      </div>

                      {order.notes && !order.notes.includes('Cart Items:') && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Notes:</strong> {order.notes}
                          </p>
                        </div>
                      )}

                      {/* Order Receipt Confirmation Notice */}
                      {order.status === 'shipped' && !order.is_confirmed && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-yellow-800">
                                Order Shipped - Awaiting Confirmation
                              </p>
                              <p className="text-sm text-yellow-700 mt-1">
                                Once you receive your order, please confirm receipt to complete the transaction.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Confirmed but not reviewed */}
                      {order.is_confirmed && (!order.reviews || order.reviews.length === 0) && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <Star className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-800">
                                Share Your Experience
                              </p>
                              <p className="text-sm text-blue-700 mt-1">
                                Help other buyers by leaving a review for this supplier.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display existing reviews */}
                      {order.reviews && order.reviews.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-800 mb-2">
                                Your Review
                              </p>
                              <div className="flex items-center space-x-2 mb-2">
                                {renderStarRating(order.reviews[0].rating)}
                                <span className="text-sm text-green-700">
                                  {order.reviews[0].rating}/5
                                </span>
                              </div>
                              <p className="text-sm text-green-700">{order.reviews[0].comment}</p>
                              {order.reviews[0].created_at && (
                                <p className="text-xs text-green-600 mt-2">
                                  Reviewed on {formatDate(order.reviews[0].created_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Order Summary & Actions */}
                    <div className="w-full">
                      {/* Total Amount Summary - Full width on mobile, prominent display */}
                      <div className="bg-secondary-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-secondary-600">Total Amount</span>
                          <span className="text-base sm:text-lg font-bold text-secondary-900">
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-600 mt-1">{order.payment_terms}</p>
                      </div>

                      {/* Action Buttons - Grid layout for mobile, better organization */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                        {/* Confirm Receipt Button - Only show for shipped but not confirmed orders */}
                        {(order.status === 'shipped' || order.status === 'delivered') && !order.is_confirmed && (
                          <Button 
                            size="sm" 
                            className="w-full col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-3"
                            onClick={() => handleConfirmReceipt(order.id)}
                            disabled={confirmingOrderId === order.id}
                          >
                            <ThumbsUp className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">{confirmingOrderId === order.id ? 'Confirming...' : 'Confirm Receipt'}</span>
                          </Button>
                        )}

                        {/* Leave Review Button - Only show for confirmed but not reviewed orders */}
                        {order.is_confirmed && (!order.reviews || order.reviews.length === 0) && (
                          <Button 
                            size="sm" 
                            className="w-full col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-3"
                            onClick={() => handleOpenReview(order)}
                          >
                            <Star className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">Leave Review</span>
                          </Button>
                        )}

                        {order.product_id ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => window.location.href = `/buyer/products/${order.product_id}`}
                          >
                            <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm hidden sm:inline">View Details</span>
                            <span className="text-xs sm:hidden">Details</span>
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            disabled
                            title="Product information not available"
                          >
                            <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm hidden sm:inline">View Details</span>
                            <span className="text-xs sm:hidden">Details</span>
                          </Button>
                        )}
                        
                        {(order.status === 'delivered' || order.is_confirmed) && (
                          <Button variant="outline" size="sm" className="w-full">
                            <Download className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm hidden sm:inline">Invoice</span>
                            <span className="text-xs sm:hidden">Invoice</span>
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full col-span-2 sm:col-span-1"
                          onClick={() => {
                            router.push({
                              pathname: '/buyer/messages',
                              query: { 
                                company: order.supplier.id, 
                                order: order.id 
                              }
                            });
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Contact</span>
                        </Button>

                        {order.tracking_number && (
                          <Button variant="outline" size="sm" className="w-full">
                            <Truck className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm hidden sm:inline">Track</span>
                            <span className="text-xs sm:hidden">Track</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card>
                <Pagination
                  currentPage={currentPage}
                  lastPage={totalPages}
                  perPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onPerPageChange={handlePerPageChange}
                  showPerPageSelector={true}
                  from={paginationInfo.from}
                  to={paginationInfo.to}
                  total={paginationInfo.total}
                />
              </Card>
            )}
          </>
        )}

        {/* Review Modal */}
        {reviewingOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-secondary-900">Leave a Review</h2>
                    <p className="text-sm text-secondary-600 mt-1">
                      Order {reviewingOrder.id} - {reviewingOrder.supplier.name}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseReview}
                    className="text-secondary-400 hover:text-secondary-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                {/* Overall Rating */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Overall Rating *
                  </label>
                  <div className="flex items-center space-x-3">
                    {renderStarRating(reviewData.rating, (rating) => 
                      setReviewData({ ...reviewData, rating })
                    )}
                    <span className="text-sm text-secondary-600">
                      {reviewData.rating}/5
                    </span>
                  </div>
                </div>

                {/* Detailed Ratings */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Product Quality
                    </label>
                    <div className="flex items-center space-x-3">
                      {renderStarRating(reviewData.productQuality, (rating) => 
                        setReviewData({ ...reviewData, productQuality: rating })
                      )}
                      <span className="text-sm text-secondary-600">
                        {reviewData.productQuality}/5
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Delivery Speed
                    </label>
                    <div className="flex items-center space-x-3">
                      {renderStarRating(reviewData.deliverySpeed, (rating) => 
                        setReviewData({ ...reviewData, deliverySpeed: rating })
                      )}
                      <span className="text-sm text-secondary-600">
                        {reviewData.deliverySpeed}/5
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Communication
                    </label>
                    <div className="flex items-center space-x-3">
                      {renderStarRating(reviewData.communication, (rating) => 
                        setReviewData({ ...reviewData, communication: rating })
                      )}
                      <span className="text-sm text-secondary-600">
                        {reviewData.communication}/5
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Comment */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Your Review *
                  </label>
                  <textarea
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                    placeholder="Share your experience with this supplier and product. Your review helps other buyers make informed decisions."
                    rows={6}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    Minimum 10 characters required
                  </p>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    Tips for writing a helpful review:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Describe the product quality and if it matches the description</li>
                    <li>Comment on the delivery time and packaging</li>
                    <li>Share your communication experience with the supplier</li>
                    <li>Be honest and constructive in your feedback</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCloseReview}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmitReview}
                    disabled={!reviewData.comment.trim() || reviewData.comment.length < 10}
                  >
                    Submit Review
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
