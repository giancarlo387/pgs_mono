import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Users, Search, Filter, UserCheck, UserX, Mail, Trash2, Eye, UserPlus, Building2, RefreshCw } from 'lucide-react';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import toast from 'react-hot-toast';
import apiService from '../../../lib/api';

export default function AgentManagement() {
  const [agents, setAgents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    total_agents: 0,
    active_agents: 0,
    pending_agents: 0,
    inactive_agents: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChangeCompanyModal, setShowChangeCompanyModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company_id: '',
    role: 'Agent'
  });

  useEffect(() => {
    fetchAgents();
    fetchStatistics();
    fetchCompanies();
  }, [currentPage, searchTerm, filterStatus]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        per_page: 10,
        search: searchTerm,
        is_active: filterStatus !== 'all' ? filterStatus : undefined
      };
      const response = await apiService.getAdminAgents(params);
      setAgents(response.data || []);
      setPagination({
        current_page: response.current_page,
        last_page: response.last_page,
        total: response.total,
        from: response.from,
        to: response.to
      });
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await apiService.getAdminAgentStatistics();
      setStats(response.data || {});
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await apiService.getAdminCompanies({ per_page: 1000 });
      setCompanies(response.data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleToggleStatus = async (agentId) => {
    try {
      await apiService.toggleAdminAgentStatus(agentId);
      fetchAgents();
      fetchStatistics();
    } catch (error) {
      console.error('Error toggling agent status:', error);
      alert(error.message || 'Failed to toggle agent status');
    }
  };

  const handleDelete = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) return;
    
    try {
      await apiService.deleteAdminAgent(agentId);
      fetchAgents();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert(error.message || 'Failed to delete agent');
    }
  };

  const handleResendInvitation = async (agentId) => {
    try {
      const loadingToastId = toast.loading('Resending invitation...');
      await apiService.resendAdminAgentInvitation(agentId);
      toast.dismiss(loadingToastId);
      toast.success('The invitation has been resent successfully.');
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error(error.message || 'Failed to resend invitation');
    }
  };

  const handleCreateInvitation = async (e) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      const loadingToastId = toast.loading('Creating invitation...');
      
      await apiService.createAdminAgentInvitation(formData);
      
      toast.dismiss(loadingToastId);
      toast.success(`Agent invitation sent to ${formData.email}`);
      
      setShowCreateModal(false);
      setFormData({ name: '', email: '', company_id: '', role: 'Agent' });
      fetchAgents();
      fetchStatistics();
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error(error.message || 'Failed to create invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  const openChangeCompanyModal = (agent) => {
    setSelectedAgent(agent);
    setShowChangeCompanyModal(true);
  };

  const handleChangeCompany = async (e) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      const loadingToastId = toast.loading('Changing company...');
      
      const companyId = document.getElementById('change-company-select').value;
      await apiService.changeAdminAgentCompany(selectedAgent.id, companyId);
      
      toast.dismiss(loadingToastId);
      toast.success(`Agent has been reassigned successfully.`);
      
      setShowChangeCompanyModal(false);
      setSelectedAgent(null);
      fetchAgents();
    } catch (error) {
      console.error('Error changing company:', error);
      toast.error(error.message || 'Failed to change company');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (agent) => {
    const companyAgent = agent.company_agent;
    if (!companyAgent) {
      return { text: 'No Company', class: 'bg-gray-100 text-gray-800' };
    }
    if (!companyAgent.joined_at) {
      return { text: 'Pending', class: 'bg-yellow-100 text-yellow-800' };
    }
    if (companyAgent.is_active) {
      return { text: 'Active', class: 'bg-green-100 text-green-800' };
    }
    return { text: 'Inactive', class: 'bg-red-100 text-red-800' };
  };

  return (
    <>
      <Head>
        <title>Agent Management - Admin Portal</title>
      </Head>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage company agents and their permissions
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 flex items-center"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Agent Invitation
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Agents</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_agents?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active_agents?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pending_agents?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Mail className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inactive_agents?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <UserX className="h-6 w-6 text-red-600" />
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
                  placeholder="Search agents by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </Card>

        {/* Agents Table - Desktop */}
        <Card className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
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
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : agents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No agents found
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => {
                    const statusBadge = getStatusBadge(agent);
                    const companyAgent = agent.company_agent;
                    return (
                      <tr key={agent.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <span className="text-orange-600 font-medium">
                                {agent.name?.substring(0, 2).toUpperCase() || 'AG'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                              <div className="text-sm text-gray-500">{agent.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {companyAgent?.company?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {companyAgent?.role || 'Agent'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge.class}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {companyAgent?.joined_at ? new Date(companyAgent.joined_at).toLocaleDateString() : 'Not yet'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {companyAgent && !companyAgent.joined_at && (
                              <button
                                onClick={() => handleResendInvitation(companyAgent.id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Resend Invitation"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            )}
                            {companyAgent && companyAgent.joined_at && (
                              <button
                                onClick={() => handleToggleStatus(agent.id)}
                                className={companyAgent.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                                title={companyAgent.is_active ? "Deactivate" : "Activate"}
                              >
                                {companyAgent.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => openChangeCompanyModal(agent)}
                              className="text-purple-600 hover:text-purple-900"
                              title="Change Company"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => alert('View details coming soon')}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(agent.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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

        {/* Agents Cards - Mobile */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <Card className="p-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            </Card>
          ) : agents.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">
              No agents found
            </Card>
          ) : (
            agents.map((agent) => {
              const statusBadge = getStatusBadge(agent);
              const companyAgent = agent.company_agent;
              return (
                <Card key={agent.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-600 font-semibold text-sm">
                          {agent.name?.substring(0, 2).toUpperCase() || 'AG'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{agent.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{agent.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.class}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3 pb-3 border-b border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Company</p>
                      <p className="text-sm font-medium text-gray-900">{companyAgent?.company?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Role</p>
                      <p className="text-sm text-gray-900">{companyAgent?.role || 'Agent'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Joined</p>
                      <p className="text-sm text-gray-900">{new Date(agent.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openChangeCompanyModal(agent)}
                      className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg"
                      title="Change Company"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => alert('View details coming soon')}
                      className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </Card>
              );
            })
          )}

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

        {/* Create Invitation Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full mb-4">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Create Agent Invitation
              </h3>
              
              <p className="text-sm text-gray-500 text-center mb-6">
                Invite a new agent to join a company
              </p>

              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <select
                    required
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Agent"
                  />
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', email: '', company_id: '', role: 'Agent' });
                    }}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? 'Creating...' : 'Create Invitation'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Company Modal */}
        {showChangeCompanyModal && selectedAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-purple-100 rounded-full mb-4">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Change Agent Company
              </h3>
              
              <p className="text-sm text-gray-500 text-center mb-6">
                Reassign <span className="font-semibold text-gray-900">{selectedAgent.name}</span> to a different company
              </p>

              <form onSubmit={handleChangeCompany} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Company
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                    {selectedAgent.company_agent?.company?.name || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Company
                  </label>
                  <select
                    id="change-company-select"
                    required
                    defaultValue={selectedAgent.company_agent?.company_id || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This will immediately change the agent's company assignment.
                  </p>
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowChangeCompanyModal(false);
                      setSelectedAgent(null);
                    }}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {isProcessing ? 'Changing...' : 'Change Company'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
