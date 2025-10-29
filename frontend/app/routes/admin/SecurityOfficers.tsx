import React, { useState, useEffect } from 'react';
import Header from 'components/Header';
import * as Grids from '@syncfusion/ej2-react-grids';

const SecurityOfficers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'delete' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  // Suspension form data
  const [suspensionData, setSuspensionData] = useState({
    suspension_reason: '',
    suspension_duration_days: 90
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      if (data.success) {
        // Filter only security officers
        const securityOfficers = data.data.filter((user: any) => user.user_type === 'security_officer');
        setUsers(securityOfficers);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (officer: any, action: 'suspend' | 'activate' | 'delete') => {
    setSelectedOfficer(officer);
    setActionType(action);
    setIsActionModalOpen(true);
    setActionError(null);
    setActionSuccess(null);
  };

  const closeActionModal = () => {
    setIsActionModalOpen(false);
    setSelectedOfficer(null);
    setActionType(null);
    setSuspensionData({
      suspension_reason: '',
      suspension_duration_days: 90
    });
    setActionError(null);
    setActionSuccess(null);
  };

  const handleSuspendOfficer = async () => {
    if (!suspensionData.suspension_reason.trim()) {
      setActionError('Suspension reason is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`http://localhost:3000/api/admin/officers/${selectedOfficer.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'suspend',
          suspension_reason: suspensionData.suspension_reason,
          suspension_duration_days: suspensionData.suspension_duration_days
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to suspend officer');
      }

      setActionSuccess('Officer suspended successfully!');
      fetchUsers();
      setTimeout(() => {
        closeActionModal();
      }, 2000);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateOfficer = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`http://localhost:3000/api/admin/officers/${selectedOfficer.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'activate'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reactivate officer');
      }

      setActionSuccess('Officer reactivated successfully!');
      fetchUsers();
      setTimeout(() => {
        closeActionModal();
      }, 2000);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOfficer = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`http://localhost:3000/api/admin/officers/${selectedOfficer.user_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete officer');
      }

      setActionSuccess('Officer deleted successfully!');
      fetchUsers();
      setTimeout(() => {
        closeActionModal();
      }, 2000);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (actionType === 'suspend') {
      handleSuspendOfficer();
    } else if (actionType === 'activate') {
      handleActivateOfficer();
    } else if (actionType === 'delete') {
      handleDeleteOfficer();
    }
  };

  const statusTemplate = (props: any) => {
    const statusColors: Record<string, string> = {
      active: 'bg-success-50 text-success-700',
      suspended: 'bg-red-50 text-red-500',
      inactive: 'bg-gray-200 text-gray-700',
      deleted: 'bg-red-100 text-red-500'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[props.status] || 'bg-gray-200 text-gray-700'}`}>
        {props.status}
      </span>
    );
  };

  const approvedTemplate = (props: any) => {
    return (
      <div className="flex-center">
        {props.is_approved ? (
          <span className="text-success-500 text-lg font-semibold">✓</span>
        ) : (
          <span className="text-red-500 text-lg font-semibold">✗</span>
        )}
      </div>
    );
  };

  const actionsTemplate = (props: any) => {
    return (
      <div className="flex gap-2 justify-center">
        {props.status === 'suspended' ? (
          <button
            onClick={() => openActionModal(props, 'activate')}
            className="px-3 py-1 bg-success-500 hover:bg-success-600 text-white text-xs rounded-lg transition-colors"
            title="Reactivate Officer"
          >
            Activate
          </button>
        ) : (
          <button
            onClick={() => openActionModal(props, 'suspend')}
            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-lg transition-colors"
            title="Suspend Officer"
          >
            Suspend
          </button>
        )}
        <button
          onClick={() => openActionModal(props, 'delete')}
          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
          title="Delete Officer"
        >
          Delete
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Security Officers"
          description="View and manage security officer accounts"
        />
        <div className="flex-center p-8">
          <p className="p-18-regular text-gray-500">Loading security officers...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Security Officers"
          description="View and manage security officer accounts"
        />
        <div className="error p-4">
          <p>Error: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className='security-officers wrapper'>
      <Header
        title="Security Officers"
        description="View and manage security officer accounts"
      />
      
      <div className="container">
        <div className="flex-between mb-6">
          <h1 className="p-24-semibold text-dark-100">Security Officers</h1>
          <p className="p-16-semibold text-gray-500">Total: {users.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-300 p-6">
          <Grids.GridComponent 
            dataSource={users}
            allowPaging={true}
            allowSorting={true}
            allowFiltering={true}
            pageSettings={{ pageSize: 10, pageSizes: [10, 25, 50, 100] }}
            filterSettings={{ type: 'Excel' }}
            width='100%'
          >
            <Grids.ColumnsDirective>
              <Grids.ColumnDirective 
                field='user_id' 
                headerText='ID' 
                width='80'
                isPrimaryKey={true}
                textAlign='Center'
                visible={false}
              />
              <Grids.ColumnDirective 
                field='first_name' 
                headerText='First Name' 
                width='140'
              />
              <Grids.ColumnDirective 
                field='last_name' 
                headerText='Last Name' 
                width='140'
              />
              <Grids.ColumnDirective 
                field='email' 
                headerText='Email' 
                width='220'
              />
              <Grids.ColumnDirective 
                field='phone_number' 
                headerText='Phone' 
                width='140'
              />
              <Grids.ColumnDirective 
                field='status' 
                headerText='Status' 
                width='130'
                template={statusTemplate}
              />
              <Grids.ColumnDirective 
                field='is_approved' 
                headerText='Approved' 
                width='110'
                template={approvedTemplate}
                textAlign='Center'
              />
              <Grids.ColumnDirective 
                field='last_login' 
                headerText='Last Login' 
                width='140'
                format='yMd'
                type='date'
              />
              <Grids.ColumnDirective 
                field='created_at' 
                headerText='Joined Date' 
                width='140'
                format='yMd'
                type='date'
              />
              <Grids.ColumnDirective 
                headerText='Actions' 
                width='180'
                template={actionsTemplate}
                textAlign='Center'
              />
            </Grids.ColumnsDirective>
            <Grids.Inject services={[Grids.Page, Grids.Sort, Grids.Filter]} />
          </Grids.GridComponent>
        </div>
      </div>

      {/* Action Modal */}
      {isActionModalOpen && selectedOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {actionType === 'suspend' && 'Suspend Officer'}
                  {actionType === 'activate' && 'Reactivate Officer'}
                  {actionType === 'delete' && 'Delete Officer'}
                </h2>
                <button
                  onClick={closeActionModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleActionSubmit} className="p-6 space-y-4">
              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {actionError}
                </div>
              )}

              {actionSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {actionSuccess}
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Officer Details:</p>
                <p className="font-semibold text-gray-900">
                  {selectedOfficer.first_name} {selectedOfficer.last_name}
                </p>
                <p className="text-sm text-gray-600">{selectedOfficer.email}</p>
              </div>

              {actionType === 'suspend' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suspension Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={suspensionData.suspension_reason}
                      onChange={(e) => setSuspensionData({
                        ...suspensionData,
                        suspension_reason: e.target.value
                      })}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter reason for suspension..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suspension Duration (days)
                    </label>
                    <input
                      type="number"
                      value={suspensionData.suspension_duration_days}
                      onChange={(e) => setSuspensionData({
                        ...suspensionData,
                        suspension_duration_days: parseInt(e.target.value) || 90
                      })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 90 days</p>
                  </div>
                </>
              )}

              {actionType === 'activate' && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">
                    This will reactivate the officer and clear their suspension. They will be able to resume their duties immediately.
                  </p>
                </div>
              )}

              {actionType === 'delete' && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <p className="text-sm font-semibold mb-2">⚠️ Warning: This action cannot be undone!</p>
                  <p className="text-sm">
                    This will permanently remove the officer from the system. All their data will be marked as deleted.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeActionModal}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    ${actionType === 'delete' 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : actionType === 'activate'
                      ? 'bg-success-500 hover:bg-success-600 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    }`}
                >
                  {isSubmitting ? 'Processing...' : 
                    actionType === 'suspend' ? 'Suspend Officer' :
                    actionType === 'activate' ? 'Reactivate Officer' :
                    'Delete Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default SecurityOfficers;