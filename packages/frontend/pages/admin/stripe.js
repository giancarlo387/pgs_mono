import Head from 'next/head';
import { useState, useEffect } from 'react';
import { CreditCard, Users, TrendingUp, Activity, CheckCircle, XCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import apiService from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';

export default function StripeManagement() {
  const router = useRouter();
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.usertype !== 'admin') {
      router.push('/login');
    }
  }, [user, router]);

  // Fetch data
  useEffect(() => {
    fetchOverview();
    fetchConfig();
    if (activeTab === 'accounts') {
      fetchAccounts();
    }
  }, [activeTab, currentPage, searchTerm, statusFilter]);

  const fetchOverview = async () => {
    try {
      const response = await apiService.getAdminStripeOverview();
      if (response.success) {
        setOverview(response.data);
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await apiService.getAdminStripeConfig();
      if (response.success) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        per_page: 15,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };

      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await apiService.getAdminStripeAccounts(params);
      setAccounts(response.data);
      setCurrentPage(response.current_page);
      setTotalPages(response.last_page);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const response = await apiService.testAdminStripeConnection();
      setConnectionStatus({
        success: response.success,
        message: response.message,
        data: response.data
      });
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: error.message || 'Connection test failed'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    if (status === 'complete') {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Complete
        </span>
      );
    }
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
        <AlertCircle className="h-3 w-3 mr-1" />
        Pending
      </span>
    );
  };

  return (
    <>
      <Head>
        <title>Stripe Management - Admin Portal</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stripe Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor Stripe Connect accounts, transactions, and configuration
            </p>
          </div>
          <Button 
            onClick={testConnection}
            disabled={testingConnection}
            className="flex items-center mt-4 sm:mt-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${testingConnection ? 'animate-spin' : ''}`} />
            Test Connection
          </Button>
        </div>

        {/* Connection Status Alert */}
        {connectionStatus && (
          <Card className={`border-l-4 ${connectionStatus.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <div className="flex items-center">
              {connectionStatus.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mr-3" />
              )}
              <div>
                <p className={`font-medium ${connectionStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                  {connectionStatus.message}
                </p>
                {connectionStatus.data && (
                  <p className="text-sm text-gray-600 mt-1">
                    Available Balance: {formatCurrency(connectionStatus.data.available[0]?.amount / 100 || 0)}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Configuration Status */}
        {config && (
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Stripe Secret Key</span>
                {config.stripe_key_configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Publishable Key</span>
                {config.stripe_publishable_key_configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Webhook Secret</span>
                {config.webhook_secret_configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Environment</span>
                <span className="text-sm font-medium text-gray-900">{config.environment}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Statistics */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Connected Accounts</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {overview.connected_accounts.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Accounts</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {overview.active_accounts.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Volume</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(overview.total_volume)}
                  </p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Platform Fees</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(overview.total_platform_fees)}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Card>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('accounts')}
                className={`${
                  activeTab === 'accounts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Connected Accounts
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === 'overview' && overview && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {overview.total_transactions.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Average Transaction</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(overview.average_transaction)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Recent Activity (7 days)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {overview.recent_activity.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Activity className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Stripe Integration Active</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Your Stripe integration is properly configured and processing payments successfully.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'accounts' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search by company name or account ID..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="complete">Complete</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading accounts...</p>
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No accounts found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stripe Account ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Country
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {accounts.map((account) => (
                          <tr key={account.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{account.name}</div>
                              <div className="text-sm text-gray-500">{account.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {account.stripe_account_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {account.stripe_country || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(account.stripe_onboarding_status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push(`/admin/stripe/accounts/${account.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <Button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            variant="outline"
                            size="sm"
                          >
                            Previous
                          </Button>
                          <Button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            size="sm"
                          >
                            Next
                          </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Page <span className="font-medium">{currentPage}</span> of{' '}
                              <span className="font-medium">{totalPages}</span>
                            </p>
                          </div>
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                              <Button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                variant="outline"
                                size="sm"
                              >
                                Previous
                              </Button>
                              <Button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                variant="outline"
                                size="sm"
                                className="ml-3"
                              >
                                Next
                              </Button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-4 mt-4">
                    {accounts.map((account) => (
                      <Card key={account.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{account.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{account.email}</p>
                          </div>
                          {getStatusBadge(account.stripe_onboarding_status)}
                        </div>

                        <div className="space-y-2 mb-3 pb-3 border-b border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500">Stripe Account ID</p>
                            <p className="text-xs font-mono text-gray-900 break-all">{account.stripe_account_id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Country</p>
                            <p className="text-sm text-gray-900">{account.stripe_country || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/stripe/accounts/${account.id}`)}
                            className="text-xs"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </Card>
                    ))}

                    {totalPages > 1 && (
                      <Card className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="text-sm text-gray-700 text-center">
                            Page {currentPage} of {totalPages}
                          </div>
                          <div className="flex justify-center space-x-2">
                            <Button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              variant="outline"
                              size="sm"
                            >
                              Previous
                            </Button>
                            <Button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              variant="outline"
                              size="sm"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
