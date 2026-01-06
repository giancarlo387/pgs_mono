import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Users, Search, Filter, UserPlus, MoreVertical, Edit, Trash2, Ban, CheckCircle, LogIn } from 'lucide-react';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import apiService from '../../../lib/api';

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    buyers: 0,
    sellers: 0,
    agents: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [impersonating, setImpersonating] = useState(false);
  
  // Confirmation dialogs
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, userId: null, userName: '' });
  const [impersonateDialog, setImpersonateDialog] = useState({ isOpen: false, user: null });

  useEffect(() => {
    fetchUsers();
    fetchStatistics();
  }, [currentPage, searchTerm, filterType]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        per_page: 10,
        search: searchTerm,
        usertype: filterType
      };
      const response = await apiService.getAdminUsers(params);
      setUsers(response.data || []);
      setPagination({
        current_page: response.current_page,
        last_page: response.last_page,
        total: response.total,
        from: response.from,
        to: response.to
      });
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await apiService.getAdminUserStatistics();
      setStats(response.data || {});
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleDeleteClick = (user) => {
    setDeleteDialog({ isOpen: true, userId: user.id, userName: user.name });
  };

  const handleDeleteConfirm = async () => {
    try {
      await apiService.deleteAdminUser(deleteDialog.userId);
      toast.success(`${deleteDialog.userName} has been successfully deleted.`);
      setDeleteDialog({ isOpen: false, userId: null, userName: '' });
      fetchUsers();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleImpersonateClick = (user) => {
    setImpersonateDialog({ isOpen: true, user });
  };

  const handleImpersonateConfirm = async () => {
    const user = impersonateDialog.user;
    setImpersonateDialog({ isOpen: false, user: null });
    
    try {
      setImpersonating(true);
      const loadingToast = toast.loading(`Logging in as ${user.name}...`);
      
      // Store the admin's current token BEFORE impersonating
      const adminToken = apiService.token;
      localStorage.setItem('admin_token', adminToken);
      
      const response = await apiService.impersonateUser(user.id);
      
      // Store impersonation data
      localStorage.setItem('impersonation_token', response.data.token);
      localStorage.setItem('impersonator_id', response.data.impersonator_id);
      localStorage.setItem('impersonator_name', response.data.impersonator_name);
      localStorage.setItem('is_impersonating', 'true');
      
      // CRITICAL: Set the token using apiService.setToken()
      // This will store it in the correct localStorage key ('auth_token')
      // and make it available for all API requests
      apiService.setToken(response.data.token);
      
      // Redirect based on user type
      const redirectMap = {
        buyer: '/buyer',
        seller: '/',
        agent: '/agent/dashboard'
      };
      
      const redirectPath = redirectMap[user.usertype] || '/';
      
      toast.dismiss(loadingToast);
      toast.success('Redirecting to user portal...');
      
      // Force a full page reload to the new portal
      // The AuthContext will automatically load the new user data on mount
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 500);
    } catch (error) {
      console.error('Error impersonating user:', error);
      toast.error(error.message || 'Failed to impersonate user');
      setImpersonating(false);
    }
  };

  const getUserTypeBadge = (usertype) => {
    const badges = {
      buyer: 'bg-blue-100 text-blue-800',
      seller: 'bg-purple-100 text-purple-800',
      agent: 'bg-orange-100 text-orange-800',
      admin: 'bg-red-100 text-red-800'
    };
    return badges[usertype] || 'bg-gray-100 text-gray-800';
  };
  return (
    <>
      <Head>
        <title>User Management - Admin Portal</title>
      </Head>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage all users, roles, and permissions
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button className="flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Add New User
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_users?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Buyers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.buyers?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sellers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.sellers?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agents</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.agents?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Types</option>
              <option value="buyer">Buyers</option>
              <option value="seller">Sellers</option>
              <option value="agent">Agents</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </Card>

        {/* Users Table - Desktop */}
        <Card className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {user.name?.substring(0, 2).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getUserTypeBadge(user.usertype)}`}>
                          {user.usertype?.charAt(0).toUpperCase() + user.usertype?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {user.usertype !== 'admin' && (
                            <button
                              onClick={() => handleImpersonateClick(user)}
                              className="text-green-600 hover:text-green-900"
                              title="Login As User"
                              disabled={impersonating}
                            >
                              <LogIn className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => toast('Edit functionality will be available soon', { icon: 'ℹ️' })}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                            disabled={user.usertype === 'admin'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{pagination.from || 0}</span> to{' '}
                  <span className="font-medium">{pagination.to || 0}</span> of{' '}
                  <span className="font-medium">{pagination.total || 0}</span> results
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === pagination.last_page}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Users Cards - Mobile */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <Card className="p-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            </Card>
          ) : users.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">
              No users found
            </Card>
          ) : (
            users.map((user) => (
              <Card key={user.id} className="p-4">
                {/* User Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 font-semibold text-sm">
                        {user.name?.substring(0, 2).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{user.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getUserTypeBadge(user.usertype)}`}>
                    {user.usertype?.charAt(0).toUpperCase() + user.usertype?.slice(1)}
                  </span>
                </div>

                {/* User Info */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                    <span className="text-xs text-gray-500">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                  {user.usertype !== 'admin' && (
                    <button
                      onClick={() => handleImpersonateClick(user)}
                      className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg"
                      title="Login As User"
                      disabled={impersonating}
                    >
                      <LogIn className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => toast('Edit functionality will be available soon', { icon: 'ℹ️' })}
                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(user)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg"
                    title="Delete"
                    disabled={user.usertype === 'admin'}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </Card>
            ))
          )}

          {/* Mobile Pagination */}
          {pagination && (
            <Card className="p-4">
              <div className="flex flex-col gap-3">
                <div className="text-sm text-gray-700 text-center">
                  Showing <span className="font-medium">{pagination.from || 0}</span> to{' '}
                  <span className="font-medium">{pagination.to || 0}</span> of{' '}
                  <span className="font-medium">{pagination.total || 0}</span> results
                </div>
                <div className="flex justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === pagination.last_page}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, userId: null, userName: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteDialog.userName}? This action cannot be undone and will permanently remove all user data.`}
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
      />

      {/* Impersonate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={impersonateDialog.isOpen}
        onClose={() => setImpersonateDialog({ isOpen: false, user: null })}
        onConfirm={handleImpersonateConfirm}
        title="Login As User"
        message={impersonateDialog.user ? `You are about to login as ${impersonateDialog.user.name}. You will be redirected to their ${impersonateDialog.user.usertype} portal and will have full access to their account.` : ''}
        confirmText="Start Impersonation"
        cancelText="Cancel"
        type="warning"
        loading={impersonating}
      />
    </>
  );
}
