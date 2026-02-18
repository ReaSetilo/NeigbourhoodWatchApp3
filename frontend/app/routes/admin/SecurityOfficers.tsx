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
  
  // Approval/Rejection modal states
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
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

  // Handle row click - opens approval modal
  const handleRowClick = (args: any) => {
    setSelectedOfficer(args.data);
    // Automatically show approve form for pending officers
    if (!args.data.is_approved && args.data.status === 'pending_approval') {
      setModalAction('approve');
    } else {
      setModalAction(null);
    }
    setApprovalNotes('');
    setRejectionReason('');
    setShowModal(true);
  };

  // Approval handlers
  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${selectedOfficer.user_id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval_notes: approvalNotes || 'Security officer approved by administrator'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✓ Security officer approved successfully!');
        setShowModal(false);
        setModalAction(null);
        setApprovalNotes('');
        fetchUsers(); // Refresh the list
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error('Error approving officer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${selectedOfficer.user_id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✗ Security officer rejected successfully');
        setShowModal(false);
        setModalAction(null);
        setRejectionReason('');
        fetchUsers(); // Refresh the list
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error('Error rejecting officer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Action modal handlers for suspend/activate/delete
  const openActionModal = (officer: any, action: 'suspend' | 'activate' | 'delete', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event
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
      pending_approval: 'bg-yellow-50 text-yellow-700',
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
            onClick={(e) => openActionModal(props, 'activate', e)}
            className="px-3 py-1 bg-success-500 hover:bg-success-600 text-white text-xs rounded-lg transition-colors"
            title="Reactivate Officer"
          >
            Activate
          </button>
        ) : (
          <button
            onClick={(e) => openActionModal(props, 'suspend', e)}
            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-lg transition-colors"
            title="Suspend Officer"
            disabled={props.status === 'pending_approval'}
          >
            Suspend
          </button>
        )}
        <button
          onClick={(e) => openActionModal(props, 'delete', e)}
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
            rowSelected={handleRowClick}
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

      {/* Approval/Rejection Modal */}
      {showModal && selectedOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Security Officer Details - {selectedOfficer.first_name} {selectedOfficer.last_name}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">First Name</p>
                      <p className="text-base font-semibold">{selectedOfficer.first_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Name</p>
                      <p className="text-base font-semibold">{selectedOfficer.last_name}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-base font-semibold">{selectedOfficer.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="text-base font-semibold">{selectedOfficer.phone_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Account Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        selectedOfficer.status === 'active' ? 'bg-success-50 text-success-700' :
                        selectedOfficer.status === 'pending_approval' ? 'bg-yellow-50 text-yellow-700' :
                        selectedOfficer.status === 'suspended' ? 'bg-red-50 text-red-500' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {selectedOfficer.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Approved</p>
                      <p className={`text-base font-semibold ${selectedOfficer.is_approved ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedOfficer.is_approved ? 'Yes ✓' : 'No ✗'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Dates */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Account Dates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Joined Date</p>
                      <p className="text-base font-semibold">
                        {selectedOfficer.created_at ? new Date(selectedOfficer.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Login</p>
                      <p className="text-base font-semibold">
                        {selectedOfficer.last_login ? new Date(selectedOfficer.last_login).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Selection */}
                {!modalAction && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3">Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setModalAction('approve')}
                        disabled={selectedOfficer.is_approved && selectedOfficer.status === 'active'}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {selectedOfficer.is_approved ? '✓ Already Approved' : 'Approve Officer'}
                      </button>
                      <button
                        onClick={() => setModalAction('reject')}
                        disabled={!selectedOfficer.is_approved && selectedOfficer.status === 'inactive'}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {!selectedOfficer.is_approved && selectedOfficer.status === 'inactive' ? '✗ Already Rejected' : 'Reject Officer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Approve Form */}
                {modalAction === 'approve' && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-green-600">Approve Security Officer</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Approval Notes (Optional)
                        </label>
                        <textarea
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          placeholder="Enter any notes about this approval (e.g., 'Background check completed', 'Training certification verified')..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          These notes are for internal records only.
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-700 mb-2">
                          <strong>Approving this security officer will:</strong>
                        </p>
                        <ul className="list-disc list-inside text-sm text-green-600 space-y-1">
                          <li>Set account status to "active"</li>
                          <li>Grant full access to security features</li>
                          <li>Send approval notification to officer</li>
                          <li>Allow officer to manage incidents and patrols</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleApprove}
                          disabled={submitting}
                          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Approving...' : '✓ Confirm Approval'}
                        </button>
                        <button
                          onClick={() => {
                            setModalAction(null);
                            setApprovalNotes('');
                          }}
                          disabled={submitting}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reject Form */}
                {modalAction === 'reject' && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-red-600">Reject Security Officer</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rejection Reason *
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Enter reason for rejection (e.g., 'Failed background check', 'Incomplete certification', 'Does not meet requirements')..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This reason will be sent to the officer in their notification.
                        </p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700 mb-2">
                          <strong>Rejecting this security officer will:</strong>
                        </p>
                        <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                          <li>Set account status to "inactive"</li>
                          <li>Deny access to security features</li>
                          <li>Send rejection notification with reason</li>
                          <li>Prevent officer from logging in</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={submitting || !rejectionReason.trim()}
                          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Rejecting...' : '✗ Confirm Rejection'}
                        </button>
                        <button
                          onClick={() => {
                            setModalAction(null);
                            setRejectionReason('');
                          }}
                          disabled={submitting}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Suspend/Activate/Delete) */}
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