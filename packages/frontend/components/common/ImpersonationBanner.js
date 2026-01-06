import { useState } from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import apiService from '../../lib/api';
import ConfirmDialog from './ConfirmDialog';

export default function ImpersonationBanner() {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleExitClick = () => {
    setShowConfirm(true);
  };

  const handleExitConfirm = async () => {
    setShowConfirm(false);
    
    try {
      setLoading(true);
      
      // Get the admin token before clearing everything
      const adminToken = localStorage.getItem('admin_token');
      
      // Call API to stop impersonation (this will delete the impersonation token)
      try {
        await apiService.stopImpersonation();
      } catch (error) {
        // Continue even if API call fails - we still want to restore admin session
        console.warn('Stop impersonation API call failed:', error);
      }
      
      // Clear impersonation data from localStorage
      localStorage.removeItem('impersonation_token');
      localStorage.removeItem('impersonator_id');
      localStorage.removeItem('impersonator_name');
      localStorage.removeItem('is_impersonating');
      
      // Restore the admin token
      if (adminToken) {
        apiService.setToken(adminToken);
        localStorage.removeItem('admin_token'); // Clean up
      }
      
      // Redirect back to admin portal
      window.location.href = '/admin/users';
    } catch (error) {
      console.error('Error exiting impersonation:', error);
      setLoading(false);
    }
  };

  const impersonatorName = typeof window !== 'undefined' 
    ? localStorage.getItem('impersonator_name') 
    : null;

  return (
    <>
      <div className="bg-yellow-500 text-white px-2 py-1.5 shadow-sm overflow-hidden sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs font-semibold leading-none truncate">Impersonation Mode Active</p>
              <p className="text-xs text-yellow-100 leading-none truncate mt-0.5">
                Admin: {impersonatorName}
              </p>
            </div>
          </div>
          <button
            onClick={handleExitClick}
            disabled={loading}
            className="flex items-center gap-1 bg-white text-yellow-600 px-2 py-1 rounded text-xs font-medium hover:bg-yellow-50 transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden xs:inline sm:inline">{loading ? 'Exit...' : 'Exit'}</span>
          </button>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleExitConfirm}
        title="Exit Impersonation"
        message="Are you sure you want to exit impersonation mode and return to the admin portal? You will be logged back in as the administrator."
        confirmText="Exit Impersonation"
        cancelText="Stay Here"
        type="warning"
        loading={loading}
      />
    </>
  );
}
